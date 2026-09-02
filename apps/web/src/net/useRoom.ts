import { useEffect, useRef, useState } from "react";
import type { ClientMsg, CrowdMember, WornShirt, ReactionKind } from "@typohero/protocol";
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

export type Room = {
  snapshot: RoomState | null;
  frame: Record<string, LiveStat>;
  crowd: CrowdMember[];
  /** What each spectator has on, keyed by crowd id. */
  wardrobe: Record<string, WornShirt>;
  /** Bursts still in flight, oldest first. */
  reactions: Reaction[];
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
): Room {
  const [snapshot, setSnapshot] = useState<RoomState | null>(null);
  const [frame, setFrame] = useState<Record<string, LiveStat>>({});
  const [crowd, setCrowd] = useState<CrowdMember[]>([]);
  const [wardrobe, setWardrobe] = useState<Record<string, WornShirt>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
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
        onPositions: setPositions,
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
      },
      spectate,
      character,
      spectatorId,
      observer,
    );
    clientRef.current = client;
    client.connect();
    return () => client.close();
  }, [roomId, name, spectate, character?.faceId, spectatorId, observer]);

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

  return {
    snapshot,
    frame,
    crowd,
    wardrobe,
    reactions,
    positions,
    playerId,
    connected,
    send: (msg) => clientRef.current?.send(msg),
  };
}
