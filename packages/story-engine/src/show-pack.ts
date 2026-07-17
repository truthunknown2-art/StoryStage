import {hashCanonical} from "./canonical-hash";
import {
  assetManifestEntrySchema,
  showPackSchema,
  type AssetManifestEntry,
  type ProjectType,
  type ShowPack,
} from "./model";

const projectLicense = "StoryStage project-owned code fixture; replace through an approved asset-factory job";

const asset = (
  id: string,
  kind: AssetManifestEntry["kind"],
  displayName: string,
  tags: string[],
  palette: [string, string, string],
): AssetManifestEntry => {
  const metadata = {id, kind, version: "1.0.0", displayName, origin: "project-owned-code" as const, license: projectLicense, localAssetKey: id, tags, palette};
  return assetManifestEntrySchema.parse({...metadata, contentHash: hashCanonical(metadata), hashStatus: "verified-metadata"});
};

type ShowPackInput = Omit<ShowPack, "contentHash" | "hashStatus" | "styleBible"> & {
  styleBible: Omit<ShowPack["styleBible"], "contentHash"> & {principles: string[]};
};

function createShowPack(input: ShowPackInput): ShowPack {
  const {principles, ...styleIdentity} = input.styleBible;
  const styleBible = {...styleIdentity, contentHash: hashCanonical({...styleIdentity, principles})};
  const packWithoutHash = {...input, styleBible};
  return showPackSchema.parse({...packWithoutHash, contentHash: hashCanonical(packWithoutHash), hashStatus: "verified-metadata"});
}

export function rehashShowPack(pack: ShowPack): ShowPack {
  const content = Object.fromEntries(Object.entries(pack).filter(([key]) => key !== "contentHash" && key !== "hashStatus"));
  return showPackSchema.parse({...content, contentHash: hashCanonical(content), hashStatus: "verified-metadata"});
}

export function verifyShowPackHash(pack: ShowPack): boolean {
  return rehashShowPack(pack).contentHash === pack.contentHash;
}

export const kidsAdventureShowPack = createShowPack({
  schemaVersion: "1.2",
  id: "kids-adventure-v1",
  version: "1.0.0",
  displayName: "Kids Adventure",
  projectType: "kids",
  styleBible: {id: "kids-adventure-style-v1", version: "1.0.0", principles: ["Readable silhouettes", "Layered illustrated worlds", "Performance before graphics", "Original unbranded character design"]},
  profile: {
    id: "kids-adventure-director-v1",
    version: "1.1.0",
    projectType: "kids",
    visualMode: "kids-adventure",
    cadence: {targetCutsPerMinute: 18, minShotFrames: 81, maxShotFrames: 129, maxStaticFrames: 129},
    treatmentWeights: {environment: 0.16, characterPerformance: 0.38, reaction: 0.2, insert: 0.1, kineticType: 0.02, diagram: 0.02, licensedMedia: 0, generatedIllustration: 0.12},
    framingWeights: {wide: 0.3, medium: 0.4, closeUp: 0.2, insert: 0.1},
    cameraPolicy: {moves: [{type: "locked", weight: 0.35}, {type: "cameraPush", weight: 0.25}, {type: "pan", weight: 0.2}, {type: "reframe", weight: 0.2}]},
    transitionPolicy: {hardCut: 0.45, foregroundWipe: 0.25, cameraCarry: 0.25, briefDissolve: 0.05},
    performancePolicy: {gesturesPerMinute: 20, reactionsPerMinute: 12, poseChangesPerMinute: 24},
    textPolicy: {mode: "participation-cues", maximumWords: 18, targetEventsPerMinute: 5},
    accentColor: "#ffd83d",
    qualityRules: ["Keep silhouettes readable at thumbnail size.", "Change pose or expression at least every two seconds.", "Do not exceed the profile maximum static duration.", "Use foreground depth or a framing change before reusing a set plate."],
  },
  assetFactory: {
    providerClass: "chatgpt-images",
    exchangeMode: "manual-chatgpt-images",
    requiredCharacterOutputs: ["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"],
    requiredBackgroundOutputs: ["clean-plate", "depth-layers", "foreground-occluders"],
    approvalRequired: true,
  },
  assets: [
    asset("kids-rig-sun", "character-rig", "Adventure rig - Sun", ["character", "lead", "rig", "slot-a"], ["#ffcf3d", "#f05d4f", "#184f68"]),
    asset("kids-rig-moon", "character-rig", "Adventure rig - Moon", ["character", "support", "rig", "slot-b"], ["#f44ba0", "#112c49", "#4bc3af"]),
    asset("kids-set-grove", "location", "Layered discovery grove", ["location", "interior", "workshop", "grove", "depth-layers"], ["#173d36", "#2e8055", "#f4ce67"]),
    asset("kids-set-river", "location", "Layered river trail", ["location", "hallway", "river", "exterior", "depth-layers"], ["#124766", "#25b9c5", "#e7f4cf"]),
    asset("kids-prop-box", "prop", "Mystery box", ["prop", "box", "case", "brass"], ["#efba42", "#905b27", "#44271e"]),
    asset("kids-overlay-leaves", "overlay", "Foreground leaf pass", ["overlay", "foreground", "occluder", "leaves"], ["#0c312c", "#1d5946", "#3f9060"]),
    asset("kids-placeholder", "placeholder", "Unresolved asset marker", ["placeholder", "unknown"], ["#ffdc62", "#27232d", "#f05d4f"]),
  ],
  roleBindings: {narrationPresenterAssetId: null},
  allowedGestures: ["explain", "point", "lift", "shrug", "run", "listen", "celebrate", "none"],
  allowedFramings: ["wide", "medium", "close-up", "insert"],
});

