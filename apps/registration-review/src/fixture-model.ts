import type {
  JointOrbitSample,
  RegistrationReviewPresentation,
  RegistrationViewModel,
  UnresolvedRequirement,
} from "./presentation-model";

/**
 * Explicit TEST/DEVELOPMENT fixture. Hand-projected from the host's exact
 * m1-static-v8 registration artifacts for UI development and truth tests. It
 * is never host-verified evidence: the app marks it persistently as a test
 * fixture through `isTestFixture`, and it is reachable only through the
 * explicit fixture host entry point.
 *
 * Every value here mirrors the real measured artifact state (counts, hashes,
 * requirement IDs and reasons, gap/orbit samples, mask summaries).
 * `counts.joints` carries the exact number of `packet/joint-evidence/` sets
 * recorded for the view (front 32, profile-left 29, profile-right 29) — never
 * a sockets-plus-attachments sum. The joint/orbit rows are the view's
 * complete `gap-orbit-measurements.json` sample set (16/16/17 attachments).
 */

const v8AggregateHash =
  "a90d1565b1fa4966d63193f56af2ccd8e44d1cbe4078a134e4e554ddfe6299a1";

const viewHashes: Record<
  string,
  { measurement: string; effective: string; gate: string }
> = {
  front: {
    measurement:
      "6f414199449e0497a0979648e57c62bbf2ba5bd3d5b0ddd4630e10bdaaaeb7ed",
    effective:
      "624e1f0a5ae2d219a7fae7bf1769f75316aec5d9359c96d7f7dd29e01a412b99",
    gate: "c11e9d91bcad2700f7db107b4c0c9437897c7cc1fd9a5364baff5f38754924fb",
  },
  "profile-left": {
    measurement:
      "23fed70343ba54625728c31b41220c2cdb1ed4630a8dcd138a7b2d9b43bb74bf",
    effective:
      "25e073dc31e2f86c846b33a0d8c1788367ec6a7e4d46e51d0b14c188fadf9db1",
    gate: "5d90d3ff5d9720492b608b9388e3cea5e225d16d53a8599f063386efa48cecae",
  },
  "profile-right": {
    measurement:
      "c755e5d22674041281aac737ef75ce069455705d9af4c9bc9aa91df4c15efeab",
    effective:
      "316178d2970bc2f9aca8285de9fb157a283656bf0add81cf6f89df5854e63414",
    gate: "4295969027df47815b7a3ab3488704dfd15a3cd02afbc369600301a3c14f7b66",
  },
};

const imageKinds = [
  "original",
  "seams",
  "rest",
  "minus-15",
  "zero",
  "plus-15",
  "gap-orbit",
  "z-order-near-far",
  "masked",
] as const;

/**
 * Exact image references from the KCAST-001 private-registration diagnostic
 * run m1-static-v8 (read-only artifact tree). SHA-256 digests and dimensions
 * are the real values of the referenced PNGs.
 */
const imageSha256: Record<
  "front" | "profile-left" | "profile-right",
  Record<(typeof imageKinds)[number], string>
