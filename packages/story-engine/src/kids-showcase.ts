import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  createDirectedSequencePlan,
  resolveDirectorAudioIntentFrame,
  type DirectedSequencePlan,
} from "./directed-sequence-plan";
import {
  frameAccurateRenderPlanSchema,
  hashSchema,
  identifierSchema,
  type FrameAccurateRenderPlan,
} from "./model";
import { buildAnimaticSync, createProductionDraft } from "./pipeline";
import { sampleWorkshopScript } from "./sample-script";

export const KIDS_SHOWCASE_TEMPLATE_ID = "kids-moonlit-ruins-v1";
export const KIDS_SHOWCASE_TEMPLATE_VERSION = "1.0.0";
export const KIDS_SHOWCASE_RIG_IDS = [
  "mara-cutout-rig-v1",
  "milo-cutout-rig-v1",
  "moss-creature-rig-v1",
] as const;
export const KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES = [
  "d569b47f5f33b86ccdc887e7d4d1cdc973f257213fad8efa8c3254d53d3eeab9",
  "e9892507a1d07de2afe69917af295ac546ab721be2c8a911e365365ff41903ba",
  "11996c64a02ee27a0125a287d716a567bb7618c527d08e3afcad83fb1d122697",
] as const;

const sceneDrafts = [
  {
    id: "scene-moonlit-ruins-01",
    title: "Follow the light",
    beats: [
      {
        id: "beat-follow-the-moth",
        text: "A silver moth darts between the trees. Mara and Milo race after it, matching its turns until it slips through a moonlit stone arch.",
        shotIds: ["shot-run-to-the-ruin", "shot-cross-the-threshold"],
      },
      {
        id: "beat-listen-at-the-threshold",
        text: "The friends stop and listen. The moth crosses an empty corridor while a mound of moss takes one almost invisible breath.",
        shotIds: ["shot-listen-in-the-dark", "shot-empty-corridor"],
      },
    ],
  },
  {
    id: "scene-moonlit-ruins-02",
    title: "Wake the moss",
    beats: [
      {
        id: "beat-wake-the-creature",
        text: "Mara and Milo sneak into the moon hall. The moth lands on a mossy nose, and a shy creature slowly opens its enormous eyes.",
        shotIds: [
          "shot-sneak-entrance",
          "shot-creature-reveal",
          "shot-eye-close-up",
        ],
      },
      {
        id: "beat-spark-sneeze",
        text: "The children mistake the waking creature for a threat. The moth tickles its nose; it compresses, sneezes a burst of sparks, and blinks in embarrassment.",
        shotIds: ["shot-kids-reaction", "shot-spark-sneeze"],
      },
    ],
  },
  {
    id: "scene-moonlit-ruins-03",
    title: "Understand the chase",
    beats: [
      {
        id: "beat-escape-the-hall",
        text: "Mara and Milo turn, then sprint back through the hall. The creature follows carefully, cupping the silver moth between its leafy hands.",
        shotIds: ["shot-escape-run"],
      },
      {
        id: "beat-friendly-offer",
        text: "In the clearing, the creature offers the moth to Mara. She reaches, Milo relaxes, and the creature mirrors their playful wave before everyone holds on the new understanding.",
        shotIds: ["shot-friendly-offer", "shot-understand-and-play"],
      },
    ],
  },
] as const;

export const KIDS_SHOWCASE_SOURCE_SCRIPT = sceneDrafts
  .flatMap((scene) => scene.beats.map((beat) => beat.text))
  .join("\n\n");

