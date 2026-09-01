import type { Member, LiveStat } from "@typohero/engine";
import { useNav } from "../../nav/NavContext";

export function MultiResults({
  members,
  frame,
  youId,
}: {
  members: Member[];
  frame: Record<string, LiveStat>;
  youId: string | null;
}) {
  const { reset } = useNav();
  const ranked = members
    .map((m) => ({ m, s: frame[m.id] }))
    .sort((a, b) => (b.s?.points ?? 0) - (a.s?.points ?? 0));
  const bandTotal = ranked.reduce((sum, r) => sum + (r.s?.points ?? 0), 0);
  const avgAccuracy =
    ranked.length === 0 ? 0 : ranked.reduce((sum, r) => sum + (r.s?.accuracy ?? 0), 0) / ranked.length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-900 py-16 text-white">
      <div className="text-center">
        <h1 className="text-2xl">The band played on</h1>
        <div className="mt-2 font-mono text-4xl">{bandTotal.toLocaleString()} pts</div>
        <div className="text-sm text-neutral-500">band total · {Math.round(avgAccuracy * 100)}% avg accuracy</div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-1 font-mono text-sm">
        {ranked.map(({ m, s }, i) => (
          <div
            key={m.id}
            className={
              "flex items-center justify-between rounded-lg px-4 py-2 " +
              (m.id === youId ? "bg-white/5 text-white" : "text-neutral-400")
            }
          >
            <span>
              {i === 0 ? "🏆 " : `${i + 1}. `}
              {m.name}
              {m.id === youId ? " (you)" : ""}
              <span className="text-neutral-600"> · {m.instrument}</span>
            </span>
            <span>
              {s ? `${s.points} pts · ${Math.round(s.accuracy * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>

      <button className="text-neutral-500" onClick={reset}>
        Exit to menu
      </button>
    </div>
  );
}
