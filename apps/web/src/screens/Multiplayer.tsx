import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Character } from "@typohero/engine";
import { useRoom } from "../net/useRoom";
import { CabinetPage } from "../ui/CabinetPage";
import { NameEntry } from "../ui/NameEntry";
import {
  CabinetButton,
  CabinetField,
  CabinetInput,
  CabinetPanel,
  CabinetStatus,
  Divider,
} from "../ui/cabinet";
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
      <CabinetPanel className="w-full max-w-md">
        <div className="flex flex-col gap-5">
          <CabinetField label="Your name">
            <CabinetInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="frog sinatra"
            />
          </CabinetField>

          <CabinetButton variant="primary" full disabled={!name} onClick={() => enter(randomCode())}>
            Create Band
          </CabinetButton>

          <Divider label="or join" />

          <div className="flex gap-3">
            <CabinetInput
              code
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
              className="w-full"
            />
            <CabinetButton
              disabled={!name || !joinCode}
              onClick={() => enter(joinCode)}
              className="whitespace-nowrap"
            >
              Join
            </CabinetButton>
          </div>
        </div>
      </CabinetPanel>

      <CabinetButton variant="ghost" onClick={() => navigate("/")}>
        ← Back
      </CabinetButton>
    </CabinetPage>
  );
}

export function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomId = (code ?? "").toUpperCase();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");

  if (!name) {
    return (
      <NameEntry
        subtitle={`joining band ${roomId}`}
        cta={`Join ${roomId} →`}
        onBack={() => navigate("/")}
        onSubmit={(next) => {
          sessionStorage.setItem(NAME_KEY, next);
          setName(next);
        }}
      />
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
    return <CabinetStatus>connecting to {roomId}…</CabinetStatus>;
  }

  if (room.snapshot.phase === "lobby") {
    return <Lobby roomId={roomId} room={room} />;
  }
  if (room.snapshot.phase === "setup") {
    return <MultiSetup room={room} />;
  }
  return <MultiPerformance roomId={roomId} room={room} />;
}
