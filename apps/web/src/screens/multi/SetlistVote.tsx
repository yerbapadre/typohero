import type { Song } from "@typohero/engine";
import type { CrowdMember } from "@typohero/protocol";
import { tallyCrowdVotes } from "../../game/crowdVotes";
import { CabinetPanel } from "../../ui/cabinet";
import { SongCard } from "../SongCard";

// The pit's say in the setlist. Spectators aren't on the roster, so their votes
// ride the crowd channel; the band sees the tally on its own song list and the
// host still makes the call.
export function SetlistVote({
  songs,
  crowd,
  youId,
  lockedSongId,
  onVote,
}: {
  songs: Song[] | null;
  crowd: CrowdMember[];
  youId: string;
  /** Set once the band commits to a song — voting closes and the bill goes up. */
  lockedSongId: string | null;
  onVote: (songId: string) => void;
}) {
  const myVote = crowd.find((c) => c.id === youId)?.vote ?? null;
  const tally = tallyCrowdVotes(crowd);

  if (lockedSongId) {
    const picked = songs?.find((s) => s.id === lockedSongId);
    return (
      <CabinetPanel tight title="on the bill" className="w-full max-w-4xl">
        <div className="text-sm uppercase tracking-widest text-cabinet-accent">
          {picked?.title ?? lockedSongId}
        </div>
        <div className="mt-1 font-mono text-[11px] lowercase tracking-wide text-cabinet-text/50">
          {picked?.artist ? `${picked.artist} · ` : ""}
          the band locked it in
          {myVote === lockedSongId ? " — you called it" : ""}
        </div>
      </CabinetPanel>
    );
  }

  // Only the top pick gets the crown, and only once somebody has voted.
  const leadVotes = Math.max(0, ...Object.values(tally));

  return (
    <CabinetPanel tight title="vote for the setlist" className="w-full max-w-4xl">
      <div className="mb-3 font-mono text-[11px] lowercase tracking-wide text-cabinet-text/50">
        pick the song you want to hear — the band can see what the pit wants
      </div>
      <div className="flex max-h-[38vh] flex-col gap-2 overflow-y-auto">
        {songs === null ? (
          <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">
            loading…
          </span>
        ) : songs.length === 0 ? (
          <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">
            no songs yet
          </span>
        ) : (
          songs.map((s) => {
            const votes = tally[s.id] ?? 0;
            const leading = votes > 0 && votes === leadVotes;
            return (
              <SongCard
                key={s.id}
                song={s}
                active={myVote === s.id}
                onClick={() => onVote(s.id)}
                badge={
                  <div className="flex items-center gap-1.5">
                    {leading && (
                      <span className="border-2 border-cabinet-border px-1.5 text-[9px] uppercase tracking-widest text-cabinet-text/50">
                        leading
                      </span>
                    )}
                    <span
                      className={
                        "border-2 px-1.5 text-[10px] font-bold " +
                        (votes > 0
                          ? "border-cabinet-accent text-cabinet-accent"
                          : "border-cabinet-border text-cabinet-text/30")
                      }
                    >
                      ♥ {votes}
                    </span>
                  </div>
                }
              />
            );
          })
        )}
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-widest text-cabinet-text/40">
        {myVote ? "your vote is in · tap another to switch" : "no vote yet"}
      </div>
    </CabinetPanel>
  );
}
