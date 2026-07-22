/**
 * F4-WP3 deterministic scene-scoped image request packs — creator-readable
 * request instructions built from the accepted F4-WP2 requirement fixtures.
 *
 * A request pack is a planning document only. Its prompt is text the creator
 * may manually select and copy; its reference attachments are names and
 * descriptive local demo records, never attached files or content-addressed
 * artifacts; its expected views and layers are request instructions for the
 * creator's own image tool, never verified asset structure. Nothing here
 * copies text, opens a site, generates or downloads an image, reads or writes
 * bytes, or proves any artifact exists.
 */

import { OLLO_DEMO_SCENES } from "./demo-project";
import { assetCategoryLabel, type AssetCategoryId } from "./asset-workspace";
import {
  requirementSceneLabel,
  type ResolvedSceneRequirement,
} from "./asset-requirements";

/** The one honesty line carried by every request pack: the pack is a
 * planning document and no artifact of any kind exists for it. */
export const REQUEST_PACK_TRUTH =
  "This request pack is a planning document only — no image, file, reference attachment, or layer exists, and nothing here generates, downloads, copies, or imports one.";

/** Shown next to the reference inventory so a labelled reference row can
 * never be read as an attached file. */
export const REFERENCE_TRUTH =
  "References are names and descriptive local demo records only — no reference file, bytes, or content-addressed artifact exists or is attached.";

/** Shown next to expected views/layers so request instructions can never be
 * read as verified structure. */
export const EXPECTED_STRUCTURE_TRUTH =
  "Expected views and layers are request instructions for your own image tool — they are not verified structure, and no image or layer exists to inspect.";

/** Shown next to the manual workflow guidance. No capability is claimed:
 * the demo cannot copy text, open a tool, generate, or download. */
export const MANUAL_WORKFLOW_TRUTH =
  "Manual workflow only — this demo does not copy text to your clipboard, open any site or tool, generate any image, or download any file. Those steps happen entirely outside StoryStage, in tools you choose.";

/* ------------------------------------------------------------------ */
/* Request pack model                                                  */
/* ------------------------------------------------------------------ */

export interface RequestPackReference {
  id: string;
  /** The labelled reference name. */
  label: string;
  /** The descriptive local demo record behind the label. */
  description: string;
}

export interface RequestPack {
  requirementId: string;
  sceneId: string;
  sceneLabel: string;
  category: AssetCategoryId;
  categoryLabel: string;
  plannedName: string;
  /** The current F4-WP2 blocker, kept visible beside the pack. */
  blocker: string;
  /** Creator-readable prompt text for manual selection and copying. */
  prompt: string;
  references: readonly RequestPackReference[];
  expectedViews: readonly string[];
  expectedLayers: readonly string[];
  intendedUse: string;
  truthNote: string;
}

interface CategoryRequestShape {
  singular: string;
  views: readonly string[];
  layers: readonly string[];
}

const CATEGORY_REQUEST_SHAPES: Record<AssetCategoryId, CategoryRequestShape> = {
  characters: {
    singular: "character",
    views: ["Front view", "Three-quarter view", "Side view"],
    layers: [
      "Full character on one transparent plane",
      "Separate face plane for expressions (requested, not verified)",
    ],
  },
  locations: {
    singular: "location",
    views: ["Wide establishing view", "Mid view"],
    layers: ["Single background plate"],
  },
  "layered-sets": {
    singular: "layered set",
    views: ["Full set, straight-on"],
    layers: ["Background plane", "Midground plane", "Foreground plane"],
  },
  props: {
    singular: "prop",
    views: ["Front view", "Detail close-up"],
    layers: ["Prop on one transparent plane"],
  },
  rigs: {
    singular: "rig reference",
    views: ["Neutral front pose", "Neutral side pose"],
    layers: ["Full character on one transparent plane"],
  },
};

const buildPrompt = (
  shape: CategoryRequestShape,
  plannedName: string,
  sceneTitle: string,
  summary: string,
  views: readonly string[],
): string =>
  [
    `A quiet, hand-painted limited-animation ${shape.singular} image of "${plannedName}" for the scene "${sceneTitle}".`,
    `Context: ${summary}`,
    `Show these views: ${views.join(", ")}.`,
    "Soft storybook light, calm composition, flat or transparent background as listed, no text or watermark.",
  ].join(" ");

/** Build the deterministic request pack for one resolved requirement, failing
 * closed: unavailable entries, ready entries, and unknown scenes have no
 * request path and yield null. The same requirement always yields the same
 * pack — no randomness, time, or external input. */
export const buildRequestPack = (
  item: ResolvedSceneRequirement,
): RequestPack | null => {
  const { entry } = item;
  if (item.unavailableReason !== null) return null;
  if (entry.readiness === "ready") return null;
  if (entry.blocker === null) return null;
  const scene = OLLO_DEMO_SCENES.find(
    (candidate) => candidate.id === entry.sceneId,
  );
  if (!scene) return null;
  const shape = CATEGORY_REQUEST_SHAPES[entry.category];
  const sceneLabel = requirementSceneLabel(entry.sceneId);
  const summary = item.asset?.summary ?? entry.blocker;

  const references: RequestPackReference[] = [
    {
      id: `ref-${entry.id}-record`,
      label: `${entry.plannedName} — local planning record`,
      description:
        item.asset !== null
          ? `${item.asset.summary} (${item.asset.sourceTruth})`
          : `No local record exists yet — only this planned need is recorded. ${entry.blocker}`,
    },
    {
      id: `ref-${entry.id}-scene`,
      label: `${sceneLabel} — bounded demo scene`,
      description: `Scene ${OLLO_DEMO_SCENES.indexOf(scene) + 1} of the bounded Ollo demo plan (${scene.seconds}s, ${scene.beats.length} beats). The image must serve this scene's moment, not a generic standalone picture.`,
    },
  ];
  if (item.reusable && item.asset !== null) {
    const otherScenes = OLLO_DEMO_SCENES.filter(
      (candidate) =>
        item.asset!.sceneIds.includes(candidate.id) &&
        candidate.id !== entry.sceneId,
    ).map((candidate) => {
      const index = OLLO_DEMO_SCENES.indexOf(candidate);
      return `Scene ${index + 1} · ${candidate.title}`;
    });
    references.push({
      id: `ref-${entry.id}-reuse`,
      label: "Shared record note",
      description: `The same local record is also referenced by ${otherScenes.join(", ")}. One shared image request should stay consistent with every listed scene.`,
    });
  }

  return {
    requirementId: entry.id,
    sceneId: entry.sceneId,
    sceneLabel,
    category: entry.category,
    categoryLabel: assetCategoryLabel(entry.category),
    plannedName: entry.plannedName,
    blocker: entry.blocker,
    prompt: buildPrompt(
      shape,
      entry.plannedName,
      scene.title,
      summary,
      shape.views,
    ),
    references,
    expectedViews: shape.views,
    expectedLayers: shape.layers,
    intendedUse: `Reference artwork for the ${assetCategoryLabel(entry.category)} requirement "${entry.plannedName}" in ${sceneLabel} — input to a later local layer/rig review only. Requesting it does not approve, prepare, rig, or productionize anything.`,
    truthNote: REQUEST_PACK_TRUTH,
  };
};