export function createKidsShowcaseSparkSneezePlan(): DirectedSequencePlan {
  return createDirectedSequencePlan({
    schemaVersion: "1.0",
    id: "director-plan-spark-sneeze-v1",
    productionId: "production-kids-moonlit-ruins",
    grammarId: "kids-adventure-v1",
    sourceContentHash: hashCanonical(KIDS_SHOWCASE_SOURCE_SCRIPT),
    startFrame: 522,
    durationInFrames: 108,
    scenes: [
      {
        id: "scene-moonlit-ruins-02",
        objective: "Turn the apparent threat into a funny misunderstanding.",
        geography:
          "The guardian fills center frame; Mara and Milo share the reaction plane camera-left; the moth remains at the guardian's nose.",
        sceneKitId: "scene-kit-moon-hall-v1",
        beatIds: ["beat-spark-sneeze"],
      },
    ],
    beats: [
      {
        id: "beat-spark-sneeze",
        sceneId: "scene-moonlit-ruins-02",
        audienceQuestion: "Will the guardian attack the children?",
        knowledgeBefore:
          "The children believe the waking guardian is dangerous.",
        knowledgeAfter:
          "The guardian is startled, shy, and accidentally magical.",
        emotionBefore: "held-breath fear",
        emotionAfter: "surprised relief",
        muteReadableAction:
          "The guardian inhales, sneezes sparks, then blinks in embarrassment while the children react a few frames later.",
        audioReadableIntent:
          "A rising inhale, sneeze impact, sparkling tail, delayed gasp, and music duck sell the reversal without narration.",
        shotIds: ["shot-spark-sneeze"],
      },
    ],
    shots: [
      {
        id: "shot-spark-sneeze",
        sceneId: "scene-moonlit-ruins-02",
        beatId: "beat-spark-sneeze",
        storyFunction:
          "Pay off the threat setup with a readable comic sneeze and delayed child reaction.",
        startFrame: 522,
        durationInFrames: 108,
        composition: {
          scale: "medium",
          focalSubjectId: "moss-guardian",
          screenDirection: "static",
          depthPlaneIds: [
            "moon-hall-backdrop",
            "guardian-performance-plane",
            "children-reaction-plane",
            "foreground-vines",
          ],
          eyelineTargetIds: ["moss-guardian", "silver-moth"],
          staging:
            "Hold the guardian center with clear negative space for sparks; keep the children readable on the left and foreground vines outside every face crop.",
        },
        transition: {
          type: "hard-cut",
          motivation:
            "The preceding reaction shot establishes the children's fear; cutting to the guardian answers it.",
        },
        continuity: {
          entryState:
            "The moth rests on the guardian's nose while the children brace camera-left.",
          exitState:
            "Sparks settle; the guardian is embarrassed and the children understand the mistake.",
        },
        performanceProgramIds: [
          "guardian-sneeze-hybrid-v1",
          "children-delayed-reaction-v1",
        ],
        assetRequirementIds: [
          "scene-kit-moon-hall-v1",
          "guardian-sneeze-sequence-v1",
          "mara-articulated-rig-v1",
          "milo-articulated-rig-v1",
          "spark-particle-program-v1",
        ],
        events: [
          {
            id: "inhale-apex",
            kind: "anticipation",
            frameOffset: 42,
            description: "The guardian reaches maximum inhale compression.",
          },
          {
            id: "sneeze-impact",
            kind: "impact",
            frameOffset: 62,
            description: "The guardian snaps through the sneeze action.",
          },
          {
            id: "spark-onset",
            kind: "action",
            frameOffset: 64,
            description: "The first visible sparks leave the guardian.",
          },
          {
            id: "child-reaction",
            kind: "reaction",
            frameOffset: 72,
            description: "Mara and Milo recoil after perceiving the sneeze.",
          },
          {
            id: "settle",
            kind: "settle",
            frameOffset: 96,
            description:
              "The guardian and children land in the new emotional state.",
          },
        ],
        audioIntentIds: [
          "intent-guardian-inhale",
          "intent-guardian-sneeze",
          "intent-spark-burst",
          "intent-children-gasp",
          "intent-music-duck",
        ],
      },
    ],
    audioIntents: [
      {
        id: "intent-guardian-inhale",
        role: "sfx",
        shotId: "shot-spark-sneeze",
        anchorEventId: "inhale-apex",
        offsetFrames: -18,
        direction: "Soft leafy inhale rising into the held apex.",
      },
      {
        id: "intent-guardian-sneeze",
        role: "sfx",
        shotId: "shot-spark-sneeze",
        anchorEventId: "sneeze-impact",
        offsetFrames: 0,
        direction: "Round, funny sneeze with weight but no frightening crack.",
      },
      {
        id: "intent-spark-burst",
        role: "sfx",
        shotId: "shot-spark-sneeze",
        anchorEventId: "spark-onset",
        offsetFrames: 0,
        direction:
          "Bright paper-sparkle burst followed by a short glittering tail.",
      },
      {
        id: "intent-children-gasp",
        role: "dialogue",
        shotId: "shot-spark-sneeze",
        anchorEventId: "child-reaction",
        offsetFrames: 0,
        direction:
          "Two owner-performed, staggered surprise gasps; never cloned child voices.",
      },
      {
        id: "intent-music-duck",
        role: "music",
        shotId: "shot-spark-sneeze",
        anchorEventId: "sneeze-impact",
        offsetFrames: -2,
        direction:
          "Duck the curious music bed through the sneeze and reaction, then recover at settle.",
        duckMusicDb: -8,
      },
    ],
  });
}

