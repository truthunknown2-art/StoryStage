import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

export const cv002ArtDirectionGrammarSchema = z.enum([
  "kids-adventure",
  "weird-history",
]);

export const cv002KidsArtDirectionOptionIdSchema = z.enum([
  "storybook-watercolor-paper-cutout",
  "cut-paper-collage-mixed-media",
  "soft-2d-digital-illustration",
]);

export const cv002WeirdHistoryArtDirectionOptionIdSchema = z.literal(
  "weird-history-editorial-collage",
);

export const cv002ArtDirectionOptionIdSchema = z.union([
  cv002KidsArtDirectionOptionIdSchema,
  cv002WeirdHistoryArtDirectionOptionIdSchema,
]);

export const cv002ArtDirectionReferenceSetSchema = z
  .object({
    id: identifierSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    contentHash: hashSchema,
  })
  .strict();

export type Cv002ArtDirectionGrammar = z.infer<
  typeof cv002ArtDirectionGrammarSchema
>;
export type Cv002ArtDirectionOptionId = z.infer<
  typeof cv002ArtDirectionOptionIdSchema
>;
export type Cv002ArtDirectionReferenceSet = z.infer<
  typeof cv002ArtDirectionReferenceSetSchema
>;

/**
 * These hashes bind the creator's direction to the full canonical reference
 * bytes tracked by the repository. They intentionally do not identify the
 * compressed/cropped images used by the Create screen.
 */
const olloEnvironmentReferenceSet = Object.freeze({
  id: "ollo-friends-environment-art-direction-board",
  version: "1.0.0",
  contentHash:
    "d8fb05e2eeb63b2d8a1397f4aa43a5c4ad28d3cac333ce5b48f0a9bb7b41c30d",
} as const satisfies Cv002ArtDirectionReferenceSet);

const weirdHistoryReferenceSetManifestFields = {
  schemaVersion: z.literal("1.0"),
  id: z.literal("weird-history-editorial-collage-reference-set"),
  version: z.literal("1.0.0"),
  sources: z.tuple([
    z
      .object({
        role: z.literal("directing-study"),
        id: z.literal("reference-direction-study"),
        version: z.literal("1.0.0"),
        contentHash: z.literal(
          "2268f8ffe7646d8e868ea6cb72d9624903137104355ef6547ccbf56ef9b5c6a5",
        ),
      })
      .strict(),
    z
      .object({
        role: z.literal("presenter-identity-authority"),
        id: z.literal("weird-history-rook-v1"),
        version: z.literal("1.0.0"),
        contentHash: z.literal(
          "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691",
        ),
      })
      .strict(),
  ]),
};

const weirdHistoryReferenceSetManifestDraftSchema = z
  .object(weirdHistoryReferenceSetManifestFields)
  .strict();

export const cv002WeirdHistoryReferenceSetManifestSchema = z
  .object({
    ...weirdHistoryReferenceSetManifestFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((manifest, context) => {
    const { contentHash, ...draft } = manifest;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Weird History reference-set manifest hash is invalid.",
      });
  });

const weirdHistoryReferenceSetManifestDraft =
  weirdHistoryReferenceSetManifestDraftSchema.parse({
    schemaVersion: "1.0",
    id: "weird-history-editorial-collage-reference-set",
    version: "1.0.0",
    sources: [
      {
        role: "directing-study",
        id: "reference-direction-study",
        version: "1.0.0",
        // SHA-256 of the canonical repository blob for
        // docs/REFERENCE-DIRECTION-STUDY.md (normalized LF bytes).
        contentHash:
          "2268f8ffe7646d8e868ea6cb72d9624903137104355ef6547ccbf56ef9b5c6a5",
      },
      {
        role: "presenter-identity-authority",
        id: "weird-history-rook-v1",
        version: "1.0.0",
        // Canonical contentHash in the tracked Rook candidate manifest.
        contentHash:
          "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691",
      },
    ],
  });

export const cv002WeirdHistoryReferenceSetManifest =
  cv002WeirdHistoryReferenceSetManifestSchema.parse({
    ...weirdHistoryReferenceSetManifestDraft,
    contentHash: hashCanonical(weirdHistoryReferenceSetManifestDraft),
  });

