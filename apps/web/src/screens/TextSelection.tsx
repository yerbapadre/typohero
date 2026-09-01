import { PASSAGES } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";

export function TextSelection() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 py-16 text-white">
      <h1 className="text-2xl">Pick your passage</h1>

      <div className="flex w-full max-w-xl flex-col gap-2">
        {PASSAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setConfig({ passageId: p.id })}
            className={
              "rounded-lg px-4 py-3 text-left " +
              (p.id === config.passageId ? "bg-sky-500/15 ring-1 ring-sky-400" : "bg-neutral-800 hover:bg-neutral-700")
            }
          >
            <div className="flex items-center justify-between">
              <span>{p.title}</span>
              <span className="font-mono text-xs text-neutral-500">{p.lengthChars} chars</span>
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-neutral-400">{p.content}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-4">
        <button className="text-neutral-500" onClick={() => navigate("/solo/difficulty")}>
          Back
        </button>
        <button
          disabled={!config.passageId}
          onClick={() => navigate("/solo/show")}
          className="text-lg text-green-400 disabled:text-neutral-700"
        >
          ▶ Start performance
        </button>
      </div>
    </div>
  );
}
