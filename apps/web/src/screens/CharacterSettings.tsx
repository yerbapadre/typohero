import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { CabinetPage } from "../ui/CabinetPage";
import { WizardNav } from "../ui/cabinet";
import { FrogList } from "./FrogList";

export function CharacterSettings() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const selected = config.character?.faceId ?? null;

  // FrogList reports `null` while a locked frog is on screen, which clears the
  // selection and disables "next" until a code is redeemed.
  function pick(id: string | null) {
    setConfig({
      character: id ? { faceId: id, outfitId: "default", instrumentSkinId: "default" } : null,
    });
  }

  return (
    <CabinetPage
      subtitle="single player"
      title={
        <>
          CHOOSE YOUR <span className="text-cabinet-accent">FROG</span>
        </>
      }
    >
      <FrogList selected={selected} onSelect={pick} />

      <WizardNav
        onBack={() => navigate("/")}
        onNext={() => navigate("/solo/song")}
        nextLabel="Next: Song →"
        nextDisabled={!selected}
      />
    </CabinetPage>
  );
}
