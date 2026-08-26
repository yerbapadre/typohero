import { useNav } from "../nav/NavContext";

export function ModeSelect() {
  const { chooseMode } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Choose your game mode</h1>
      <button onClick={() => chooseMode("single")}>Single-player</button>
      <button onClick={() => chooseMode("multi")}>Multi-player</button>
    </div>
  );
}
