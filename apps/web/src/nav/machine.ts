import type { Mode } from "@typohero/engine";

export type Screen =
  | "mode"
  | "band"
  | "waiting"
  | "character"
  | "song"
  | "text"
  | "performance";

export type NavState = {
  screen: Screen;
  mode: Mode | null;
  history: Screen[];
};

export type NavAction =
  | { type: "chooseMode"; mode: Mode }
  | { type: "goto"; screen: Screen }
  | { type: "back" }
  | { type: "reset" };

export const initialNav: NavState = { screen: "mode", mode: null, history: [] };

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "chooseMode": {
      const screen: Screen = action.mode === "single" ? "character" : "band";
      return { screen, mode: action.mode, history: [state.screen] };
    }
    case "goto":
      return { ...state, screen: action.screen, history: [...state.history, state.screen] };
    case "back": {
      const history = state.history.slice();
      const prev = history.pop();
      if (prev === undefined) return state;
      return { ...state, screen: prev, history };
    }
    case "reset":
      return initialNav;
  }
}
