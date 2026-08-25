export class GameRoom {
  constructor(_state: DurableObjectState, _env: unknown) {}

  async fetch(_request: Request): Promise<Response> {
    return new Response("GameRoom online", { status: 200 });
  }
}
