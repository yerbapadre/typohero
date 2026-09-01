import type { ReactNode } from "react";
import type { Song } from "@typohero/engine";

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SongCard({
  song,
  active,
  onClick,
  onHover,
  badge,
}: {
  song: Song;
  active: boolean;
  onClick: () => void;
  onHover?: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={
        "flex w-full items-center gap-3 border-2 px-3 py-3 text-left font-pixel transition-colors " +
        (active
          ? "border-cabinet-accent bg-cabinet-accent/10"
          : "border-cabinet-border bg-cabinet-btn hover:border-cabinet-accent")
      }
    >
      {song.cover ? (
        <img src={`/songs/${song.id}/${song.cover}`} alt="" className="h-12 w-12 shrink-0 object-cover" />
      ) : (
        <span className="h-12 w-12 shrink-0 bg-cabinet-frame" />
      )}
      <span className="min-w-0 flex-1">
        <span className={"block truncate text-sm " + (active ? "text-cabinet-accent" : "text-cabinet-text")}>
          {song.title}
        </span>
        <span className="block truncate text-[11px] text-cabinet-text/50">{song.artist}</span>
      </span>
      <span className="font-mono text-xs text-cabinet-text/40">{fmtDuration(song.durationMs)}</span>
      {badge}
    </button>
  );
}
