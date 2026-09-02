import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { PlayController } from "../game/PlayController";
import { CabinetButton } from "../ui/cabinet";

export function PerformancePage() {
  const { reset } = useNav();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative">
      <CabinetButton variant="ghost" onClick={reset} className="absolute left-4 top-4 z-10 font-pixel">
        ← Exit
      </CabinetButton>
      <CabinetButton
        variant="default"
        size="sm"
        onClick={() => setConfirming(true)}
        className="absolute right-4 top-4 z-10 font-pixel"
      >
        Quit
      </CabinetButton>
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
              <CabinetButton variant="default" onClick={() => setConfirming(false)} className="font-pixel">
                Keep Playing
              </CabinetButton>
              <CabinetButton variant="primary" onClick={() => navigate("/solo/song")} className="font-pixel">
                Quit
              </CabinetButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
