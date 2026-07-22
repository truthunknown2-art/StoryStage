/**
 * F3-WP4 New Project proposal model — deterministic local fixture
 * screenplay/hierarchy proposals for the two entry paths (**Paste a
 * script** and **What's your idea?**).
 *
 * Both builders are pure and deterministic: the same input always
 * produces the same proposal, no AI service is contacted, and no
 * project, screenplay file, asset, media, render, or export is created.
 * Both paths converge on this one `CreateProposal` model and the same
 * review component before the local demo may enter Studio.
 */

import {
  countWords,
  estimateDurationSeconds,
  formatDuration,
  previewBeats,
} from "./beat-preview";

/** The single private-launch template. No grammar or art-style choice is
 * offered, and Weird History is not shown. */
export const CREATE_TEMPLATE_LABEL = "Ollo & Friends — Kids Story";
export const CREATE_TEMPLATE_GRAMMAR_LABEL = "Kids Adventure";
export const CREATE_TEMPLATE_ART_LABEL = "Storybook Cutout";

export const IDEA_DURATION_OPTIONS = [
  { seconds: 60, label: "About 1 minute" },
  { seconds: 120, label: "About 2 minutes" },
  { seconds: 300, label: "About 5 minutes" },
] as const;

export const IDEA_TONE_OPTIONS = [
  "Gentle",
  "Playful",
  "Curious",
  "Cozy",
] as const;
export type IdeaTone = (typeof IDEA_TONE_OPTIONS)[number];

export interface IdeaDraft {
  storyIdea: string;
  targetDurationSeconds: number;
  tone: IdeaTone;
  cast: string;
  constraints: string;
}

export interface CreateProposalBeat {
  title: string;
  seconds: number;
  direction: string;
}

export interface CreateProposalScene {
  title: string;
  seconds: number;
  direction: string;
  beats: CreateProposalBeat[];
}

/** The shared pre-project proposal both entry paths review. */
export interface CreateProposal {
  source: "paste" | "idea";
  templateLabel: string;
  episodeTitle: string;
  estimatedSeconds: number;
  scenes: CreateProposalScene[];
  /** Beats detected but not listed individually in the review. */
  hiddenBeatCount: number;
  affectedRangeLabel: string;
  assetImpactLabel: string;
  directionSummary: string;
}

const MAX_REVIEW_SCENES = 3;
const MAX_BEATS_PER_SCENE = 2;

const titleFrom = (text: string): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled Kids Story";
  const title = words.slice(0, 6).join(" ");
  return words.length > 6 ? `${title}…` : title;
};

/** Honest asset impact for every fixture proposal: nothing exists but
 * planning metadata. */
const ASSET_IMPACT_LABEL =
  "No assets, media, or project files are created — this proposal is planning metadata only.";

const PASTE_SCENE_DIRECTIONS = [
  "Set the action clearly, then let the reaction land (fixture planning direction).",
  "Keep the camera calm and let the characters carry the moment (fixture planning direction).",
  "Build gently toward the next scene's hook (fixture planning direction).",
] as const;

/** Deterministic local screenplay/hierarchy proposal from a pasted
 * script. Returns `null` for an empty script — the caller validates
 * before review so the review can never be bypassed or empty. */
