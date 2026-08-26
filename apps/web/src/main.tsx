import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Stage } from "./routes/Stage";
import { App } from "./App";
import { Gate } from "./ui/Gate";
import "./styles/index.css";

const isStage = window.location.pathname.startsWith("/stage");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Gate>{isStage ? <Stage /> : <App />}</Gate>
  </StrictMode>,
);
