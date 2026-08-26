import { DurableObject } from "cloudflare:workers";
import {
  initialRoom,
  roomReducer,
  countdownToPlaying,
  COUNTDOWN_MS,
  type RoomState,
  type RoomAction,
  type LiveStat,
} from "@typohero/engine";
import type { ClientMsg, ServerMsg } from "@typohero/protocol";

const FRAME_MS = 50;

type Env = Record<string, never>;
type Conn = { ws: WebSocket; playerId: string | null };

export class GameRoom extends DurableObject<Env> {
  private room: RoomState = initialRoom();
  private conns = new Set<Conn>();
  private stats = new Map<string, LiveStat>();
  private tokens = new Map<string, string>();
  private frameTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<RoomState>("room")) ?? initialRoom();
      this.tokens = (await ctx.storage.get<Map<string, string>>("tokens")) ?? new Map();
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const conn: Conn = { ws: server, playerId: null };
    this.conns.add(conn);

    server.addEventListener("message", (e) => this.onMessage(conn, e.data));
    server.addEventListener("close", () => this.onClose(conn));

    return new Response(null, { status: 101, webSocket: client });
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put("room", this.room);
    await this.ctx.storage.put("tokens", this.tokens);
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMsg): void {
    const raw = JSON.stringify(msg);
    for (const c of this.conns) c.ws.send(raw);
  }

  private broadcastSession(): void {
    this.broadcast({ type: "session", snapshot: this.room });
  }

  private apply(action: RoomAction): void {
    this.room = roomReducer(this.room, action);
  }

  private newToken(): string {
    return crypto.randomUUID();
  }

  private async onMessage(conn: Conn, data: string | ArrayBuffer): Promise<void> {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data));
    } catch {
      return;
    }

    if (msg.type === "join") {
      this.handleJoin(conn, msg);
      await this.persist();
      this.broadcastSession();
      return;
    }

    const playerId = conn.playerId;
    if (!playerId) return;

    if (msg.type === "stats") {
      this.stats.set(playerId, msg.stat);
      return;
    }

    const before = this.room.phase;
    this.apply(this.toAction(playerId, msg));

    if (this.room.phase === "countdown" && before !== "countdown") {
      this.beginCountdown();
    }

    await this.persist();
    this.broadcastSession();
  }

  private handleJoin(conn: Conn, msg: Extract<ClientMsg, { type: "join" }>): void {
    let playerId = msg.reconnectToken ? this.tokens.get(msg.reconnectToken) : undefined;
    let token = msg.reconnectToken ?? "";
    if (!playerId) {
      playerId = crypto.randomUUID();
      token = this.newToken();
      this.tokens.set(token, playerId);
    }
    conn.playerId = playerId;
    this.apply({ t: "join", id: playerId, name: msg.name, character: msg.character });
    this.send(conn.ws, {
      type: "welcome",
      playerId,
      roomId: this.ctx.id.toString(),
      reconnectToken: token,
      snapshot: this.room,
    });
  }

  private toAction(id: string, msg: ClientMsg): RoomAction {
    switch (msg.type) {
      case "updateProfile":
        return { t: "updateProfile", id, name: msg.name, character: msg.character };
      case "pickInstrument":
        return { t: "pickInstrument", id, instrument: msg.instrument };
      case "pickPassage":
        return { t: "pickPassage", id, passageId: msg.passageId };
      case "setDifficulty":
        return { t: "setDifficulty", id, difficulty: msg.difficulty };
      case "ready":
        return { t: "ready", id, ready: msg.ready };
      case "proposeSong":
        return { t: "proposeSong", id, songId: msg.songId, durationMs: msg.durationMs };
      case "confirmSong":
        return { t: "confirmSong", id };
      case "proposeStart":
        return { t: "proposeStart", id };
      case "confirmStart":
        return { t: "confirmStart", id };
      case "setMode":
        return { t: "setMode", id, mode: msg.mode };
      case "assignAudio":
        return { t: "assignAudio", id, playerId: msg.playerId, on: msg.on };
      case "nextSong":
        return { t: "nextSong", id };
      default:
        throw new Error("unhandled");
    }
  }

  private beginCountdown(): void {
    this.room = countdownToPlaying(this.room, Date.now());
    const startAt = this.room.startedAtEpochMs!;
    this.broadcast({ type: "countdown", startAtEpochMs: startAt });

    const durationMs = this.room.songDurationMs ?? 0;
    void this.ctx.storage.setAlarm(startAt + durationMs);

    setTimeout(() => this.songStart(), COUNTDOWN_MS);
  }

  private async songStart(): Promise<void> {
    this.apply({ t: "songStarted" });
    await this.persist();
    this.broadcastSession();
    this.startFrames();
  }

  private startFrames(): void {
    if (this.frameTimer) return;
    this.frameTimer = setInterval(() => {
      if (this.room.phase !== "playing") return;
      const stats: Record<string, LiveStat> = {};
      for (const [id, stat] of this.stats) stats[id] = stat;
      this.broadcast({ type: "frame", atMs: Date.now(), stats });
    }, FRAME_MS);
  }

  private stopFrames(): void {
    if (this.frameTimer) clearInterval(this.frameTimer);
    this.frameTimer = null;
  }

  async alarm(): Promise<void> {
    this.apply({ t: "endPerformance" });
    this.stopFrames();
    const final: Record<string, LiveStat> = {};
    for (const [id, stat] of this.stats) final[id] = stat;
    await this.persist();
    this.broadcastSession();
    this.broadcast({ type: "results", final });
  }

  private onClose(conn: Conn): void {
    this.conns.delete(conn);
    if (conn.playerId) {
      this.apply({ t: "leave", id: conn.playerId });
      void this.persist();
      this.broadcastSession();
    }
  }
}
