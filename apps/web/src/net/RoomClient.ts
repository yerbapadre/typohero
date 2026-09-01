import type { ClientMsg, ServerMsg } from "@typohero/protocol";
import type { RoomState, LiveStat, Character } from "@typohero/engine";

function wsBase(): string {
  return import.meta.env.DEV ? "ws://localhost:8799" : `wss://${location.host}`;
}

const TOKEN_KEY = "th-reconnect";

export type RoomEvents = {
  onSnapshot?: (snapshot: RoomState) => void;
  onFrame?: (stats: Record<string, LiveStat>, atMs: number) => void;
  onCountdown?: (startAtEpochMs: number) => void;
  onResults?: (final: Record<string, LiveStat>) => void;
  onCrowd?: (members: { id: string; name: string; x: number; y: number; facing: number }[]) => void;
  onPositions?: (players: Record<string, { x: number; y: number; facing: number }>) => void;
  onWelcome?: (playerId: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class RoomClient {
  private ws: WebSocket | null = null;
  playerId: string | null = null;

  constructor(
    private roomId: string,
    private name: string,
    private events: RoomEvents,
    private spectate = false,
    private character?: Character,
    private spectatorId?: string,
  ) {}

  connect(): void {
    const ws = new WebSocket(`${wsBase()}/room/${this.roomId}/ws`);
    this.ws = ws;
    ws.addEventListener("open", () => {
      if (this.spectate) {
        this.send({ type: "spectate", name: this.name, id: this.spectatorId });
      } else {
        const reconnectToken = localStorage.getItem(this.tokenKey()) ?? undefined;
        this.send({ type: "join", name: this.name, character: this.character, reconnectToken });
      }
      this.events.onOpen?.();
    });
    ws.addEventListener("message", (e) => this.onMessage(JSON.parse(e.data) as ServerMsg));
    ws.addEventListener("close", () => this.events.onClose?.());
  }

  private tokenKey(): string {
    return `${TOKEN_KEY}:${this.roomId}`;
  }

  private onMessage(msg: ServerMsg): void {
    switch (msg.type) {
      case "welcome":
        this.playerId = msg.playerId;
        localStorage.setItem(this.tokenKey(), msg.reconnectToken);
        this.events.onWelcome?.(msg.playerId);
        this.events.onSnapshot?.(msg.snapshot);
        break;
      case "session":
        this.events.onSnapshot?.(msg.snapshot);
        break;
      case "frame":
        this.events.onFrame?.(msg.stats, msg.atMs);
        break;
      case "countdown":
        this.events.onCountdown?.(msg.startAtEpochMs);
        break;
      case "results":
        this.events.onResults?.(msg.final);
        break;
      case "crowd":
        this.events.onCrowd?.(msg.members);
        break;
      case "positions":
        this.events.onPositions?.(msg.players);
        break;
    }
  }

  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
