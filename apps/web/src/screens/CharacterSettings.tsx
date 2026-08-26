import { useNav } from "../nav/NavContext";

export function CharacterSettings() {
  const { goto, back } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Character settings</h1>
      <button onClick={() => goto("song")}>Next: Song</button>
      <button onClick={back}>Back</button>
    </div>
  );
}
