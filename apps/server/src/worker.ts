import { GameRoom } from "./GameRoom";

export { GameRoom };

type Env = { GAME_ROOM: DurableObjectNamespace<GameRoom> };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([^/]+)\/ws$/);
    if (!match) return new Response("TypoHero server", { status: 200 });

    return env.GAME_ROOM.getByName(match[1]!).fetch(request);
  },
};
