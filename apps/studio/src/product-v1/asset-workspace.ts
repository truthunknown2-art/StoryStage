/**
 * F4-WP1 Assets & Rigs workspace — deterministic session-local fixture
 * information architecture.
 *
 * Everything in this module is a labelled local demo record: no image, file,
 * layer, rig, approval, provider, or production capability exists for any
 * item, and nothing here can create one. The records are grounded in the
 * accepted Ollo demo hierarchy (`demo-project.ts`) so the episode and scene
 * filters describe the same scope the Studio shell already shows.
 *
 * The readiness vocabulary below is deliberately small so later F4 packages
 * (scene requirements, image request/import, layer/rig review) can extend it.
 * It never uses words such as generated, imported, approved, ready, rigged,
 * production-ready, or available as a state claim; they appear only inside
 * `ASSET_READINESS_DISCLAIMER`, which explicitly says no artifact exists.
 */

import {
  OLLO_DEMO_PROJECT,
  OLLO_DEMO_SCENES,
  type DemoScene,
} from "./demo-project";

/** The one mandatory honesty label on every asset record. */
export const ASSET_FIXTURE_LABEL = "Local demo record — no artifact exists";

/** Shown wherever readiness vocabulary appears, so a readiness word can never
 * be read as a real artifact or capability claim. */
export const ASSET_READINESS_DISCLAIMER =
  "Readiness words describe these local demo records only — nothing is generated, imported, approved, rigged, or ready, and no image, file, layer, or rig exists.";

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const ASSET_CATEGORIES = [
  { id: "characters", label: "Characters" },
  { id: "locations", label: "Locations" },
  { id: "layered-sets", label: "Layered Sets" },
  { id: "props", label: "Props" },
  { id: "rigs", label: "Rigs" },
] as const;

export type AssetCategoryId = (typeof ASSET_CATEGORIES)[number]["id"];

export const assetCategoryLabel = (id: AssetCategoryId): string =>
  ASSET_CATEGORIES.find((category) => category.id === id)?.label ?? id;

/* ------------------------------------------------------------------ */
/* Readiness vocabulary (fixture truth, not artifact state)            */
/* ------------------------------------------------------------------ */

export type AssetReadiness = "record-only" | "described" | "needs-reference";

export const ASSET_READINESS_LABELS: Record<AssetReadiness, string> = {
  "record-only": "Record only",
  described: "Described",
  "needs-reference": "Needs reference",
};

export const ASSET_READINESS_NOTES: Record<AssetReadiness, string> = {
  "record-only":
    "Only a name and its scene scope are recorded. Nothing has been described, referenced, or prepared.",
  described:
    "A written description exists for this record. No reference image, file, or layer exists.",
  "needs-reference":
    "The next preparation step would attach a reference image, which this demo cannot do.",
};

/* ------------------------------------------------------------------ */
/* Episode fixtures grounded in the Ollo demo hierarchy                */
/* ------------------------------------------------------------------ */

export interface AssetEpisodeFixture {
  id: string;
  title: string;
  sceneIds: readonly string[];
}

export const ASSET_EPISODES: readonly AssetEpisodeFixture[] = [
  {
    id: "episode-1",
    title: `Episode 1 · ${OLLO_DEMO_PROJECT.title}`,
    sceneIds: OLLO_DEMO_SCENES.map((scene) => scene.id),
  },
];

/* ------------------------------------------------------------------ */
/* Episode/scene scope filters                                         */
/* ------------------------------------------------------------------ */

export const SCOPE_ALL = "all";

export interface AssetScope {
  episodeId: string;
  sceneId: string;
}

export const INITIAL_ASSET_SCOPE: AssetScope = {
  episodeId: SCOPE_ALL,
  sceneId: SCOPE_ALL,
};

/** Scene options for an episode scope, in accepted demo order. An unknown
 * episode yields no scenes; `all` yields every fixture episode's scenes. */
export const scenesForEpisodeScope = (
  episodeId: string,
  episodes: readonly AssetEpisodeFixture[] = ASSET_EPISODES,
): readonly DemoScene[] => {
  const wanted =
    episodeId === SCOPE_ALL
      ? new Set(episodes.flatMap((episode) => episode.sceneIds))
      : new Set(
          episodes.find((episode) => episode.id === episodeId)?.sceneIds ?? [],
        );
  return OLLO_DEMO_SCENES.filter((scene) => wanted.has(scene.id));
};

/** Fail-closed scope normalization: an unknown episode falls back to `all`,
 * and a scene that does not belong to the selected episode falls back to
 * `all`, so a filter combination can never be silently invalid. */
