import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CrowdItem } from "@typohero/protocol";
import { useRoom } from "../net/useRoom";
import { useSongs } from "../net/useSongs";
import { CROWD_FROG_IMAGE } from "../characters";
import { CabinetPage } from "../ui/CabinetPage";
import { useWorn } from "../merch/shirts";
import { NameEntry } from "../ui/NameEntry";
import {
  CabinetButton,
  CabinetField,
  CabinetInput,
  CabinetPanel,
  CabinetStatus,
  RoomHeader,
} from "../ui/cabinet";
import { Playground } from "./multi/Playground";
import { StageView } from "./multi/StageView";
import { MultiResults } from "./multi/MultiResults";

const NAME_KEY = "typohero:name";

export function CrowdEntry() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [code, setCode] = useState("");

  function watch() {
    sessionStorage.setItem(NAME_KEY, name);
    navigate(`/crowd/${code}`);
  }

  return (
    <CabinetPage
      subtitle="spectator"
      title={
        <>
          JOIN THE <span className="text-cabinet-accent">CROWD</span>
        </>
      }
    >
      <img
        src={CROWD_FROG_IMAGE}
        alt=""
        draggable={false}
        className="h-32 w-auto select-none object-contain md:h-40"
      />

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

          <CabinetField label="Band code">
            <CabinetInput
              code
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
            />
          </CabinetField>

          <CabinetButton variant="primary" full disabled={!name || !code} onClick={watch}>
            Watch the Show →
          </CabinetButton>
        </div>
      </CabinetPanel>

      <CabinetButton variant="ghost" onClick={() => navigate("/")}>
        ← Back
      </CabinetButton>
    </CabinetPage>
  );
}

export function CrowdView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomId = (code ?? "").toUpperCase();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");

  if (!name) {
    return (
      <NameEntry
        subtitle={`joining crowd ${roomId}`}
        cta={`Watch ${roomId} →`}
        onBack={() => navigate("/")}
        onSubmit={(next) => {
          sessionStorage.setItem(NAME_KEY, next);
          setName(next);
        }}
      />
    );
  }

  return <CrowdWatch roomId={roomId} name={name} />;
}

function CrowdWatch({ roomId, name }: { roomId: string; name: string }) {
  const navigate = useNavigate();
  const [spectatorId] = useState(() => crypto.randomUUID());
  const room = useRoom(roomId, name, true, undefined, spectatorId);
  const songs = useSongs();
  const snap = room.snapshot;
  const song = songs?.find((s) => s.id === snap?.songId) ?? null;

  const onMove = useCallback(
    (x: number, y: number, facing: -1 | 1) => room.send({ type: "move", x, y, facing }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Tell the room what you have on: once the socket is up, and again whenever
  // you change shirts at the merch booth. `room.send` is a fresh closure every
  // render, so it goes through a ref rather than the dependency list.
  const { shirt } = useWorn();
  const sendRef = useRef(room.send);
  sendRef.current = room.send;
  useEffect(() => {
    if (room.connected) sendRef.current({ type: "wear", shirt });
  }, [room.connected, shirt]);

  const onEquip = useCallback(
    (item: CrowdItem | null) => room.send({ type: "equip", item }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!snap) {
    return <CabinetStatus>joining the crowd at {roomId}…</CabinetStatus>;
  }

  if (snap.phase === "results") {
    return <MultiResults members={snap.members} frame={room.frame} youId={null} />;
  }

  if (snap.phase === "playing" || snap.phase === "countdown") {
    return (
      <StageView
        roomId={roomId}
        snapshot={snap}
        frame={room.frame}
        song={song}
        youId={null}
        positions={room.positions}
        crowd={room.crowd}
        wardrobe={room.wardrobe}
        crowdYouId={spectatorId}
        crowdYouName={name}
        onMove={onMove}
        onEquip={onEquip}
        controllableCrowd
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-cabinet-bg px-6 pb-10 pt-10 font-pixel text-cabinet-text">
      <RoomHeader
        eyebrow="now watching"
        code={roomId}
        caption={`in the crowd as ${name} · 👥 ${room.crowd.length}`}
      />

      <div className="w-full">
        <Playground
          mode="crowd"
          youId={spectatorId}
          youName={name}
          youImage={CROWD_FROG_IMAGE}
          members={snap.members}
          positions={room.positions}
          onMove={onMove}
          bandName={roomId}
          crowd={room.crowd}
          wardrobe={room.wardrobe}
        />
      </div>

      <CabinetButton variant="ghost" onClick={() => navigate("/")}>
        ← Leave crowd
      </CabinetButton>
    </div>
  );
}
