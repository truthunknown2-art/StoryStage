import {
  showPackSchema,
  type AssetManifestEntry,
  type ProjectType,
  type ShowPack,
} from "./model";

const projectLicense = "StoryStage project-owned code placeholder; replace through an approved asset-factory job";

const asset = (
  id: string,
  kind: AssetManifestEntry["kind"],
  displayName: string,
  contentHash: string,
  tags: string[],
  palette: [string, string, string],
): AssetManifestEntry => ({
  id,
  kind,
  version: "1.0.0",
  displayName,
  contentHash,
  origin: "project-owned-code",
  license: projectLicense,
  localAssetKey: id,
  tags,
  palette,
});

export const kidsAdventureShowPack: ShowPack = showPackSchema.parse({
  schemaVersion: "1.1",
  id: "kids-adventure-v1",
  version: "1.0.0",
  displayName: "Kids Adventure",
  contentHash: "e97a7ce23d6ed1d33759541c1d91423391d6b47a2bf3743750f195d96869aeee",
  projectType: "kids",
  profile: {
    id: "kids-adventure-director-v1",
    version: "1.0.0",
    projectType: "kids",
    visualMode: "kids-adventure",
    cadenceSeconds: [2.5, 5],
    maxStaticSeconds: 4,
    shotMix: {wide: 0.25, medium: 0.4, closeUp: 0.25, insert: 0.1, graphic: 0},
    cameraMoves: ["locked", "push", "pan", "track", "crash-in"],
    transitions: ["hard-cut", "foreground-wipe", "camera-carry"],
    textMode: "participation-cues",
    accentColor: "#ffd83d",
    qualityRules: [
      "Keep silhouettes readable at thumbnail size.",
      "Change pose or expression at least every two seconds.",
      "Do not hold a static talking tableau longer than four seconds.",
      "Use foreground depth or a framing change before reusing a set plate.",
    ],
  },
  assetFactory: {
    providerClass: "chatgpt-images",
    integrationStatus: "disabled",
    requiredCharacterOutputs: ["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"],
    requiredBackgroundOutputs: ["clean-plate", "depth-layers", "foreground-occluders"],
    approvalRequired: true,
  },
  assets: [
    asset("kids-rig-sun", "character-rig", "Adventure rig - Sun", "c22c16afef019cb857eb446c4ac393624a2974eab5c268c5375379557ded2b52", ["character", "lead", "rig", "slot-a"], ["#ffcf3d", "#f05d4f", "#184f68"]),
    asset("kids-rig-moon", "character-rig", "Adventure rig - Moon", "29c372ec97f27829354e6427233293dc67d1710a843e3e98116d2d4b200f0af7", ["character", "lead", "rig", "slot-b"], ["#f44ba0", "#112c49", "#4bc3af"]),
    asset("kids-set-grove", "location", "Layered discovery grove", "19fb3c9d70aaa572940aca255c38a585f68fcbb301106ba1bb2a28edaabaabd7", ["location", "interior", "workshop", "grove", "depth-layers"], ["#173d36", "#2e8055", "#f4ce67"]),
    asset("kids-set-river", "location", "Layered river trail", "656f6b01aa504de4dd8876b2478f16c9ff0cae655cea911446fe45ded4eebb84", ["location", "hallway", "river", "exterior", "depth-layers"], ["#124766", "#25b9c5", "#e7f4cf"]),
    asset("kids-prop-box", "prop", "Mystery box", "44906c120cf0aba1687e22b85f03d9d0ef4a66bdd7832da927d8f359dc532224", ["prop", "box", "case", "brass"], ["#efba42", "#905b27", "#44271e"]),
    asset("kids-overlay-leaves", "overlay", "Foreground leaf pass", "787a500a761395a812c7d565ff3b072cc35a306d267e815a3fe723743028516a", ["overlay", "foreground", "occluder", "leaves"], ["#0c312c", "#1d5946", "#3f9060"]),
    asset("kids-placeholder", "placeholder", "Unresolved asset marker", "d185044276c3e048586c51b26c80823ebda277042c952e28f133bd59110a99ff", ["placeholder", "unknown"], ["#ffdc62", "#27232d", "#f05d4f"]),
  ],
  allowedGestures: ["explain", "point", "lift", "shrug", "run", "listen", "celebrate", "none"],
  allowedFramings: ["wide", "medium", "close-up", "insert"],
});