export const buildPasteProposal = (script: string): CreateProposal | null => {
  const words = countWords(script);
  if (words === 0) return null;
  const beats = previewBeats(script).beats;
  const shownBeats = beats.slice(0, MAX_REVIEW_SCENES * MAX_BEATS_PER_SCENE);
  const scenes: CreateProposalScene[] = [];
  for (let index = 0; index < MAX_REVIEW_SCENES; index += 1) {
    const sceneBeats = shownBeats.slice(
      index * MAX_BEATS_PER_SCENE,
      (index + 1) * MAX_BEATS_PER_SCENE,
    );
    if (sceneBeats.length === 0) break;
    const beatModels: CreateProposalBeat[] = sceneBeats.map((beat) => ({
      title: beat.trim(),
      seconds: estimateDurationSeconds(countWords(beat)),
      direction:
        "Play the beat as written; hold the final reaction (fixture planning direction).",
    }));
    scenes.push({
      title: `Scene ${index + 1}`,
      seconds: beatModels.reduce((sum, beat) => sum + beat.seconds, 0),
      direction: PASTE_SCENE_DIRECTIONS[index]!,
      beats: beatModels,
    });
  }
  const estimatedSeconds = estimateDurationSeconds(words);
  return {
    source: "paste",
    templateLabel: CREATE_TEMPLATE_LABEL,
    episodeTitle: titleFrom(script),
    estimatedSeconds,
    scenes,
    hiddenBeatCount: beats.length - shownBeats.length,
    affectedRangeLabel: `Whole episode · ${formatDuration(estimatedSeconds)} (fixture estimate)`,
    assetImpactLabel: ASSET_IMPACT_LABEL,
    directionSummary:
      "One gentle pass per scene: set the action, then land the reaction (fixture planning direction).",
  };
};

const IDEA_SCENE_BEATS: ReadonlyArray<{
  sceneTitle: string;
  beatTitle: (idea: IdeaDraft, castLabel: string) => string;
  direction: (idea: IdeaDraft) => string;
}> = [
  {
    sceneTitle: "Opening",
    beatTitle: (idea, castLabel) =>
      `${castLabel} in an ordinary moment before “${titleFrom(idea.storyIdea)}” begins`,
    direction: (idea) =>
      `Open ${idea.tone.toLowerCase()} and unhurried; let the world introduce itself (fixture planning direction).`,
  },
  {
    sceneTitle: "Middle",
    beatTitle: () => "The idea turns into a small adventure",
    direction: (idea) =>
      `Keep the energy ${idea.tone.toLowerCase()}; one clear action per beat (fixture planning direction).`,
  },
  {
    sceneTitle: "Resolution",
    beatTitle: () => "A warm landing back home",
    direction: () =>
      "Slow down and let the final reaction hold (fixture planning direction).",
  },
];

/** Deterministic local hierarchy proposal from the AI Director
 * conversation form. Returns `null` for an empty story idea. */
export const buildIdeaProposal = (idea: IdeaDraft): CreateProposal | null => {
  if (idea.storyIdea.trim().length === 0) return null;
  const castLabel =
    idea.cast.trim().length > 0 ? idea.cast.trim() : "Ollo & friends";
  const sceneSeconds = Math.max(
    5,
    Math.round(idea.targetDurationSeconds / IDEA_SCENE_BEATS.length),
  );
  const scenes: CreateProposalScene[] = IDEA_SCENE_BEATS.map(
    (template, index) => ({
      title: `Scene ${index + 1} · ${template.sceneTitle}`,
      seconds: sceneSeconds,
      direction: template.direction(idea),
      beats: [
        {
          title: template.beatTitle(idea, castLabel),
          seconds: sceneSeconds,
          direction: template.direction(idea),
        },
      ],
    }),
  );
  const constraintsNote =
    idea.constraints.trim().length > 0
      ? ` Constraints honored: ${idea.constraints.trim()}.`
      : "";
  return {
    source: "idea",
    templateLabel: CREATE_TEMPLATE_LABEL,
    episodeTitle: titleFrom(idea.storyIdea),
    estimatedSeconds: idea.targetDurationSeconds,
    scenes,
    hiddenBeatCount: 0,
    affectedRangeLabel: `Whole episode · ${formatDuration(idea.targetDurationSeconds)} (fixture target)`,
    assetImpactLabel: ASSET_IMPACT_LABEL,
    directionSummary:
      `A ${idea.tone.toLowerCase()} three-scene Kids Story for ${castLabel}.${constraintsNote}`.trim(),
  };
};