export function createKidsShowcaseFriendlyPayoffPlan(): DirectedSequencePlan {
  return createDirectedSequencePlan({
    schemaVersion: "1.0",
    id: "director-plan-friendly-payoff-v1",
    productionId: "production-kids-moonlit-ruins",
    grammarId: "kids-adventure-v1",
    sourceContentHash: hashCanonical(KIDS_SHOWCASE_SOURCE_SCRIPT),
    startFrame: 750,
    durationInFrames: 150,
    scenes: [
      {
        id: "scene-moonlit-ruins-03",
        objective: "Make the guardian's friendly intent unmistakable.",
        geography:
          "The children remain camera-left and center; the guardian offers from camera-right; the moth crosses between their hands without teleporting.",
        sceneKitId: "scene-kit-dawn-clearing-v1",
        beatIds: ["beat-friendly-offer"],
      },
    ],
    beats: [
      {
        id: "beat-friendly-offer",
        sceneId: "scene-moonlit-ruins-03",
        audienceQuestion: "Was the guardian chasing them or trying to help?",
        knowledgeBefore: "The children still read the guardian as a threat.",
        knowledgeAfter: "The guardian protected the moth and wants to play.",
        emotionBefore: "guarded uncertainty",
        emotionAfter: "warm understanding",
        muteReadableAction:
          "The guardian offers the moth, Mara hesitates then accepts, Milo relaxes, and their waves become shared play.",
        audioReadableIntent:
          "The moth chime marks release and the returning motif confirms safety without dialogue.",
        shotIds: ["shot-friendly-offer", "shot-understand-and-play"],
      },
    ],
    shots: [
      {
        id: "shot-friendly-offer",
        sceneId: "scene-moonlit-ruins-03",
        beatId: "beat-friendly-offer",
        storyFunction:
          "Show the guardian's offer and Mara's cautious choice in one readable three-shot.",
        startFrame: 750,
        durationInFrames: 78,
        composition: {
          scale: "medium",
          focalSubjectId: "guardian-offering-hand",
          screenDirection: "right-to-left",
          depthPlaneIds: [
            "dawn-clearing-backdrop",
            "character-performance-plane",
            "moth-prop-plane",
            "foreground-plants",
          ],
          eyelineTargetIds: ["silver-moth", "guardian-offering-hand"],
          staging:
            "Guardian offers from camera-right; Mara's gaze leads her head, torso, and hand; Milo stays guarded behind her.",
        },
        transition: {
          type: "hard-cut",
          motivation:
            "The escape ends in the clearing; the wider three-shot re-establishes the new geography.",
        },
        continuity: {
          entryState:
            "The children have stopped camera-left; the guardian holds the moth camera-right.",
          exitState:
            "Mara's hand meets the guardian's offering hand while Milo begins to relax.",
        },
        performanceProgramIds: [
          "guardian-offer-articulated-v1",
          "mara-cautious-reach-v1",
          "milo-guarded-hold-v1",
        ],
        assetRequirementIds: [
          "scene-kit-dawn-clearing-v1",
          "guardian-payoff-puppet-v1",
          "mara-payoff-puppet-v1",
          "milo-payoff-puppet-v1",
          "silver-moth-prop-v1",
        ],
        events: [
          {
            id: "guardian-offer-start",
            kind: "action",
            frameOffset: 8,
            description: "The guardian begins extending the moth.",
          },
          {
            id: "mara-gaze-acquire",
            kind: "reaction",
            frameOffset: 14,
            description: "Mara looks from the guardian to the moth.",
          },
          {
            id: "mara-reach-start",
            kind: "action",
            frameOffset: 28,
            description: "Mara's hand begins its cautious reach.",
          },
          {
            id: "mara-hand-contact",
            kind: "contact",
            frameOffset: 60,
            description: "Mara's hand reaches the offered moth without a jump.",
          },
        ],
        audioIntentIds: [],
      },
      {
        id: "shot-understand-and-play",
        sceneId: "scene-moonlit-ruins-03",
        beatId: "beat-friendly-offer",
        storyFunction:
          "Release the moth, show the guardian mirror the children's wave, and land the comprehension image.",
        startFrame: 828,
        durationInFrames: 72,
        composition: {
          scale: "close-up",
          focalSubjectId: "mara-and-guardian",
          screenDirection: "static",
          depthPlaneIds: [
            "dawn-clearing-backdrop",
            "character-performance-plane",
            "moth-prop-plane",
            "foreground-plants",
          ],
          eyelineTargetIds: ["silver-moth", "mara", "moss-guardian"],
          staging:
            "Cut closer on hand contact, follow the moth release upward, then settle into an asymmetrical shared wave.",
        },
        transition: {
          type: "action-cut",
          motivation:
            "Cutting on hand contact changes scale while preserving the transfer action.",
        },
        continuity: {
          entryState:
            "Mara and the guardian share hand contact; Milo's shoulders have started to drop.",
          exitState:
            "The moth flies free; everyone shares a playful wave and living hold.",
        },
        performanceProgramIds: [
          "mara-release-and-wave-v1",
          "guardian-mirrored-wave-v1",
          "milo-late-wave-v1",
          "payoff-living-hold-v1",
        ],
        assetRequirementIds: [
          "scene-kit-dawn-clearing-v1",
          "guardian-payoff-puppet-v1",
          "mara-payoff-puppet-v1",
          "milo-payoff-puppet-v1",
          "silver-moth-prop-v1",
        ],
        events: [
          {
            id: "moth-detach-guardian",
            kind: "action",
            frameOffset: 4,
            description: "The moth detaches from the guardian's hand.",
          },
          {
            id: "milo-relax-start",
            kind: "reaction",
            frameOffset: 10,
            description: "Milo's guarded shoulders visibly release.",
          },
          {
            id: "moth-release",
            kind: "action",
            frameOffset: 14,
            description: "Mara releases the moth into the clearing light.",
          },
          {
            id: "music-resolve",
            kind: "reveal",
            frameOffset: 22,
            description: "The friendly motif returns on the new understanding.",
          },
          {
            id: "mirrored-wave-apex",
            kind: "action",
            frameOffset: 38,
            description:
              "Mara and the guardian reach the high point of the shared wave.",
          },
          {
            id: "comprehension-hold-start",
            kind: "settle",
            frameOffset: 50,
            description:
              "The final living hold begins after the action is complete.",
          },
        ],
        audioIntentIds: ["intent-payoff-moth-chime", "intent-payoff-resolve"],
      },
    ],
    audioIntents: [
      {
        id: "intent-payoff-moth-chime",
        role: "sfx",
        shotId: "shot-understand-and-play",
        anchorEventId: "moth-release",
        offsetFrames: 0,
        direction:
          "A delicate silver chime follows the moth's visible release.",
      },
      {
        id: "intent-payoff-resolve",
        role: "music",
        shotId: "shot-understand-and-play",
        anchorEventId: "music-resolve",
        offsetFrames: 0,
        direction:
          "Return the curious motif warmly, then leave room for the final hold.",
      },
    ],
  });
}

