import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {hashSchema, identifierSchema, type ProductionDraft} from "./model";

const scriptApprovalRecordFields = {
  schemaVersion: z.literal("1.0"),
  productionId: identifierSchema,
  scriptContentHash: hashSchema,
  decision: z.literal("approved"),
  reviewMethod: z.literal("human-editorial-review"),
  approvedAt: z.string().datetime(),
};

export const scriptApprovalRecordSchema = z.object({
  ...scriptApprovalRecordFields,
  contentHash: hashSchema,
}).strict();

export type ScriptApprovalRecord = z.infer<typeof scriptApprovalRecordSchema>;
export type ScriptApprovalProduction = Pick<ProductionDraft, "productionId" | "script">;

export function getScriptContentHash(script: string): string {
  return hashCanonical({script});
}

export function finalizeScriptApprovalRecord(production: ScriptApprovalProduction, approvedAt: string): ScriptApprovalRecord {
  const unhashed = {
    schemaVersion: "1.0" as const,
    productionId: production.productionId,
    scriptContentHash: getScriptContentHash(production.script),
    decision: "approved" as const,
    reviewMethod: "human-editorial-review" as const,
    approvedAt,
  };
  return scriptApprovalRecordSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyScriptApprovalRecordHash(recordInput: ScriptApprovalRecord): boolean {
  const parsed = scriptApprovalRecordSchema.safeParse(recordInput);
  if (!parsed.success) return false;
  const {contentHash, ...unhashed} = parsed.data;
  return hashCanonical(unhashed) === contentHash;
}

export function scriptApprovalMatchesProduction(record: ScriptApprovalRecord | null | undefined, production: ScriptApprovalProduction): boolean {
  return Boolean(record
    && verifyScriptApprovalRecordHash(record)
    && record.productionId === production.productionId
    && record.scriptContentHash === getScriptContentHash(production.script));
}
