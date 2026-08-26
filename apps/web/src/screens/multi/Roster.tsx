import type { Member, LiveStat } from "@typohero/engine";

export function Roster({
  members,
  frame,
  youId,
}: {
  members: Member[];
  frame: Record<string, LiveStat>;
  youId: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 font-mono text-sm">
      {members.map((m) => {
        const s = frame[m.id];
        return (
          <div key={m.id} className={m.id === youId ? "text-white" : "text-neutral-400"}>
            {m.name} · {m.instrument} ·{" "}
            {s ? `${s.points} pts · ${Math.round(s.quality * 100)}%` : "—"}
          </div>
        );
      })}
    </div>
  );
}