const shotDrafts = [
  {
    id: "shot-run-to-the-ruin",
    sceneId: sceneDrafts[0].id,
    beatId: "beat-follow-the-moth",
    title: "Follow the glow",
    startFrame: 0,
    durationInFrames: 84,
    framing: "wide",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "mara-root-and-run-rig",
      "milo-offset-run-rig",
      "moth-flight",
      "camera-pan",
      "forest-parallax",
      "foreground-plant-occlusion",
    ],
  },
  {
    id: "shot-cross-the-threshold",
    sceneId: sceneDrafts[0].id,
    beatId: "beat-follow-the-moth",
    title: "Cross the threshold",
    startFrame: 84,
    durationInFrames: 48,
    framing: "close-up",
    treatment: "character-performance",
    transition: "foreground-wipe",
    motionChannels: [
      "articulated-feet",
      "ground-contact",
      "match-direction",
      "leaf-wipe",
    ],
  },
  {
    id: "shot-listen-in-the-dark",
    sceneId: sceneDrafts[0].id,
    beatId: "beat-listen-at-the-threshold",
    title: "Did you hear that?",
    startFrame: 132,
    durationInFrames: 78,
    framing: "medium",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "shared-eyeline",
      "head-lead",
      "torso-settle",
      "arm-gesture",
      "camera-push",
    ],
  },
  {
    id: "shot-empty-corridor",
    sceneId: sceneDrafts[0].id,
    beatId: "beat-listen-at-the-threshold",
    title: "Let the room breathe",
    startFrame: 210,
    durationInFrames: 48,
    framing: "wide",
    treatment: "environment",
    transition: "hard-cut",
    motionChannels: [
      "moth-flight",
      "moss-breath-plant",
      "dust-layers",
      "camera-hold",
    ],
  },
  {
    id: "shot-sneak-entrance",
    sceneId: sceneDrafts[1].id,
    beatId: "beat-wake-the-creature",
    title: "Into the moon hall",
    startFrame: 258,
    durationInFrames: 84,
    framing: "wide",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "mara-sneak-rig",
      "milo-staggered-sneak-rig",
      "silhouette-entry",
      "camera-push",
      "cave-parallax",
    ],
  },
  {
    id: "shot-creature-reveal",
    sceneId: sceneDrafts[1].id,
    beatId: "beat-wake-the-creature",
    title: "Something wakes",
    startFrame: 342,
    durationInFrames: 60,
    framing: "medium",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "creature-rise",
      "head-and-arms",
      "eye-open",
      "moth-landing",
      "kids-eyeline",
    ],
  },
  {
    id: "shot-eye-close-up",
    sceneId: sceneDrafts[1].id,
    beatId: "beat-wake-the-creature",
    title: "Eye-line payoff",
    startFrame: 402,
    durationInFrames: 48,
    framing: "close-up",
    treatment: "reaction",
    transition: "hard-cut",
    motionChannels: [
      "eye-track",
      "blink",
      "brow-change",
      "shy-recoil",
      "extreme-reframe",
    ],
  },
  {
    id: "shot-kids-reaction",
    sceneId: sceneDrafts[1].id,
    beatId: "beat-spark-sneeze",
    title: "Read the reaction",
    startFrame: 450,
    durationInFrames: 72,
    framing: "close-up",
    treatment: "reaction",
    transition: "hard-cut",
    motionChannels: [
      "shared-eyeline",
      "anticipation",
      "recoil",
      "overshoot",
      "settle",
    ],
  },
  {
    id: "shot-spark-sneeze",
    sceneId: sceneDrafts[1].id,
    beatId: "beat-spark-sneeze",
    title: "The spark sneeze",
    startFrame: 522,
    durationInFrames: 108,
    framing: "medium",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "moth-contact",
      "creature-compression",
      "blink-and-head",
      "limb-overshoot",
      "spark-emission",
      "delayed-kids-reaction",
      "camera-response",
    ],
  },
  {
    id: "shot-escape-run",
    sceneId: sceneDrafts[2].id,
    beatId: "beat-escape-the-hall",
    title: "Run through the wipe",
    startFrame: 630,
    durationInFrames: 120,
    framing: "wide",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "motivated-turn",
      "mara-escape-rig",
      "milo-offset-escape-rig",
      "creature-carry",
      "foreground-occluders",
      "cave-parallax",
    ],
  },
  {
    id: "shot-friendly-offer",
    sceneId: sceneDrafts[2].id,
    beatId: "beat-friendly-offer",
    title: "Offer and hesitate",
    startFrame: 750,
    durationInFrames: 78,
    framing: "medium",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "guardian-offer-track",
      "mara-gaze-lead",
      "mara-reach-track",
      "milo-guarded-hold",
      "moth-hand-attachment",
    ],
  },
  {
    id: "shot-understand-and-play",
    sceneId: sceneDrafts[2].id,
    beatId: "beat-friendly-offer",
    title: "Understand and play",
    startFrame: 828,
    durationInFrames: 72,
    framing: "close-up",
    treatment: "character-performance",
    transition: "hard-cut",
    motionChannels: [
      "moth-release-track",
      "mara-wave-track",
      "milo-late-wave-track",
      "guardian-mirrored-wave-track",
      "living-hold-channels",
    ],
  },
] as const;

const kidsShowcaseBeatSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    order: z.number().int().positive(),
    text: z.string().min(1),
    contentHash: hashSchema,
    shotIds: z.array(identifierSchema).min(1),
  })
  .strict();

const kidsShowcaseSceneSchema = z
  .object({
    id: identifierSchema,
    order: z.number().int().positive(),
    title: z.string().min(1),
    beatIds: z.array(identifierSchema).min(1),
  })
  .strict();

const kidsShowcaseShotBindingSchema = z
  .object({
    shotId: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    grammarId: z.literal("kids-adventure-v1"),
    templateId: z.literal(KIDS_SHOWCASE_TEMPLATE_ID),
    templateVersion: z.literal(KIDS_SHOWCASE_TEMPLATE_VERSION),
    rigIds: z.array(identifierSchema).min(1),
    motionChannels: z.array(z.string().min(1)).min(3),
    contentHash: hashSchema,
  })
  .strict();

const kidsShowcaseAudioCueSchema = z
  .object({
    id: identifierSchema,
    shotId: identifierSchema,
    offsetInFrames: z.number().int().nonnegative(),
    assetId: z.enum([
      "showcase-footstep",
      "showcase-rustle",
      "showcase-moth-chime",
      "showcase-wake",
      "showcase-sneeze",
      "showcase-spark",
      "showcase-resolve",
    ]),
    gain: z.number().positive().max(1),
  })
  .strict();

