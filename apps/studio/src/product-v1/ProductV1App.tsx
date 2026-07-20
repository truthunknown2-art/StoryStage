import { useState } from "react";
import type { CreateDraft } from "./CreateProject";
import { CreateProject } from "./CreateProject";
import { OLLO_DEMO_PROJECT } from "./demo-project";
import { ProjectsHome } from "./ProjectsHome";
import { StudioShell } from "./StudioShell";

type ProductScreen = "projects" | "create" | "studio" | "demo";

const INITIAL_DRAFT: CreateDraft = {
  script: "",
  grammar: "kids-adventure",
  artStyle: "storybook-cutout",
  narration: "guide-voice",
  format: "16:9",
  language: "english",
};

const projectNameFor = (script: string): string => {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "New project";
  const name = words.slice(0, 6).join(" ");
  return words.length > 6 ? `${name}…` : name;
};

/**
 * F1/F2 creator journey: Projects → Create → Studio shell, plus the
 * bounded long-form Ollo demo entering the same shell. Local UI state only
 * — production services stay disconnected and are labelled as such.
 */
export function ProductV1App({
  showDemoProject = true,
}: {
  showDemoProject?: boolean;
}) {
  const [screen, setScreen] = useState<ProductScreen>("projects");
  const [draft, setDraft] = useState<CreateDraft>(INITIAL_DRAFT);

  if (screen === "create")
    return (
      <CreateProject
        draft={draft}
        onBackToProjects={() => setScreen("projects")}
        onCreateFirstCut={() => setScreen("studio")}
        onDraftChange={setDraft}
      />
    );

  if (screen === "studio")
    return (
      <StudioShell
        onBackToProjects={() => setScreen("projects")}
        projectTitle={projectNameFor(draft.script)}
      />
    );

  if (screen === "demo")
    return (
      <StudioShell
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
