import { useState } from "react";
import { redeemCode } from "../game/unlocks";
import type { Frog } from "../characters";
import { CabinetButton } from "./cabinet";

/** Code-entry row for a locked premium frog. Shared by the solo picker and the lobby. */
export function UnlockForm({
  frogName,
  onUnlocked,
}: {
  frogName: string;
  onUnlocked: (frog: Frog) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await redeemCode(code);
    setBusy(false);
    if (res.ok) {
      setCode("");
      onUnlocked(res.frog);
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-widest text-cabinet-text/40">
        {frogName} is locked — enter an unlock code
      </div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="unlock code"
          aria-label={`unlock code for ${frogName}`}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 border-2 border-cabinet-border bg-black/30 px-3 py-2 font-mono text-xs uppercase tracking-widest text-cabinet-text outline-none placeholder:text-cabinet-text/25 focus:border-cabinet-accent"
        />
        <CabinetButton type="submit" variant="primary" size="sm" disabled={busy || !code.trim()}>
          {busy ? "…" : "Unlock"}
        </CabinetButton>
      </div>
      {error && <div className="font-mono text-[11px] normal-case text-red-400">{error}</div>}
    </form>
  );
}
