import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { useSongs } from "../net/useSongs";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SongSelection() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const songs = useSongs();

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 py-16 text-white">
      <h1 className="text-2xl">Pick a song</h1>

      <div className="flex w-full max-w-md flex-col gap-2">
        {songs === null ? (
          <span className="text-center text-neutral-600">loading…</span>
        ) : songs.length === 0 ? (
          <span className="text-center text-neutral-600">no songs</span>
        ) : (
          songs.map((s) => (
            <button
              key={s.id}
              onClick={() => setConfig({ songId: s.id })}
              className={
                "flex items-center justify-between rounded-lg px-4 py-3 text-left " +
                (s.id === config.songId ? "bg-amber-500/15 ring-1 ring-amber-400" : "bg-neutral-800 hover:bg-neutral-700")
              }
            >
              <span>
                <span className="block">{s.title}</span>
                <span className="block text-sm text-neutral-400">{s.artist}</span>
              </span>
              <span className="font-mono text-sm text-neutral-500">{fmtDuration(s.durationMs)}</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-4">
        <button className="text-neutral-500" onClick={() => navigate("/solo/character")}>
          Back
        </button>
        <button
          disabled={!config.songId}
          onClick={() => navigate("/solo/instrument")}
          className="text-lg text-green-400 disabled:text-neutral-700"
        >
          Next: Instrument →
        </button>
      </div>
    </div>
  );
}
