import type {ImportRecord} from "./import-record";
import type {CandidateBundle, GenerationJob} from "./model";

export type CandidateSetValidationResult = {
  candidateSets: ImportRecord["candidateSets"];
  findings: ImportRecord["findings"];
  missingRoleCount: number;
};

export function validateCandidateSets(job: GenerationJob, bundle: CandidateBundle): CandidateSetValidationResult {
  const candidateSets: ImportRecord["candidateSets"] = [];
  const findings: ImportRecord["findings"] = [];
  const candidateSetOwner = new Map<string, string>();
  const briefById = new Map(job.briefs.map((brief) => [brief.id, brief]));
  let missingRoleCount = 0;

  for (const asset of bundle.assets) {
    const brief = briefById.get(asset.briefId);
    if (!brief) throw new Error(`Candidate ${asset.candidateId} names an unknown generation brief.`);
    if (!brief.expectedFiles.includes(asset.fileRole)) throw new Error(`Candidate ${asset.candidateId} has unexpected role ${asset.fileRole}.`);
  }

  for (const brief of job.briefs) {
    const assets = bundle.assets.filter((asset) => asset.briefId === brief.id);
    const assetsBySet = new Map<string, typeof assets>();
    for (const asset of assets) {
      const owner = candidateSetOwner.get(asset.candidateSetId);
      if (owner && owner !== brief.id) throw new Error(`Candidate set ${asset.candidateSetId} is shared across unrelated briefs.`);
      candidateSetOwner.set(asset.candidateSetId, brief.id);
      assetsBySet.set(asset.candidateSetId, [...(assetsBySet.get(asset.candidateSetId) ?? []), asset]);
    }
    if (assetsBySet.size > brief.candidateCount) throw new Error(`Brief ${brief.id} returned more candidate sets than requested.`);
    missingRoleCount += (brief.candidateCount - assetsBySet.size) * brief.expectedFiles.length;
    for (const [candidateSetId, setAssets] of assetsBySet) {
      const returnedRoles = setAssets.map((asset) => asset.fileRole);
      if (new Set(returnedRoles).size !== returnedRoles.length) throw new Error(`Candidate set ${candidateSetId} repeats a file role.`);
      const missingRoles = brief.expectedFiles.filter((role) => !returnedRoles.includes(role));
      missingRoleCount += missingRoles.length;
      candidateSets.push({candidateSetId, briefId: brief.id, requirementId: brief.requirementId, expectedRoles: brief.expectedFiles, returnedRoles: [...returnedRoles].sort(), missingRoles, complete: missingRoles.length === 0});
      if (missingRoles.length > 0) findings.push({severity: "warning", code: "MISSING_CANDIDATE_SET_ROLES", candidateId: null, message: `${candidateSetId} is missing: ${missingRoles.join(", ")}.`});
    }
    if (assetsBySet.size < brief.candidateCount) findings.push({severity: "warning", code: "MISSING_CANDIDATE_SETS", candidateId: null, message: `${brief.entity.name} returned ${assetsBySet.size} of ${brief.candidateCount} requested candidate sets.`});
  }
  return {candidateSets, findings, missingRoleCount};
}
