/**
 * Read-only presentation model for the private Ollo registration review app.
 *
 * This type is local to the review app: it is a lossless projection of
 * already-validated host registration artifacts (measurement report,
 * registration proposal, diagnostic receipt, gap/orbit measurements, and the
 * all-view gate bundle). It is NOT a new canonical engine schema, and the app
 * never recalculates authority from it. Every displayed value — counts,
 * unresolved requirements, joint samples, mask summaries, hashes — must come
 * from this model, never from constants written into component copy.
 */

export type RegistrationViewId = "front" | "profile-left" | "profile-right";

export type DiagnosticTabKind =
  | "original"
  | "seams"
  | "rest"
  | "minus-15"
  | "zero"
  | "plus-15"
  | "gap-orbit"
  | "z-order-near-far"
  | "masked";

export interface DiagnosticImageReference {
  kind: DiagnosticTabKind;
  /** Exact host-supplied image URL, or null when the artifact is unavailable. */
  url: string | null;
  sha256: string;
  width: number;
  height: number;
}

export interface UnresolvedRequirement {
  requirementId: string;
  componentRole: string;
  featureClass:
    | "articulation-proximal"
    | "articulation-distal"
    | "rigid-registration"
    | "mask-only";
  topologyEdge: {
    parentRole: string;
    childRole: string;
    socketId: string;
  } | null;
  status:
    | "missing"
    | "insufficient"
    | "ambiguous"
    | "alpha-indistinguishable"
    | "detected";
  reasonCode: string;
  detail: string;
  sourceFeatureIds: string[];
  proposalState: "referenced" | "unreferenced";
  displayBasis: "unresolved-blocked";
}

export interface JointOrbitSample {
  attachmentId: string;
  parentRole: string;
  childRole: string;
  socketId: string;
  angles: Array<{
    angleDegrees: -15 | 0 | 15;
    gapMicropixels: number;
    heat: "pass" | "review" | "fail";
  }>;
}

export interface MaskEvidenceSummary {
  componentId: string;
  semanticRole: string;
  originalPngContentHash: string;
  maskedPngContentHash: string;
  maskedPixelCount: number;
  /** Total mask-derivation entries recorded for this view. */
  viewMaskEntryCount: number;
}

export interface RegistrationViewModel {
  view: RegistrationViewId;
  decision: "accepted-static-gate-one" | "needs-registration-correction" | "regenerate-source";
  counts: {
    /** Measured components in the view's measurement report. */
    components: number;
    /** Proposal joint records (sockets plus attachments). */
    joints: number;
    /** Unresolved requirements in the view's proposal. */
    unresolved: number;
  };
  measurementReportContentHash: string;
  effectiveProposalContentHash: string;
  gateContentHash: string;
  images: DiagnosticImageReference[];
  joints: JointOrbitSample[];
  maskSummaries: MaskEvidenceSummary[];
  unresolvedRequirements: UnresolvedRequirement[];
}

export interface RegistrationReviewPresentation {
  candidate: {
    id: string;
    label: string;
  };
  aggregate: {
    contentHash: string;
    allViewsAccepted: boolean;
    motionDiagnosticAuthorized: boolean;
    decision: "accepted-static-gate-one" | "needs-registration-correction" | "regenerate-source";
  };
  views: RegistrationViewModel[];
  /**
   * True only when this model was produced by the explicit test/development
   * fixture entry point. The UI must then show a persistent
   * `TEST FIXTURE — NOT PRODUCTION EVIDENCE` banner. Host-verified artifacts
   * always carry false.
   */
  isTestFixture: boolean;
}
