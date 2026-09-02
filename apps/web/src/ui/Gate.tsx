import { useEffect, useState, type ReactNode } from "react";
import { frogFor } from "../theme/themes";
import { useTheme } from "../theme/useTheme";
import { CabinetButton, CabinetField, CabinetInput, CabinetPanel } from "./cabinet";

type Status = "checking" | "out" | "in";

export function Gate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    fetch("/api/gate", { credentials: "include" })
      .then((r) => setStatus(r.ok ? "in" : "out"))
      .catch(() => setStatus("out"));
  }, []);

  if (status === "checking") return null;
  if (status === "in") return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: value }),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("in");
    } else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cabinet-bg px-6 py-12 font-pixel text-cabinet-text">
      <img
        src={`/frogs/${frogFor(theme)}.png`}
        alt=""
        draggable={false}
        className="h-40 w-auto select-none object-contain md:h-52"
      />

      <h1 className="text-center leading-[1.3] tracking-wide">
        <span className="block text-2xl font-bold text-white md:text-4xl">FROG SINATRA</span>
        <span className="mt-2 block text-base font-bold text-cabinet-accent md:text-xl">&amp; THE TADPOLES</span>
      </h1>

      <CabinetPanel className="w-full max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <CabinetField label="Password">
            <CabinetInput
              autoFocus
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setWrong(false);
              }}
              placeholder="password"
            />
          </CabinetField>
          <CabinetButton type="submit" variant="primary" full disabled={!value}>
            Enter the Venue
          </CabinetButton>
          {wrong && (
            <div className="text-center text-[11px] uppercase tracking-widest text-red-400">nope</div>
          )}
        </form>
      </CabinetPanel>
    </div>
  );
}
