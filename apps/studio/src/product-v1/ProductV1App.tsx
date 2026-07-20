import { useState } from "react";
import type { CreateDraft } from "./CreateProject";
import { CreateProject } from "./CreateProject";
import { LocalStudioHandoff } from "./LocalStudioHandoff";
import { LongFormDemo } from "./LongFormDemo";
import { ProjectsHome } from "./ProjectsHome";

type ProductScreen = "projects" | "create" | "handoff" | "demo";

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
 * F1 creator journey: Projects → Create → honest local Studio handoff,
 * plus the bounded long-form Ollo demo. Local UI state only — production
 * services stay disconnected and are labelled as such.
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
        onCreateFirstCut={() => setScreen("handoff")}
        onDraftChange={setDraft}
      />
    );

  if (screen === "handoff")
    return (
      <LocalStudioHandoff
        draft={draft}
        onBackToProjects={() => setScreen("projects")}
        onEditScript={() => setScreen("create")}
        projectName={projectNameFor(draft.script)}
      />
    );

  if (screen === "demo")
    return <LongFormDemo onBackToProjects={() => setScreen("projects")} />;

  return (
    <ProjectsHome
      onNewProject={() => setScreen("create")}
      onOpenDemo={() => setScreen("demo")}
      showDemoProject={showDemoProject}
    />
  );
}
