import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavProvider, useNav } from "./nav/NavContext";
import { ModeSelect } from "./screens/ModeSelect";
import { CharacterSettings } from "./screens/CharacterSettings";
import { SongSelection } from "./screens/SongSelection";
import { InstrumentSelect } from "./screens/InstrumentSelect";
import { DifficultySelect } from "./screens/DifficultySelect";
import { TextSelection } from "./screens/TextSelection";
import { PerformancePage } from "./screens/PerformancePage";
import { Results } from "./screens/Results";
import { BandEntry } from "./screens/Multiplayer";
import { Room } from "./screens/Multiplayer";
import { CrowdEntry, CrowdView } from "./screens/Crowd";
import { ThemePicker } from "./ui/ThemePicker";

function Guard({ ok, to, children }: { ok: boolean; to: string; children: React.ReactNode }) {
  if (!ok) return <Navigate to={to} replace />;
  return <>{children}</>;
}

function SoloRoutes() {
  const { config, result } = useNav();
  return (
    <Routes>
      <Route path="character" element={<CharacterSettings />} />
      <Route path="song" element={<SongSelection />} />
      <Route
        path="instrument"
        element={
          <Guard ok={!!config.songId} to="/solo/song">
            <InstrumentSelect />
          </Guard>
        }
      />
      <Route
        path="difficulty"
        element={
          <Guard ok={!!config.instrument} to="/solo/instrument">
            <DifficultySelect />
          </Guard>
        }
      />
      <Route
        path="text"
        element={
          <Guard ok={!!config.instrument} to="/solo/instrument">
            <TextSelection />
          </Guard>
        }
      />
      <Route
        path="show"
        element={
          <Guard ok={!!config.passageId} to="/solo/text">
            <PerformancePage />
          </Guard>
        }
      />
      <Route
        path="results"
        element={
          <Guard ok={!!result} to="/solo/character">
            <Results />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/solo/character" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ModeSelect />} />
      <Route path="/solo/*" element={<SoloRoutes />} />
      <Route path="/band" element={<BandEntry />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/crowd" element={<CrowdEntry />} />
      <Route path="/crowd/:code" element={<CrowdView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <NavProvider>
        <ThemePicker />
        <AppRoutes />
      </NavProvider>
    </BrowserRouter>
  );
}