export const sanitizeAssetScope = (
  scope: AssetScope,
  episodes: readonly AssetEpisodeFixture[] = ASSET_EPISODES,
): AssetScope => {
  const episodeId =
    scope.episodeId !== SCOPE_ALL &&
    episodes.some((episode) => episode.id === scope.episodeId)
      ? scope.episodeId
      : SCOPE_ALL;
  const validScenes = scenesForEpisodeScope(episodeId, episodes);
  const sceneId =
    scope.sceneId !== SCOPE_ALL &&
    validScenes.some((scene) => scene.id === scope.sceneId)
      ? scope.sceneId
      : SCOPE_ALL;
  return { episodeId, sceneId };
};

/** Human-readable current scope, used by the list header and empty state. */
export const assetScopeFilterLabel = (
  scope: AssetScope,
  episodes: readonly AssetEpisodeFixture[] = ASSET_EPISODES,
): string => {
  const episodeLabel =
    scope.episodeId === SCOPE_ALL
      ? "All episodes"
      : (episodes.find((episode) => episode.id === scope.episodeId)?.title ??
        scope.episodeId);
  if (scope.sceneId === SCOPE_ALL) return `${episodeLabel} · All scenes`;
  const sceneIndex = OLLO_DEMO_SCENES.findIndex(
    (scene) => scene.id === scope.sceneId,
  );
  const scene = OLLO_DEMO_SCENES[sceneIndex];
  return scene
    ? `${episodeLabel} · Scene ${sceneIndex + 1} · ${scene.title}`
    : `${episodeLabel} · All scenes`;
};

/* ------------------------------------------------------------------ */
/* Asset fixtures                                                      */
/* ------------------------------------------------------------------ */

export interface AssetFixture {
  id: string;
  category: AssetCategoryId;
  name: string;
  episodeId: string;
  /** Scenes this record is scoped to, in any order. */
  sceneIds: readonly string[];
  /** What is known about the record. */
  summary: string;
  sourceTruth: string;
  approvalTruth: string;
  readiness: AssetReadiness;
  /** The one next honest preparation action. Always visibly unavailable in
   * this package — the control is disabled and explains why. */
  nextPreparation: {
    action: string;
    unavailableReason: string;
  };
}

const APPROVAL_TRUTH =
  "Not reviewed — this demo has no approval workflow, so nothing here is or can be approved.";

const REFERENCE_PREPARATION = {
  action: "Attach reference art",
  unavailableReason:
    "Unavailable — image import and generation do not exist in this demo. A later F4 package adds them.",
} as const;

