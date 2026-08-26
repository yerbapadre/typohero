import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { Mode } from "@typohero/engine";
import { navReducer, initialNav, type NavState, type Screen } from "./machine";

type NavApi = {
  state: NavState;
  chooseMode: (mode: Mode) => void;
  goto: (screen: Screen) => void;
  back: () => void;
  reset: () => void;
};

const NavCtx = createContext<NavApi | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navReducer, initialNav);
  const api: NavApi = {
    state,
    chooseMode: (mode) => dispatch({ type: "chooseMode", mode }),
    goto: (screen) => dispatch({ type: "goto", screen }),
    back: () => dispatch({ type: "back" }),
    reset: () => dispatch({ type: "reset" }),
  };
  return <NavCtx.Provider value={api}>{children}</NavCtx.Provider>;
}

export function useNav(): NavApi {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
