import { useState, type ReactNode } from "react";

const GATE_HASH = "7585798689e45d180eba380a0a5a2ddd995738335fbb80336932bc50b382a456";
const KEY = "th-gate";

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Gate({ children }: { children: ReactNode }) {
  const [passed, setPassed] = useState(() => sessionStorage.getItem(KEY) === "ok");
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  if (passed) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((await sha256(value)) === GATE_HASH) {
      sessionStorage.setItem(KEY, "ok");
      setPassed(true);
    } else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-900 text-white">
      <form onSubmit={submit} className="flex flex-col items-center gap-4">
        <h1 className="font-mono text-2xl">TypoHero</h1>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
          }}
          placeholder="password"
          className="rounded bg-neutral-800 px-4 py-2 text-center font-mono outline-none"
        />
        {wrong && <span className="font-mono text-sm text-red-400">nope</span>}
      </form>
    </div>
  );
}
