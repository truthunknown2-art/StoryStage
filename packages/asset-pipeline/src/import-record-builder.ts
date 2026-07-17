import {basename} from "node:path";
import {
  candidateBundleSchema,
  finalizeImportRecord,
  hashCanonical,
  validateCandidateSets,
  type CandidateBundle,
  type GenerationJob,
  type ImportRecord,
  type StagedCandidate,
} from "@storystage/story-engine";

export type CreateImportRecordOptions = {
  job: GenerationJob;
  importId: string;
  sourceMode: "structured-bundle" | "loose-files";
  bundle: CandidateBundle;
  staged: StagedCandidate[];
  originalNames?: Record<string, string>;
  createdAt?: string;
};

export function createImportRecordFromStagedCandidates(options: CreateImportRecordOptions): {record: ImportRecord; missingRoleCount: number} {
  const bundle = candidateBundleSchema.parse(options.bundle);
  const {candidateSets, findings, missingRoleCount} = validateCandidateSets(options.job, bundle);
  const briefById = new Map(options.job.briefs.map((brief) => [brief.id, brief]));
  const bundleAssetById = new Map(bundle.assets.map((asset) => [asset.candidateId, asset]));
  const assets = options.staged.map((stagedCandidate) => {
    const asset = bundleAssetById.get(stagedCandidate.candidateId);
    if (!asset) throw new Error(`Staged candidate ${stagedCandidate.candidateId} is absent from its immutable manifest.`);
    const brief = briefById.get(asset.briefId);
    if (!brief) throw new Error(`Staged candidate ${stagedCandidate.candidateId} names an unknown brief.`);
    const originalName = options.originalNames?.[stagedCandidate.candidateId] ?? basename(asset.relativeFile);
    if (!stagedCandidate.checks.alphaOrMatte) findings.push({severity: "warning", code: "MANUAL_MASK_REQUIRED", candidateId: stagedCandidate.candidateId, message: `${originalName} needs matte or alpha cleanup.`});
    return {candidateId: stagedCandidate.candidateId, candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: brief.requirementId, fileRole: asset.fileRole, originalName, mediaType: asset.mediaType, width: asset.width, height: asset.height, rights: asset.rights, stagedCandidate};
  });
  findings.unshift({severity: "info", code: "BYTE_STAGING_COMPLETE", candidateId: null, message: `${assets.length} candidates were byte-verified; ${missingRoleCount} expected roles remain missing.`});
  const record = finalizeImportRecord({schemaVersion: "1.0", importId: options.importId, sourceMode: options.sourceMode, exchangeJobId: options.job.exchangeJobId, generationJobContentHash: options.job.contentHash, production: {id: options.job.production.id, revision: options.job.production.revision}, manifestContentHash: hashCanonical(bundle), candidateBundle: bundle, assets, candidateSets, findings, missingRoleCount}, options.createdAt ?? new Date().toISOString());
  return {record, missingRoleCount};
}
