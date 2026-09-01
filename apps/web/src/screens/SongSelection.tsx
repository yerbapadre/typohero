import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { useSongs } from "../net/useSongs";
import { useSongPreview } from "../game/useSongPreview";
import { CabinetPage } from "../ui/CabinetPage";
import { SongCard } from "./SongCard";

export function SongSelection() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const songs = useSongs();
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (songs && songs.length > 0 && !config.songId) setConfig({ songId: songs[0]!.id });
  }, [songs, config.songId, setConfig]);

  const previewSong = songs?.find((s) => s.id === previewId) ?? null;
  useSongPreview(previewSong);

  function focus(id: string) {
    setConfig({ songId: id });
    setPreviewId(id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!songs || songs.length === 0) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const cur = Math.max(0, songs.findIndex((s) => s.id === config.songId));
      const next = e.key === "ArrowDown" ? (cur + 1) % songs.length : (cur - 1 + songs.length) % songs.length;
      focus(songs[next]!.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <CabinetPage
      subtitle="single player"
      title={
        <>
          PICK A <span className="text-cabinet-accent">SONG</span>
        </>
      }
    >
      <div
        className="flex max-h-[52vh] w-full max-w-md flex-col gap-2 overflow-y-auto border-[3px] border-cabinet-frame bg-black/15 p-4 shadow-[8px_8px_0_var(--cab-shadow)]"
        onMouseLeave={() => setPreviewId(null)}
      >
        {songs === null ? (
          <span className="py-8 text-center text-xs uppercase tracking-widest text-cabinet-text/40">loading…</span>
        ) : songs.length === 0 ? (
          <span className="py-8 text-center text-xs uppercase tracking-widest text-cabinet-text/40">no songs</span>
        ) : (
          songs.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              active={s.id === config.songId}
              onClick={() => focus(s.id)}
              onHover={() => focus(s.id)}
            />
          ))
        )}
      </div>

      <div className="mt-2 flex w-full max-w-md gap-3">
        <button
          className="border-2 border-cabinet-border bg-cabinet-btn px-5 py-4 text-sm uppercase tracking-widest text-cabinet-text transition-colors hover:border-cabinet-accent"
          onClick={() => navigate("/solo/character")}
        >
          ← Back
        </button>
        <button
          disabled={!config.songId}
          onClick={() => navigate("/solo/instrument")}
          className="flex-1 border-2 border-cabinet-accent bg-cabinet-accent px-5 py-4 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
        >
          Next: Instrument →
        </button>
      </div>
    </CabinetPage>
  );
}