> = {
  front: {
    original: "d855e4c3f16bf8068f4460bcbf650b8e03428ad9f2305a1a4b4c774ba36a3d77",
    seams: "94bfe7e6322f5dfcc071fd9a23ac32dfb314ac6d303b2a66307abf163d3b7b4e",
    rest: "46d711e279b713bbec6c3c2f425c234311518d746a420db9c1bd139fc447719f",
    "minus-15": "19409d94d46c26ac81fe8bc9ef86ab064f4e7dbf35f64fca953edf266be056ab",
    zero: "07eb989bf02cb305453e755e5eb742b5bbc465547ec72b9441e911e377baafe8",
    "plus-15": "1bd49d8841d4484c4eb0ef19d67eba13b1a687607b3cabb74dfb4edd20e64a62",
    "gap-orbit": "40c8552b31011b39d4bed3f504cdc1b86526451f202262c5ee2e905f4c55ce06",
    "z-order-near-far": "9d486c21ab67919c0d4d6c44ac38364bf6f6fad925376ee0adcd0e3910e5ad27",
    masked: "4612067bdcc39a3c5ce6d1205e3853c3c47b8b1c91fa7ddfb30afee181ea724f",
  },
  "profile-left": {
    original: "75f8c50de1c72ce492ed1d9b11fae2be4f3c6fa2714a895a499e9a2cf583a23e",
    seams: "8065b294e737aba414e49ceb9b5bc36a0e393c15f3a9e4ec19cffe8b42bbb1c9",
    rest: "f6513e72c536422104c8e07ede1bc14afccf6c24371119ac2616739b5dcc71c6",
    "minus-15": "81a32c782465ecddb0dc451da66687bebe26ea43b1113352b6de5d6a8c596e9b",
    zero: "25d38887662ca89924239a05c2eeed0e77d0be225151d88b90d14bdaad557979",
    "plus-15": "686867d7c691610420adf9190d6917562f16a9a9c1b1107b880d92e65eb4bb7a",
    "gap-orbit": "69dbfe8adf8fab578b96d776b3a35b4363b10867d688fa601e29ccc0cf40bd35",
    "z-order-near-far": "1b4e28b0b6509cb4b4dc82c9423ab5dc8f001969b982c021dc6d5c6786e0f34a",
    masked: "9d0b651882b7304fd7c51f77bec9d6372aba6dc500af4bcf02cde6ce32f17515",
  },
  "profile-right": {
    original: "a06186a2ec5c11d324c051302ffabb4e0ce7f26a2bfdb0a6634690c54574dc9f",
    seams: "3d28b985a696572d0e61db1c068ccf0a450005bf93c4571d9f9a3659f4041329",
    rest: "e8b6d83e672b7612281eea1287773e65341197b6126b03e57e95df8eacdc6244",
    "minus-15": "5f5d72e0a9e3034ec39ba69f16b28252cb99a931f4daf903f67dd2b8e75e46be",
    zero: "fdb1435acb94b80d54bf040bb27a30f5a75f1a8e4655cbc2ff3a9745e32ad7db",
    "plus-15": "4dd7fcf4066799abf3b2df714e0e8ba53c2b3dad8926fc71270776aa70e628bb",
    "gap-orbit": "867ef4849cf4d6744e05d1fbf21c54a012d9b8bca7c3d9fd67719562f716aa94",
    "z-order-near-far": "dc1caf8ca12f371e1c15ba3a9d0c0b9030c05ab67a8ced604916997de6d38e3f",
    masked: "811aaf3bf7d2c445c81ee146a74b8f5713eb522f2080f27d9f8eb1616ad7fa40",
  },
};

const imagesFor = (
  view: keyof typeof imageSha256,
): RegistrationViewModel["images"] =>
  imageKinds.map((kind) => ({
    kind,
    url: `/evidence/m1-static-v8-${view}/${kind}.png`,
    sha256: imageSha256[view][kind],
    width: 1920,
    height: 1080,
  }));

const tailRequirement = (view: string): UnresolvedRequirement => ({
  requirementId: `${view}-pelvis-tail-base-distal`,
  componentRole: "pelvis",
  featureClass: "articulation-distal",
  topologyEdge: {
    parentRole: "pelvis",
    childRole: "tail",
    socketId: "tail-base",
  },
  status: "missing",
  reasonCode: "missing-feature",
  detail: `No unique coordinate-free parent seam is present for pelvis:tail-base. The distal guide point is missing or leaves exact hashed parent support; it was not clamped.`,
  sourceFeatureIds: [],
  proposalState: "unreferenced",
  displayBasis: "unresolved-blocked",
});

const scarfRequirement = (
  view: string,
  side: "back" | "front",
): UnresolvedRequirement => ({
  requirementId: `${view}-secondary-${side}-mask`,
  componentRole: `secondary-${side}`,
  featureClass: "mask-only",
  topologyEdge: null,
  status: "alpha-indistinguishable",
  reasonCode: "alpha-indistinguishable-mask",
  detail:
    "Decorative scarf support blends into semantic artwork; alpha alone cannot authorize a hinge or complete mask. Exact alpha cannot isolate this mask-only support; Preston correction or regenerated source is required.",
  sourceFeatureIds: [],
  proposalState: "unreferenced",
  displayBasis: "unresolved-blocked",
});