const weirdHistoryEditorialReferenceSet = Object.freeze({
  id: cv002WeirdHistoryReferenceSetManifest.id,
  version: cv002WeirdHistoryReferenceSetManifest.version,
  contentHash: cv002WeirdHistoryReferenceSetManifest.contentHash,
} as const satisfies Cv002ArtDirectionReferenceSet);

export const cv002ArtDirectionRegistry = Object.freeze({
  "kids-adventure": Object.freeze({
    "storybook-watercolor-paper-cutout": olloEnvironmentReferenceSet,
    "cut-paper-collage-mixed-media": olloEnvironmentReferenceSet,
    "soft-2d-digital-illustration": olloEnvironmentReferenceSet,
  }),
  "weird-history": Object.freeze({
    "weird-history-editorial-collage": weirdHistoryEditorialReferenceSet,
  }),
} as const);

const artDirectionSelectionFields = {
  schemaVersion: z.literal("1.0"),
  grammar: cv002ArtDirectionGrammarSchema,
  optionId: cv002ArtDirectionOptionIdSchema,
  referenceSet: cv002ArtDirectionReferenceSetSchema,
  selectedBy: z.literal("creator"),
  usage: z.literal("direction-reference-only"),
};

const cv002ArtDirectionSelectionDraftSchema = z
  .object(artDirectionSelectionFields)
  .strict();

const referenceSetFor = (
  grammar: Cv002ArtDirectionGrammar,
  optionId: Cv002ArtDirectionOptionId,
): Cv002ArtDirectionReferenceSet | null => {
  if (grammar === "kids-adventure") {
    const result = cv002KidsArtDirectionOptionIdSchema.safeParse(optionId);
    return result.success
      ? cv002ArtDirectionRegistry[grammar][result.data]
      : null;
  }
  const result = cv002WeirdHistoryArtDirectionOptionIdSchema.safeParse(optionId);
  return result.success
    ? cv002ArtDirectionRegistry[grammar][result.data]
    : null;
};

export const cv002ArtDirectionSelectionSchema = z
  .object({ ...artDirectionSelectionFields, contentHash: hashSchema })
  .strict()
  .superRefine((selection, context) => {
    const { contentHash, ...draft } = selection;
    const authoritativeReference = referenceSetFor(
      selection.grammar,
      selection.optionId,
    );
    if (!authoritativeReference)
      context.addIssue({
        code: "custom",
        path: ["optionId"],
        message: "Art direction option is not available for this grammar.",
      });
    else if (
      authoritativeReference.id !== selection.referenceSet.id ||
      authoritativeReference.version !== selection.referenceSet.version ||
      authoritativeReference.contentHash !== selection.referenceSet.contentHash
    )
      context.addIssue({
        code: "custom",
        path: ["referenceSet"],
        message:
          "Art direction selection does not bind the canonical reference set.",
      });
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Art direction selection hash is invalid.",
      });
  });

export type Cv002ArtDirectionSelection = z.infer<
  typeof cv002ArtDirectionSelectionSchema
>;

export function createCv002ArtDirectionSelection(
  grammar: Cv002ArtDirectionGrammar,
  optionId: Cv002ArtDirectionOptionId,
): Cv002ArtDirectionSelection {
  const parsedGrammar = cv002ArtDirectionGrammarSchema.parse(grammar);
  const parsedOptionId = cv002ArtDirectionOptionIdSchema.parse(optionId);
  const referenceSet = referenceSetFor(parsedGrammar, parsedOptionId);
  if (!referenceSet)
    throw new Error("Art direction option is not available for this grammar.");
  const draft = cv002ArtDirectionSelectionDraftSchema.parse({
    schemaVersion: "1.0",
    grammar: parsedGrammar,
    optionId: parsedOptionId,
    referenceSet,
    selectedBy: "creator",
    usage: "direction-reference-only",
  });
  return cv002ArtDirectionSelectionSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export function validateCv002ArtDirectionSelection(
  selection: unknown,
): Cv002ArtDirectionSelection {
  return cv002ArtDirectionSelectionSchema.parse(selection);
}

export function createDefaultCv002ArtDirectionSelection(
  grammar: Cv002ArtDirectionGrammar,
): Cv002ArtDirectionSelection {
  return grammar === "kids-adventure"
    ? createCv002ArtDirectionSelection(
        grammar,
        "cut-paper-collage-mixed-media",
      )
    : createCv002ArtDirectionSelection(
        grammar,
        "weird-history-editorial-collage",
      );
}
