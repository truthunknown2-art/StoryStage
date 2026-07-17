import {Audio} from "@remotion/media";
import type {Caption} from "@remotion/captions";
import type {AudioMix, FrameAccurateRenderPlan} from "@storystage/story-engine";
import {AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import {Captions} from "./Captions";

export type CharacterPlaybackAsset = {type: "character-rig"; assetId: string; neutral: string; talk: string; reaction: string};
export type BackgroundPlaybackAsset = {type: "background-layers"; assetId: string; far: string; midground: string; foreground: string};
export type PropPlaybackAsset = {type: "prop"; assetId: string; cutout: string};
export type PlaybackAsset = CharacterPlaybackAsset | BackgroundPlaybackAsset | PropPlaybackAsset;

export type ProductionCompositionProps = {
  plan: FrameAccurateRenderPlan;
  playbackAssets: Record<string, PlaybackAsset>;
  sliceDurationInFrames: number;
  voiceTrackDataUrl?: string;
  musicTrackDataUrl?: string;
  audioMix?: AudioMix;
};
type RenderShot = FrameAccurateRenderPlan["shots"][number];

const fallbackPalette = (projectType: FrameAccurateRenderPlan["projectType"]) => projectType === "kids"
  ? {ink: "#123c43", paper: "#f3d979", accent: "#ef5c52", ground: "#245b53"}
  : {ink: "#171b1d", paper: "#e7ece8", accent: "#ef4e3b", ground: "#68726c"};

const TransitionedShot: React.FC<{projectType: FrameAccurateRenderPlan["projectType"]; shot: RenderShot; children: React.ReactNode}> = ({projectType, shot, children}) => {
  const frame = useCurrentFrame();
  const palette = fallbackPalette(projectType);
  const entranceFrames = Math.max(1, Math.min(12, shot.durationInFrames - 1));
  const eased = Easing.bezier(.2, .8, .2, 1);
  const opacity = shot.transition === "brief-dissolve" ? interpolate(frame, [0, entranceFrames], [0, 1], {easing: eased, extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  const carry = shot.transition === "camera-carry" ? interpolate(frame, [0, entranceFrames], [-24, 0], {easing: eased, extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 0;
  const carryScale = shot.transition === "camera-carry" ? interpolate(frame, [0, entranceFrames], [1.025, 1], {easing: eased, extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  const wipeReveal = shot.transition === "foreground-wipe" ? interpolate(frame, [0, entranceFrames], [100, 0], {easing: eased, extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 0;
  const wipeEdge = shot.transition === "foreground-wipe" ? interpolate(frame, [0, entranceFrames], [-8, 108], {easing: eased, extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : -20;

  return <AbsoluteFill style={{background: palette.ink, overflow: "hidden"}}>
    <AbsoluteFill style={{clipPath: shot.transition === "foreground-wipe" ? `inset(0 ${wipeReveal}% 0 0)` : undefined, opacity, scale: carryScale, translate: `${carry}px 0`}}>{children}</AbsoluteFill>
    {shot.transition === "foreground-wipe" && frame <= entranceFrames ? <div style={{background: `linear-gradient(90deg, transparent, ${palette.accent} 45%, ${palette.paper})`, height: "120%", left: `${wipeEdge}%`, opacity: .92, position: "absolute", top: "-10%", rotate: "7deg", width: "12%"}} /> : null}
  </AbsoluteFill>;
};

const ShotBackground: React.FC<{asset?: BackgroundPlaybackAsset; projectType: FrameAccurateRenderPlan["projectType"]; shot: RenderShot}> = ({asset, projectType, shot}) => {
  const frame = useCurrentFrame();
  const palette = fallbackPalette(projectType);
  const push = shot.actions.some((action) => action.detail.type === "cameraPush");
  if (asset) {
    return <AbsoluteFill style={{background: palette.ink, overflow: "hidden"}}>
      <Img src={asset.far} style={{height: "100%", objectFit: "cover", scale: interpolate(frame, [0, shot.durationInFrames], [1, push ? 1.08 : 1.035], {extrapolateRight: "clamp"}), translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -12], {extrapolateRight: "clamp"})}px 0`, width: "100%"}} />
      <Img src={asset.midground} style={{height: "100%", objectFit: "contain", position: "absolute", scale: interpolate(frame, [0, shot.durationInFrames], [1, push ? 1.12 : 1.05], {extrapolateRight: "clamp"}), translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -28], {extrapolateRight: "clamp"})}px 0`, width: "100%"}} />
      <Img src={asset.foreground} style={{height: "100%", objectFit: "contain", position: "absolute", scale: interpolate(frame, [0, shot.durationInFrames], [1.03, push ? 1.2 : 1.09], {extrapolateRight: "clamp"}), translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -54], {extrapolateRight: "clamp"})}px 0`, width: "100%"}} />
    </AbsoluteFill>;
  }
  return <AbsoluteFill style={{background: `linear-gradient(145deg, ${palette.paper}, ${palette.ground})`, overflow: "hidden"}}>
    <div style={{background: palette.accent, borderRadius: "50%", height: 320, opacity: .2, position: "absolute", right: 120, top: 70, translate: `${interpolate(frame, [0, shot.durationInFrames], [0, -70], {extrapolateRight: "clamp"})}px 0`, width: 320}} />
    <div style={{background: palette.ink, bottom: -180, height: 500, left: -100, opacity: .28, position: "absolute", rotate: "-6deg", width: "120%"}} />
  </AbsoluteFill>;
};

const CharacterPerformance: React.FC<{asset: CharacterPlaybackAsset; projectType: FrameAccurateRenderPlan["projectType"]; shot: RenderShot; side: "left" | "right"}> = ({asset, projectType, shot, side}) => {
  const frame = useCurrentFrame();
  const absoluteFrame = shot.startFrame + frame;
  const activeTalk = shot.actions.find((action) => action.detail.type === "talk" && absoluteFrame >= action.startFrame && absoluteFrame < action.endFrame);
  const activePerformance = shot.actions.find((action) => ["react", "poseChange", "gesture"].includes(action.detail.type) && absoluteFrame >= action.startFrame && absoluteFrame < action.endFrame);
  const cue = activeTalk?.detail.type === "talk" ? activeTalk.detail.mouthCue : undefined;
  const defaultOpenFrames = projectType === "kids" ? 4 : 3;
  const defaultClosedFrames = projectType === "kids" ? 3 : 2;
  const openFrames = cue?.openFrames ?? defaultOpenFrames;
  const closedFrames = cue?.closedFrames ?? defaultClosedFrames;
  const mouthPhase = activeTalk ? (absoluteFrame - activeTalk.startFrame + (cue?.phaseOffsetFrames ?? 0)) % (openFrames + closedFrames) : 0;
  const mouthOpen = Boolean(activeTalk && mouthPhase < openFrames);
  const pose = mouthOpen ? asset.talk : activePerformance ? asset.reaction : asset.neutral;
  const entrance = interpolate(frame, [0, Math.min(14, shot.durationInFrames - 1)], [side === "left" ? -90 : 90, 0], {easing: Easing.bezier(.2, .8, .2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const gestureLift = activePerformance?.detail.type === "gesture" || activePerformance?.detail.type === "react" ? interpolate(absoluteFrame, [activePerformance.startFrame, Math.min(activePerformance.endFrame, activePerformance.startFrame + 10), activePerformance.endFrame], [0, -30, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 0;
  return <Img src={pose} style={{bottom: -20, filter: "drop-shadow(18px 22px 12px rgba(0,0,0,.28))", height: "88%", objectFit: "contain", objectPosition: "bottom", position: "absolute", right: side === "right" ? 50 : undefined, left: side === "left" ? 50 : undefined, scale: interpolate(frame, [0, shot.durationInFrames], [.96, 1.02], {extrapolateRight: "clamp"}), translate: `${entrance}px ${gestureLift + Math.sin(frame / 8) * 3}px`, width: "48%"}} />;
};

const ShotScene: React.FC<{plan: FrameAccurateRenderPlan; playbackAssets: Record<string, PlaybackAsset>; shot: RenderShot}> = ({plan, playbackAssets, shot}) => {
  const frame = useCurrentFrame();
  const backgroundBinding = shot.visualBindings.find((binding) => binding.role === "background");
  const background = backgroundBinding ? playbackAssets[backgroundBinding.assetId] : undefined;
  const characters = shot.visualBindings.map((binding) => playbackAssets[binding.assetId]).filter((asset): asset is CharacterPlaybackAsset => asset?.type === "character-rig");
  const props = shot.visualBindings.map((binding) => playbackAssets[binding.assetId]).filter((asset): asset is PropPlaybackAsset => asset?.type === "prop");
  const palette = fallbackPalette(plan.projectType);
  const titleIn = interpolate(frame, [0, Math.min(8, shot.durationInFrames - 1)], [0, 1], {extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background: palette.ink, overflow: "hidden"}}>
    <ShotBackground asset={background?.type === "background-layers" ? background : undefined} projectType={plan.projectType} shot={shot} />
    {characters.slice(0, 2).map((asset, index) => <CharacterPerformance asset={asset} key={asset.assetId} projectType={plan.projectType} shot={shot} side={index === 0 ? "left" : "right"} />)}
    {props.slice(0, 1).map((asset) => <Img key={asset.assetId} src={asset.cutout} style={{bottom: 90, filter: "drop-shadow(12px 16px 10px rgba(0,0,0,.3))", height: "38%", objectFit: "contain", position: "absolute", right: characters.length > 0 ? "32%" : "10%", rotate: `${interpolate(frame, [0, shot.durationInFrames], [-3, 3], {extrapolateRight: "clamp"})}deg`, translate: `0 ${Math.sin(frame / 6) * 8}px`, width: "28%"}} />)}
    {characters.length === 0 && props.length === 0 ? <div style={{alignItems: "center", display: "flex", height: "100%", justifyContent: "center", padding: "100px"}}><div style={{color: palette.ink, fontFamily: "Georgia, serif", fontSize: 92, fontWeight: 800, lineHeight: .95, maxWidth: 1200, opacity: .86, textAlign: "center"}}>{shot.title}</div></div> : null}
    <div style={{background: palette.ink, color: palette.paper, fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 800, left: 70, letterSpacing: 4, opacity: titleIn, padding: "14px 18px", position: "absolute", textTransform: "uppercase", top: 62}}>{shot.number} · {shot.treatment.replaceAll("-", " ")}</div>
  </AbsoluteFill>;
};

export const ProductionComposition: React.FC<ProductionCompositionProps> = ({plan, playbackAssets, sliceDurationInFrames, voiceTrackDataUrl, musicTrackDataUrl, audioMix}) => {
  const duration = Math.min(sliceDurationInFrames, plan.durationInFrames);
  const captions: Caption[] = plan.shots.filter((shot) => shot.caption && shot.startFrame < duration).map((shot) => ({text: shot.caption!, startMs: shot.startFrame / plan.fps * 1000, endMs: Math.min(duration, shot.startFrame + shot.durationInFrames) / plan.fps * 1000, timestampMs: null, confidence: null}));
  return <AbsoluteFill style={{background: "#111718"}}>
    {plan.shots.filter((shot) => shot.startFrame < duration).map((shot) => <Sequence from={shot.startFrame} durationInFrames={Math.min(shot.durationInFrames, duration - shot.startFrame)} key={shot.id}><TransitionedShot projectType={plan.projectType} shot={shot}><ShotScene plan={plan} playbackAssets={playbackAssets} shot={shot} /></TransitionedShot></Sequence>)}
    {voiceTrackDataUrl ? <Audio src={voiceTrackDataUrl} volume={() => audioMix?.voiceGain ?? 1} /> : null}
    {musicTrackDataUrl && audioMix?.musicDecision === "approved-master" ? <Audio loop={audioMix.musicLoop ?? true} src={musicTrackDataUrl} volume={() => audioMix.musicGain ?? .1} /> : null}
    {audioMix?.transitionSfx === "paper-flip" ? plan.shots.filter((shot) => shot.startFrame > 0 && shot.startFrame < duration).map((shot) => <Sequence from={shot.startFrame} durationInFrames={18} key={`sfx-${shot.id}`}><Audio src={staticFile("audio/paper-flip.wav")} volume={() => audioMix.transitionSfxGain} /></Sequence>) : null}
    <Captions captions={captions} />
  </AbsoluteFill>;
};
