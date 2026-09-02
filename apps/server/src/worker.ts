import { GameRoom } from "./GameRoom";
import { getOrCreateWallet, listProducts, purchase } from "./store";

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  SONGS: R2Bucket;
  /** LeCoin store: wallets, product catalog, transaction ledger. */
  DB: D1Database;
  ASSETS: Fetcher;
  UPLOAD_TOKEN: string;
  /** Premium frog codes: "frogId:CODE,frogId:CODE". Unset = no frogs unlockable. */
  UNLOCK_CODES: string;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Resolve a redemption code to the frog id it unlocks, or null. */
function frogForCode(codes: string, code: string): string | null {
  for (const pair of codes.split(",")) {
    const idx = pair.indexOf(":");
    if (idx < 1) continue;
    const frogId = pair.slice(0, idx).trim();
    const secret = pair.slice(idx + 1).trim();
    if (secret && safeEqual(secret, code)) return frogId;
  }
  return null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const ws = path.match(/^\/room\/([^/]+)\/ws$/);
    if (ws) return env.GAME_ROOM.getByName(ws[1]!).fetch(request);

    if (path === "/api/unlock" && request.method === "POST") {
      const { code } = (await request.json().catch(() => ({}))) as { code?: string };
      const frogId = code ? frogForCode(env.UNLOCK_CODES ?? "", code.trim()) : null;
      if (!frogId) return json({ ok: false }, 403);
      return json({ ok: true, frogId });
    }

    // --- LeCoin store -----------------------------------------------------
    // Open, like /api/songs: main removed the server-side session gate, so
    // there is nothing left to check against here.

    if (path === "/api/store/products" && request.method === "GET") {
      return json(await listProducts(env.DB));
    }

    if (path === "/api/store/wallet" && request.method === "POST") {
      const { username } = (await request.json().catch(() => ({}))) as { username?: string };
      const wallet = username ? await getOrCreateWallet(env.DB, username) : null;
      if (!wallet) return json({ ok: false, error: "bad_username" }, 400);
      return json(wallet);
    }

    if (path === "/api/store/purchase" && request.method === "POST") {
      const { username, productId } = (await request.json().catch(() => ({}))) as {
        username?: string;
        productId?: string;
      };
      if (!username || !productId) return json({ ok: false, error: "bad_request" }, 400);
      const result = await purchase(env.DB, username, productId);
      if (!result) return json({ ok: false, error: "bad_username" }, 400);
      if (!result.ok) return json(result, result.error === "unknown_product" ? 404 : 402);
      return json(result);
    }

    const put = path.match(/^\/api\/songs\/([^/]+)\/([^/]+)$/);
    if (put && request.method === "PUT") {
      const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
      if (!safeEqual(token, env.UPLOAD_TOKEN)) return json({ ok: false }, 401);
      await env.SONGS.put(`songs/${put[1]}/${put[2]}`, request.body, {
        httpMetadata: {
          contentType: request.headers.get("Content-Type") ?? "application/octet-stream",
        },
      });
      return json({ ok: true });
    }

    const del = path.match(/^\/api\/songs\/([^/]+)(?:\/([^/]+))?$/);
    if (del && request.method === "DELETE") {
      const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
      if (!safeEqual(token, env.UPLOAD_TOKEN)) return json({ ok: false }, 401);
      if (del[2]) {
        await env.SONGS.delete(`songs/${del[1]}/${del[2]}`);
        return json({ ok: true, deleted: 1 });
      }
      const prefix = `songs/${del[1]}/`;
      const keys: string[] = [];
      let cursor: string | undefined;
      do {
        const listed = await env.SONGS.list({ prefix, cursor });
        keys.push(...listed.objects.map((o) => o.key));
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      if (keys.length === 0) return json({ ok: false, error: "not found" }, 404);
      await env.SONGS.delete(keys);
      return json({ ok: true, deleted: keys.length });
    }

    if (path === "/api/songs" && request.method === "GET") {
      const listed = await env.SONGS.list({ prefix: "songs/" });
      const manifests = listed.objects.filter((o) => o.key.endsWith("/song.json"));
      const songs = await Promise.all(
        manifests.map(async (o) => {
          const obj = await env.SONGS.get(o.key);
          return obj ? await obj.json() : null;
        }),
      );
      return json(songs.filter(Boolean));
    }

    const stem = path.match(/^\/songs\/([^/]+)\/([^/]+)$/);
    if (stem && request.method === "GET") {
      const obj = await env.SONGS.get(`songs/${stem[1]}/${stem[2]}`);
      if (obj) {
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("etag", obj.httpEtag);
        return new Response(obj.body, { headers });
      }
      return env.ASSETS.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
