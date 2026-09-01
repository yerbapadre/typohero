import { streakMultiplier } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { frogById } from "../characters";
import { FrogArt } from "../ui/FrogArt";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );
}

export function Results() {
  const { config, result: r, reset } = useNav();
  const navigate = useNavigate();

  if (!r) {
    return (
      <div className="grid h-screen place-items-center bg-neutral-900 text-white">
        <button onClick={reset}>Back to menu</button>
      </div>
    );
  }

  const frog = frogById(config.character?.faceId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-900 py-16 text-white">
      <div className="flex flex-col items-center text-center">
        {frog ? (
          <FrogArt frog={frog} className="h-40 w-auto" />
        ) : (
          <div className="text-5xl">🎸</div>
        )}
        <h1 className="mt-2 text-2xl">Show complete</h1>
        <div className="text-sm text-neutral-500">
          {frog?.name}
          {frog && config.instrument ? " · " : ""}
          {config.instrument}
        </div>
      </div>

      <div className="flex gap-10">
        <Stat label="points" value={r.points.toLocaleString()} />
        <Stat label="accuracy" value={`${Math.round(r.accuracy * 100)}%`} />
        <Stat label="best streak" value={`${r.longestStreak} (×${streakMultiplier(r.longestStreak)})`} />
      </div>

      <div className="font-mono text-sm text-neutral-500">
        {r.correct} correct · {r.fixed} fixed · {r.incorrect} wrong · {r.missed} missed
      </div>

      <div className="flex gap-4">
        <button className="text-neutral-500" onClick={reset}>
          Exit
        </button>
        <button className="text-lg text-green-400" onClick={() => navigate("/solo/show")}>
          ↻ Play again
        </button>
      </div>
    </div>
  );
}
