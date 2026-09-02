import { useEffect, useRef, useState } from "react";
import type { ClientMsg, WornShirt, CrowdItem } from "@typohero/protocol";
import type { RoomState, LiveStat, Character } from "@typohero/engine";
import { RoomClient } from "./RoomClient";

export type Position = { x: number; y: number; facing: number };
export type CrowdMember = { id: string; name: string; x: number; y: number; facing: number; item?: CrowdItem };

export type Room = {
  snapshot: RoomState | null;
  frame: Record<string, LiveStat>;
  crowd: CrowdMember[];
  /** What each spectator has on, keyed by crowd id. */
  wardrobe: Record<string, WornShirt>;
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

  return {
    snapshot,
    frame,
    crowd,
    wardrobe,
    positions,
    playerId,
    connected,
    send: (msg) => clientRef.current?.send(msg),
  };
}