export const ASSET_FIXTURES: readonly AssetFixture[] = [
  {
    id: "char-ollo",
    category: "characters",
    name: "Ollo",
    episodeId: "episode-1",
    sceneIds: OLLO_DEMO_SCENES.map((scene) => scene.id),
    summary:
      "Ollo, the small hero who carries the Storylight through the little wood.",
    sourceTruth:
      "Named in the local Ollo demo plan — no design, image, or model file exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "described",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "char-tix",
    category: "characters",
    name: "Tix",
    episodeId: "episode-1",
    sceneIds: ["scene-2", "scene-3", "scene-4"],
    summary: "Tix, Ollo's cautious friend who follows along the forest path.",
    sourceTruth:
      "Named in the local Ollo demo plan — no design, image, or model file exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "char-dot",
    category: "characters",
    name: "Dot",
    episodeId: "episode-1",
    sceneIds: ["scene-3", "scene-7"],
    summary: "Dot, a supporting friend who spots the dropped berry trail.",
    sourceTruth:
      "Named in the local Ollo demo plan — no design, image, or model file exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "loc-little-wood",
    category: "locations",
    name: "The Little Wood",
    episodeId: "episode-1",
    sceneIds: ["scene-1", "scene-2", "scene-3", "scene-4"],
    summary: "The everyday forest home of Act I.",
    sourceTruth:
      "Named in the local Ollo demo plan as a story location — no artwork or plate exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "described",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "loc-little-elsewhere",
    category: "locations",
    name: "The Little Elsewhere",
    episodeId: "episode-1",
    sceneIds: ["scene-5", "scene-6", "scene-7"],
    summary: "The folded, lantern-lit world of Act II.",
    sourceTruth:
      "Named in the local Ollo demo plan as a story location — no artwork or plate exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "set-home-nook",
    category: "layered-sets",
    name: "The Home Nook set",
    episodeId: "episode-1",
    sceneIds: ["scene-1", "scene-8"],
    summary:
      "Ollo's cozy den interior, planned as background, midground, and foreground planes.",
    sourceTruth:
      "Planned as a layered set in the local Ollo demo plan — no artwork has been sliced and no layer files exist.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: {
      action: "Slice artwork into layers",
      unavailableReason:
        "Unavailable — there is no artwork to slice and no slicing capability in this demo. A later F4 package adds layer review.",
    },
  },
  {
    id: "set-lantern-bridge",
    category: "layered-sets",
    name: "Lantern Bridge set",
    episodeId: "episode-1",
    sceneIds: ["scene-5"],
    summary:
      "The bridge whose lanterns wake one by one, planned as parallax layers.",
    sourceTruth:
      "Planned as a layered set in the local Ollo demo plan — no artwork has been sliced and no layer files exist.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: {
      action: "Slice artwork into layers",
      unavailableReason:
        "Unavailable — there is no artwork to slice and no slicing capability in this demo. A later F4 package adds layer review.",
    },
  },
  {
    id: "prop-storylight",
    category: "props",
    name: "The Storylight lantern",
    episodeId: "episode-1",
    sceneIds: ["scene-5", "scene-6", "scene-7", "scene-8"],
    summary: "The small guiding light at the heart of the story.",
    sourceTruth: "Named in the local Ollo demo plan — no prop artwork exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "needs-reference",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "prop-berry-trail",
    category: "props",
    name: "Dropped berry trail",
    episodeId: "episode-1",
    sceneIds: ["scene-3"],
    summary: "The trail of berries Dot notices in the Berry Patch.",
    sourceTruth: "Named in the local Ollo demo plan — no prop artwork exists.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: REFERENCE_PREPARATION,
  },
  {
    id: "rig-ollo",
    category: "rigs",
    name: "Ollo performance rig",
    episodeId: "episode-1",
    sceneIds: OLLO_DEMO_SCENES.map((scene) => scene.id),
    summary:
      "Placeholder for the rig Ollo would need for bounce, turn, and reach performances.",
    sourceTruth:
      "Placeholder for a future performance rig — no rig, skeleton, pivots, or markers exist.",
    approvalTruth: APPROVAL_TRUTH,
    readiness: "record-only",
    nextPreparation: {
      action: "Register rig markers",
      unavailableReason:
        "Unavailable — rigging does not exist in this demo. A later F4 package adds rig review.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Scope matching and deterministic selection                          */
/* ------------------------------------------------------------------ */

export const assetMatchesScope = (
  asset: AssetFixture,
  scope: AssetScope,
): boolean => {
  if (scope.episodeId !== SCOPE_ALL && asset.episodeId !== scope.episodeId)
    return false;
  if (scope.sceneId !== SCOPE_ALL && !asset.sceneIds.includes(scope.sceneId))
    return false;
  return true;
};

/** The visible record list for one category and scope, in fixture order. */
export const filterAssetFixtures = (
  category: AssetCategoryId,
  scope: AssetScope,
  assets: readonly AssetFixture[] = ASSET_FIXTURES,
): readonly AssetFixture[] =>
  assets.filter(
    (asset) => asset.category === category && assetMatchesScope(asset, scope),
  );

/** One deterministic selection rule: keep the selected record while it is
 * visible; otherwise fall to the first visible record, or to none. A filter
 * or category change can therefore never retain hidden stale detail. */
export const resolveAssetSelection = (
  visible: readonly AssetFixture[],
  selectedId: string | null,
): string | null => {
  if (selectedId && visible.some((asset) => asset.id === selectedId))
    return selectedId;
  return visible[0]?.id ?? null;
};

/** Display scope for one record: its episode plus either "episode-wide"
 * (when it spans every demo scene) or the explicit scene list. */
export const assetFixtureScopeLabel = (asset: AssetFixture): string => {
  const episode = ASSET_EPISODES.find((entry) => entry.id === asset.episodeId);
  const episodeTitle = episode?.title ?? asset.episodeId;
  const scenes = OLLO_DEMO_SCENES.filter((scene) =>
    asset.sceneIds.includes(scene.id),
  );
  if (asset.sceneIds.length === 0 || scenes.length === OLLO_DEMO_SCENES.length)
    return `${episodeTitle} · Episode-wide (every scene)`;
  const sceneLabels = scenes.map((scene) => {
    const index = OLLO_DEMO_SCENES.indexOf(scene);
    return `Scene ${index + 1} · ${scene.title}`;
  });
  return `${episodeTitle} · ${sceneLabels.join(", ")}`;
};
