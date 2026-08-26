import { NavProvider, useNav } from "./nav/NavContext";
import { ModeSelect } from "./screens/ModeSelect";
import { CharacterSettings } from "./screens/CharacterSettings";
import { SongSelection } from "./screens/SongSelection";
import { TextSelection } from "./screens/TextSelection";
import { PerformancePage } from "./screens/PerformancePage";
import { Multiplayer } from "./screens/Multiplayer";

function ScreenRouter() {
  const { state } = useNav();
  if (state.screen === "mode") return <ModeSelect />;
  if (state.mode === "multi") return <Multiplayer />;

  switch (state.screen) {
    case "character":
      return <CharacterSettings />;
    case "song":
      return <SongSelection />;
    case "text":
      return <TextSelection />;
    case "performance":
      return <PerformancePage />;
    default:
      return <ModeSelect />;
  }
}

export function App() {
  return (
    <NavProvider>
      <ScreenRouter />
    </NavProvider>
  );
}
