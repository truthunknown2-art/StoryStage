import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";

const frameRangeSchema = z
  .object({
    minimum: z.number().int().nonnegative(),
    maximum: z.number().int().positive(),
  })
  .strict()
  .refine((range) => range.minimum <= range.maximum, {
    message: "Frame range minimum must not exceed its maximum.",
  });

const grammarProfileFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  kind: z.enum(["kids-adventure", "weird-history"]),
  label: z.string().min(1),
  pacing: z
    .object({
      shotDurationFrames: frameRangeSchema,
      reactionDelayFrames: frameRangeSchema,
      comprehensionHoldFrames: frameRangeSchema,
      maximumRepeatedShotSignature: z.number().int().positive(),
    })
    .strict(),
  performance: z
    .object({
      muteReadableActionRequired: z.boolean(),
      rootOnlyMotionAllowed: z.boolean(),
      minimumInternalMotionChannels: z.number().int().nonnegative(),
      requiredPhases: z.array(
        z.enum([
          "anticipation",
          "action",
          "impact",
          "reaction",
          "settle",
          "hold",
        ]),
      ),
    })
    .strict(),
  camera: z
    .object({
      persistentGeographyRequired: z.boolean(),
      motivatedMovementRequired: z.boolean(),
      allowedMovements: z.array(
        z.enum(["locked", "pan", "track", "push", "pull", "reframe"]),
      ),
    })
    .strict(),
  audio: z
    .object({
      eventAnchoredEffectsRequired: z.boolean(),
      ambienceContinuityRequired: z.boolean(),
      dialogueTimingBasis: z.enum([
        "guide-then-final",
        "narration-first",
        "final-only",
      ]),
    })
    .strict(),
  evidence: z
    .object({
      claimBindingRequired: z.boolean(),
      reconstructionDisclosureRequired: z.boolean(),
      rightsTraceabilityRequired: z.boolean(),
    })
    .strict(),
};

const grammarProfileDraftSchema = z.object(grammarProfileFields).strict();

export const grammarProfileSchema = z
  .object({ ...grammarProfileFields, contentHash: hashSchema })
  .strict()
  .superRefine((profile, context) => {
    const { contentHash, ...draft } = profile;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Grammar profile hash is invalid.",
      });
  });

export type GrammarProfile = z.infer<typeof grammarProfileSchema>;

const sealGrammarProfile = (
  draft: z.infer<typeof grammarProfileDraftSchema>,
): GrammarProfile => {
  const parsed = grammarProfileDraftSchema.parse(draft);
  return grammarProfileSchema.parse({
    ...parsed,
    contentHash: hashCanonical(parsed),
  });
};

export const grammarProfiles = {
  kidsAdventure: sealGrammarProfile({
    schemaVersion: "1.0",
    id: "kids-adventure-director-v1",
    kind: "kids-adventure",
    label: "Kids Adventure",
    pacing: {
      shotDurationFrames: { minimum: 48, maximum: 150 },
      reactionDelayFrames: { minimum: 4, maximum: 10 },
      comprehensionHoldFrames: { minimum: 10, maximum: 30 },
      maximumRepeatedShotSignature: 2,
    },
    performance: {
      muteReadableActionRequired: true,
      rootOnlyMotionAllowed: false,
      minimumInternalMotionChannels: 3,
      requiredPhases: ["anticipation", "action", "reaction", "settle", "hold"],
    },
    camera: {
      persistentGeographyRequired: true,
      motivatedMovementRequired: true,
      allowedMovements: ["locked", "pan", "track", "push", "pull", "reframe"],
    },
    audio: {
      eventAnchoredEffectsRequired: true,
      ambienceContinuityRequired: true,
      dialogueTimingBasis: "guide-then-final",
    },
    evidence: {
      claimBindingRequired: false,
      reconstructionDisclosureRequired: false,
      rightsTraceabilityRequired: true,
    },
  }),
  weirdHistory: sealGrammarProfile({
    schemaVersion: "1.0",
    id: "weird-history-director-v1",
    kind: "weird-history",
    label: "Frankly Weird History",
    pacing: {
      shotDurationFrames: { minimum: 24, maximum: 105 },
      reactionDelayFrames: { minimum: 2, maximum: 8 },
      comprehensionHoldFrames: { minimum: 6, maximum: 20 },
      maximumRepeatedShotSignature: 2,
    },
    performance: {
      muteReadableActionRequired: false,
      rootOnlyMotionAllowed: false,
      minimumInternalMotionChannels: 2,
      requiredPhases: ["action", "reaction", "hold"],
    },
    camera: {
      persistentGeographyRequired: true,
      motivatedMovementRequired: true,
      allowedMovements: ["locked", "pan", "track", "push", "pull", "reframe"],
    },
    audio: {
      eventAnchoredEffectsRequired: true,
      ambienceContinuityRequired: true,
      dialogueTimingBasis: "narration-first",
    },
    evidence: {
      claimBindingRequired: true,
      reconstructionDisclosureRequired: true,
      rightsTraceabilityRequired: true,
    },
  }),
} as const;

export function getGrammarProfile(
  kind: GrammarProfile["kind"],
): GrammarProfile {
  return kind === "kids-adventure"
    ? grammarProfiles.kidsAdventure
    : grammarProfiles.weirdHistory;
}
