import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  // A director opens the room and runs it from the desk — song, note style,
  // sound — without taking a lane or a frog on the riser.
  const [directing, setDirecting] = useState(false);

  function enter(code: string) {
    sessionStorage.setItem(NAME_KEY, name);
    navigate(`/room/${code}${directing ? "?direct=1" : ""}`);
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

          <CabinetField label="Your job">
            <div className="flex gap-2">
              <CabinetButton
                full
                selected={!directing}
                onClick={() => setDirecting(false)}
                className="whitespace-nowrap"
              >
                🎸 Play
              </CabinetButton>
              <CabinetButton
                full
                selected={directing}
                onClick={() => setDirecting(true)}
                className="whitespace-nowrap"
              >
                🎛 Direct
              </CabinetButton>
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-cabinet-text/40">
              {directing
                ? "run the song, the note style and the sound — no frog on stage"
                : "pick up an instrument and play the show"}
            </div>
          </CabinetField>

          <CabinetButton variant="primary" full disabled={!name} onClick={() => enter(randomCode())}>
            {directing ? "Create Band as Director" : "Create Band"}
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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomId = (code ?? "").toUpperCase();
  const directing = params.get("direct") === "1";
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");

  if (!name) {
    return (
      <NameEntry
        subtitle={directing ? `directing band ${roomId}` : `joining band ${roomId}`}
        cta={directing ? `Direct ${roomId} →` : `Join ${roomId} →`}
        onBack={() => navigate("/")}
        onSubmit={(next) => {
          sessionStorage.setItem(NAME_KEY, next);
          setName(next);
        }}
      />
    );
  }

  return <RoomView roomId={roomId} name={name} directing={directing} />;
}

function RoomView({ roomId, name, directing }: { roomId: string; name: string; directing: boolean }) {
  const character = useMemo<Character | undefined>(() => {
    const id = sessionStorage.getItem(CHAR_KEY);
    return id ? { faceId: id, outfitId: "default", instrumentSkinId: "default" } : undefined;
  }, []);
  const room = useRoom(roomId, name, false, character, undefined, false, directing);

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
