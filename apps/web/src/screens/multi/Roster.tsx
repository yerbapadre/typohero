import type { Member, LiveStat } from "@typohero/engine";
import { frogById } from "../../characters";

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
        const frog = frogById(m.character?.faceId);
        return (
          <div key={m.id} className={"flex items-center gap-2 " + (m.id === youId ? "text-white" : "text-neutral-400")}>
            {frog && <img src={frog.image} alt="" className="h-5 w-5 shrink-0 object-contain" />}
            <span>
              {m.name} · {m.instrument} ·{" "}
              {s ? `${s.points} pts · ${Math.round(s.quality * 100)}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