const frontJoints: JointOrbitSample[] = [
  {
    attachmentId: "front-head-ear-left",
    parentRole: "head",
    childRole: "ear-left",
    socketId: "ear-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 127624582, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 125001834, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 121293234, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-head-ear-right",
    parentRole: "head",
    childRole: "ear-right",
    socketId: "ear-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 120992008, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 124923710, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 127742491, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-lower-arm-left-hand-left",
    parentRole: "lower-arm-left",
    childRole: "hand-left",
    socketId: "wrist-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12909462, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 13498708, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 14614299, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-lower-arm-right-hand-right",
    parentRole: "lower-arm-right",
    childRole: "hand-right",
    socketId: "wrist-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12910097, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 11969627, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11696728, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-lower-leg-left-foot-left",
    parentRole: "lower-leg-left",
    childRole: "foot-left",
    socketId: "ankle-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 9939724, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 10873279, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11642662, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-lower-leg-right-foot-right",
    parentRole: "lower-leg-right",
    childRole: "foot-right",
    socketId: "ankle-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 11484794, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 10723633, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 9803445, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-pelvis-upper-leg-left",
    parentRole: "pelvis",
    childRole: "upper-leg-left",
    socketId: "hip-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 2741165, heat: "review" },
      { angleDegrees: 0, gapMicropixels: 2741165, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 2741165, heat: "review" },
    ],
  },
  {
    attachmentId: "front-pelvis-upper-leg-right",
    parentRole: "pelvis",
    childRole: "upper-leg-right",
    socketId: "hip-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 2849717, heat: "review" },
      { angleDegrees: 0, gapMicropixels: 2849717, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 2849717, heat: "review" },
    ],
  },
  {
    attachmentId: "front-torso-head",
    parentRole: "torso",
    childRole: "head",
    socketId: "neck",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12434020, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 12434020, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 12434020, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-torso-pelvis",
    parentRole: "torso",
    childRole: "pelvis",
    socketId: "pelvis",
    angles: [
      { angleDegrees: -15, gapMicropixels: 26456360, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 25760211, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 25577201, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-torso-upper-arm-left",
    parentRole: "torso",
    childRole: "upper-arm-left",
    socketId: "shoulder-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 92452443, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 93156355, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 94042110, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-torso-upper-arm-right",
    parentRole: "torso",
    childRole: "upper-arm-right",
    socketId: "shoulder-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 93837536, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 93298096, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 93005615, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-upper-arm-left-lower-arm-left",
    parentRole: "upper-arm-left",
    childRole: "lower-arm-left",
    socketId: "elbow-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 6980649, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 8944480, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11024526, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-upper-arm-right-lower-arm-right",
    parentRole: "upper-arm-right",
    childRole: "lower-arm-right",
    socketId: "elbow-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12776240, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 11005262, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 9381708, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-upper-leg-left-lower-leg-left",
    parentRole: "upper-leg-left",
    childRole: "lower-leg-left",
    socketId: "knee-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 7972195, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 8495537, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 9137604, heat: "fail" },
    ],
  },
  {
    attachmentId: "front-upper-leg-right-lower-leg-right",
    parentRole: "upper-leg-right",
    childRole: "lower-leg-right",
    socketId: "knee-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 9713624, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 9151118, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 8696410, heat: "fail" },
    ],
  },
];

