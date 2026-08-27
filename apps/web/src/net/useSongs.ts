import { useEffect, useState } from "react";
import type { Song } from "@typohero/engine";

export function useSongs(): Song[] | null {
  const [songs, setSongs] = useState<Song[] | null>(null);
  useEffect(() => {
    fetch("/api/songs", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Song[]) => setSongs(data))
      .catch(() => setSongs([]));
  }, []);
  return songs;
}
