import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import type {
  AudioMix,
  DirectedBeatProgram,
  FrameAccurateRenderPlan,
  SoundEffectCue,
} from "@storystage/story-engine";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Captions } from "./Captions";
import { HistoryDiagram } from "./HistoryDiagram";
import { HistoryEditorialStage } from "./HistoryEditorialStage";
import { HistoryEditorialVisual } from "./HistoryEditorialVisual";
import { HistoryKineticType } from "./HistoryKineticType";
import { Cv001RigProofComposition } from "./Cv001RigProofComposition";
import {
  getCv001LanternPickupTransform,
  type Cv001WorldTransform,
} from "./cv001-rig-kinematics";
import {
  assertDirectedShotMotionBindings,
  type DirectedShotMotionBinding,
} from "./production-motion-binding";

export type CharacterPlaybackAsset = {
  type: "character-rig";
  assetId: string;
  neutral: string;
  talk: string;
  reaction: string;
};
export type BackgroundPlaybackAsset = {
  type: "background-layers";
  assetId: string;
  far: string;
  midground: string;
  foreground: string;
};
export type PropPlaybackAsset = {
  type: "prop";
  assetId: string;
  assetClass: "prop" | "editorial-visual" | "diagram" | "reconstruction";
  cutout: string;
};
export type PlaybackAsset =
  | CharacterPlaybackAsset
  | BackgroundPlaybackAsset
  | PropPlaybackAsset;

export type ProductionCompositionProps = {
  plan: FrameAccurateRenderPlan;
  playbackAssets: Record<string, PlaybackAsset>;
  sliceDurationInFrames: number;
  voiceTrackDataUrl?: string;
  musicTrackDataUrl?: string;
  soundEffectDataUrls?: Record<string, string>;
  soundEffectCues?: SoundEffectCue[];
  audioMix?: AudioMix;
  previewWatermark?: string;
  previewAssetStatus?: "unapproved-candidate";
  directedMotions?: DirectedShotMotionBinding[];
};
type RenderShot = FrameAccurateRenderPlan["shots"][number];

const fallbackPalette = (
  projectType: FrameAccurateRenderPlan["projectType"],
) =>
  projectType === "kids"
    ? { ink: "#123c43", paper: "#f3d979", accent: "#ef5c52", ground: "#245b53" }
    : {
        ink: "#171b1d",
        paper: "#e7ece8",
        accent: "#ef4e3b",
        ground: "#68726c",
      };

