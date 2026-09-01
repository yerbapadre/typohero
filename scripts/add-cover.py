#!/usr/bin/env python3
"""Source album cover art (Deezer) for a song and upload it to the R2 catalog.

Usage: scripts/add-cover.py <id> [<id> ...] [--url URL]
  --url  skip Deezer lookup and use an explicit image URL (single id only)

Env: BASE (default http://localhost:8799), UPLOAD_TOKEN (default: apps/server/.dev.vars)
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SONGS_DIR = ROOT / "apps/web/public/songs"
BASE = None
TOKEN = None

NOISE = re.compile(r"\b(lofi|live|remix|acoustic|instrumental|karaoke|cover|sped up|version)\b", re.I)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def deezer_cover(artist: str, title: str) -> str | None:
    q = f'artist:"{artist}" track:"{re.sub(r"[*]", "", title)}"'
    url = "https://api.deezer.com/search?" + urllib.parse.urlencode({"q": q, "limit": 10})
    data = json.load(urllib.request.urlopen(url))["data"]
    if not data:
        return None
    want, wa = norm(title), norm(artist)
    scored = []
    for r in data:
        t, a = norm(r["title"]), norm(r["artist"]["name"])
        score = 0
        if t == want:
            score += 4
        elif want in t or t in want:
            score += 2
        if wa in a or a in wa:
            score += 2
        if NOISE.search(r["title"]) and not NOISE.search(title):
            score -= 3
        cover = r["album"].get("cover_xl") or r["album"].get("cover_big")
        if cover:
            scored.append((score, cover, r["title"], r["artist"]["name"], r["album"]["title"]))
    if not scored:
        return None
    scored.sort(key=lambda x: -x[0])
    best = scored[0]
    print(f"    matched: {best[2]} — {best[3]}  [{best[4]}]")
    return best[1]


def put(song_id: str, name: str, body: bytes, content_type: str):
    req = urllib.request.Request(
        f"{BASE}/api/songs/{song_id}/{name}",
        data=body,
        method="PUT",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": content_type},
    )
    with urllib.request.urlopen(req) as resp:
        print(f"    PUT {song_id}/{name} -> {resp.status}")


def process(song_id: str, override_url: str | None):
    folder = SONGS_DIR / song_id
    manifest_path = folder / "song.json"
    if not manifest_path.exists():
        print(f"  skip {song_id}: no song.json"); return
    manifest = json.loads(manifest_path.read_text())
    print(f"  {song_id}: {manifest['title']} — {manifest['artist']}")
    url = override_url or deezer_cover(manifest["artist"], manifest["title"])
    if not url:
        print(f"    NO COVER FOUND — skipping"); return
    img = urllib.request.urlopen(url).read()
    (folder / "cover.jpg").write_bytes(img)
    manifest["cover"] = "cover.jpg"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    put(song_id, "cover.jpg", img, "image/jpeg")
    put(song_id, "song.json", (json.dumps(manifest, indent=2) + "\n").encode(), "application/json")


def load_token() -> str:
    dev_vars = ROOT / "apps/server/.dev.vars"
    if dev_vars.exists():
        for line in dev_vars.read_text().splitlines():
            if line.startswith("UPLOAD_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("UPLOAD_TOKEN not set (env or apps/server/.dev.vars)")


if __name__ == "__main__":
    import os

    args = sys.argv[1:]
    override = None
    if "--url" in args:
        i = args.index("--url")
        override = args[i + 1]
        args = args[:i] + args[i + 2:]
    if not args:
        raise SystemExit(__doc__)
    BASE = os.environ.get("BASE", "http://localhost:8799")
    TOKEN = os.environ.get("UPLOAD_TOKEN") or load_token()
    for sid in args:
        process(sid, override)
