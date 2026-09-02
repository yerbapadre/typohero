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
import { REACTION_KINDS, type ClientMsg, type ServerMsg, type WornShirt, type CrowdItem } from "@typohero/protocol";

const FRAME_MS = 50;
// A wire-sized print is a few KB; anything near this is not one of ours.
const MAX_ART_CHARS = 48_000;
// A reaction fans out to every socket in the room, so one guest leaning on the
// button can't be allowed to drive the broadcast rate. Roughly six a second is
// faster than anyone clicks and cheap enough to relay.
const REACT_MIN_MS = 160;

type Env = Record<string, never>;
type Conn = { ws: WebSocket; playerId: string | null; crowdId?: string; lastReactMs?: number };
type CrowdEntry = { name: string; x: number; y: number; facing: number; item?: CrowdItem };

export class GameRoom extends DurableObject<Env> {
  private room: RoomState = initialRoom();
  private conns = new Set<Conn>();
  private stats = new Map<string, LiveStat>();
  private positions = new Map<string, { x: number; y: number; facing: number }>();
  private crowd = new Map<string, CrowdEntry>();
  // Kept apart from `crowd` on purpose: that map is rebroadcast on every
  // movement tick, and shirts are far too fat to ride along.
  private wardrobe = new Map<string, WornShirt>();
  private tokens = new Map<string, string>();
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private reactionSeq = 0;

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

  private broadcastCrowd(): void {
    const members = [...this.crowd.entries()].map(([id, e]) => ({ id, ...e }));
    this.broadcast({ type: "crowd", members });
  }

  private wardrobeObject(): Record<string, WornShirt> {
    const shirts: Record<string, WornShirt> = {};
    for (const [id, s] of this.wardrobe) shirts[id] = s;
    return shirts;
  }

  private broadcastWardrobe(): void {
    this.broadcast({ type: "wardrobe", shirts: this.wardrobeObject() });
  }

  private positionsObject(): Record<string, { x: number; y: number; facing: number }> {
    const players: Record<string, { x: number; y: number; facing: number }> = {};
    for (const [id, p] of this.positions) players[id] = p;
    return players;
  }

  private broadcastPositions(): void {
    this.broadcast({ type: "positions", players: this.positionsObject() });
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
      this.broadcastCrowd();
      this.broadcastPositions();
      return;
    }

    if (msg.type === "spectate") {
      this.send(conn.ws, { type: "session", snapshot: this.room });
      this.send(conn.ws, { type: "positions", players: this.positionsObject() });
      this.send(conn.ws, { type: "wardrobe", shirts: this.wardrobeObject() });
      if (msg.observer) {
        this.broadcastCrowd();
        return;
      }
      const id = msg.id ?? crypto.randomUUID();
      conn.crowdId = id;
      this.crowd.set(id, { name: msg.name?.trim() || "someone", x: 30, y: 0, facing: 1 });
      this.broadcastCrowd();
      return;
    }

    if (msg.type === "wear") {
      if (!conn.crowdId) return;
      const shirt = msg.shirt;
      if (shirt && (typeof shirt.art !== "string" || shirt.art.length > MAX_ART_CHARS)) return;
      if (shirt) this.wardrobe.set(conn.crowdId, shirt);
      else this.wardrobe.delete(conn.crowdId);
      this.broadcastWardrobe();
      return;
    }

    if (msg.type === "move") {
      if (conn.crowdId) {
        const e = this.crowd.get(conn.crowdId);
        if (e) {
          e.x = msg.x;
          e.y = msg.y;
          e.facing = msg.facing;
          this.broadcastCrowd();
        }
        return;
      }
      if (conn.playerId) {
        this.positions.set(conn.playerId, { x: msg.x, y: msg.y, facing: msg.facing });
        this.broadcastPositions();
      }
      return;
    }

    if (msg.type === "equip") {
      if (conn.crowdId) {
        const e = this.crowd.get(conn.crowdId);
        if (e) {
          e.item = msg.item ?? undefined;
          this.broadcastCrowd();
        }
      }
      return;
    }

    if (msg.type === "react") {
      this.handleReact(conn, msg);
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

  // A reaction is pure relay: no room state to reduce, nothing to persist, so it
  // skips the reducer path below and goes straight back out.
  private handleReact(conn: Conn, msg: Extract<ClientMsg, { type: "react" }>): void {
    if (!REACTION_KINDS.includes(msg.kind)) return;

    // Where the sender is standing — the pit for a spectator, the riser for a
    // band member, centre stage for a player who hasn't walked anywhere yet.
    // Anyone without a frog of their own (the big screen) has nowhere to throw
    // from and is ignored.
    const at = conn.crowdId
      ? this.crowd.get(conn.crowdId)
      : conn.playerId
        ? this.positions.get(conn.playerId) ?? { x: 50 }
        : undefined;
    if (!at) return;

    const now = Date.now();
    if (now - (conn.lastReactMs ?? 0) < REACT_MIN_MS) return;
    conn.lastReactMs = now;

    this.broadcast({ type: "reaction", id: `r${++this.reactionSeq}`, kind: msg.kind, x: at.x });
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
    this.apply({
      t: "join",
      id: playerId,
      name: msg.name,
      character: msg.character,
      director: msg.director,
    });
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
      case "lockIn":
        return { t: "lockIn", id };
      case "backToLobby":
        return { t: "backToLobby", id };
      case "clearSong":
        return { t: "clearSong", id };
      case "updateProfile":
        return { t: "updateProfile", id, name: msg.name, character: msg.character };
      case "pickInstrument":
        return { t: "pickInstrument", id, instrument: msg.instrument };
      case "pickPassage":
        return { t: "pickPassage", id, passageId: msg.passageId };
      case "setDifficulty":
        return { t: "setDifficulty", id, difficulty: msg.difficulty };
      case "setSongCursor":
        return { t: "setSongCursor", id, songId: msg.songId };
      case "voteSong":
        return { t: "voteSong", id, songId: msg.songId };
      case "ready":
        return { t: "ready", id, ready: msg.ready };
      case "setAudioOutput":
        return { t: "setAudioOutput", id, on: msg.on };
      case "setDirector":
        return { t: "setDirector", id, on: msg.on };
      case "proposeSong":
        return { t: "proposeSong", id, songId: msg.songId, durationMs: msg.durationMs };
      case "confirmSong":
        return { t: "confirmSong", id };
      case "proposeStart":
        return { t: "proposeStart", id };
      case "confirmStart":
        return { t: "confirmStart", id };
      case "setNoteMode":
        return { t: "setNoteMode", id, noteMode: msg.noteMode };
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
      this.positions.delete(conn.playerId);
      void this.persist();
      this.broadcastSession();
      this.broadcastPositions();
    }
    if (conn.crowdId) {
      this.crowd.delete(conn.crowdId);
      this.wardrobe.delete(conn.crowdId);
      this.broadcastCrowd();
      this.broadcastWardrobe();
    }
  }
}
