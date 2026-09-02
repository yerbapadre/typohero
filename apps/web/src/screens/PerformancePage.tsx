import { useNav } from "../nav/NavContext";
import { PlayController } from "../game/PlayController";
import { CabinetButton } from "../ui/cabinet";

export function PerformancePage() {
  const { reset } = useNav();
  return (
    <div className="relative">
      <CabinetButton variant="ghost" onClick={reset} className="absolute left-4 top-4 z-10 font-pixel">
        ← Exit
      </CabinetButton>
      <PlayController />
    </div>
  );
}
