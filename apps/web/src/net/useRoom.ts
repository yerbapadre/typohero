import { useEffect, useRef, useState } from "react";
import type { ClientMsg } from "@typohero/protocol";
import type { RoomState, LiveStat } from "@typohero/engine";
import { RoomClient } from "./RoomClient";

export type Room = {
  snapshot: RoomState | null;
  frame: Record<string, LiveStat>;
  playerId: string | null;
  connected: boolean;
  send: (msg: ClientMsg) => void;
};

export function useRoom(roomId: string, name: string): Room {
  const [snapshot, setSnapshot] = useState<RoomState | null>(null);
  const [frame, setFrame] = useState<Record<string, LiveStat>>({});
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<RoomClient | null>(null);

  useEffect(() => {
    const client = new RoomClient(roomId, name, {
      onWelcome: setPlayerId,
      onSnapshot: setSnapshot,
      onFrame: (stats) => setFrame(stats),
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
    });
    clientRef.current = client;
    client.connect();
    return () => client.close();
  }, [roomId, name]);

  return {
    snapshot,
    frame,
    playerId,
    connected,
    send: (msg) => clientRef.current?.send(msg),
  };
}
