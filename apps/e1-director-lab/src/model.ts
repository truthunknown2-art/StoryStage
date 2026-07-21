import liveEvidence from "../../../reports/evidence/E1-WP3/live-roundtrip.json";

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
};
