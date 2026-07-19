import {
  candidateRigReviewRegistrationPlanSchema,
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigExposureRoleSchema,
  characterRigImportReceiptSchema,
  characterRigPartRoleSchema,
  characterRigStagingReportSchema,
  compileCandidateRigReviewRenderInput,
  compileCandidateRigReviewVisualProgram,
  createCharacterRigPreparationRecipe,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
  validateCharacterRigImportReceipt,
  type CandidateRigReviewRegistrationPlan,
  type CandidateRigReviewRenderInput,
  type CandidateRigReviewVisualProgram,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";

type ReviewView = "front" | "profile-left" | "profile-right";
type ReviewAtlasKind = "parts-kit" | "face-kit";
type Rect = { x: number; y: number; width: number; height: number };

export type OlloCandidateIAtlasComponentMap = {
  role: string;
  atlasCell: Rect;
  atlasContentBounds: Rect;
};

export type OlloCandidateIAtlasMap = {
  view: ReviewView;
  kind: ReviewAtlasKind;
  requestItemId: string;
  candidateId: string;
  stagedContentHash: string;
  width: number;
  height: number;
  alphaClass: "mixed-alpha";
  matteMode: "existing-alpha";
  mapContentHash: string;
  components: OlloCandidateIAtlasComponentMap[];
};

export type OlloCandidateIReviewRecipeInput = {
  request: unknown;
  bundle: unknown;
  stagingReport: unknown;
  importReceipt: unknown;
  atlasMaps: OlloCandidateIAtlasMap[];
  registrationPlans?: OlloCandidateIRegistrationPlan[];
};

export type OlloCandidateIRegistrationPlan = CandidateRigReviewRegistrationPlan;

const EXPECTED_LINEAGE = {
  requestContentHash:
    "82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310",
  bundleContentHash:
    "ffc0d8186be2559466b84d0c8daeb46ea13085f13cc781416f0cd5eb8648b40c",
  stagingReportContentHash:
    "616e96a3216d09ecd93eb0d5a610b7e959090f81661835e22314f89d55b7eb4b",
  importReceiptContentHash:
    "da3609ced3ae19a908f3f0dbbabfc5ce76e96208e34642b5df56d47cdefee9de",
} as const;

const EXPECTED_ATLASES = {
  "front:parts-kit": {
    requestItemId: "parts-front",
    candidateId: "ollo-parts-front-source-set-f-alpha",
    stagedContentHash:
      "a8c74ff89094a4169be9b19f7d9c0e251f0059aa6d13a9075994d74ba11efe30",
    width: 1600,
    height: 1248,
    mapContentHash:
      "6497bcf970ff62d7239c6ad6dd1ca50b3ddc218d47e75ece150103400ecf11f6",
  },
  "front:face-kit": {
    requestItemId: "face-front",
    candidateId: "ollo-face-front-source-set-f-alpha",
    stagedContentHash:
      "b9564f7fd1a30e470ea62e9d85d430dcb2d437f4b9e9a5ef01cc1507cb6925c7",
    width: 4896,
    height: 2112,
    mapContentHash:
      "35a6bb37ed0b11a16b4abb50d7c08a42aa1a99b028e04d404b3134ebf8fdede7",
  },
  "profile-left:parts-kit": {
    requestItemId: "parts-profile-left",
    candidateId: "ollo-parts-profile-left-source-set-i-alpha",
    stagedContentHash:
      "7fbb40653a0ef6598fc8c96f55f84b4ee9e28da18b9e96778ac3ebd9e8e9ba81",
    width: 1845,
    height: 1652,
    mapContentHash:
      "a7fbec549081200e900f220b054350a741099f229d0f208e25910b9de364b85e",
  },
  "profile-left:face-kit": {
    requestItemId: "face-profile-left",
    candidateId: "ollo-face-profile-left-source-set-i-alpha",
    stagedContentHash:
      "46e3f51ee56d4dff0a1b86dbecd773e22d1ea9a27543bdf6383d9b140debab78",
    width: 4008,
    height: 1832,
    mapContentHash:
      "4f578a175828417c5e27589f105b9b58dce33872c5523da1284ae728a83ddfd7",
  },
  "profile-right:parts-kit": {
    requestItemId: "parts-profile-right",
    candidateId: "ollo-parts-profile-right-source-set-i-alpha",
    stagedContentHash:
      "97321741fdf6ec482893a6050a0fbc6ec9ee0a243310fe44325295ac995e6a06",
    width: 1860,
    height: 1620,
    mapContentHash:
      "fac167f8c0a918b0f26c97749b9822d26f2efbcdb2a6ab9a97e13675233c8ad6",
  },
  "profile-right:face-kit": {
    requestItemId: "face-profile-right",
    candidateId: "ollo-face-profile-right-source-set-i-alpha",
    stagedContentHash:
      "2574cf00a897e03641c56a1fd007b21507baf93f4ec0067ce9997b2879ed84ce",
    width: 5328,
    height: 2052,
    mapContentHash:
      "6ae9ea3d2d2cca2a909a0b61e18ad937e283a79e209e4210acf638c7cb1ee77a",
  },
} as const;

const expectedAtlasKeys = Object.keys(EXPECTED_ATLASES).sort();
const extractionPadding = 8;

const isSafeRect = (rect: Rect, width: number, height: number) =>
  Number.isInteger(rect.x) &&
  Number.isInteger(rect.y) &&
  Number.isInteger(rect.width) &&
  Number.isInteger(rect.height) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.width > 0 &&
  rect.height > 0 &&
  rect.x + rect.width <= width &&
  rect.y + rect.height <= height;

const within = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const overlaps = (left: Rect, right: Rect) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const canonicalMapPayload = (atlas: OlloCandidateIAtlasMap) => ({
  view: atlas.view,
  kind: atlas.kind,
  requestItemId: atlas.requestItemId,
  candidateId: atlas.candidateId,
  stagedContentHash: atlas.stagedContentHash,
  width: atlas.width,
  height: atlas.height,
  alphaClass: atlas.alphaClass,
  matteMode: atlas.matteMode,
  components: atlas.components
    .map((component) => ({
      role: component.role,
      atlasCell: component.atlasCell,
      atlasContentBounds: component.atlasContentBounds,
    }))
    .sort((left, right) => left.role.localeCompare(right.role)),
});

const assertCandidateIAtlasMap = (
  atlas: OlloCandidateIAtlasMap,
  requestItems: Map<
    string,
    { kind: string; view: string | null; requiredComponents: string[] }
  >,
  stagedAssets: Map<
    string,
    {
      requestItemId: string;
      stagedContentHash: string;
      width: number;
      height: number;
      alphaClass: string;
    }
  >,
) => {
  const key = `${atlas.view}:${atlas.kind}` as keyof typeof EXPECTED_ATLASES;
  const expected = EXPECTED_ATLASES[key];
  if (!expected) throw new Error(`Unexpected Candidate I atlas map ${key}.`);
  if (
    atlas.requestItemId !== expected.requestItemId ||
    atlas.candidateId !== expected.candidateId ||
    atlas.stagedContentHash !== expected.stagedContentHash ||
    atlas.width !== expected.width ||
    atlas.height !== expected.height
  )
    throw new Error(
      `Candidate I atlas map ${key} changed exact imported source lineage.`,
    );
  if (
    atlas.alphaClass !== "mixed-alpha" ||
    atlas.matteMode !== "existing-alpha"
  )
    throw new Error(
      `Candidate I atlas map ${key} must reuse existing alpha; re-chroma is forbidden.`,
    );
  if (
    atlas.mapContentHash !== expected.mapContentHash ||
    hashCanonical(canonicalMapPayload(atlas)) !== atlas.mapContentHash
  )
    throw new Error(
      `Candidate I atlas component map ${key} is stale or forged.`,
    );
  const requestItem = requestItems.get(atlas.requestItemId);
  const staged = stagedAssets.get(atlas.candidateId);
  if (
    !requestItem ||
    requestItem.kind !== atlas.kind ||
    requestItem.view !== atlas.view ||
    !staged ||
    staged.requestItemId !== atlas.requestItemId ||
    staged.stagedContentHash !== atlas.stagedContentHash ||
    staged.width !== atlas.width ||
    staged.height !== atlas.height ||
    staged.alphaClass !== "mixed-alpha"
  )
    throw new Error(
      `Candidate I atlas map ${key} does not match mechanical import evidence.`,
    );
  const roles = atlas.components.map((component) => component.role);
  if (
    new Set(roles).size !== roles.length ||
    hashCanonical([...roles].sort()) !==
      hashCanonical([...requestItem.requiredComponents].sort())
  )
    throw new Error(
      `Candidate I atlas map ${key} does not cover its exact role allowlist.`,
    );
  for (const [index, component] of atlas.components.entries()) {
    if (
      !isSafeRect(component.atlasCell, atlas.width, atlas.height) ||
      !isSafeRect(component.atlasContentBounds, atlas.width, atlas.height) ||
      !within(component.atlasCell, component.atlasContentBounds) ||
      component.atlasContentBounds.x <= component.atlasCell.x ||
      component.atlasContentBounds.y <= component.atlasCell.y ||
      component.atlasContentBounds.x + component.atlasContentBounds.width >=
        component.atlasCell.x + component.atlasCell.width ||
      component.atlasContentBounds.y + component.atlasContentBounds.height >=
        component.atlasCell.y + component.atlasCell.height
    )
      throw new Error(
        `Candidate I atlas role ${component.role} has an unsafe crop/gutter.`,
      );
    for (const other of atlas.components.slice(index + 1))
      if (overlaps(component.atlasCell, other.atlasCell))
        throw new Error(
          `Candidate I atlas roles ${component.role} and ${other.role} overlap.`,
        );
  }
};

export const createOlloCandidateIProposedReviewRecipes = (
  input: OlloCandidateIReviewRecipeInput,
): CharacterRigPreparationRecipe[] => {
  const request = characterRigAssetRequestSchema.parse(input.request);
  const bundle = characterRigCandidateBundleSchema.parse(input.bundle);
  const report = characterRigStagingReportSchema.parse(input.stagingReport);
  const receipt = characterRigImportReceiptSchema.parse(input.importReceipt);
  validateCharacterRigImportReceipt(request, bundle, report, receipt);
  if (
    request.contentHash !== EXPECTED_LINEAGE.requestContentHash ||
    bundle.contentHash !== EXPECTED_LINEAGE.bundleContentHash ||
    report.contentHash !== EXPECTED_LINEAGE.stagingReportContentHash ||
    receipt.contentHash !== EXPECTED_LINEAGE.importReceiptContentHash
  )
    throw new Error(
      "Candidate I proposed recipes require the exact mechanical import lineage.",
    );
  if (receipt.providerAuthority || !receipt.approvalRequired)
    throw new Error(
      "Candidate I mechanical import cannot grant provider or approval authority.",
    );
  const atlasKeys = input.atlasMaps
    .map((atlas) => `${atlas.view}:${atlas.kind}`)
    .sort();
  if (
    input.atlasMaps.length !== expectedAtlasKeys.length ||
    hashCanonical(atlasKeys) !== hashCanonical(expectedAtlasKeys)
  )
    throw new Error(
      "Candidate I proposed recipes require one exact parts/face atlas per review view.",
    );
  const requestItems = new Map(request.items.map((item) => [item.id, item]));
  const stagedAssets = new Map(
    report.assets.map((asset) => [asset.candidateId, asset]),
  );
  for (const atlas of input.atlasMaps)
    assertCandidateIAtlasMap(atlas, requestItems, stagedAssets);

  if (!input.registrationPlans || input.registrationPlans.length !== 3)
    throw new Error(
      "Candidate I proposed recipes require three explicit hash-bound registration inputs; atlas-cell centers are not valid registration authority.",
    );

  const atlasByKey = new Map(
    input.atlasMaps.map((atlas) => [
      `${atlas.view}:${atlas.kind}`,
      {
        ...atlas,
        components: [...atlas.components].sort((left, right) =>
          left.role.localeCompare(right.role),
        ),
      },
    ]),
  );
  const registrationByView = new Map<
    ReviewView,
    OlloCandidateIRegistrationPlan
  >();
  for (const rawPlan of input.registrationPlans) {
    const plan = candidateRigReviewRegistrationPlanSchema.parse(rawPlan);
    const { contentHash, ...draft } = plan;
    if (
      hashCanonical(draft) !== contentHash ||
      plan.schemaVersion !== "1.0" ||
      plan.authorityDomain !== "source-review-registration-input" ||
      plan.registrationState !== "proposed" ||
      plan.approvalRequired !== true ||
      plan.productionBindable !== false ||
      plan.requestContentHash !== request.contentHash ||
      plan.candidateBundleContentHash !== bundle.contentHash ||
      plan.stagingReportContentHash !== report.contentHash ||
      plan.importReceiptContentHash !== receipt.contentHash ||
      plan.identityLockContentHash !== request.identityLock.contentHash ||
      plan.topologyTemplateContentHash !==
        request.rigProfile.templateContentHash
    )
      throw new Error(
        `Candidate I ${plan.view} registration input is stale, forged, or authority-bearing.`,
      );
    if (registrationByView.has(plan.view))
      throw new Error(
        `Candidate I repeats registration input for ${plan.view}.`,
      );
    registrationByView.set(plan.view, plan);
  }
  return (["front", "profile-left", "profile-right"] as const).map((view) => {
    const partsAtlas = atlasByKey.get(`${view}:parts-kit`)!;
    const faceAtlas = atlasByKey.get(`${view}:face-kit`)!;
    const registration = registrationByView.get(view);
    if (!registration)
      throw new Error(`Candidate I is missing registration input for ${view}.`);
    if (
      registration.atlasMapContentHashes.parts !== partsAtlas.mapContentHash ||
      registration.atlasMapContentHashes.face !== faceAtlas.mapContentHash
    )
      throw new Error(
        `Candidate I ${view} registration input is not bound to the exact atlas component maps.`,
      );
    const componentByRole = new Map(
      [partsAtlas, faceAtlas].flatMap((atlas) =>
        atlas.components.map(
          (component) => [component.role, { atlas, component }] as const,
        ),
      ),
    );
    const outputForRole = (role: string) => {
      const source = componentByRole.get(role);
      if (!source)
        throw new Error(`Candidate I review recipe is missing role ${role}.`);
      return {
        relativeFile: `review-planned/${view}/${role}.png`,
        width: source.component.atlasCell.width + extractionPadding * 2,
        height: source.component.atlasCell.height + extractionPadding * 2,
        padding: extractionPadding,
      };
    };
    const sourceForRole = (role: string) => {
      const source = componentByRole.get(role)!;
      // The composed evidence declares equal atlas cells as the registered
      // source canvases. Use that exact cell so exposure/target canvases remain
      // identical. output.padding is a separate immutable publication gutter;
      // this bridge does not crop to content bounds and then double-pad them.
      return {
        candidateId: source.atlas.candidateId,
        requestItemId: source.atlas.requestItemId,
        stagedContentHash: source.atlas.stagedContentHash,
        rect: source.component.atlasCell,
        matte: { mode: "existing-alpha" as const },
      };
    };
    const outputByRole = new Map(
      [...componentByRole.keys()].map((role) => [role, outputForRole(role)]),
    );
    const registrationPartByRole = new Map(
      registration.parts.map((part) => [part.role, part]),
    );
    const registrationExposureByRole = new Map(
      registration.exposures.map((exposure) => [exposure.role, exposure]),
    );
    const expectedPartRoles = kidsBipedV1TopologyTemplate.parts
      .map((part) => part.role)
      .sort();
    const expectedExposureRoles = kidsBipedV1TopologyTemplate.exposures
      .map((exposure) => exposure.role)
      .sort();
    if (
      registrationPartByRole.size !== registration.parts.length ||
      registrationExposureByRole.size !== registration.exposures.length ||
      hashCanonical([...registrationPartByRole.keys()].sort()) !==
        hashCanonical(expectedPartRoles) ||
      hashCanonical([...registrationExposureByRole.keys()].sort()) !==
        hashCanonical(expectedExposureRoles)
    )
      throw new Error(
        `Candidate I ${view} registration input does not cover the exact topology roles.`,
      );
    const partByRole = new Map(
      kidsBipedV1TopologyTemplate.parts.map((rule) => [
        rule.role,
        `part-${rule.role}`,
      ]),
    );
    const parts = kidsBipedV1TopologyTemplate.parts.map((rule) => {
      const role = characterRigPartRoleSchema.parse(rule.role);
      const parentRole = rule.parentRole
        ? characterRigPartRoleSchema.parse(rule.parentRole)
        : null;
      const registered = registrationPartByRole.get(role)!;
      return {
        id: partByRole.get(role)!,
        role,
        source: sourceForRole(role),
        output: outputByRole.get(role)!,
        parentId: parentRole ? partByRole.get(parentRole)! : null,
        parentSocketId: rule.parentSocketId,
        childPivot: registered.childPivot,
        parentJoint: registered.parentJoint,
        restTransform: registered.restTransform,
        sockets: registered.sockets,
        zIndex: registered.zIndex,
      };
    });
    const exposures = kidsBipedV1TopologyTemplate.exposures.map((rule) => {
      const role = characterRigExposureRoleSchema.parse(rule.role);
      const targetRole = characterRigPartRoleSchema.parse(rule.targetRole);
      const registered = registrationExposureByRole.get(role)!;
      const targetOutput = outputByRole.get(targetRole)!;
      const exposureOutput = outputByRole.get(role)!;
      if (
        targetOutput.width !== exposureOutput.width ||
        targetOutput.height !== exposureOutput.height
      )
        throw new Error(
          `Candidate I review exposure ${role} is not registered to ${targetRole}.`,
        );
      return {
        id: `exposure-${role}`,
        role,
        targetPartId: partByRole.get(targetRole)!,
        source: sourceForRole(role),
        output: exposureOutput,
        childPivot: registered.childPivot,
      };
    });
    return createCharacterRigPreparationRecipe({
      schemaVersion: "1.0",
      recipeId: `ollo-review-${view}-${registration.contentHash.slice(0, 20)}`,
      requestId: request.requestId,
      requestContentHash: request.contentHash,
      bundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      importReceiptContentHash: receipt.contentHash,
      identityLockContentHash: request.identityLock.contentHash,
      templateContentHash: request.rigProfile.templateContentHash,
      processor: {
        extractionAlgorithm: {
          id: "character-rig-component-preparation",
          version: "1.0.0",
        },
        imageLibrary: { id: "sharp", version: "0.34.5" },
      },
      view,
      state: "proposed",
      parts,
      exposures,
      approvalRequired: true,
    });
  });
};

export type OlloCandidateISourceReviewPlanView = {
  view: ReviewView;
  registrationPlanContentHash: string;
  registrationPlan: OlloCandidateIRegistrationPlan;
  recipe: CharacterRigPreparationRecipe;
  program: CandidateRigReviewVisualProgram;
  cleanRenderInput: CandidateRigReviewRenderInput;
  overlayRenderInput: CandidateRigReviewRenderInput;
};

export type OlloCandidateISourceReviewPlan = {
  status: "ready-for-private-source-review-render";
  views: OlloCandidateISourceReviewPlanView[];
  providerAuthority: false;
  approvalAuthority: false;
  approvalRequired: true;
  productionBindable: false;
};

/**
 * Derives the complete Candidate I review plan from exact mechanical evidence,
 * atlas maps, and proposed registrations. Recipes/programs are deliberately not
 * accepted as inputs, so they cannot become a parallel caller-authored truth.
 *
 * This is not a packet constructor. Its output is accepted only by the private
 * worker route that renders and verifies actual artifact bytes; it grants no
 * approval or production authority.
 */
export const createOlloCandidateISourceReviewPlan = (
  input: OlloCandidateIReviewRecipeInput,
): OlloCandidateISourceReviewPlan => {
  const recipes = createOlloCandidateIProposedReviewRecipes(input);
  const registrationPlanHashByView = new Map(
    input.registrationPlans!.map((plan) => [plan.view, plan.contentHash]),
  );
  const registrationPlanByView = new Map(
    input.registrationPlans!.map((plan) => [plan.view, plan]),
  );
  const views = recipes.map((recipe) => {
    const program = compileCandidateRigReviewVisualProgram(
      input.request,
      input.bundle,
      input.stagingReport,
      input.importReceipt,
      recipe,
    );
    return {
      view: recipe.view,
      registrationPlanContentHash: registrationPlanHashByView.get(recipe.view)!,
      registrationPlan: registrationPlanByView.get(recipe.view)!,
      recipe,
      program,
      cleanRenderInput: compileCandidateRigReviewRenderInput("clean", program),
      overlayRenderInput: compileCandidateRigReviewRenderInput(
        "overlay",
        program,
      ),
    };
  });
  return {
    status: "ready-for-private-source-review-render",
    views,
    providerAuthority: false,
    approvalAuthority: false,
    approvalRequired: true,
    productionBindable: false,
  };
};
