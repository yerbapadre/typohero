import type { Character, Difficulty, InstrumentLane, Mode } from "@typohero/engine";

export type Screen =
  | "mode"
  | "band"
  | "waiting"
  | "character"
  | "song"
  | "text"
  | "performance"
  | "results";

export type RunConfig = {
  character: Character | null;
  instrument: InstrumentLane | null;
  songId: string | null;
  passageId: string | null;
  difficulty: Difficulty;
};

export const defaultConfig: RunConfig = {
  character: null,
  instrument: null,
  songId: null,
  passageId: null,
  difficulty: "medium",
};

export type NavState = {
  screen: Screen;
  mode: Mode | null;
  config: RunConfig;
  history: Screen[];
};

export type NavAction =
  | { type: "chooseMode"; mode: Mode }
  | { type: "goto"; screen: Screen }
  | { type: "setConfig"; patch: Partial<RunConfig> }
  | { type: "back" }
  | { type: "reset" };

export const initialNav: NavState = {
  screen: "mode",
  mode: null,
  config: defaultConfig,
  history: [],
};

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "chooseMode": {
      const screen: Screen = action.mode === "single" ? "character" : "band";
      return { screen, mode: action.mode, config: defaultConfig, history: [state.screen] };
    }
    case "goto":
      return { ...state, screen: action.screen, history: [...state.history, state.screen] };
    case "setConfig":
      return { ...state, config: { ...state.config, ...action.patch } };
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
