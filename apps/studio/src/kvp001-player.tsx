import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoryStageErrorBoundary } from "./AppErrorBoundary";
import { Kvp001PlayerEvidence } from "./Kvp001PlayerEvidence";
import "./styles.css";
import "./cv002-draft-review.css";
import "./kvp001-player.css";

const root = document.getElementById("root");
if (!root) throw new Error("KVP-001 Player evidence root is missing.");

createRoot(root).render(
  <StrictMode>
    <StoryStageErrorBoundary>
      <Kvp001PlayerEvidence />
    </StoryStageErrorBoundary>
  </StrictMode>,
);
