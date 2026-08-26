import { useNav } from "../nav/NavContext";

export function TextSelection() {
  const { goto, back } = useNav();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-2xl">Text selection</h1>
      <button onClick={() => goto("performance")}>Start performance</button>
      <button onClick={back}>Back</button>
    </div>
  );
}
