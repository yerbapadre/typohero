import {
  INSTRUMENT_LANES,
  PASSAGES,
  presentLanes,
  type Difficulty,
  type InstrumentLane,
} from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { useSongs } from "../../net/useSongs";
import { frogById } from "../../characters";
import { SongCard } from "../SongCard";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-4 shadow-[8px_8px_0_var(--cab-shadow)]">
      {title && <div className="mb-3 text-xs uppercase tracking-widest text-cabinet-accent">{title}</div>}
      {children}
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={
        "border-2 px-3 py-2 text-[11px] uppercase tracking-widest transition-colors " +
        (active
          ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
          : disabled
            ? "cursor-not-allowed border-cabinet-border bg-cabinet-btn text-cabinet-text/25 line-through"
            : "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent")
      }
    >
      {children}
    </button>
  );
}

export function MultiSetup({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const songs = useSongs();
  const me = snap.members.find((m) => m.id === room.playerId);
  const isHost = snap.hostId === room.playerId;
  const song = songs?.find((s) => s.id === snap.songId) ?? null;
  const available = song ? new Set(presentLanes(song)) : new Set(INSTRUMENT_LANES);
  const takenLanes = new Set(
    snap.members.filter((m) => m.id !== room.playerId && m.instrument).map((m) => m.instrument),
  );

  if (!me) return null;

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-cabinet-bg px-6 pb-12 pt-12 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">band setup</div>
        <h1 className="mt-2 text-2xl font-bold tracking-wide text-white md:text-3xl">
          {snap.songId ? (
            <>
              YOUR <span className="text-cabinet-accent">PART</span>
            </>
          ) : (
            <>
              PICK A <span className="text-cabinet-accent">SONG</span>
            </>
          )}
        </h1>
      </header>

      {/* ready strip */}
      <div className="flex flex-wrap justify-center gap-2">
        {snap.members.map((m) => {
          const f = frogById(m.character?.faceId);
          return (
            <div
              key={m.id}
              className={
                "flex items-center gap-1.5 border-2 px-2 py-1 text-[10px] uppercase tracking-widest " +
                (m.ready ? "border-cabinet-accent text-cabinet-accent" : "border-cabinet-border text-cabinet-text/50")
              }
            >
              {f && <img src={f.image} alt="" className="h-4 w-4 object-contain" />}
              {m.name}
              {m.ready ? " ✓" : ""}
            </div>
          );
        })}
      </div>

      {!snap.songId ? (
        <>
          <Panel title={isHost ? "pick a song" : "the host is picking a song"}>
            <div className="flex max-h-[48vh] flex-col gap-2 overflow-y-auto">
              {songs === null ? (
                <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">loading…</span>
              ) : songs.length === 0 ? (
                <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">no songs</span>
              ) : (
                songs.map((s) => (
                  <SongCard
                    key={s.id}
                    song={s}
                    active={snap.songProposal?.songId === s.id}
                    onClick={
                      isHost
                        ? () => room.send({ type: "proposeSong", songId: s.id, durationMs: s.durationMs })
                        : () => {}
                    }
                  />
                ))
              )}
            </div>
          </Panel>

          {snap.songProposal && (
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-cabinet-accent">
              proposed: {songs?.find((s) => s.id === snap.songProposal!.songId)?.title ?? snap.songProposal.songId}
              {snap.songProposal.by !== room.playerId || isHost ? (
                <button
                  className="border-2 border-cabinet-accent bg-cabinet-accent px-4 py-2 text-cabinet-ink"
                  onClick={() => room.send({ type: "confirmSong" })}
                >
                  confirm
                </button>
              ) : (
                <span className="text-cabinet-text/40">waiting for confirm…</span>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <Panel title={`song · ${song?.title ?? snap.songId}`}>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-cabinet-text/40">instrument</div>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENT_LANES.map((lane: InstrumentLane) => {
                    const gone = (takenLanes.has(lane) || !available.has(lane)) && me.instrument !== lane;
                    return (
                      <Chip
                        key={lane}
                        active={me.instrument === lane}
                        disabled={gone}
                        title={!available.has(lane) ? "not in this song" : undefined}
                        onClick={() => room.send({ type: "pickInstrument", instrument: lane })}
                      >
                        {lane}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-cabinet-text/40">passage</div>
                <div className="flex flex-wrap gap-2">
                  {PASSAGES.map((p) => (
                    <Chip
                      key={p.id}
                      active={me.passageId === p.id}
                      onClick={() => room.send({ type: "pickPassage", passageId: p.id })}
                    >
                      {p.title}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-cabinet-text/40">difficulty</div>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <Chip
                      key={d}
                      active={me.difficulty === d}
                      onClick={() => room.send({ type: "setDifficulty", difficulty: d })}
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <button
            disabled={!me.instrument}
            onClick={() => room.send({ type: "ready", ready: !me.ready })}
            className={
              "w-full max-w-md border-2 px-5 py-4 text-sm uppercase tracking-widest transition-colors md:text-base " +
              (me.ready
                ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                : "border-cabinet-accent bg-transparent text-cabinet-accent hover:bg-cabinet-accent hover:text-cabinet-ink disabled:cursor-not-allowed disabled:border-cabinet-border disabled:text-cabinet-text/30")
            }
          >
            {me.ready ? "✓ Ready" : "Ready Up"}
          </button>

          {isHost && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <Chip onClick={() => room.send({ type: "setMode", mode: "shared" })}>shared audio</Chip>
                <Chip onClick={() => room.send({ type: "setMode", mode: "distributed" })}>distributed audio</Chip>
              </div>
              <button
                onClick={() => room.send({ type: "proposeStart" })}
                className="border-2 border-cabinet-accent bg-cabinet-accent px-8 py-4 text-base uppercase tracking-widest text-cabinet-ink transition-colors hover:bg-[#ffcf5a]"
              >
                ▶ Start the Show
              </button>
            </div>
          )}
        </>
      )}

      {isHost && (
        <button
          className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
          onClick={() => room.send({ type: "backToLobby" })}
        >
          ← Back to lobby
        </button>
      )}
    </div>
  );
}
