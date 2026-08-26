import { useNav } from "../nav/NavContext";
import { PlayController } from "../game/PlayController";

export function PerformancePage() {
  const { reset } = useNav();
  return (
    <div className="relative">
      <button className="absolute left-4 top-4 z-10 text-white" onClick={reset}>
        Exit
      </button>
      <PlayController />
    </div>
  );
}
