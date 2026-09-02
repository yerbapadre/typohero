import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { PlayController } from "../game/PlayController";

export function PerformancePage() {
  const { reset } = useNav();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative">
      <button className="absolute left-4 top-4 z-10 text-white" onClick={reset}>
        Exit
      </button>
      <button
        className="absolute right-4 top-4 z-10 border-2 border-cabinet-border bg-cabinet-btn px-4 py-2 font-pixel text-xs uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent"
        onClick={() => setConfirming(true)}
      >
        Quit
      </button>

      <PlayController />

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cabinet-bg/80">
          <div className="border-[3px] border-cabinet-frame bg-cabinet-bg p-8 text-center shadow-[8px_8px_0_#6b4e18]">
            <p className="font-pixel text-base uppercase tracking-widest text-cabinet-text">
              Quit this song?
            </p>
            <p className="mt-3 font-mono text-sm text-cabinet-text/70">
              You'll go back to song selection.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                className="border-2 border-cabinet-border bg-cabinet-btn px-5 py-4 font-pixel text-sm uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent"
                onClick={() => setConfirming(false)}
              >
                Keep Playing
              </button>
              <button
                className="border-2 border-cabinet-accent bg-cabinet-accent px-5 py-4 font-pixel text-sm uppercase tracking-widest text-cabinet-ink"
                onClick={() => navigate("/solo/song")}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
