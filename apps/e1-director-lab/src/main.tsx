import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { E1DirectorLabApp } from "./App";
import { liveProposalLabModel } from "./model";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <E1DirectorLabApp host={{ model: liveProposalLabModel }} />
  </StrictMode>,
);
