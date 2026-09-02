import { PASSAGES } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { CabinetPage } from "../ui/CabinetPage";
import { CabinetPanel, WizardNav } from "../ui/cabinet";

export function TextSelection() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();

  return (
    <CabinetPage
      subtitle="single player"
      title={
        <>
          PICK YOUR <span className="text-cabinet-accent">PASSAGE</span>
        </>
      }
    >
      <CabinetPanel tight className="max-h-[52vh] w-full max-w-md overflow-y-auto">
        <div className="flex flex-col gap-2">
          {PASSAGES.map((p) => {
            const active = p.id === config.passageId;
            return (
              <button
                key={p.id}
                onClick={() => setConfig({ passageId: p.id })}
                className={
                  "border-2 px-4 py-3 text-left font-pixel transition-colors " +
                  (active
                    ? "border-cabinet-accent bg-cabinet-accent/10"
                    : "border-cabinet-border bg-cabinet-btn hover:border-cabinet-accent")
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={
                      "truncate text-sm uppercase tracking-widest " +
                      (active ? "text-cabinet-accent" : "text-cabinet-text")
                    }
                  >
                    {p.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-cabinet-text/40">
                    {p.lengthChars} chars
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 font-mono text-xs leading-relaxed text-cabinet-text/50">
                  {p.content}
                </p>
              </button>
            );
          })}
        </div>
      </CabinetPanel>

      <WizardNav
        onBack={() => navigate("/solo/difficulty")}
        onNext={() => navigate("/solo/show")}
        nextLabel="▶ Start the Show"
        nextDisabled={!config.passageId}
      />
    </CabinetPage>
  );
}
