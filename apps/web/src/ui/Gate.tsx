import { useEffect, useState, type ReactNode } from "react";

type Status = "checking" | "out" | "in";

export function Gate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

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
    <div className="flex h-screen items-center justify-center bg-neutral-900 text-white">
      <form onSubmit={submit} className="flex flex-col items-center gap-4">
        <h1 className="font-mono text-2xl">Frog City</h1>
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