export const weirdHistoryShowPack: ShowPack = showPackSchema.parse({
  schemaVersion: "1.1",
  id: "weird-history-editorial-v1",
  version: "1.0.0",
  displayName: "Frankly Weird History - Editorial",
  contentHash: "8dd09d8a218652b71ac7370f89fc4303716121db754492188c2216cff008d0bb",
  projectType: "explainer",
  profile: {
    id: "weird-history-director-v1",
    version: "1.0.0",
    projectType: "explainer",
    visualMode: "weird-history-editorial",
    cadenceSeconds: [1.2, 3],
    maxStaticSeconds: 4,
    shotMix: {wide: 0.15, medium: 0.25, closeUp: 0.2, insert: 0.2, graphic: 0.2},
    cameraMoves: ["locked", "push", "pan", "crash-in"],
    transitions: ["hard-cut", "camera-carry", "brief-dissolve"],
    textMode: "editorial-keywords",
    accentColor: "#f04438",
    qualityRules: [
      "Introduce a new visual idea at least every four seconds.",
      "Show one short readable text idea at a time.",
      "Use at least three visual treatments per thirty seconds.",
      "Require provenance for factual archival or stock media.",
    ],
  },
  assetFactory: {
    providerClass: "chatgpt-images",
    integrationStatus: "disabled",
    requiredCharacterOutputs: ["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"],
    requiredBackgroundOutputs: ["clean-plate", "depth-layers", "foreground-occluders"],
    approvalRequired: true,
  },
  assets: [
    asset("history-rig-guide", "character-rig", "Editorial guide rig", "0f25ab9b38ffc7356e727d699ea4ba0dc590c0fe1a64eb52bec0355e9c60de99", ["character", "narrator", "rig", "slot-a"], ["#f4f1e8", "#161a1d", "#f04438"]),
    asset("history-rig-witness", "character-rig", "Editorial witness rig", "7ae7e0a8eef3bfafba1abf0b7271a43d968dc61f245d6b9f73ffd7897d08d696", ["character", "support", "rig", "slot-b"], ["#e8efe9", "#161a1d", "#4da1a9"]),
    asset("history-set-paper", "location", "Editorial paper stage", "1e65d655f38e7c5692bfc9732d595c09a17a006ad614c4f2a0586181bbd3e546", ["location", "workshop", "interior", "neutral-stage"], ["#e9f0ed", "#cfd9d5", "#161a1d"]),
    asset("history-set-archive", "location", "Archive wall stage", "a3c2e68adfd86b011b094c9d93671f8ab1b5862e122408299cd083e53685629f", ["location", "hallway", "archive", "exterior"], ["#c8b28b", "#66564a", "#ece3d3"]),
    asset("history-prop-box", "prop", "Evidence box", "fd4ab0ddec3715314efa006b48bc97a150381fad287e4ad87ce80c3b8acbf312", ["prop", "box", "case", "evidence"], ["#d39b4a", "#6c4122", "#f4f1e8"]),
    asset("history-graphic-type", "graphic", "Editorial type system", "9c6a38391a31a0689c78d94be2ae0348a0c8eaddcee6c6e2004ce71eb924ca0b", ["graphic", "kinetic-type", "diagram"], ["#e9f0ed", "#161a1d", "#f04438"]),
    asset("history-placeholder", "placeholder", "Unresolved source marker", "225bfadfb6f931e6afa9a3b83e73b5bc34a8146855770dcca969d83ebcc527bd", ["placeholder", "unknown"], ["#ffd166", "#161a1d", "#f04438"]),
  ],
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
