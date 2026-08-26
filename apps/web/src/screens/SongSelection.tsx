import { useNav } from "../nav/NavContext";

export function SongSelection() {
  const { goto, back } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Song selection</h1>
      <button onClick={() => goto("text")}>Next: Text</button>
      <button onClick={back}>Back</button>
    </div>
  );
}
