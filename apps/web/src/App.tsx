import { NavProvider, useNav } from "./nav/NavContext";
import { ModeSelect } from "./screens/ModeSelect";
import { BandSelect } from "./screens/BandSelect";
import { WaitingRoom } from "./screens/WaitingRoom";
import { CharacterSettings } from "./screens/CharacterSettings";
import { SongSelection } from "./screens/SongSelection";
import { TextSelection } from "./screens/TextSelection";
import { PerformancePage } from "./screens/PerformancePage";

function ScreenRouter() {
  const { state } = useNav();
  switch (state.screen) {
    case "mode":
      return <ModeSelect />;
    case "band":
      return <BandSelect />;
    case "waiting":
      return <WaitingRoom />;
    case "character":
      return <CharacterSettings />;
    case "song":
      return <SongSelection />;
    case "text":
      return <TextSelection />;
    case "performance":
      return <PerformancePage />;
  }
}

export function App() {
  return (
    <NavProvider>
      <ScreenRouter />
    </NavProvider>
  );
}
