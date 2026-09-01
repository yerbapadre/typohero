import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Character } from "@typohero/engine";
import { useRoom } from "../net/useRoom";
import { CabinetPage } from "../ui/CabinetPage";
import { Lobby } from "./multi/Lobby";
import { MultiSetup } from "./multi/MultiSetup";
import { MultiPerformance } from "./multi/MultiPerformance";

const NAME_KEY = "typohero:name";
const CHAR_KEY = "typohero:frog";

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
    <CabinetPage
      subtitle="multiplayer"
      title={
        <>
          FORM A <span className="text-cabinet-accent">BAND</span>
        </>
      }
    >
      <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-cabinet-accent">Your name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="frog sinatra"
              className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-sm text-cabinet-text outline-none placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
            />
          </label>

          <button
            disabled={!name}
            onClick={() => enter(randomCode())}
            className="w-full border-2 border-cabinet-accent bg-cabinet-accent px-5 py-5 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
          >
            Create Band
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-cabinet-text/40">
            <div className="h-0.5 flex-1 bg-cabinet-frame" />
            or join
            <div className="h-0.5 flex-1 bg-cabinet-frame" />
          </div>

          <div className="flex gap-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
              className="w-full border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-xl uppercase tracking-[0.4em] text-cabinet-text outline-none placeholder:tracking-widest placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
            />
            <button
              disabled={!name || !joinCode}
              onClick={() => enter(joinCode)}
              className="whitespace-nowrap border-2 border-cabinet-border bg-cabinet-btn px-5 text-sm uppercase tracking-widest text-cabinet-text transition-colors hover:border-cabinet-accent disabled:cursor-not-allowed disabled:text-cabinet-text/30 disabled:hover:border-cabinet-border md:text-base"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      <button
        className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
        onClick={() => navigate("/")}
      >
        ← Back
      </button>
    </CabinetPage>
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
      <CabinetPage
        subtitle={`joining band ${roomId}`}
        title={
          <>
            WHO ARE <span className="text-cabinet-accent">YOU?</span>
          </>
        }
      >
        <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-cabinet-accent">Your name</span>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="frog sinatra"
                className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-sm text-cabinet-text outline-none placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
              />
            </label>
            <button
              disabled={!draft}
              onClick={() => {
                sessionStorage.setItem(NAME_KEY, draft);
                setName(draft);
              }}
              className="w-full border-2 border-cabinet-accent bg-cabinet-accent px-5 py-5 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
            >
              Join {roomId} →
            </button>
          </div>
        </div>
        <button
          className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
      </CabinetPage>
    );
  }

  return <RoomView roomId={roomId} name={name} />;
}

function RoomView({ roomId, name }: { roomId: string; name: string }) {
  const character = useMemo<Character | undefined>(() => {
    const id = sessionStorage.getItem(CHAR_KEY);
    return id ? { faceId: id, outfitId: "default", instrumentSkinId: "default" } : undefined;
  }, []);
  const room = useRoom(roomId, name, false, character);

  if (!room.snapshot) {
    return (
      <div className="flex h-screen items-center justify-center bg-cabinet-bg font-pixel text-sm uppercase tracking-widest text-cabinet-text/50">
        connecting to {roomId}…
      </div>
    );
  }

  if (room.snapshot.phase === "lobby") {
    return <Lobby roomId={roomId} room={room} />;
  }
  if (room.snapshot.phase === "setup") {
    return <MultiSetup room={room} />;
  }
  return <MultiPerformance room={room} />;
}
