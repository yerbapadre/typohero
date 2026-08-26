import { useNav } from "../nav/NavContext";

export function WaitingRoom() {
  const { goto, back } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Waiting room</h1>
      <button onClick={() => goto("character")}>Character</button>
      <button onClick={() => goto("song")}>Song</button>
      <button onClick={() => goto("text")}>Text</button>
      <button onClick={() => goto("performance")}>Start performance</button>
      <button onClick={back}>Back</button>
    </div>
  );
}
