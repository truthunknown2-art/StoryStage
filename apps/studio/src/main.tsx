import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {App} from "./App";
import {StoryStageErrorBoundary} from "./AppErrorBoundary";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("StoryStage root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <StoryStageErrorBoundary><App /></StoryStageErrorBoundary>
  </StrictMode>,
);
