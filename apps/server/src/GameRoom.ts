// Durable Object: one game room. Holds state + WebSockets, relays via protocol. Placeholder.

export class GameRoom {
  constructor(_state: DurableObjectState, _env: unknown) {}

  async fetch(_request: Request): Promise<Response> {
    // TODO: accept WebSocket upgrade, register connection, relay ClientMsg/ServerMsg.
    return new Response("GameRoom online", { status: 200 });
  }
}
