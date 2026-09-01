import { useEffect, useRef, useState } from "react";
import type { ClientMsg } from "@typohero/protocol";
import type { RoomState, LiveStat, Character } from "@typohero/engine";
import { RoomClient } from "./RoomClient";

export type Position = { x: number; y: number; facing: number };

export type Room = {
  snapshot: RoomState | null;
  frame: Record<string, LiveStat>;
  crowd: string[];
  positions: Record<string, Position>;
  playerId: string | null;
  connected: boolean;
  send: (msg: ClientMsg) => void;
};

export function useRoom(roomId: string, name: string, spectate = false, character?: Character): Room {
  const [snapshot, setSnapshot] = useState<RoomState | null>(null);
  const [frame, setFrame] = useState<Record<string, LiveStat>>({});
  const [crowd, setCrowd] = useState<string[]>([]);
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
        onPositions: setPositions,
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
      },
      spectate,
      character,
    );
    clientRef.current = client;
    client.connect();
    return () => client.close();
  }, [roomId, name, spectate, character?.faceId]);

  return {
    snapshot,
    frame,
    crowd,
    positions,
    playerId,
    connected,
    send: (msg) => clientRef.current?.send(msg),
  };
}
