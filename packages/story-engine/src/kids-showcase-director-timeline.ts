import {
  createDirectorTimeline,
  type DirectorTimeline,
} from "./director-timeline";

export const KIDS_SHOWCASE_DIRECTED_SHOTS = [
  { id: "shot-run-to-the-ruin", startFrame: 0, durationInFrames: 120 },
  { id: "shot-listen-in-the-dark", startFrame: 120, durationInFrames: 90 },
  { id: "shot-sneak-entrance", startFrame: 210, durationInFrames: 132 },
  { id: "shot-creature-reveal", startFrame: 342, durationInFrames: 72 },
  { id: "shot-eye-close-up", startFrame: 414, durationInFrames: 48 },
  { id: "shot-kids-reaction", startFrame: 462, durationInFrames: 72 },
  { id: "shot-spark-sneeze", startFrame: 534, durationInFrames: 120 },
  { id: "shot-escape-run", startFrame: 654, durationInFrames: 120 },
  { id: "shot-friendly-offer", startFrame: 774, durationInFrames: 72 },
  { id: "shot-understand-and-play", startFrame: 846, durationInFrames: 54 },
] as const;

type Motion =
  | "idle"
  | "decelerating"
  | "walking"
  | "sneaking"
  | "running"
  | "turning"
  | "reacting"
  | "performing";

const state = (
  entityId: string,
  stageX: number,
  apparentScale: number,
  motion: Motion,
  options: {
    owner?: string | null;
    gait?: number | null;
    facing?: "left" | "right" | "camera" | "away";
    gaze?: string | null;
    visible?: boolean;
    stageY?: number;
  } = {},
) => ({
  entityId,
  visible: options.visible ?? true,
  stageX,
  stageY: options.stageY ?? 0.84,
  apparentScale,
  facing: options.facing ?? "right",
  motion,
  gaitPhase: options.gait ?? null,
  gazeTargetId: options.gaze ?? null,
  attachmentOwnerId: options.owner ?? null,
});

const forestLayers = [
  {
    layerId: "forest-background",
    role: "background" as const,
    depth: 0,
    assetRequirementId: "moonlit-forest-background",
    animated: false,
  },
  {
    layerId: "forest-performers",
    role: "character" as const,
    depth: 20,
    assetRequirementId: "mara-milo-rigs",
    animated: true,
  },
  {
    layerId: "forest-foreground",
    role: "foreground-occluder" as const,
    depth: 40,
    assetRequirementId: "moonlit-forest-foreground",
    animated: true,
  },
];

const hallLayers = [
  {
    layerId: "hall-background",
    role: "background" as const,
    depth: 0,
    assetRequirementId: "moon-hall-background",
    animated: false,
  },
  {
    layerId: "hall-performers",
    role: "character" as const,
    depth: 20,
    assetRequirementId: "moon-hall-character-rigs",
    animated: true,
  },
  {
    layerId: "hall-moth",
    role: "prop" as const,
    depth: 25,
    assetRequirementId: "silver-moth-prop",
    animated: true,
  },
  {
    layerId: "hall-foreground",
    role: "foreground-occluder" as const,
    depth: 40,
    assetRequirementId: "moon-hall-foreground",
    animated: true,
  },
];

const clearingLayers = [
  {
    layerId: "clearing-background",
    role: "background" as const,
    depth: 0,
    assetRequirementId: "dawn-clearing-background",
    animated: false,
  },
  {
    layerId: "clearing-performers",
    role: "character" as const,
    depth: 20,
    assetRequirementId: "payoff-puppet-rigs",
    animated: true,
  },
  {
    layerId: "clearing-moth",
    role: "prop" as const,
    depth: 25,
    assetRequirementId: "silver-moth-prop",
    animated: true,
  },
  {
    layerId: "clearing-foreground",
    role: "foreground-occluder" as const,
    depth: 40,
    assetRequirementId: "dawn-clearing-foreground",
    animated: true,
  },
];

