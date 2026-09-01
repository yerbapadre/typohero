import { GameRoom } from "./GameRoom";

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  SONGS: R2Bucket;
  ASSETS: Fetcher;
  GATE_SECRET: string;
  UPLOAD_TOKEN: string;
}

const SESSION_COOKIE = "th-session";
const SESSION_PAYLOAD = "ok";

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hasSession(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  const [payload, mac] = decodeURIComponent(match[1]!).split(".");
  if (payload !== SESSION_PAYLOAD || !mac) return false;
  return safeEqual(mac, await hmac(env.GATE_SECRET, payload));
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

    if (path === "/api/gate" && request.method === "GET") {
      const ok = await hasSession(request, env);
      return json({ ok }, ok ? 200 : 401);
    }

    if (path === "/api/gate" && request.method === "POST") {
      const { password } = (await request.json().catch(() => ({}))) as { password?: string };
      if (!password || !safeEqual(password, env.GATE_SECRET)) {
        return json({ ok: false }, 401);
      }
      const mac = await hmac(env.GATE_SECRET, SESSION_PAYLOAD);
      const value = encodeURIComponent(`${SESSION_PAYLOAD}.${mac}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
        },
      });
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
      if (!(await hasSession(request, env))) return json({ ok: false }, 401);
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
      if (!(await hasSession(request, env))) return json({ ok: false }, 401);
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
