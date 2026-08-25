// Cloudflare Worker HTTP entry. Routes requests to the room Durable Object. Placeholder.

export { GameRoom } from "./GameRoom";

type Env = { GAME_ROOM: DurableObjectNamespace };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([^/]+)/);
    if (!match) return new Response("TypoHero server", { status: 200 });

    const roomId = match[1]!;
    const id = env.GAME_ROOM.idFromName(roomId);
    return env.GAME_ROOM.get(id).fetch(request);
  },
};
