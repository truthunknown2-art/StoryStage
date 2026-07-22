import { useState } from "react";
import type { CreateDraft } from "./CreateProject";
import { CreateProject } from "./CreateProject";
import {
  CREATE_TEMPLATE_ART_LABEL,
  CREATE_TEMPLATE_GRAMMAR_LABEL,
} from "./create-proposal";
import { OLLO_DEMO_PROJECT } from "./demo-project";
import { ProjectsHome } from "./ProjectsHome";
import { StudioShell } from "./StudioShell";
import type { AiConnectionState } from "./ai-director-fixture";

type ProductScreen = "projects" | "create" | "studio" | "demo";

const INITIAL_DRAFT: CreateDraft = {
  path: "choice",
  script: "",
  idea: {
    storyIdea: "",
    targetDurationSeconds: 120,
    tone: "Gentle",
    cast: "",
    constraints: "",
  },
};

/**
 * F1/F2 creator journey: Projects → Create → Studio shell, plus the
 * bounded long-form Ollo demo entering the same shell. Local UI state only
 * — production services stay disconnected and are labelled as such.
 *
 * F3-WP4 adds the shared AI Director connection fixture state: one
 * session-local connection label drives the status chip in Create and
 * Studio, the idea-path Connect surface, and the docked Studio panel. It
 * is a deterministic local fixture — nothing contacts a real service.
 */
export function ProductV1App({
  showDemoProject = true,
}: {
  showDemoProject?: boolean;
}) {
  const [screen, setScreen] = useState<ProductScreen>("projects");
  const [draft, setDraft] = useState<CreateDraft>(INITIAL_DRAFT);
  const [createdTitle, setCreatedTitle] = useState("New project");
  const [aiConnection, setAiConnection] =
    useState<AiConnectionState>("signed-out");

  if (screen === "create")
    return (
      <CreateProject
        aiConnection={aiConnection}
        draft={draft}
        onAiConnectionChange={setAiConnection}
        onBackToProjects={() => setScreen("projects")}
        onDraftChange={setDraft}
        onEnterStudio={(proposal) => {
          setCreatedTitle(proposal.episodeTitle);
          setScreen("studio");
        }}
      />
    );

  if (screen === "studio")
    return (
      <StudioShell
        aiConnection={aiConnection}
        artStyleLabel={CREATE_TEMPLATE_ART_LABEL}
        grammarLabel={CREATE_TEMPLATE_GRAMMAR_LABEL}
        onAiConnectionChange={setAiConnection}
        onBackToProjects={() => setScreen("projects")}
        projectTitle={createdTitle}
        usesLayoutDemo
      />
    );

  if (screen === "demo")
    return (
      <StudioShell
        aiConnection={aiConnection}
        artStyleLabel={OLLO_DEMO_PROJECT.artStyle}
        grammarLabel={OLLO_DEMO_PROJECT.grammar}
        onAiConnectionChange={setAiConnection}
        onBackToProjects={() => setScreen("projects")}
        projectTitle={OLLO_DEMO_PROJECT.title}
      />
    );

  return (
    <ProjectsHome
      onNewProject={() => setScreen("create")}
      onOpenDemo={() => setScreen("demo")}
      showDemoProject={showDemoProject}
    />
  );
}
