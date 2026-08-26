import { useState } from "react";
import { useNav } from "../nav/NavContext";
import { useRoom } from "../net/useRoom";
import { Lobby } from "./multi/Lobby";
import { MultiPerformance } from "./multi/MultiPerformance";

function randomCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

export function Multiplayer() {
  const { reset } = useNav();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  if (!roomId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 text-white">
        <h1 className="text-2xl">Multiplayer</h1>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          className="rounded bg-neutral-800 px-4 py-2 text-center outline-none"
        />
        <div className="flex flex-col items-center gap-3">
          <button disabled={!name} onClick={() => setRoomId(randomCode())}>
            Create band
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="code"
              className="w-24 rounded bg-neutral-800 px-3 py-2 text-center uppercase outline-none"
            />
            <button disabled={!name || !joinCode} onClick={() => setRoomId(joinCode)}>
              Join band
            </button>
          </div>
        </div>
        <button className="text-neutral-500" onClick={reset}>
          Back
        </button>
      </div>
    );
  }

  return <RoomView roomId={roomId} name={name} />;
}

function RoomView({ roomId, name }: { roomId: string; name: string }) {
  const room = useRoom(roomId, name);

  if (!room.snapshot) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        connecting to {roomId}…
      </div>
    );
  }

  if (room.snapshot.phase === "lobby") {
    return <Lobby roomId={roomId} room={room} />;
  }
  return <MultiPerformance room={room} />;
}
