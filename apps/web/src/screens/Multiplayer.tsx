import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../net/useRoom";
import { Lobby } from "./multi/Lobby";
import { MultiPerformance } from "./multi/MultiPerformance";

const NAME_KEY = "typohero:name";

function randomCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

export function BandEntry() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [joinCode, setJoinCode] = useState("");

  function enter(code: string) {
    sessionStorage.setItem(NAME_KEY, name);
    navigate(`/room/${code}`);
  }

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
        <button disabled={!name} onClick={() => enter(randomCode())}>
          Create band
        </button>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="code"
            className="w-24 rounded bg-neutral-800 px-3 py-2 text-center uppercase outline-none"
          />
          <button disabled={!name || !joinCode} onClick={() => enter(joinCode)}>
            Join band
          </button>
        </div>
      </div>
      <button className="text-neutral-500" onClick={() => navigate("/")}>
        Back
      </button>
    </div>
  );
}

export function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomId = (code ?? "").toUpperCase();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [draft, setDraft] = useState("");

  if (!name) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 text-white">
        <div className="text-center">
          <div className="text-sm text-neutral-500">joining band</div>
          <div className="font-mono text-4xl tracking-widest">{roomId}</div>
        </div>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="your name"
          className="rounded bg-neutral-800 px-4 py-2 text-center outline-none"
        />
        <button
          disabled={!draft}
          onClick={() => {
            sessionStorage.setItem(NAME_KEY, draft);
            setName(draft);
          }}
        >
          Join {roomId}
        </button>
        <button className="text-neutral-500" onClick={() => navigate("/")}>
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
