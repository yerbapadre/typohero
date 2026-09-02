import { useState, type ReactNode } from "react";
import { CabinetPage } from "./CabinetPage";
import { CabinetButton, CabinetField, CabinetInput, CabinetPanel } from "./cabinet";

/** Name prompt shown when someone lands on a room link without a stored name. */
export function NameEntry({
  subtitle,
  cta,
  onSubmit,
  onBack,
}: {
  subtitle: ReactNode;
  cta: ReactNode;
  onSubmit: (name: string) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <CabinetPage
      subtitle={subtitle}
      title={
        <>
          WHO ARE <span className="text-cabinet-accent">YOU?</span>
        </>
      }
    >
      <CabinetPanel className="w-full max-w-md">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft) onSubmit(draft);
          }}
        >
          <CabinetField label="Your name">
            <CabinetInput
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="frog sinatra"
            />
          </CabinetField>
          <CabinetButton type="submit" variant="primary" full disabled={!draft}>
            {cta}
          </CabinetButton>
        </form>
      </CabinetPanel>

      <CabinetButton variant="ghost" onClick={onBack}>
        ← Back
      </CabinetButton>
    </CabinetPage>
  );
}