export function createKidsShowcaseDirectorTimeline(
  sourceContentHash: string,
): DirectorTimeline {
  return createDirectorTimeline({
    schemaVersion: "1.0",
    productionId: "production-kids-moonlit-ruins",
    grammarId: "kids-adventure-v1",
    sourceContentHash,
    fps: 30,
    durationInFrames: 900,
    shots: [
      {
        id: "shot-run-to-the-ruin",
        sceneId: "scene-moonlit-ruins-01",
        stageId: "stage-forest-threshold",
        beatId: "beat-follow-the-moth",
        storyFunction:
          "Pursue the moth and cross a visible threshold in one continuous action.",
        startFrame: 0,
        durationInFrames: 120,
        cutInEventId: null,
        cutOutEventId: "planted-threshold-foot",
        cutMotivation:
          "The planted foot completes the pursuit and makes the listening stop readable.",
        camera: {
          shotSize: "wide",
          angle: "profile",
          movement: "track",
          focalSubjectId: "mara",
          lensIntent:
            "Keep the destination arch and both profile run cycles readable.",
          axisId: "forest-left-to-right-axis",
        },
        layers: forestLayers,
        entryState: [
          state("milo", 0.02, 0.51, "running", { gait: 0.34 }),
          state("mara", 0.14, 0.55, "running", { gait: 0 }),
          state("silver-moth", 0.34, 0.04, "performing", { stageY: 0.35 }),
        ],
        exitState: [
          state("milo", 0.43, 0.56, "running", { gait: 0.75 }),
          state("mara", 0.56, 0.6, "running", { gait: 0.5 }),
          state("silver-moth", 0.73, 0.04, "performing", { stageY: 0.35 }),
        ],
        events: [
          {
            id: "arch-enters-frame",
            kind: "reveal",
            frameOffset: 62,
            subjectIds: ["moon-arch"],
            description: "The destination arch becomes the dominant landmark.",
          },
          {
            id: "planted-threshold-foot",
            kind: "foot-contact",
            frameOffset: 109,
            subjectIds: ["mara"],
            description:
              "Mara plants inside the arch without restarting the run.",
          },
        ],
        minimumReadFramesAfterCutEvent: 8,
        performanceProgramIds: [
          "mara-run-cycle-v1",
          "milo-run-cycle-v1",
          "moth-flight-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-running-foley", "intent-threshold-rustle"],
        axisReset: false,
      },
      {
        id: "shot-listen-in-the-dark",
        sceneId: "scene-moonlit-ruins-01",
        stageId: "stage-forest-threshold",
        beatId: "beat-listen-at-the-threshold",
        storyFunction:
          "Show the physical stop, shared gaze, and decision to enter.",
        startFrame: 120,
        durationInFrames: 90,
        cutInEventId: "planted-threshold-foot",
        cutOutEventId: "moth-crosses-threshold",
        cutMotivation: "Both eyelines lock as the moth crosses into the hall.",
        camera: {
          shotSize: "medium",
          angle: "eye-level",
          movement: "push",
          focalSubjectId: "mara",
          lensIntent:
            "Read residual motion, then the shared decision in one two-shot.",
          axisId: "forest-left-to-right-axis",
        },
        layers: forestLayers,
        entryState: [
          state("milo", 0.43, 0.56, "decelerating", {
            gait: 0.75,
            gaze: "silver-moth",
          }),
          state("mara", 0.56, 0.6, "decelerating", {
            gait: 0.5,
            gaze: "silver-moth",
          }),
          state("silver-moth", 0.73, 0.04, "performing", { stageY: 0.35 }),
        ],
        exitState: [
          state("milo", 0.43, 0.56, "idle", { gaze: "silver-moth" }),
          state("mara", 0.56, 0.6, "idle", { gaze: "silver-moth" }),
          state("silver-moth", 0.78, 0.04, "performing", { stageY: 0.35 }),
        ],
        events: [
          {
            id: "threshold-deceleration",
            kind: "deceleration",
            frameOffset: 0,
            subjectIds: ["milo", "mara"],
            description:
              "The children carry inherited gait into a staggered thirty-four-frame stop.",
          },
          {
            id: "mara-threshold-plant",
            kind: "foot-contact",
            frameOffset: 30,
            subjectIds: ["mara"],
            description: "Mara plants first with torso follow-through.",
          },
          {
            id: "milo-threshold-plant",
            kind: "foot-contact",
            frameOffset: 34,
            subjectIds: ["milo"],
            description:
              "Milo takes one delayed final step and plants behind Mara.",
          },
          {
            id: "shared-gaze-acquire",
            kind: "gaze-acquire",
            frameOffset: 40,
            subjectIds: ["milo", "mara"],
            description:
              "Both children resolve their gaze to the same moth position after the plant.",
          },
          {
            id: "moth-crosses-threshold",
            kind: "portal-cross",
            frameOffset: 72,
            subjectIds: ["silver-moth"],
            description:
              "The moth visibly crosses the arch into the moon hall.",
          },
        ],
        minimumReadFramesAfterCutEvent: 10,
        performanceProgramIds: [
          "children-decelerate-and-listen-v1",
          "moth-flight-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-threshold-silence", "intent-moth-chime"],
        axisReset: false,
      },
      {
        id: "shot-sneak-entrance",
        sceneId: "scene-moonlit-ruins-02",
        stageId: "stage-moon-hall",
        beatId: "beat-wake-the-creature",
        storyFunction:
          "Establish the hall entrance, continuous moth path, and child reveal marks.",
        startFrame: 210,
        durationInFrames: 132,
        cutInEventId: "moth-crosses-threshold",
        cutOutEventId: "moth-lands-on-nose",
        cutMotivation: "The moth contact motivates the guardian wake shot.",
        camera: {
          shotSize: "wide",
          angle: "eye-level",
          movement: "push",
          focalSubjectId: "silver-moth",
          lensIntent:
            "Keep the forest arch visible at frame left while the children enter and plant.",
          axisId: "hall-left-to-right-axis",
        },
        layers: hallLayers,
        entryState: [
          state("milo", 0.02, 0.56, "sneaking", { gaze: "silver-moth" }),
          state("mara", 0.13, 0.6, "sneaking", { gaze: "silver-moth" }),
          state("moss-guardian", 0.78, 1.55, "idle", {
            facing: "left",
            gaze: "silver-moth",
          }),
          state("silver-moth", 0.2, 0.04, "performing", { stageY: 0.35 }),
        ],
        exitState: [
          state("milo", 0.28, 0.56, "idle", { gaze: "moss-guardian" }),
          state("mara", 0.44, 0.6, "idle", { gaze: "moss-guardian" }),
          state("moss-guardian", 0.78, 1.55, "idle", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        events: [
          {
            id: "children-enter-hall",
            kind: "entrance",
            frameOffset: 18,
            subjectIds: ["milo", "mara"],
            description:
              "Milo and Mara enter progressively through the visible arch.",
          },
          {
            id: "children-plant-reveal-marks",
            kind: "foot-contact",
            frameOffset: 124,
            subjectIds: ["milo", "mara"],
            description:
              "Both children finish the sneak cycle into inherited reveal contacts without changing order.",
          },
          {
            id: "moth-lands-on-nose",
            kind: "attach",
            frameOffset: 120,
            subjectIds: ["silver-moth", "moss-guardian"],
            description: "The moth attaches to the guardian nose socket.",
          },
        ],
        minimumReadFramesAfterCutEvent: 8,
        performanceProgramIds: [
          "mara-sneak-cycle-v1",
          "milo-sneak-cycle-v1",
          "moth-flight-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-sneak-foley", "intent-moth-land"],
        axisReset: true,
      },
      {
        id: "shot-creature-reveal",
        sceneId: "scene-moonlit-ruins-02",
        stageId: "stage-moon-hall",
        beatId: "beat-wake-the-creature",
        storyFunction:
          "Wake the guardian through a complete held performance while preserving geography.",
        startFrame: 342,
        durationInFrames: 72,
        cutInEventId: "moth-lands-on-nose",
        cutOutEventId: "guardian-eye-open-apex",
        cutMotivation:
          "The fully opened eye motivates a closer emotional read.",
        camera: {
          shotSize: "medium",
          angle: "eye-level",
          movement: "locked",
          focalSubjectId: "moss-guardian",
          lensIntent:
            "Keep the children at their inherited marks while the guardian wakes on frame right.",
          axisId: "hall-left-to-right-axis",
        },
        layers: hallLayers,
        entryState: [
          state("milo", 0.28, 0.56, "idle", { gaze: "moss-guardian" }),
          state("mara", 0.44, 0.6, "idle", { gaze: "moss-guardian" }),
          state("moss-guardian", 0.78, 1.55, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        exitState: [
          state("milo", 0.28, 0.56, "reacting", { gaze: "moss-guardian" }),
          state("mara", 0.44, 0.6, "reacting", { gaze: "moss-guardian" }),
          state("moss-guardian", 0.78, 1.55, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        events: [
          {
            id: "guardian-wake-anticipation",
            kind: "anticipation",
            frameOffset: 8,
            subjectIds: ["moss-guardian"],
            description: "Moss lifts before the eyes open.",
          },
          {
            id: "guardian-eye-open-apex",
            kind: "reveal",
            frameOffset: 55,
            subjectIds: ["moss-guardian"],
            description: "The guardian reaches the readable eye-open apex.",
          },
        ],
        minimumReadFramesAfterCutEvent: 10,
        performanceProgramIds: ["guardian-wake-v1", "children-held-eyeline-v1"],
        dialogueLineIds: [],
        audioIntentIds: ["intent-guardian-wake"],
        axisReset: false,
      },
      {
        id: "shot-eye-close-up",
        sceneId: "scene-moonlit-ruins-02",
        stageId: "stage-moon-hall",
        beatId: "beat-wake-the-creature",
        storyFunction:
          "Clarify that the guardian is shy rather than aggressive.",
        startFrame: 414,
        durationInFrames: 48,
        cutInEventId: "guardian-eye-open-apex",
        cutOutEventId: "guardian-gaze-lock",
        cutMotivation: "The guardian's gaze resolves specifically to Mara.",
        camera: {
          shotSize: "close-up",
          angle: "eye-level",
          movement: "push",
          focalSubjectId: "moss-guardian",
          lensIntent:
            "Preserve the eye and moth nose socket across the scale change.",
          axisId: "hall-left-to-right-axis",
        },
        layers: hallLayers,
        entryState: [
          state("moss-guardian", 0.78, 2.1, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        exitState: [
          state("moss-guardian", 0.78, 2.1, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        events: [
          {
            id: "guardian-blink",
            kind: "action",
            frameOffset: 14,
            subjectIds: ["moss-guardian"],
            description: "A complete blink softens the reveal.",
          },
          {
            id: "guardian-gaze-lock",
            kind: "gaze-acquire",
            frameOffset: 30,
            subjectIds: ["moss-guardian", "mara"],
            description:
              "The guardian resolves its gaze to Mara's inherited side.",
          },
        ],
        minimumReadFramesAfterCutEvent: 10,
        performanceProgramIds: ["guardian-closeup-v1"],
        dialogueLineIds: [],
        audioIntentIds: ["intent-closeup-breath"],
        axisReset: false,
      },
      {
        id: "shot-kids-reaction",
        sceneId: "scene-moonlit-ruins-02",
        stageId: "stage-moon-hall",
        beatId: "beat-spark-sneeze",
        storyFunction:
          "Let Mara lead the fear reaction and Milo follow before the comic reversal.",
        startFrame: 462,
        durationInFrames: 72,
        cutInEventId: "guardian-gaze-lock",
        cutOutEventId: "children-reaction-settle",
        cutMotivation:
          "The held reaction sets up the cause-and-effect sneeze shot.",
        camera: {
          shotSize: "medium",
          angle: "eye-level",
          movement: "locked",
          focalSubjectId: "mara",
          lensIntent:
            "Milo remains left and Mara right; negative space points toward the guardian.",
          axisId: "hall-left-to-right-axis",
        },
        layers: hallLayers,
        entryState: [
          state("milo", 0.28, 0.9, "reacting", { gaze: "moss-guardian" }),
          state("mara", 0.44, 1.05, "reacting", { gaze: "moss-guardian" }),
        ],
        exitState: [
          state("milo", 0.28, 0.9, "idle", { gaze: "moss-guardian" }),
          state("mara", 0.44, 1.05, "idle", { gaze: "moss-guardian" }),
        ],
        events: [
          {
            id: "mara-reaction",
            kind: "reaction",
            frameOffset: 8,
            subjectIds: ["mara"],
            description: "Mara reacts first.",
          },
          {
            id: "milo-delayed-reaction",
            kind: "reaction",
            frameOffset: 13,
            subjectIds: ["milo"],
            description: "Milo follows five frames later.",
          },
          {
            id: "children-reaction-settle",
            kind: "settle",
            frameOffset: 58,
            subjectIds: ["milo", "mara"],
            description: "The fear reaction holds long enough to read.",
          },
        ],
        minimumReadFramesAfterCutEvent: 8,
        performanceProgramIds: ["mara-reaction-v1", "milo-delayed-reaction-v1"],
        dialogueLineIds: [],
        audioIntentIds: ["intent-children-gasp"],
        axisReset: false,
      },
      {
        id: "shot-spark-sneeze",
        sceneId: "scene-moonlit-ruins-02",
        stageId: "stage-moon-hall",
        beatId: "beat-spark-sneeze",
        storyFunction:
          "Play the full comic chain from tickle through visible pivot and moth catch.",
        startFrame: 534,
        durationInFrames: 120,
        cutInEventId: "children-reaction-settle",
        cutOutEventId: "first-escape-foot-contact",
        cutMotivation:
          "The first planted escape step carries the motion into the portal shot.",
        camera: {
          shotSize: "wide",
          angle: "eye-level",
          movement: "reframe",
          focalSubjectId: "moss-guardian",
          lensIntent:
            "Keep sneeze, delayed child reaction, pivot, and moth catch in one geography.",
          axisId: "hall-left-to-right-axis",
        },
        layers: hallLayers,
        entryState: [
          state("milo", 0.28, 0.9, "idle", { gaze: "moss-guardian" }),
          state("mara", 0.44, 1.05, "idle", { gaze: "moss-guardian" }),
          state("moss-guardian", 0.78, 1.55, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.76, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        exitState: [
          state("milo", 0.28, 0.9, "running", {
            facing: "left",
            gait: 0.25,
            gaze: "hall-exit",
          }),
          state("mara", 0.44, 1.05, "running", {
            facing: "left",
            gait: 0,
            gaze: "hall-exit",
          }),
          state("moss-guardian", 0.78, 1.55, "turning", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.74, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.52,
          }),
        ],
        events: [
          {
            id: "guardian-inhale-apex",
            kind: "anticipation",
            frameOffset: 28,
            subjectIds: ["moss-guardian"],
            description: "The guardian reaches maximum inhale compression.",
          },
          {
            id: "guardian-sneeze-impact",
            kind: "impact",
            frameOffset: 48,
            subjectIds: ["moss-guardian"],
            description: "The sneeze releases the moth and sparks.",
          },
          {
            id: "moth-detaches-nose",
            kind: "detach",
            frameOffset: 49,
            subjectIds: ["silver-moth", "moss-guardian"],
            description: "The moth becomes airborne after the sneeze.",
          },
          {
            id: "children-delayed-sneeze-reaction",
            kind: "reaction",
            frameOffset: 56,
            subjectIds: ["milo", "mara"],
            description: "The children react only after the sneeze.",
          },
          {
            id: "children-pivot-left",
            kind: "pivot",
            frameOffset: 78,
            subjectIds: ["milo", "mara"],
            description: "Both children visibly turn toward the exit.",
          },
          {
            id: "guardian-catches-moth",
            kind: "attach",
            frameOffset: 90,
            subjectIds: ["silver-moth", "moss-guardian"],
            description:
              "The moth reaches the open hand on a visible contact/glow accent.",
          },
          {
            id: "guardian-holds-moth",
            kind: "settle",
            frameOffset: 99,
            subjectIds: ["silver-moth", "moss-guardian"],
            description:
              "The attached moth remains hand-relative long enough to establish ownership.",
          },
          {
            id: "first-escape-foot-contact",
            kind: "foot-contact",
            frameOffset: 114,
            subjectIds: ["mara"],
            description: "Mara's first leftward escape step plants.",
          },
        ],
        minimumReadFramesAfterCutEvent: 4,
        performanceProgramIds: [
          "guardian-sneeze-v1",
          "children-pivot-v1",
          "guardian-moth-catch-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: [
          "intent-guardian-inhale",
          "intent-guardian-sneeze",
          "intent-spark-burst",
        ],
        axisReset: false,
      },
      {
        id: "shot-escape-run",
        sceneId: "scene-moonlit-ruins-03",
        stageId: "stage-portal-crossing",
        beatId: "beat-escape-the-hall",
        storyFunction:
          "Carry exact gait and ownership through the visible hall entrance into the clearing.",
        startFrame: 654,
        durationInFrames: 120,
        cutInEventId: "first-escape-foot-contact",
        cutOutEventId: "clearing-arrival-reframe",
        cutMotivation:
          "The fixed portal leaves frame and motivates a closer view of the still-moving arrival.",
        camera: {
          shotSize: "wide",
          angle: "profile",
          movement: "track",
          focalSubjectId: "mara",
          lensIntent:
            "Show a real right-to-left portal crossing; the foreground arch occludes only physical overlap.",
          axisId: "escape-right-to-left-axis",
        },
        layers: hallLayers,
        entryState: [
          state("milo", 0.28, 0.9, "running", {
            facing: "left",
            gait: 0.25,
            gaze: "hall-exit",
          }),
          state("mara", 0.44, 1.05, "running", {
            facing: "left",
            gait: 0,
            gaze: "hall-exit",
          }),
          state("moss-guardian", 0.78, 1.55, "running", {
            facing: "left",
            gait: 0.5,
            gaze: "mara",
          }),
          state("silver-moth", 0.74, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.52,
          }),
        ],
        exitState: [
          state("milo", 0.24, 0.62, "decelerating", {
            facing: "left",
            gait: 0.75,
            gaze: "moss-guardian",
          }),
          state("mara", 0.4, 0.72, "decelerating", {
            facing: "left",
            gait: 0.5,
            gaze: "moss-guardian",
          }),
          state("moss-guardian", 0.7, 1.2, "decelerating", {
            facing: "left",
            gait: 0,
            gaze: "mara",
          }),
          state("silver-moth", 0.68, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        events: [
          {
            id: "subjects-enter-portal-occlusion",
            kind: "occlusion",
            frameOffset: 82,
            subjectIds: ["moss-guardian"],
            description:
              "The guardian reaches the stationary world-bound arch after the children.",
          },
          {
            id: "subjects-exit-portal-occlusion",
            kind: "reveal",
            frameOffset: 106,
            subjectIds: ["moss-guardian"],
            description:
              "The guardian emerges outside while the portal remains tied to the same scene landmark.",
          },
          {
            id: "escape-deceleration",
            kind: "deceleration",
            frameOffset: 104,
            subjectIds: ["milo", "mara", "moss-guardian"],
            description:
              "The group begins slowing but retains velocity through the next cut.",
          },
          {
            id: "clearing-arrival-reframe",
            kind: "action",
            frameOffset: 113,
            subjectIds: ["milo", "mara", "moss-guardian"],
            description:
              "The cast clears the portal and the camera reframes the continuing arrival.",
          },
        ],
        minimumReadFramesAfterCutEvent: 6,
        performanceProgramIds: [
          "mara-run-left-v1",
          "milo-run-left-v1",
          "guardian-chase-left-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-escape-foley", "intent-portal-rustle"],
        axisReset: true,
      },
      {
        id: "shot-friendly-offer",
        sceneId: "scene-moonlit-ruins-03",
        stageId: "stage-dawn-clearing",
        beatId: "beat-friendly-offer",
        storyFunction:
          "Let the moving group arrive, stop, and reveal the guardian's friendly offer.",
        startFrame: 774,
        durationInFrames: 72,
        cutInEventId: "clearing-arrival-reframe",
        cutOutEventId: "mara-hand-contact",
        cutMotivation: "Hand contact motivates a closer emotional payoff.",
        camera: {
          shotSize: "medium",
          angle: "eye-level",
          movement: "locked",
          focalSubjectId: "mara",
          lensIntent:
            "Keep Milo left, Mara center-left, and guardian right while gaze leads the reach.",
          axisId: "clearing-left-to-right-axis",
        },
        layers: clearingLayers,
        entryState: [
          state("milo", 0.24, 0.62, "decelerating", {
            facing: "right",
            gait: 0.75,
            gaze: "moss-guardian",
          }),
          state("mara", 0.4, 0.72, "decelerating", {
            facing: "right",
            gait: 0.5,
            gaze: "silver-moth",
          }),
          state("moss-guardian", 0.7, 1.2, "decelerating", {
            facing: "left",
            gait: 0,
            gaze: "mara",
          }),
          state("silver-moth", 0.68, 0.04, "idle", {
            owner: "moss-guardian",
            stageY: 0.5,
          }),
        ],
        exitState: [
          state("milo", 0.24, 0.62, "idle", { facing: "right", gaze: "mara" }),
          state("mara", 0.4, 0.72, "performing", {
            facing: "right",
            gaze: "silver-moth",
          }),
          state("moss-guardian", 0.7, 1.2, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.53, 0.04, "idle", {
            owner: "mara",
            stageY: 0.5,
          }),
        ],
        events: [
          {
            id: "payoff-deceleration",
            kind: "deceleration",
            frameOffset: 0,
            subjectIds: ["milo", "mara", "moss-guardian"],
            description: "The moving group finishes decelerating on screen.",
          },
          {
            id: "mara-clearing-plant",
            kind: "foot-contact",
            frameOffset: 22,
            subjectIds: ["mara"],
            description:
              "Mara plants at the exact payoff mark after visible deceleration.",
          },
          {
            id: "milo-clearing-plant",
            kind: "foot-contact",
            frameOffset: 24,
            subjectIds: ["milo"],
            description: "Milo finishes one delayed contact behind Mara.",
          },
          {
            id: "guardian-clearing-settle",
            kind: "settle",
            frameOffset: 26,
            subjectIds: ["moss-guardian"],
            description:
              "The guardian closes the distance and settles before offering.",
          },
          {
            id: "guardian-offer",
            kind: "action",
            frameOffset: 28,
            subjectIds: ["moss-guardian", "silver-moth"],
            description:
              "Only after the arrival settles, the guardian extends the cupped moth.",
          },
          {
            id: "mara-gaze-leads-reach",
            kind: "gaze-acquire",
            frameOffset: 38,
            subjectIds: ["mara", "silver-moth"],
            description: "Mara's gaze leads head, torso, then hand.",
          },
          {
            id: "mara-hand-contact",
            kind: "attach",
            frameOffset: 64,
            subjectIds: ["mara", "silver-moth"],
            description: "The moth transfers to Mara at visible hand contact.",
          },
        ],
        minimumReadFramesAfterCutEvent: 5,
        performanceProgramIds: [
          "guardian-offer-v1",
          "mara-cautious-reach-v1",
          "milo-relax-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-offer-breath"],
        axisReset: true,
      },
      {
        id: "shot-understand-and-play",
        sceneId: "scene-moonlit-ruins-03",
        stageId: "stage-dawn-clearing",
        beatId: "beat-friendly-offer",
        storyFunction:
          "Release the moth and land the shared understanding in a living hold.",
        startFrame: 846,
        durationInFrames: 54,
        cutInEventId: "mara-hand-contact",
        cutOutEventId: "shared-living-hold",
        cutMotivation:
          "The final hold is the comprehension image and production endpoint.",
        camera: {
          shotSize: "close-up",
          angle: "eye-level",
          movement: "push",
          focalSubjectId: "mara",
          lensIntent:
            "Preserve left/right order and hand contact while moving closer for the release and wave.",
          axisId: "clearing-left-to-right-axis",
        },
        layers: clearingLayers,
        entryState: [
          state("milo", 0.24, 0.72, "idle", { facing: "right", gaze: "mara" }),
          state("mara", 0.4, 0.84, "performing", {
            facing: "right",
            gaze: "silver-moth",
          }),
          state("moss-guardian", 0.7, 1.4, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.53, 0.04, "idle", {
            owner: "mara",
            stageY: 0.5,
          }),
        ],
        exitState: [
          state("milo", 0.24, 0.72, "performing", {
            facing: "right",
            gaze: "silver-moth",
          }),
          state("mara", 0.4, 0.84, "performing", {
            facing: "right",
            gaze: "silver-moth",
          }),
          state("moss-guardian", 0.7, 1.4, "performing", {
            facing: "left",
            gaze: "mara",
          }),
          state("silver-moth", 0.58, 0.05, "performing", { stageY: 0.3 }),
        ],
        events: [
          {
            id: "moth-release",
            kind: "detach",
            frameOffset: 8,
            subjectIds: ["mara", "silver-moth"],
            description:
              "After an eight-frame held state, Mara releases the moth from her palm.",
          },
          {
            id: "mara-starts-wave",
            kind: "action",
            frameOffset: 10,
            subjectIds: ["mara"],
            description: "Mara initiates the play gesture.",
          },
          {
            id: "guardian-mirrors-wave",
            kind: "action",
            frameOffset: 18,
            subjectIds: ["mara", "moss-guardian"],
            description: "The guardian mirrors Mara's wave.",
          },
          {
            id: "milo-joins-late",
            kind: "reaction",
            frameOffset: 24,
            subjectIds: ["milo"],
            description: "Milo joins six frames later.",
          },
          {
            id: "shared-living-hold",
            kind: "settle",
            frameOffset: 45,
            subjectIds: ["milo", "mara", "moss-guardian"],
            description:
              "Asymmetrical breathing, gaze, blink, hair, and moss follow-through keep the final image alive.",
          },
        ],
        minimumReadFramesAfterCutEvent: 8,
        performanceProgramIds: [
          "mara-release-wave-v1",
          "guardian-mirror-wave-v1",
          "milo-late-wave-v1",
          "living-hold-v1",
        ],
        dialogueLineIds: [],
        audioIntentIds: ["intent-payoff-moth-chime", "intent-payoff-resolve"],
        axisReset: false,
      },
    ],
  });
}
