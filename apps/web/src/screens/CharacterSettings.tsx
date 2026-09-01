import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { CabinetPage } from "../ui/CabinetPage";
import { FrogList } from "./FrogList";

export function CharacterSettings() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const selected = config.character?.faceId ?? null;

  function pick(id: string) {
    setConfig({ character: { faceId: id, outfitId: "default", instrumentSkinId: "default" } });
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

      <div className="mt-2 flex w-full max-w-md gap-3">
        <button
          className="border-2 border-cabinet-border bg-cabinet-btn px-5 py-4 text-sm uppercase tracking-widest text-cabinet-text transition-colors hover:border-cabinet-accent"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
        <button
          disabled={!selected}
          onClick={() => navigate("/solo/song")}
          className="flex-1 border-2 border-cabinet-accent bg-cabinet-accent px-5 py-4 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
        >
          Next: Song →
        </button>
      </div>
    </CabinetPage>
  );
}
