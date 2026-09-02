import { INSTRUMENT_LANES, presentLanes, type InstrumentLane } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { useSongs } from "../net/useSongs";
import { CabinetPage } from "../ui/CabinetPage";
import { InstrumentGrid } from "../ui/InstrumentGrid";
import { WizardNav } from "../ui/cabinet";

export function InstrumentSelect() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const songs = useSongs();
  const song = songs?.find((s) => s.id === config.songId) ?? null;
  const available = new Set<InstrumentLane>(song ? presentLanes(song) : INSTRUMENT_LANES);

  return (
    <CabinetPage
      subtitle="single player"
      title={
        <>
          PICK YOUR <span className="text-cabinet-accent">INSTRUMENT</span>
        </>
      }
    >
      <InstrumentGrid
        value={config.instrument ?? null}
        available={available}
        onPick={(lane) => setConfig({ instrument: lane })}
      />

      <WizardNav
        onBack={() => navigate("/solo/song")}
        onNext={() => navigate("/solo/difficulty")}
        nextLabel="Next: Difficulty →"
        nextDisabled={!config.instrument}
      />
    </CabinetPage>
  );
}