const leftJoints: JointOrbitSample[] = [
  {
    attachmentId: "profile-left-head-ear-left",
    parentRole: "head",
    childRole: "ear-left",
    socketId: "ear-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 20060716, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 20060716, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 20060716, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-head-ear-right",
    parentRole: "head",
    childRole: "ear-right",
    socketId: "ear-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 20958640, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 20958640, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 20958640, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-lower-arm-left-hand-left",
    parentRole: "lower-arm-left",
    childRole: "hand-left",
    socketId: "wrist-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 11536641, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 10119709, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 8954924, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-lower-arm-right-hand-right",
    parentRole: "lower-arm-right",
    childRole: "hand-right",
    socketId: "wrist-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 5241005, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 3954771, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 2956818, heat: "review" },
    ],
  },
  {
    attachmentId: "profile-left-lower-leg-left-foot-left",
    parentRole: "lower-leg-left",
    childRole: "foot-left",
    socketId: "ankle-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 6775487, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 6775487, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 6775487, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-lower-leg-right-foot-right",
    parentRole: "lower-leg-right",
    childRole: "foot-right",
    socketId: "ankle-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 16546522, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 18758890, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 21262789, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-pelvis-upper-leg-left",
    parentRole: "pelvis",
    childRole: "upper-leg-left",
    socketId: "hip-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 2855451, heat: "review" },
      { angleDegrees: 0, gapMicropixels: 2855451, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 2855451, heat: "review" },
    ],
  },
  {
    attachmentId: "profile-left-pelvis-upper-leg-right",
    parentRole: "pelvis",
    childRole: "upper-leg-right",
    socketId: "hip-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 2096190, heat: "review" },
      { angleDegrees: 0, gapMicropixels: 2096190, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 2096190, heat: "review" },
    ],
  },
  {
    attachmentId: "profile-left-torso-head",
    parentRole: "torso",
    childRole: "head",
    socketId: "neck",
    angles: [
      { angleDegrees: -15, gapMicropixels: 15710705, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 14667759, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 13378900, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-torso-pelvis",
    parentRole: "torso",
    childRole: "pelvis",
    socketId: "pelvis",
    angles: [
      { angleDegrees: -15, gapMicropixels: 63547445, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 65289490, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 67199779, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-torso-upper-arm-left",
    parentRole: "torso",
    childRole: "upper-arm-left",
    socketId: "shoulder-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 5860370, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 5860370, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 5860370, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-torso-upper-arm-right",
    parentRole: "torso",
    childRole: "upper-arm-right",
    socketId: "shoulder-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 4226063, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 4226063, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 4226063, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-upper-arm-left-lower-arm-left",
    parentRole: "upper-arm-left",
    childRole: "lower-arm-left",
    socketId: "elbow-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 19976717, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 19112949, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 18366595, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-upper-arm-right-lower-arm-right",
    parentRole: "upper-arm-right",
    childRole: "lower-arm-right",
    socketId: "elbow-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 15405040, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 14860648, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 14504994, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-upper-leg-left-lower-leg-left",
    parentRole: "upper-leg-left",
    childRole: "lower-leg-left",
    socketId: "knee-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 11364114, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 11108555, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11045909, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-left-upper-leg-right-lower-leg-right",
    parentRole: "upper-leg-right",
    childRole: "lower-leg-right",
    socketId: "knee-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12688584, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 13100499, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 13620440, heat: "fail" },
    ],
  },
];

const rightJoints: JointOrbitSample[] = [
  {
    attachmentId: "profile-right-head-ear-left",
    parentRole: "head",
    childRole: "ear-left",
    socketId: "ear-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 16868108, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 16868108, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 16868108, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-head-ear-right",
    parentRole: "head",
    childRole: "ear-right",
    socketId: "ear-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 22339201, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 22339201, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 22339201, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-lower-arm-left-hand-left",
    parentRole: "lower-arm-left",
    childRole: "hand-left",
    socketId: "wrist-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 13574359, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 16476830, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 19347483, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-lower-arm-right-hand-right",
    parentRole: "lower-arm-right",
    childRole: "hand-right",
    socketId: "wrist-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 9848619, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 12562807, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 15159995, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-lower-leg-left-foot-left",
    parentRole: "lower-leg-left",
    childRole: "foot-left",
    socketId: "ankle-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 8428240, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 8428240, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 8428240, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-lower-leg-right-foot-right",
    parentRole: "lower-leg-right",
    childRole: "foot-right",
    socketId: "ankle-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 5827573, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 3442011, heat: "review" },
      { angleDegrees: 15, gapMicropixels: 3448335, heat: "review" },
    ],
  },
  {
    attachmentId: "profile-right-pelvis-tail",
    parentRole: "pelvis",
    childRole: "tail",
    socketId: "tail-base",
    angles: [
      { angleDegrees: -15, gapMicropixels: 39110206, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 33503141, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 28538740, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-pelvis-upper-leg-left",
    parentRole: "pelvis",
    childRole: "upper-leg-left",
    socketId: "hip-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 4076862, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 4076862, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 4076862, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-pelvis-upper-leg-right",
    parentRole: "pelvis",
    childRole: "upper-leg-right",
    socketId: "hip-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 4153907, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 4153907, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 4153907, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-torso-head",
    parentRole: "torso",
    childRole: "head",
    socketId: "neck",
    angles: [
      { angleDegrees: -15, gapMicropixels: 13416405, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 13416405, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 13416405, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-torso-pelvis",
    parentRole: "torso",
    childRole: "pelvis",
    socketId: "pelvis",
    angles: [
      { angleDegrees: -15, gapMicropixels: 42677666, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 42067223, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 42818209, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-torso-upper-arm-left",
    parentRole: "torso",
    childRole: "upper-arm-left",
    socketId: "shoulder-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 6248354, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 6248354, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 6248354, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-torso-upper-arm-right",
    parentRole: "torso",
    childRole: "upper-arm-right",
    socketId: "shoulder-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 5699073, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 5699073, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 5699073, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-upper-arm-left-lower-arm-left",
    parentRole: "upper-arm-left",
    childRole: "lower-arm-left",
    socketId: "elbow-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 22918599, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 23285960, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 23953469, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-upper-arm-right-lower-arm-right",
    parentRole: "upper-arm-right",
    childRole: "lower-arm-right",
    socketId: "elbow-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 20205870, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 20285065, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 20669761, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-upper-leg-left-lower-leg-left",
    parentRole: "upper-leg-left",
    childRole: "lower-leg-left",
    socketId: "knee-left",
    angles: [
      { angleDegrees: -15, gapMicropixels: 10789124, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 11254102, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11897687, heat: "fail" },
    ],
  },
  {
    attachmentId: "profile-right-upper-leg-right-lower-leg-right",
    parentRole: "upper-leg-right",
    childRole: "lower-leg-right",
    socketId: "knee-right",
    angles: [
      { angleDegrees: -15, gapMicropixels: 12840019, heat: "fail" },
      { angleDegrees: 0, gapMicropixels: 12283327, heat: "fail" },
      { angleDegrees: 15, gapMicropixels: 11928957, heat: "fail" },
    ],
  },
];

const viewModel = (
  view: "front" | "profile-left" | "profile-right",
  unresolvedCount: number,
  jointsTotal: number,
  joints: JointOrbitSample[],
  mask: {
    componentId: string;
    semanticRole: string;
    originalPngContentHash: string;
    maskedPngContentHash: string;
    maskedPixelCount: number;
    viewMaskEntryCount: number;
  },
  unresolved: UnresolvedRequirement[],
): RegistrationViewModel => ({
  view,
  decision: "needs-registration-correction",
  counts: {
    components: 29,
    joints: jointsTotal,
    unresolved: unresolvedCount,
  },
  measurementReportContentHash: viewHashes[view]!.measurement,
  effectiveProposalContentHash: viewHashes[view]!.effective,
  gateContentHash: viewHashes[view]!.gate,
  images: imagesFor(view),
  joints,
  maskSummaries: [mask],
  unresolvedRequirements: unresolved,
});

export const registrationReviewFixture: RegistrationReviewPresentation = {
  candidate: {
    id: "ollo-candidate-i",
    label: "Ollo / Candidate I",
  },
  aggregate: {
    contentHash: v8AggregateHash,
    allViewsAccepted: false,
    motionDiagnosticAuthorized: false,
    decision: "needs-registration-correction",
  },
  views: [
    viewModel(
      "front",
      3,
      32,
      frontJoints,
      {
        componentId: "part-torso",
        semanticRole: "torso",
        originalPngContentHash:
          "8cc8a4989dc18e8dfc4cd9633c4421871d5f262595b2b8e48dba53468daaa05d",
        maskedPngContentHash:
          "5a5550211075f893672ebb1b86557aaa6f92dc39d70469260c9dc6b3968d6343",
        maskedPixelCount: 5935,
        viewMaskEntryCount: 18,
      },
      [
        tailRequirement("front"),
        scarfRequirement("front", "back"),
        scarfRequirement("front", "front"),
      ],
    ),
    viewModel(
      "profile-left",
      3,
      29,
      leftJoints,
      {
        componentId: "part-torso",
        semanticRole: "torso",
        originalPngContentHash:
          "717fc9f04fcab4c51ae68330d5ee35698b1ef3ed11c156cfa0a98696f4a34da2",
        maskedPngContentHash:
          "7ad0f84cf0ca465f94e752bff83c740734c6e0838fcb4d00f513bd0ee0fe7d22",
        maskedPixelCount: 2828,
        viewMaskEntryCount: 17,
      },
      [
        tailRequirement("profile-left"),
        scarfRequirement("profile-left", "back"),
        scarfRequirement("profile-left", "front"),
      ],
    ),
    viewModel(
      "profile-right",
      2,
      29,
      rightJoints,
      {
        componentId: "part-torso",
        semanticRole: "torso",
        originalPngContentHash:
          "ce9497d5b2396c39a5a2a2ed6d613e38a41d10477b20e06d8661c76258467d2f",
        maskedPngContentHash:
          "aecb9aa381da884db35dc67ec2f8f1ef66815ebd8b9f939449392e021fd1a594",
        maskedPixelCount: 2067,
        viewMaskEntryCount: 17,
      },
      [
        scarfRequirement("profile-right", "back"),
        scarfRequirement("profile-right", "front"),
      ],
    ),
  ],
  isTestFixture: true,
};

/** Variant with several unavailable diagnostic images, for unavailable-state tests. */
export const registrationReviewFixtureWithMissingImages: RegistrationReviewPresentation =
  {
    ...registrationReviewFixture,
    views: registrationReviewFixture.views.map((view, index) => ({
      ...view,
      images: view.images.map((image, imageIndex) =>
        (index + imageIndex) % 3 === 0 ? { ...image, url: null } : image,
      ),
    })),
  };