const TransitionedShot: React.FC<{
  projectType: FrameAccurateRenderPlan["projectType"];
  shot: RenderShot;
  children: React.ReactNode;
}> = ({ projectType, shot, children }) => {
  const frame = useCurrentFrame();
  const palette = fallbackPalette(projectType);
  const entranceFrames = Math.max(1, Math.min(12, shot.durationInFrames - 1));
  const eased = Easing.bezier(0.2, 0.8, 0.2, 1);
  const opacity =
    shot.transition === "brief-dissolve"
      ? interpolate(frame, [0, entranceFrames], [0, 1], {
          easing: eased,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const carry =
    shot.transition === "camera-carry"
      ? interpolate(frame, [0, entranceFrames], [-24, 0], {
          easing: eased,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const carryScale =
    shot.transition === "camera-carry"
      ? interpolate(frame, [0, entranceFrames], [1.025, 1], {
          easing: eased,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const wipeReveal =
    shot.transition === "foreground-wipe"
      ? interpolate(frame, [0, entranceFrames], [100, 0], {
          easing: eased,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const wipeEdge =
    shot.transition === "foreground-wipe"
      ? interpolate(frame, [0, entranceFrames], [-8, 108], {
          easing: eased,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : -20;

  return (
    <AbsoluteFill style={{ background: palette.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          clipPath:
            shot.transition === "foreground-wipe"
              ? `inset(0 ${wipeReveal}% 0 0)`
              : undefined,
          opacity,
          scale: carryScale,
          translate: `${carry}px 0`,
        }}
      >
        {children}
      </AbsoluteFill>
      {shot.transition === "foreground-wipe" && frame <= entranceFrames ? (
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${palette.accent} 45%, ${palette.paper})`,
            height: "120%",
            left: `${wipeEdge}%`,
            opacity: 0.92,
            position: "absolute",
            top: "-10%",
            rotate: "7deg",
            width: "12%",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const ShotBackground: React.FC<{
  asset?: BackgroundPlaybackAsset;
  projectType: FrameAccurateRenderPlan["projectType"];
  shot: RenderShot;
}> = ({ asset, projectType, shot }) => {
  const frame = useCurrentFrame();
  const palette = fallbackPalette(projectType);
  const push = shot.actions.some(
    (action) => action.detail.type === "cameraPush",
  );
  if (asset) {
    return (
      <AbsoluteFill style={{ background: palette.ink, overflow: "hidden" }}>
        <Img
          src={asset.far}
          style={{
            height: "100%",
            objectFit: "cover",
            scale: interpolate(
              frame,
              [0, shot.durationInFrames],
              [1, push ? 1.08 : 1.035],
              { extrapolateRight: "clamp" },
            ),
            translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -12], { extrapolateRight: "clamp" })}px 0`,
            width: "100%",
          }}
        />
        <Img
          src={asset.midground}
          style={{
            height: "100%",
            objectFit: "contain",
            position: "absolute",
            scale: interpolate(
              frame,
              [0, shot.durationInFrames],
              [1, push ? 1.12 : 1.05],
              { extrapolateRight: "clamp" },
            ),
            translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -28], { extrapolateRight: "clamp" })}px 0`,
            width: "100%",
          }}
        />
        <Img
          src={asset.foreground}
          style={{
            height: "100%",
            objectFit: "contain",
            position: "absolute",
            scale: interpolate(
              frame,
              [0, shot.durationInFrames],
              [1.03, push ? 1.2 : 1.09],
              { extrapolateRight: "clamp" },
            ),
            translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -54], { extrapolateRight: "clamp" })}px 0`,
            width: "100%",
          }}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${palette.paper}, ${palette.ground})`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: palette.accent,
          borderRadius: "50%",
          height: 320,
          opacity: 0.2,
          position: "absolute",
          right: 120,
          top: 70,
          translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -70], { extrapolateRight: "clamp" })}px 0`,
          width: 320,
        }}
      />
      <div
        style={{
          background: palette.ink,
          bottom: -180,
          height: 500,
          left: -100,
          opacity: 0.28,
          position: "absolute",
          rotate: "-6deg",
          width: "120%",
        }}
      />
    </AbsoluteFill>
  );
};

const CharacterPerformance: React.FC<{
  asset: CharacterPlaybackAsset;
  projectType: FrameAccurateRenderPlan["projectType"];
  shot: RenderShot;
  side: "left" | "right";
}> = ({ asset, projectType, shot, side }) => {
  const frame = useCurrentFrame();
  const absoluteFrame = shot.startFrame + frame;
  const activeTalk = shot.actions.find(
    (action) =>
      action.detail.type === "talk" &&
      absoluteFrame >= action.startFrame &&
      absoluteFrame < action.endFrame,
  );
  const activePerformance = shot.actions.find(
    (action) =>
      ["react", "poseChange", "gesture"].includes(action.detail.type) &&
      absoluteFrame >= action.startFrame &&
      absoluteFrame < action.endFrame,
  );
  const cue =
    activeTalk?.detail.type === "talk" ? activeTalk.detail.mouthCue : undefined;
  const defaultOpenFrames = projectType === "kids" ? 4 : 3;
  const defaultClosedFrames = projectType === "kids" ? 3 : 2;
  const openFrames = cue?.openFrames ?? defaultOpenFrames;
  const closedFrames = cue?.closedFrames ?? defaultClosedFrames;
  const mouthPhase = activeTalk
    ? (absoluteFrame - activeTalk.startFrame + (cue?.phaseOffsetFrames ?? 0)) %
      (openFrames + closedFrames)
    : 0;
  const mouthOpen = Boolean(activeTalk && mouthPhase < openFrames);
  const pose = mouthOpen
    ? asset.talk
    : activePerformance
      ? asset.reaction
      : asset.neutral;
  const closeUp = shot.framing === "close-up";
  const characterHeight =
    shot.framing === "wide" ? "76%" : closeUp ? "104%" : "88%";
  const entrance = interpolate(
    frame,
    [0, Math.min(14, shot.durationInFrames - 1)],
    [side === "left" ? -90 : 90, 0],
    {
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const gestureLift =
    activePerformance?.detail.type === "gesture" ||
    activePerformance?.detail.type === "react"
      ? interpolate(
          absoluteFrame,
          [
            activePerformance.startFrame,
            Math.min(
              activePerformance.endFrame,
              activePerformance.startFrame + 10,
            ),
            activePerformance.endFrame,
          ],
          [0, -30, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 0;
  return (
    <Img
      src={pose}
      style={{
        bottom: closeUp ? -150 : -20,
        filter: "drop-shadow(18px 22px 12px rgba(0,0,0,.28))",
        height: characterHeight,
        objectFit: "contain",
        objectPosition: "bottom",
        position: "absolute",
        right: side === "right" ? 50 : undefined,
        left: side === "left" ? 50 : undefined,
        scale: interpolate(frame, [0, shot.durationInFrames], [0.96, 1.02], {
          extrapolateRight: "clamp",
        }),
        translate: `${entrance}px ${gestureLift + Math.sin(frame / 8) * 3}px`,
        width: closeUp ? "58%" : "48%",
      }}
    />
  );
};

const ShotScene: React.FC<{
  directedBeatProgram?: DirectedBeatProgram;
  lanternPickupTransform?: Cv001WorldTransform;
  plan: FrameAccurateRenderPlan;
  playbackAssets: Record<string, PlaybackAsset>;
  previewAssetStatus?: ProductionCompositionProps["previewAssetStatus"];
  shot: RenderShot;
}> = ({
  directedBeatProgram,
  lanternPickupTransform,
  plan,
  playbackAssets,
  previewAssetStatus,
  shot,
}) => {
  const frame = useCurrentFrame();
  if (directedBeatProgram)
    return (
      <Cv001RigProofComposition
        lanternPickupTransform={lanternPickupTransform}
        program={directedBeatProgram}
      />
    );
  const backgroundBinding = shot.visualBindings.find(
    (binding) => binding.role === "background",
  );
  const background = backgroundBinding
    ? playbackAssets[backgroundBinding.assetId]
    : undefined;
  const characters = shot.visualBindings
    .map((binding) => playbackAssets[binding.assetId])
    .filter(
      (asset): asset is CharacterPlaybackAsset =>
        asset?.type === "character-rig",
    );
  const props = shot.visualBindings
    .map((binding) => playbackAssets[binding.assetId])
    .filter((asset): asset is PropPlaybackAsset => asset?.type === "prop");
  const editorialVisual = props.find((asset) => asset.assetClass !== "prop");
  const floatingProps = props.filter((asset) => asset.assetClass === "prop");
  const palette = fallbackPalette(plan.projectType);
  const historyMode =
    plan.directingProfile.visualMode === "weird-history-editorial";
  const kineticType =
    historyMode &&
    shot.treatment === "kinetic-type" &&
    shot.actions.some((action) => action.detail.type === "kineticType");
  const diagram = historyMode && shot.treatment === "diagram";
  const reconstruction =
    historyMode && shot.treatment === "generated-illustration";
  const showCharacters =
    !historyMode ||
    [
      "environment",
      "character-performance",
      "reaction",
      "kinetic-type",
    ].includes(shot.treatment);
  const ordinal = Number(shot.number.split(".").at(-1) ?? 1);
  const singleCharacterSide =
    kineticType || ordinal % 2 === 1 ? "left" : "right";
  return (
    <AbsoluteFill style={{ background: palette.ink, overflow: "hidden" }}>
      {background?.type === "background-layers" ? (
        <ShotBackground
          asset={background}
          projectType={plan.projectType}
          shot={shot}
        />
      ) : historyMode ? (
        <HistoryEditorialStage shot={shot} />
      ) : (
        <ShotBackground projectType={plan.projectType} shot={shot} />
      )}
      {reconstruction ? (
        <HistoryEditorialVisual
          asset={editorialVisual}
          candidatePreview={previewAssetStatus === "unapproved-candidate"}
          shot={shot}
        />
      ) : null}
      {diagram ? <HistoryDiagram shot={shot} /> : null}
      {kineticType ? (
        <HistoryKineticType
          reservePresenter={characters.length > 0}
          shot={shot}
        />
      ) : null}
      {showCharacters
        ? characters
            .slice(0, 2)
            .map((asset, index) => (
              <CharacterPerformance
                asset={asset}
                key={asset.assetId}
                projectType={plan.projectType}
                shot={shot}
                side={
                  index === 0
                    ? singleCharacterSide
                    : singleCharacterSide === "left"
                      ? "right"
                      : "left"
                }
              />
            ))
        : null}
      {floatingProps.slice(0, 1).map((asset) => (
        <Img
          key={asset.assetId}
          src={asset.cutout}
          style={{
            bottom: 90,
            filter: "drop-shadow(12px 16px 10px rgba(0,0,0,.3))",
            height: "38%",
            objectFit: "contain",
            position: "absolute",
            right: characters.length > 0 ? "32%" : "10%",
            rotate: `${interpolate(frame, [0, shot.durationInFrames], [-3, 3], { extrapolateRight: "clamp" })}deg`,
            translate: `0 ${Math.sin(frame / 6) * 8}px`,
            width: "28%",
          }}
        />
      ))}
      {characters.length === 0 && props.length === 0 && !historyMode ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: "100%",
            justifyContent: "center",
            padding: "100px",
          }}
        >
          <div
            style={{
              color: palette.ink,
              fontFamily: "Georgia, serif",
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.95,
              maxWidth: 1200,
              opacity: 0.86,
              textAlign: "center",
            }}
          >
            {shot.title}
          </div>
        </div>
      ) : null}
      {historyMode ? (
        <div
          style={{
            color: "rgba(23,27,29,.62)",
            fontFamily: "Arial, sans-serif",
            fontSize: 18,
            fontWeight: 900,
            left: 70,
            letterSpacing: 5,
            position: "absolute",
            textTransform: "uppercase",
            top: 48,
          }}
        >
          Frankly Weird History
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ProductionComposition: React.FC<ProductionCompositionProps> = ({
  plan,
  playbackAssets,
  sliceDurationInFrames,
  voiceTrackDataUrl,
  musicTrackDataUrl,
  soundEffectDataUrls = {},
  soundEffectCues = [],
  audioMix,
  previewWatermark,
  previewAssetStatus,
  directedMotions = [],
}) => {
  const duration = Math.min(sliceDurationInFrames, plan.durationInFrames);
  const validatedMotions = assertDirectedShotMotionBindings(
    plan,
    sliceDurationInFrames,
    directedMotions,
  );
  const motionByShotId = new Map(
    validatedMotions.map((binding) => [binding.shotId, binding.program]),
  );
  const pickupProgram = validatedMotions
    .map((binding) => binding.program)
    .find((program) =>
      program.tracks.some(
        (track) => track.type === "attachment" && track.startFrame > 0,
      ),
    );
  const lanternPickupTransform = pickupProgram
    ? getCv001LanternPickupTransform(pickupProgram)
    : undefined;
  const captions: Caption[] = plan.shots
    .filter((shot) => shot.caption && shot.startFrame < duration)
    .map((shot) => ({
      text: shot.caption!,
      startMs: (shot.startFrame / plan.fps) * 1000,
      endMs:
        (Math.min(duration, shot.startFrame + shot.durationInFrames) /
          plan.fps) *
        1000,
      timestampMs: null,
      confidence: null,
    }));
  return (
    <AbsoluteFill style={{ background: "#111718" }}>
      {plan.shots
        .filter((shot) => shot.startFrame < duration)
        .map((shot) => (
          <Sequence
            from={shot.startFrame}
            durationInFrames={Math.min(
              shot.durationInFrames,
              duration - shot.startFrame,
            )}
            key={shot.id}
          >
            <TransitionedShot projectType={plan.projectType} shot={shot}>
              <ShotScene
                directedBeatProgram={motionByShotId.get(shot.id)}
                lanternPickupTransform={lanternPickupTransform}
                plan={plan}
                playbackAssets={playbackAssets}
                previewAssetStatus={previewAssetStatus}
                shot={shot}
              />
            </TransitionedShot>
          </Sequence>
        ))}
      {voiceTrackDataUrl ? (
        <Audio
          src={voiceTrackDataUrl}
          volume={() => audioMix?.voiceGain ?? 1}
        />
      ) : null}
      {musicTrackDataUrl && audioMix?.musicDecision === "approved-master" ? (
        <Audio
          loop={audioMix.musicLoop ?? true}
          src={musicTrackDataUrl}
          volume={() => audioMix.musicGain ?? 0.1}
        />
      ) : null}
      {soundEffectCues.map((cue) => {
        const shot = plan.shots.find(
          (candidate) => candidate.id === cue.shotId,
        );
        const src = soundEffectDataUrls[cue.assetContentHash];
        const from = (shot?.startFrame ?? duration) + cue.offsetInFrames;
        return shot && src && from < duration ? (
          <Sequence durationInFrames={duration - from} from={from} key={cue.id}>
            <Audio src={src} volume={() => cue.gain} />
          </Sequence>
        ) : null;
      })}
      {audioMix?.transitionSfx === "paper-flip"
        ? plan.shots
            .filter((shot) => shot.startFrame > 0 && shot.startFrame < duration)
            .map((shot) => (
              <Sequence
                from={shot.startFrame}
                durationInFrames={18}
                key={`sfx-${shot.id}`}
              >
                <Audio
                  src={staticFile("audio/paper-flip.wav")}
                  volume={() => audioMix.transitionSfxGain}
                />
              </Sequence>
            ))
        : null}
      <Captions captions={captions} />
      {previewWatermark ? (
        <>
          <div
            style={{
              border: "6px solid rgba(240,198,104,.68)",
              inset: 18,
              pointerEvents: "none",
              position: "absolute",
            }}
          />
          <div
            style={{
              background: "rgba(16,20,20,.9)",
              color: "#f0c668",
              fontFamily: "Arial, sans-serif",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 2,
              padding: "12px 16px",
              position: "absolute",
              right: 28,
              textTransform: "uppercase",
              top: 28,
            }}
          >
            {previewWatermark}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