const kidsShowcaseProgramFields = {
  schemaVersion: z.literal("1.0"),
  id: z.literal("program-kids-moonlit-ruins"),
  title: z.literal("Moonlit Ruins"),
  sourceScript: z.string().min(1),
  sourceScriptHash: hashSchema,
  renderPlan: frameAccurateRenderPlanSchema,
  scenes: z.array(kidsShowcaseSceneSchema).length(3),
  beats: z.array(kidsShowcaseBeatSchema).length(6),
  shotBindings: z.array(kidsShowcaseShotBindingSchema).length(12),
  audioCues: z.array(kidsShowcaseAudioCueSchema).min(1),
  rigAssets: z.tuple([
    z.literal(KIDS_SHOWCASE_RIG_IDS[0]),
    z.literal(KIDS_SHOWCASE_RIG_IDS[1]),
    z.literal(KIDS_SHOWCASE_RIG_IDS[2]),
  ]),
  payoffPuppetAssetHashes: z.tuple([
    z.literal(KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES[0]),
    z.literal(KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES[1]),
    z.literal(KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES[2]),
  ]),
};

export const kidsShowcaseProgramSchema = z
  .object({ ...kidsShowcaseProgramFields, contentHash: hashSchema })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        message: "Kids showcase program hash is invalid.",
        path: ["contentHash"],
      });
    if (hashCanonical(program.sourceScript) !== program.sourceScriptHash)
      context.addIssue({
        code: "custom",
        message: "Kids showcase source script hash is invalid.",
        path: ["sourceScriptHash"],
      });
    const beatIds = new Set(program.beats.map((beat) => beat.id));
    program.shotBindings.forEach((binding, index) => {
      if (!beatIds.has(binding.beatId))
        context.addIssue({
          code: "custom",
          message: "Shot binding references an unknown beat.",
          path: ["shotBindings", index, "beatId"],
        });
      const { contentHash: bindingHash, ...bindingDraft } = binding;
      if (hashCanonical(bindingDraft) !== bindingHash)
        context.addIssue({
          code: "custom",
          message: "Shot binding hash is invalid.",
          path: ["shotBindings", index, "contentHash"],
        });
    });
  })
  .superRefine((program, context) => {
    program.audioCues.forEach((cue, index) => {
      const shot = program.renderPlan.shots.find(
        (candidate) => candidate.id === cue.shotId,
      );
      if (!shot || cue.offsetInFrames >= shot.durationInFrames)
        context.addIssue({
          code: "custom",
          message: "Audio cue must fall inside its bound shot.",
          path: ["audioCues", index],
        });
    });
  });
export type KidsShowcaseProgram = z.infer<typeof kidsShowcaseProgramSchema>;

const buildRenderPlan = (): FrameAccurateRenderPlan => {
  const basePlan = buildAnimaticSync({
    draft: createProductionDraft({
      productionId: "production-kids-moonlit-ruins",
      title: "Moonlit Ruins",
      projectType: "kids",
      showPackId: "kids-adventure-v1",
      preset: "studio",
      script: sampleWorkshopScript,
    }),
  }).renderPlan;
  const sourceShot = basePlan.shots[0]!;
  const shots = shotDrafts.map((shot, index) => ({
    ...sourceShot,
    id: shot.id,
    sceneId: shot.sceneId,
    number: `${Math.floor(index / 4) + 1}.${String((index % 4) + 1).padStart(2, "0")}`,
    title: shot.title,
    framing: shot.framing,
    treatment: shot.treatment,
    transition: shot.transition,
    focusCharacterId: null,
    startFrame: shot.startFrame,
    durationInFrames: shot.durationInFrames,
    actions: sourceShot.actions.map((action, actionIndex) => ({
      ...action,
      id: `${shot.id}-action-${actionIndex + 1}`,
      label: shot.motionChannels.join(" · "),
      startFrame: shot.startFrame,
      endFrame: shot.startFrame + shot.durationInFrames,
    })),
    caption: null,
  }));
  const { contentHash: _baseHash, ...basePayload } = basePlan;
  void _baseHash;
  const payload = {
    ...basePayload,
    id: "plan-kids-moonlit-ruins-v1",
    productionId: "production-kids-moonlit-ruins",
    title: "Moonlit Ruins",
    width: 1920,
    height: 1080,
    durationInFrames: 900,
    shots,
    metrics: {
      ...basePlan.metrics,
      averageShotSeconds: 30 / 11,
      medianShotSeconds: 2.4,
      cutsPerMinute: 22,
      maximumStaticFrames: 12,
    },
  };
  return frameAccurateRenderPlanSchema.parse({
    ...payload,
    contentHash: hashCanonical(payload),
  });
};

