import type { Member, LiveStat } from "@typohero/engine";
import { useNav } from "../../nav/NavContext";
import { CabinetButton, CabinetPanel, Divider, Stat } from "../../ui/cabinet";
import { frogById } from "../../characters";

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
  // Directors ran the show rather than played it — they don't get a line here.
  const ranked = members
    .filter((m) => !m.director)
    .map((m) => ({ m, s: frame[m.id] }))
    .sort((a, b) => (b.s?.points ?? 0) - (a.s?.points ?? 0));
  const bandTotal = ranked.reduce((sum, r) => sum + (r.s?.points ?? 0), 0);
  const avgAccuracy =
    ranked.length === 0 ? 0 : ranked.reduce((sum, r) => sum + (r.s?.accuracy ?? 0), 0) / ranked.length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cabinet-bg px-6 py-12 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">that's the show</div>
        <h1 className="mt-2 text-2xl font-bold tracking-wide text-white md:text-3xl">
          THE BAND <span className="text-cabinet-accent">PLAYED ON</span>
        </h1>
      </header>

      <CabinetPanel className="w-full max-w-md">
        <div className="flex items-start justify-around gap-4">
          <Stat label="band total" value={bandTotal.toLocaleString()} />
          <Stat label="avg accuracy" value={`${Math.round(avgAccuracy * 100)}%`} />
          <Stat label="on the bill" value={ranked.length} />
        </div>

        <Divider className="my-4" />

        <div className="flex flex-col gap-2">
          {ranked.map(({ m, s }, i) => {
            const frog = frogById(m.character?.faceId);
            const mine = m.id === youId;
            return (
              <div
                key={m.id}
                className={
                  "flex items-center gap-2 border-2 px-3 py-2 " +
                  (mine ? "border-cabinet-accent bg-cabinet-accent/10" : "border-cabinet-border bg-cabinet-btn")
                }
              >
                <span className="w-6 shrink-0 text-center text-[11px] text-cabinet-accent">
                  {i === 0 ? "🏆" : i + 1}
                </span>
                {frog ? (
                  <img src={frog.image} alt="" className="h-7 w-7 shrink-0 object-contain" />
                ) : (
                  <span className="h-7 w-7 shrink-0 bg-cabinet-frame" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs uppercase tracking-widest">
                    {m.name}
                    {mine ? " (you)" : ""}
                  </span>
                  <span className="block truncate text-[10px] uppercase tracking-widest text-cabinet-text/40">
                    {m.instrument ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-[11px] text-cabinet-text/60">
                  {s ? (
                    <>
                      <span className="block text-cabinet-text">{s.points}</span>
                      <span className="block">{Math.round(s.accuracy * 100)}%</span>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CabinetPanel>

      <CabinetButton variant="ghost" onClick={reset}>
        ← Exit to menu
      </CabinetButton>
    </div>
  );
}
