import {hashCanonical} from "./canonical-hash";
import {measureDirectedPlan} from "./metrics";
import {frameAccurateRenderPlanSchema, type ActionDetail, type FrameAccurateRenderPlan, type ResolvedProductionPlan} from "./model";

const cameraActionDetail = (type: NonNullable<ResolvedProductionPlan["overrides"][number]["cameraAction"]>, framing: FrameAccurateRenderPlan["shots"][number]["framing"]): ActionDetail => {
  if (type === "cameraPush") return {type, fromScale: 1, toScale: 1.1, easingId: "ease-standard"};
  if (type === "pan") return {type, fromX: -0.05, toX: 0.05, easingId: "ease-standard"};
  if (type === "reframe") return {type, framing, easingId: "ease-standard"};
  return {type: "reframe", framing, easingId: "ease-standard"};
};

export function compileAnimation(plan: ResolvedProductionPlan): FrameAccurateRenderPlan {
  const {creativePlan, showPack} = plan;
  const overrideByShot = new Map(plan.overrides.map((override) => [override.shotId, override]));
  const entityIdByName = new Map([...plan.characters, ...plan.locations, ...plan.props].map((entity) => [entity.entityName.toLowerCase(), entity.entityId]));
  const assets = [...showPack.assets, ...plan.approvedAssets];
  const visualByRequirementId = new Map(plan.resolvedVisuals.map((visual) => [visual.requirementId, visual]));
  const placeholder = showPack.assets.find((asset) => asset.kind === "placeholder")!;

  let cursor = 0;
  const shots = creativePlan.shots.map((shot) => {
    const override = overrideByShot.get(shot.id);
    if (override?.gesture && !showPack.allowedGestures.includes(override.gesture)) throw new Error(`Gesture ${override.gesture} is not allowed by ${showPack.id}.`);

    const startFrame = cursor;
    cursor += shot.durationInFrames;
    const focusCharacterId = shot.focusCharacterName ? entityIdByName.get(shot.focusCharacterName.toLowerCase()) ?? null : null;
    const actions = shot.actions.map((action) => {
      const localStart = Math.min(action.startOffsetFrames, Math.max(0, shot.durationInFrames - 1));
      const duration = Math.max(1, Math.min(action.durationInFrames, shot.durationInFrames - localStart));
      return {id: action.id, actorId: action.actorName ? entityIdByName.get(action.actorName.toLowerCase()) ?? null : null, targetId: action.targetName ? entityIdByName.get(action.targetName.toLowerCase()) ?? null : null, label: action.label, startFrame: startFrame + localStart, endFrame: startFrame + localStart + duration, detail: action.detail};
    });

    if (override?.gesture) {
      const existingIndex = actions.findIndex((action) => action.detail.type === "gesture");
      const existing = existingIndex >= 0 ? actions[existingIndex]! : null;
      const gestureAction = {id: `${shot.id}-override-gesture`, actorId: existing?.actorId ?? focusCharacterId, targetId: existing?.targetId ?? null, label: `Gesture override: ${override.gesture}`, startFrame: existing?.startFrame ?? startFrame, endFrame: existing?.endFrame ?? startFrame + shot.durationInFrames, detail: {type: "gesture" as const, gestureId: override.gesture, intensity: override.gestureIntensity ?? 0.75}};
      if (existingIndex >= 0) actions.splice(existingIndex, 1, gestureAction);
      else actions.push(gestureAction);
    }

    const framing = override?.framing ?? shot.framing;
    if (override?.cameraAction) {
      const existingIndex = actions.findIndex((action) => ["cameraPush", "pan", "reframe"].includes(action.detail.type));
      const cameraAction = {id: `${shot.id}-override-camera`, actorId: null, targetId: focusCharacterId, label: `Camera override: ${override.cameraAction}`, startFrame, endFrame: startFrame + shot.durationInFrames, detail: cameraActionDetail(override.cameraAction, framing)};
      if (existingIndex >= 0) actions.splice(existingIndex, 1, cameraAction);
      else actions.push(cameraAction);
    }

    const visualBindings = shot.visualRequirementIds.map((id) => visualByRequirementId.get(id)).filter((visual): visual is NonNullable<typeof visual> => Boolean(visual));
    const background = visualBindings.find((visual) => visual.role === "background");
    return {id: shot.id, sceneId: shot.sceneId, number: shot.number, title: shot.title, framing, treatment: shot.treatment, transition: shot.transition, locationAssetId: background?.assetId ?? placeholder.id, focusCharacterId, visualBindings, startFrame, durationInFrames: shot.durationInFrames, actions, caption: shot.caption};
  });

  const payload = {
    schemaVersion: "1.2" as const,
    id: `render-${creativePlan.productionId}-r${creativePlan.planRevision}`,
    productionId: creativePlan.productionId,
    planRevision: creativePlan.planRevision,
    compilerVersion: creativePlan.compilerVersion,
    title: creativePlan.title,
    fps: creativePlan.fps,
    width: creativePlan.width,
    height: creativePlan.height,
    durationInFrames: cursor,
    projectType: creativePlan.projectType,
    productionPolicy: creativePlan.productionPolicy,
    assetRoutingPolicy: creativePlan.assetRoutingPolicy,
    directingProfile: {id: showPack.profile.id, version: showPack.profile.version, visualMode: showPack.profile.visualMode},
    showPack: {id: showPack.id, version: showPack.version, contentHash: showPack.contentHash},
    assets,
    characters: plan.characters,
    locations: plan.locations,
    props: plan.props,
    shots,
    metrics: measureDirectedPlan(creativePlan),
    unresolvedWarnings: plan.warnings,
  };
  return frameAccurateRenderPlanSchema.parse({...payload, contentHash: hashCanonical(payload)});
}

export function verifyRenderPlanHash(plan: FrameAccurateRenderPlan): boolean {
  const {contentHash, ...payload} = plan;
  return hashCanonical(payload) === contentHash;
}
