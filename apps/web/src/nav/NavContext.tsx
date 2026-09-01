import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { RunSummary } from "@typohero/engine";
import { defaultConfig, type RunConfig } from "./machine";

type NavApi = {
  config: RunConfig;
  result: RunSummary | null;
  setConfig: (patch: Partial<RunConfig>) => void;
  finish: (result: RunSummary) => void;
  reset: () => void;
};

const NavCtx = createContext<NavApi | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [config, setConfigState] = useState<RunConfig>(defaultConfig);
  const [result, setResult] = useState<RunSummary | null>(null);

  const api: NavApi = {
    config,
    result,
    setConfig: (patch) => setConfigState((c) => ({ ...c, ...patch })),
    finish: (r) => {
      setResult(r);
      navigate("/solo/results");
    },
    reset: () => {
      setConfigState(defaultConfig);
      setResult(null);
      navigate("/");
    },
  };
  return <NavCtx.Provider value={api}>{children}</NavCtx.Provider>;
}

export function useNav(): NavApi {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
