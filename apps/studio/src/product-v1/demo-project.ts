/**
 * Bounded local Ollo demo project for the F1 Projects screen.
 *
 * Concise metadata only — a 20-minute episode shape so later phases can
 * exercise long-form information architecture. No script text, no imagery,
 * no production claims: every scene is labelled as not produced.
 */

export interface DemoScene {
  title: string;
  seconds: number;
}

export interface DemoProject {
  id: string;
  title: string;
  grammar: string;
  artStyle: string;
  durationLabel: string;
  status: string;
  scenes: DemoScene[];
}

export const OLLO_DEMO_PROJECT: DemoProject = {
  id: "ollo-storylight-demo",
  title: "The Storylight in the Little Wood",
  grammar: "Kids Adventure",
  artStyle: "Storybook Cutout",
  durationLabel: "~20 min episode",
  status: "Local UI demo",
  scenes: [
    { title: "The Home Nook", seconds: 150 },
    { title: "Forest Path", seconds: 160 },
    { title: "Berry Patch", seconds: 140 },
    { title: "Little Stream", seconds: 150 },
    { title: "Lantern Bridge", seconds: 170 },
    { title: "Folded Hills", seconds: 150 },
    { title: "Sunflower Field", seconds: 140 },
    { title: "Back Home", seconds: 140 },
  ],
};

export const LOCAL_DEMO_BANNER =
  "Local UI demo — production services are not connected.";
