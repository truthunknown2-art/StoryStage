import {
  frameAccurateRenderPlanSchema,
  type FrameAccurateRenderPlan,
  type ResolvedProductionPlan,
} from "./model";

export function compileAnimation(plan: ResolvedProductionPlan): FrameAccurateRenderPlan {
  const {creativePlan, showPack} = plan;
  const overrideByShot = new Map(plan.overrides.map((override) => [override.shotId, override]));
  const entityIdByName = new Map(
    [...plan.characters, ...plan.locations, ...plan.props].map((entity) => [entity.entityName.toLowerCase(), entity.entityId]),
  );
  const locationAssetByName = new Map(plan.locations.map((location) => [location.entityName.toLowerCase(), location.assetId]));
  const characterAssetByEntityId = new Map(plan.characters.map((character) => [character.entityId, character.assetId]));
  const assetIds = new Set(showPack.assets.map((asset) => asset.id));

  let cursor = 0;
  const shots = creativePlan.shots.map((shot) => {
    const override = overrideByShot.get(shot.id);
    if (override?.locationAssetId && !assetIds.has(override.locationAssetId)) {
      throw new Error(`Override for ${shot.id} references an unknown local asset.`);
    }
    if (override?.gesture && !showPack.allowedGestures.includes(override.gesture)) {
      throw new Error(`Gesture ${override.gesture} is not allowed by ${showPack.id}.`);
    }

    const startFrame = cursor;
    cursor += shot.durationInFrames;
    const focusEntityId = shot.focusCharacterName ? entityIdByName.get(shot.focusCharacterName.toLowerCase()) ?? null : null;
    const focusCharacterId = focusEntityId && characterAssetByEntityId.has(focusEntityId) ? focusEntityId : null;
    let gestureApplied = false;

    const actions = shot.actions.map((action) => {
      const localStart = Math.min(action.startOffsetFrames, Math.max(0, shot.durationInFrames - 1));
      const available = Math.max(1, shot.durationInFrames - localStart);
      const duration = Math.max(1, Math.min(action.durationInFrames, available));
      const applyGesture = Boolean(override?.gesture && !gestureApplied && action.actorName);
      if (applyGesture) gestureApplied = true;
      return {
        id: action.id,
        type: applyGesture ? "gesture" as const : action.type,
        actorId: action.actorName ? entityIdByName.get(action.actorName.toLowerCase()) ?? null : null,
        targetId: action.targetName ? entityIdByName.get(action.targetName.toLowerCase()) ?? null : null,
        label: applyGesture ? `Gesture: ${override!.gesture}` : action.label,
        startFrame: startFrame + localStart,
        endFrame: startFrame + localStart + duration,
      };
    });

    return {
      id: shot.id,
      sceneId: shot.sceneId,
      number: shot.number,
      title: shot.title,
      framing: override?.framing ?? shot.framing,
      treatment: override?.treatment ?? shot.treatment,
      transition: shot.transition,
      locationAssetId: override?.locationAssetId ?? locationAssetByName.get(shot.locationName.toLowerCase()) ?? showPack.assets.find((asset) => asset.kind === "placeholder")!.id,
      focusCharacterId,
      startFrame,
      durationInFrames: shot.durationInFrames,
      actions,
      caption: shot.caption,
    };
  });

  return frameAccurateRenderPlanSchema.parse({
    schemaVersion: "1.1",
    id: creativePlan.id.replace(/^creative-/, "render-"),
    title: creativePlan.title,
    fps: creativePlan.fps,
    width: creativePlan.width,
    height: creativePlan.height,
    durationInFrames: cursor,
    projectType: creativePlan.projectType,
    productionPolicy: creativePlan.productionPolicy,
    directingProfile: {
      id: showPack.profile.id,
      version: showPack.profile.version,
      visualMode: showPack.profile.visualMode,
    },
    showPack: {id: showPack.id, version: showPack.version, contentHash: showPack.contentHash},
    assets: showPack.assets,
    characters: plan.characters,
    locations: plan.locations,
    props: plan.props,
    shots,
    unresolvedWarnings: plan.warnings,
  });
}
