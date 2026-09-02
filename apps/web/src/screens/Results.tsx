import { streakMultiplier } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { frogById } from "../characters";
import { FrogArt } from "../ui/FrogArt";
import { CabinetButton, CabinetPanel, Divider, Stat } from "../ui/cabinet";

export function Results() {
  const { config, result: r, reset } = useNav();
  const navigate = useNavigate();

  if (!r) {
    return (
      <div className="grid h-screen place-items-center bg-cabinet-bg font-pixel">
        <CabinetButton variant="ghost" onClick={reset}>
          ← Back to menu
        </CabinetButton>
      </div>
    );
  }

  const frog = frogById(config.character?.faceId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cabinet-bg px-6 py-12 font-pixel text-cabinet-text">
      {frog ? <FrogArt frog={frog} className="h-40 w-auto md:h-48" /> : <div className="text-5xl">🎸</div>}

      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide text-white md:text-3xl">
          SHOW <span className="text-cabinet-accent">COMPLETE</span>
        </h1>
        <div className="mt-2 text-[11px] uppercase tracking-widest text-cabinet-text/40">
          {frog?.name}
          {frog && config.instrument ? " · " : ""}
          {config.instrument}
        </div>
      </header>

      <CabinetPanel className="w-full max-w-md">
        <div className="flex items-start justify-around gap-4">
          <Stat label="points" value={r.points.toLocaleString()} />
          <Stat label="accuracy" value={`${Math.round(r.accuracy * 100)}%`} />
          <Stat
            label="best streak"
            value={
              <>
                {r.longestStreak}
                <span className="ml-1 text-sm text-cabinet-accent">×{streakMultiplier(r.longestStreak)}</span>
              </>
            }
          />
        </div>

        <Divider className="my-4" />

        <div className="text-center font-mono text-[11px] leading-relaxed text-cabinet-text/50">
          {r.correct} correct · {r.fixed} fixed · {r.incorrect} wrong · {r.missed} missed
        </div>
      </CabinetPanel>

      <div className="mt-2 flex w-full max-w-md gap-3">
        <CabinetButton size="md" onClick={reset}>
          Exit
        </CabinetButton>
        <CabinetButton variant="primary" size="md" className="flex-1" onClick={() => navigate("/solo/show")}>
          ↻ Play Again
        </CabinetButton>
      </div>
    </div>
  );
}
