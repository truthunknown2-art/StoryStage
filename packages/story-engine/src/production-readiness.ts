import type {AudioMix, ApprovedAssetVersion, FrameAccurateRenderPlan, MusicTrack, ResolvedProductionPlan, ShotOverride, SoundEffectAsset, VoiceTrack} from "./model";

export type FullProductionRenderBlocker = {
  id: "approved-art" | "audio-mix" | "custom-sfx" | "source-acquisition" | "spoken-timing" | "visual-bindings" | "voice-master";
  message: string;
};

export type FullProductionReadinessInput = {
  approvedAssetVersions: ApprovedAssetVersion[];
  audioMix?: AudioMix;
  musicTrack?: MusicTrack;
  overrides: ShotOverride[];
  renderPlan: FrameAccurateRenderPlan;
  resolvedPlan: ResolvedProductionPlan;
  soundEffectAssets?: SoundEffectAsset[];
  voiceTrack?: VoiceTrack;
};

export function getFullProductionRenderBlockers(input: FullProductionReadinessInput): FullProductionRenderBlocker[] {
  const blockers: FullProductionRenderBlocker[] = [];
  const unresolvedRequirements = input.resolvedPlan.requirements.filter((requirement) => requirement.status !== "resolved").length;
  if (unresolvedRequirements > 0 || input.resolvedPlan.generationBriefs.length > 0) blockers.push({id: "source-acquisition", message: `${Math.max(unresolvedRequirements, input.resolvedPlan.generationBriefs.length)} visual requirements still need acquisition or approval.`});
  if (input.approvedAssetVersions.length === 0) blockers.push({id: "approved-art", message: "At least one prepared human-approved art version must be bound."});

  const nonApprovedBindings = input.renderPlan.shots.flatMap((shot) => shot.visualBindings).filter((binding) => binding.resolutionStatus !== "approved").length;
  if (nonApprovedBindings > 0) blockers.push({id: "visual-bindings", message: `${nonApprovedBindings} shot bindings still resolve to placeholders or unresolved media.`});
  if (input.renderPlan.directingProfile.visualMode === "weird-history-editorial") {
    const privatePlaybackAssetIds = new Set(input.approvedAssetVersions.map((asset) => asset.assetId));
    const silentFallbackShots = input.renderPlan.shots.filter((shot) => {
      const characterBindings = shot.visualBindings.filter((binding) => binding.role === "character");
      const charactersRenderable = characterBindings.length === 0 || characterBindings.every((binding) => privatePlaybackAssetIds.has(binding.assetId));
      const codeTreatment = ["environment", "character-performance", "reaction"].includes(shot.treatment)
        || (shot.treatment === "kinetic-type" && shot.actions.some((action) => action.detail.type === "kineticType" && action.detail.text.trim().length > 0));
      return !charactersRenderable || (!codeTreatment && !shot.visualBindings.some((binding) => privatePlaybackAssetIds.has(binding.assetId)));
    }).length;
    if (silentFallbackShots > 0 && !blockers.some((blocker) => blocker.id === "visual-bindings")) blockers.push({id: "visual-bindings", message: `${silentFallbackShots} history shots would still use a silent generic fallback instead of verified playback bytes or a named code-authored treatment.`});
  }

  const sourceSpokenShotIds = new Set(input.resolvedPlan.creativePlan.shots.filter((shot) => Boolean(shot.caption)).map((shot) => shot.id));
  const spokenShotIds = new Set(input.renderPlan.shots.filter((shot) => sourceSpokenShotIds.has(shot.id) || Boolean(shot.caption)).map((shot) => shot.id));
  const lockedSpokenIds = new Set(input.overrides.filter((override) => override.timingLocked && spokenShotIds.has(override.shotId)).map((override) => override.shotId));
  if (lockedSpokenIds.size !== spokenShotIds.size) blockers.push({id: "spoken-timing", message: `${lockedSpokenIds.size}/${spokenShotIds.size} spoken cues have editor-locked frame timing.`});

  if (spokenShotIds.size > 0) {
    const planSeconds = input.renderPlan.durationInFrames / input.renderPlan.fps;
    const aligned = input.voiceTrack?.approvalStatus === "approved" && Math.abs(input.voiceTrack.durationInSeconds - planSeconds) <= Math.max(2, planSeconds * .1);
    if (!aligned) blockers.push({id: "voice-master", message: "An approved voice master aligned to the final frame duration is required."});
  }

  const mixReady = input.audioMix?.reviewed === true
    && input.audioMix.musicDecision !== "pending"
    && (input.audioMix.musicDecision !== "approved-master" || input.musicTrack?.approvalStatus === "approved");
  if (!mixReady) blockers.push({id: "audio-mix", message: "Voice, music, and transition-SFX decisions need final review."});
  const unapprovedEffects = (input.soundEffectAssets ?? []).filter((asset) => asset.approvalStatus !== "approved").length;
  if (unapprovedEffects > 0) blockers.push({id: "custom-sfx", message: `${unapprovedEffects} custom sound effects are not approved.`});
  return blockers;
}