export const weirdHistoryShowPack = createShowPack({
  schemaVersion: "1.2",
  id: "weird-history-editorial-v1",
  version: "1.0.0",
  displayName: "Frankly Weird History - Editorial",
  projectType: "explainer",
  styleBible: {id: "weird-history-style-v1", version: "1.0.0", principles: ["Fast editorial resets", "Source-aware evidence", "Labeled generated reconstruction", "Original presenter identity"]},
  profile: {
    id: "weird-history-director-v1",
    version: "1.1.0",
    projectType: "explainer",
    visualMode: "weird-history-editorial",
    cadence: {targetCutsPerMinute: 25, minShotFrames: 57, maxShotFrames: 90, maxStaticFrames: 90},
    treatmentWeights: {environment: 0.08, characterPerformance: 0.2, reaction: 0.1, insert: 0.2, kineticType: 0.16, diagram: 0.14, licensedMedia: 0.08, generatedIllustration: 0.04},
    framingWeights: {wide: 0.15, medium: 0.27, closeUp: 0.18, insert: 0.4},
    cameraPolicy: {moves: [{type: "locked", weight: 0.5}, {type: "cameraPush", weight: 0.2}, {type: "pan", weight: 0.1}, {type: "reframe", weight: 0.2}]},
    transitionPolicy: {hardCut: 0.82, foregroundWipe: 0.03, cameraCarry: 0.1, briefDissolve: 0.05},
    performancePolicy: {gesturesPerMinute: 7, reactionsPerMinute: 5, poseChangesPerMinute: 8},
    textPolicy: {mode: "editorial-keywords", maximumWords: 6, targetEventsPerMinute: 14},
    accentColor: "#f04438",
    qualityRules: ["Introduce a new visual idea at least every four seconds.", "Show one short readable text idea at a time.", "Use at least three visual treatments per thirty seconds.", "Require provenance for factual archival or stock media."],
  },
  assetFactory: {
    providerClass: "chatgpt-images",
    exchangeMode: "manual-chatgpt-images",
    requiredCharacterOutputs: ["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"],
    requiredBackgroundOutputs: ["clean-plate", "depth-layers", "foreground-occluders"],
    approvalRequired: true,
  },
  assets: [
    asset("history-rig-guide", "character-rig", "Editorial guide rig", ["character", "narrator", "presenter", "rig"], ["#f4f1e8", "#161a1d", "#f04438"]),
    asset("history-rig-witness", "character-rig", "Editorial witness rig", ["character", "support", "rig", "slot-b"], ["#e8efe9", "#161a1d", "#4da1a9"]),
    asset("history-set-paper", "location", "Editorial paper stage", ["location", "workshop", "interior", "neutral-stage"], ["#e9f0ed", "#cfd9d5", "#161a1d"]),
    asset("history-set-archive", "location", "Archive wall stage", ["location", "hallway", "archive", "exterior"], ["#c8b28b", "#66564a", "#ece3d3"]),
    asset("history-prop-box", "prop", "Evidence box", ["prop", "box", "case", "evidence"], ["#d39b4a", "#6c4122", "#f4f1e8"]),
    asset("history-graphic-type", "graphic", "Editorial type system", ["graphic", "kinetic-type", "diagram"], ["#e9f0ed", "#161a1d", "#f04438"]),
    asset("history-placeholder", "placeholder", "Unresolved source marker", ["placeholder", "unknown"], ["#ffd166", "#161a1d", "#f04438"]),
  ],
  roleBindings: {narrationPresenterAssetId: "history-rig-guide"},
  allowedGestures: ["explain", "point", "lift", "shrug", "listen", "none"],
  allowedFramings: ["wide", "medium", "close-up", "insert"],
});

export const showPacks = [kidsAdventureShowPack, weirdHistoryShowPack] as const;

export function getShowPack(id: string): ShowPack {
  const pack = showPacks.find((candidate) => candidate.id === id);
  if (!pack) throw new Error(`Unknown show pack: ${id}`);
  return pack;
}

export function getDefaultShowPack(projectType: ProjectType): ShowPack {
  return projectType === "kids" ? kidsAdventureShowPack : weirdHistoryShowPack;
}