export function createKidsShowcaseProgram(): KidsShowcaseProgram {
  const renderPlan = buildRenderPlan();
  const sparkSneezePlan = createKidsShowcaseSparkSneezePlan();
  const friendlyPayoffPlan = createKidsShowcaseFriendlyPayoffPlan();
  const sparkShotStart = sparkSneezePlan.shots[0]!.startFrame;
  const sparkIntentOffset = (intentId: string) =>
    resolveDirectorAudioIntentFrame(sparkSneezePlan, intentId) - sparkShotStart;
  const payoffShotStart = friendlyPayoffPlan.shots[1]!.startFrame;
  const payoffIntentOffset = (intentId: string) =>
    resolveDirectorAudioIntentFrame(friendlyPayoffPlan, intentId) -
    payoffShotStart;
  const beats = sceneDrafts.flatMap((scene, sceneIndex) =>
    scene.beats.map((beat, beatIndex) => {
      const draft = {
        id: beat.id,
        sceneId: scene.id,
        order: sceneIndex * 2 + beatIndex + 1,
        text: beat.text,
        shotIds: [...beat.shotIds],
      };
      return { ...draft, contentHash: hashCanonical(draft) };
    }),
  );
  const scenes = sceneDrafts.map((scene, index) => ({
    id: scene.id,
    order: index + 1,
    title: scene.title,
    beatIds: scene.beats.map((beat) => beat.id),
  }));
  const shotBindings = shotDrafts.map((shot) => {
    const draft = {
      shotId: shot.id,
      sceneId: shot.sceneId,
      beatId: shot.beatId,
      grammarId: "kids-adventure-v1" as const,
      templateId: KIDS_SHOWCASE_TEMPLATE_ID,
      templateVersion: KIDS_SHOWCASE_TEMPLATE_VERSION,
      rigIds: [...KIDS_SHOWCASE_RIG_IDS],
      motionChannels: [...shot.motionChannels],
    };
    return { ...draft, contentHash: hashCanonical(draft) };
  });
  const audioCues = [
    {
      id: "cue-moth-entry",
      shotId: "shot-run-to-the-ruin",
      offsetInFrames: 8,
      assetId: "showcase-moth-chime",
      gain: 0.42,
    },
    ...[18, 36, 54, 72].map((offsetInFrames, index) => ({
      id: `cue-run-foot-${index + 1}`,
      shotId: "shot-run-to-the-ruin",
      offsetInFrames,
      assetId: "showcase-footstep" as const,
      gain: 0.23,
    })),
    {
      id: "cue-threshold-rustle",
      shotId: "shot-cross-the-threshold",
      offsetInFrames: 10,
      assetId: "showcase-rustle",
      gain: 0.34,
    },
    {
      id: "cue-corridor-moth",
      shotId: "shot-empty-corridor",
      offsetInFrames: 8,
      assetId: "showcase-moth-chime",
      gain: 0.36,
    },
    {
      id: "cue-creature-wake",
      shotId: "shot-creature-reveal",
      offsetInFrames: 16,
      assetId: "showcase-wake",
      gain: 0.32,
    },
    {
      id: "cue-sneeze",
      shotId: "shot-spark-sneeze",
      offsetInFrames: sparkIntentOffset("intent-guardian-sneeze"),
      assetId: "showcase-sneeze",
      gain: 0.62,
    },
    {
      id: "cue-spark",
      shotId: "shot-spark-sneeze",
      offsetInFrames: sparkIntentOffset("intent-spark-burst"),
      assetId: "showcase-spark",
      gain: 0.44,
    },
    ...[8, 24, 40, 56, 72, 88, 104].map((offsetInFrames, index) => ({
      id: `cue-chase-foot-${index + 1}`,
      shotId: "shot-escape-run",
      offsetInFrames,
      assetId: "showcase-footstep" as const,
      gain: 0.28,
    })),
    {
      id: "cue-payoff-moth-release",
      shotId: "shot-understand-and-play",
      offsetInFrames: payoffIntentOffset("intent-payoff-moth-chime"),
      assetId: "showcase-moth-chime",
      gain: 0.34,
    },
    {
      id: "cue-clearing-resolve",
      shotId: "shot-understand-and-play",
      offsetInFrames: payoffIntentOffset("intent-payoff-resolve"),
      assetId: "showcase-resolve",
      gain: 0.46,
    },
  ] as const;
  const draft = {
    schemaVersion: "1.0" as const,
    id: "program-kids-moonlit-ruins" as const,
    title: "Moonlit Ruins" as const,
    sourceScript: KIDS_SHOWCASE_SOURCE_SCRIPT,
    sourceScriptHash: hashCanonical(KIDS_SHOWCASE_SOURCE_SCRIPT),
    renderPlan,
    scenes,
    beats,
    shotBindings,
    audioCues,
    rigAssets: [...KIDS_SHOWCASE_RIG_IDS] as [
      (typeof KIDS_SHOWCASE_RIG_IDS)[0],
      (typeof KIDS_SHOWCASE_RIG_IDS)[1],
      (typeof KIDS_SHOWCASE_RIG_IDS)[2],
    ],
    payoffPuppetAssetHashes: [...KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES] as [
      (typeof KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES)[0],
      (typeof KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES)[1],
      (typeof KIDS_SHOWCASE_PAYOFF_PUPPET_HASHES)[2],
    ],
  };
  return kidsShowcaseProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

const directionSchema = z
  .object({ sneezeIntensity: z.number().min(1).max(1.4) })
  .strict();
export type KidsShowcaseDirection = z.infer<typeof directionSchema>;

export type KidsShowcaseEdit = {
  command: "make-sneeze-bigger";
  before: KidsShowcaseDirection;
  after: KidsShowcaseDirection;
};

export type KidsShowcaseProject = {
  program: KidsShowcaseProgram;
  directedBeatPlans: DirectedSequencePlan[];
  direction: KidsShowcaseDirection;
  history: KidsShowcaseEdit[];
  historyCursor: number;
};

export function createKidsShowcaseProject(): KidsShowcaseProject {
  return {
    program: createKidsShowcaseProgram(),
    directedBeatPlans: [
      createKidsShowcaseSparkSneezePlan(),
      createKidsShowcaseFriendlyPayoffPlan(),
    ],
    direction: { sneezeIntensity: 1 },
    history: [],
    historyCursor: 0,
  };
}

export function makeKidsShowcaseSneezeBigger(
  project: KidsShowcaseProject,
): KidsShowcaseProject {
  const before = directionSchema.parse(project.direction);
  if (before.sneezeIntensity >= 1.4)
    throw new Error("The sneeze is already at the supported maximum.");
  const after = directionSchema.parse({ sneezeIntensity: 1.4 });
  const retained = project.history.slice(0, project.historyCursor);
  return {
    ...project,
    direction: after,
    history: [...retained, { command: "make-sneeze-bigger", before, after }],
    historyCursor: retained.length + 1,
  };
}

export function undoKidsShowcaseEdit(
  project: KidsShowcaseProject,
): KidsShowcaseProject {
  if (project.historyCursor === 0) return project;
  const edit = project.history[project.historyCursor - 1]!;
  return {
    ...project,
    direction: directionSchema.parse(edit.before),
    historyCursor: project.historyCursor - 1,
  };
}

export function redoKidsShowcaseEdit(
  project: KidsShowcaseProject,
): KidsShowcaseProject {
  if (project.historyCursor >= project.history.length) return project;
  const edit = project.history[project.historyCursor]!;
  return {
    ...project,
    direction: directionSchema.parse(edit.after),
    historyCursor: project.historyCursor + 1,
  };
}

export function getKidsShowcaseShotLineage(
  program: KidsShowcaseProgram,
  shotId: string,
) {
  const parsed = kidsShowcaseProgramSchema.parse(program);
  const binding = parsed.shotBindings.find(
    (candidate) => candidate.shotId === shotId,
  );
  if (!binding) throw new Error(`Unknown showcase shot: ${shotId}`);
  const beat = parsed.beats.find(
    (candidate) => candidate.id === binding.beatId,
  )!;
  const scene = parsed.scenes.find(
    (candidate) => candidate.id === binding.sceneId,
  )!;
  return { binding, beat, scene };
}
