import { DIFFICULTY_WPM, type Difficulty } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { CabinetPage } from "../ui/CabinetPage";
import { CabinetPanel, Pips, WizardNav } from "../ui/cabinet";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function DifficultySelect() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();

  return (
    <CabinetPage
      subtitle="single player"
      title={
        <>
          PICK YOUR <span className="text-cabinet-accent">DIFFICULTY</span>
        </>
      }
    >
      <CabinetPanel tight className="w-full max-w-md">
        <div className="flex flex-col gap-2">
          {DIFFICULTIES.map((d, i) => {
            const active = d === config.difficulty;
            return (
              <button
                key={d}
                onClick={() => setConfig({ difficulty: d })}
                className={
                  "flex items-center justify-between gap-3 border-2 px-4 py-3 text-left font-pixel transition-colors " +
                  (active
                    ? "border-cabinet-accent bg-cabinet-accent/10"
                    : "border-cabinet-border bg-cabinet-btn hover:border-cabinet-accent")
                }
              >
                <span
                  className={
                    "text-sm uppercase tracking-widest " +
                    (active ? "text-cabinet-accent" : "text-cabinet-text")
                  }
                >
                  {d}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-cabinet-text/40">{DIFFICULTY_WPM[d]} wpm</span>
                  <Pips value={i + 1} />
                </span>
              </button>
            );
          })}
        </div>
      </CabinetPanel>

      <WizardNav
        onBack={() => navigate("/solo/instrument")}
        onNext={() => navigate("/solo/text")}
        nextLabel="Next: Text →"
      />
    </CabinetPage>
  );
}
