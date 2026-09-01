import { DIFFICULTY_WPM, type Difficulty } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function DifficultySelect() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 py-16 text-white">
      <h1 className="text-2xl">Pick your difficulty</h1>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setConfig({ difficulty: d })}
            className={
              "flex items-center justify-between rounded-lg px-4 py-3 text-left font-mono " +
              (d === config.difficulty ? "bg-green-500/15 ring-1 ring-green-400" : "bg-neutral-800 hover:bg-neutral-700")
            }
          >
            <span>{d}</span>
            <span className="text-sm text-neutral-500">{DIFFICULTY_WPM[d]} wpm</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-4">
        <button className="text-neutral-500" onClick={() => navigate("/solo/instrument")}>
          Back
        </button>
        <button onClick={() => navigate("/solo/text")} className="text-lg text-green-400">
          Next: Text →
        </button>
      </div>
    </div>
  );
}
