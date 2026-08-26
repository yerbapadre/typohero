import type { CharState } from "@typohero/engine";

const stateClass: Record<CharState, string> = {
  pending: "text-neutral-500",
  correct: "text-green-400",
  incorrect: "text-red-400 bg-red-500/20 rounded",
  fixed: "text-amber-400",
  missed: "text-neutral-600 line-through",
};

export function PassageView({
  text,
  displayChars,
  cursor,
}: {
  text: string;
  displayChars: CharState[];
  cursor: number;
}) {
  return (
    <p className="max-w-3xl whitespace-pre-wrap font-mono text-3xl leading-relaxed tracking-wide">
      {[...text].map((ch, i) => {
        const active = i === cursor ? "border-b-2 border-white bg-white/10" : "";
        return (
          <span key={i} className={`${stateClass[displayChars[i]!]} ${active}`}>
            {ch}
          </span>
        );
      })}
    </p>
  );
}
