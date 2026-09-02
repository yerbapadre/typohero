import { useEffect, useRef, useState } from "react";
import type { ClientMsg, CrowdMember, WornShirt, ReactionKind, EmoteKind } from "@typohero/protocol";
import type { RoomState, LiveStat, Character } from "@typohero/engine";
import { RoomClient } from "./RoomClient";

export type Position = { x: number; y: number; facing: number };
export type { CrowdMember };

/** A burst in flight. `at` is when we received it, not when it was sent: the
 *  animation is local, and the room's clock is not ours to trust. */
export type Reaction = { id: string; kind: ReactionKind; x: number; at: number };

// Long enough to cover the float animation in index.css, with a little slack.
export const REACTION_LIFETIME_MS = 2800;
// A ceiling on how much confetti one flood can put on screen at once.
const MAX_REACTIONS = 40;

/** A flourish playing on a crowd frog. `at` is when we received it, same reasoning
 *  as a reaction: the animation is ours to time, not the room's. */
export type Emote = { id: string; kind: EmoteKind; crowdId: string; at: number };

// Long enough to cover the longest emote animation in index.css, with slack.
export const EMOTE_LIFETIME_MS = 1400;
const MAX_EMOTES = 30;

export type Room = {
  snapshot: RoomState | null;
  frame: Record<string, LiveStat>;
  crowd: CrowdMember[];
  /** What each spectator has on, keyed by crowd id. */
  wardrobe: Record<string, WornShirt>;
  /** Bursts still in flight, oldest first. */
  reactions: Reaction[];
  /** Crowd-frog flourishes still animating, oldest first. */
  emotes: Emote[];
  positions: Record<string, Position>;
  playerId: string | null;
  connected: boolean;
  send: (msg: ClientMsg) => void;
};

export function useRoom(
  roomId: string,
  name: string,
  spectate = false,
  character?: Character,
  spectatorId?: string,
  observer = false,
  director = false,
): Room {
  const [snapshot, setSnapshot] = useState<RoomState | null>(null);
  const [frame, setFrame] = useState<Record<string, LiveStat>>({});
  const [crowd, setCrowd] = useState<CrowdMember[]>([]);
  const [wardrobe, setWardrobe] = useState<Record<string, WornShirt>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<RoomClient | null>(null);

  useEffect(() => {
    const client = new RoomClient(
      roomId,
      name,
      {
        onWelcome: setPlayerId,
        onSnapshot: setSnapshot,
        onFrame: (stats) => setFrame(stats),
        onResults: (final) => setFrame(final),
        onCrowd: setCrowd,
        onWardrobe: setWardrobe,
        onReaction: (r) => {
          const at = Date.now();
          setReactions((prev) => [
            ...prev.filter((p) => at - p.at < REACTION_LIFETIME_MS).slice(-MAX_REACTIONS),
            { ...r, at },
          ]);
        },
        onEmote: (e) => {
          const at = Date.now();
          setEmotes((prev) => [
            ...prev.filter((p) => at - p.at < EMOTE_LIFETIME_MS).slice(-MAX_EMOTES),
            { ...e, at },
          ]);
        },
        onPositions: setPositions,
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
      },
      spectate,
      character,
      spectatorId,
      observer,
      director,
    );
    clientRef.current = client;
    client.connect();
    return () => client.close();
  }, [roomId, name, spectate, character?.faceId, spectatorId, observer, director]);

  // Drop bursts once they have finished floating. Without this the last few of
  // a run would sit in the tree invisibly until the next reaction swept them up.
  useEffect(() => {
    const oldest = reactions[0];
    if (!oldest) return;
    const t = setTimeout(
      () => setReactions((prev) => prev.filter((r) => Date.now() - r.at < REACTION_LIFETIME_MS)),
      Math.max(0, REACTION_LIFETIME_MS - (Date.now() - oldest.at)),
    );
    return () => clearTimeout(t);
  }, [reactions]);

  // Sweep finished emotes the same way, so a frog's flourish class falls off
  // once the animation is done rather than lingering in the tree.
  useEffect(() => {
    const oldest = emotes[0];
    if (!oldest) return;
    const t = setTimeout(
      () => setEmotes((prev) => prev.filter((e) => Date.now() - e.at < EMOTE_LIFETIME_MS)),
      Math.max(0, EMOTE_LIFETIME_MS - (Date.now() - oldest.at)),
    );
    return () => clearTimeout(t);
  }, [emotes]);

  return {
    snapshot,
    frame,
    crowd,
    wardrobe,
    reactions,
    emotes,
    positions,
    playerId,
    connected,
    send: (msg) => clientRef.current?.send(msg),
  };
}
