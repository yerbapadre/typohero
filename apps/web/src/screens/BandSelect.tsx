import { useNav } from "../nav/NavContext";

export function BandSelect() {
  const { goto, back } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Multiplayer</h1>
      <button onClick={() => goto("waiting")}>Create band</button>
      <button onClick={() => goto("waiting")}>Join band</button>
      <button onClick={back}>Back</button>
    </div>
  );
}
