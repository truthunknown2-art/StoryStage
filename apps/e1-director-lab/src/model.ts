import liveEvidence from "../../../reports/evidence/E1-WP3/live-roundtrip.json";
import failureGateEvidence from "../../../reports/evidence/E1-WP4/failure-matrix.json";

export type ProposalChange =
  | { kind: "camera-intent"; intent: string }
  | {
      kind: "performance-cue";
      entityId: string;
      capability: string;
      cue: string;
    }
  | { kind: "layer-emphasis"; layerId: string; emphasis: string };

export type ProposalLabModel = {
  source: "live-pinned-runtime";
  observedAt: string;
  runtimeVersion: string;
  scope: { projectId: string; sceneId: string; beatId: string };
  proposal: {
    summary: string;
    rationale: string;
    changes: ProposalChange[];
  };
  streamFragmentCount: number;
  timeline: Array<{
    sequence: number;
    kind: string;
    tool?: string;
    status?: string;
  }>;
  applyReason: string;
  failureGate: FailureGateModel;
};

export type FailureGateCase = {
  id: string;
  title: string;
  state: string;
  code: string;
  creatorMessage: string;
  recoveryAction: string;
  recoveryOutcome: string;
  evidenceClass: "deterministic-executable-fixture";
  automaticRetry: false;
  hiddenFallback: false;
  credentialAccessAllowed: false;
  projectMutationAllowed: false;
};

export type FailureGateModel = {
  evidenceClass: string;
  cases: FailureGateCase[];
  securityChecks: Array<{ id: string }>;
  knownLimitations: string[];
};

export const liveProposalLabModel: ProposalLabModel = {
  source: liveEvidence.source as "live-pinned-runtime",
  observedAt: liveEvidence.observedAt,
  runtimeVersion: liveEvidence.runtime.cliVersion,
  scope: liveEvidence.scope,
  proposal: liveEvidence.proposal as ProposalLabModel["proposal"],
  streamFragmentCount: liveEvidence.eventTimeline.filter(
    (event) => event.kind === "agent-delta",
  ).length,
  timeline: liveEvidence.eventTimeline.filter(
    (event) => event.kind !== "agent-delta",
  ),
  applyReason: liveEvidence.reviewAuthority.applyReason,
  failureGate: {
    evidenceClass: failureGateEvidence.evidenceClass,
    cases: failureGateEvidence.cases as FailureGateCase[],
    securityChecks: failureGateEvidence.securityChecks,
    knownLimitations: failureGateEvidence.knownLimitations,
  },
};
