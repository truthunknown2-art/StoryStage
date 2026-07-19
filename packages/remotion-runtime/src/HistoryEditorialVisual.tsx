import type {FrameAccurateRenderPlan} from "@storystage/story-engine";
import {AbsoluteFill, Img, interpolate, useCurrentFrame} from "remotion";
import type {PropPlaybackAsset} from "./ProductionComposition";

type RenderShot = FrameAccurateRenderPlan["shots"][number];

export const HistoryEditorialVisual: React.FC<{asset?: PropPlaybackAsset; candidatePreview?: boolean; shot: RenderShot}> = ({asset, candidatePreview = false, shot}) => {
  const frame = useCurrentFrame();
  const ordinal = Number(shot.number.split(".").at(-1) ?? 1);
  const reverse = ordinal % 2 === 0;
  const push = interpolate(frame, [0, shot.durationInFrames], [1.025, 1.11], {extrapolateRight: "clamp"});
  const drift = interpolate(frame, [0, shot.durationInFrames], [reverse ? -24 : 24, reverse ? 26 : -26], {extrapolateRight: "clamp"});
  const editorialText = shot.editorialText ?? shot.caption ?? shot.title;

  return <AbsoluteFill style={{background: "#171b1d", overflow: "hidden"}}>
    {asset ? <Img src={asset.cutout} style={{filter: "contrast(1.04) saturate(.82)", height: "100%", objectFit: "cover", scale: push, translate: `${drift}px 0`, width: "100%"}} /> : <>
      <AbsoluteFill style={{background: "linear-gradient(125deg,#c9bfaa,#eee7d8 54%,#b8aa92)"}} />
      <AbsoluteFill style={{backgroundImage: "radial-gradient(circle at 25% 30%,rgba(23,27,29,.2) 0 1px,transparent 1.6px)", backgroundSize: "13px 13px", opacity: .6, scale: push, translate: `${drift}px 0`}} />
      <div style={{border: "5px solid rgba(23,27,29,.56)", inset: 100, position: "absolute", rotate: reverse ? "-1.2deg" : "1.2deg"}} />
      <div style={{color: "#171b1d", fontFamily: "Georgia,serif", fontSize: 74, fontWeight: 800, left: 180, lineHeight: .96, maxWidth: 1180, position: "absolute", top: 280}}>{editorialText}</div>
      <div style={{background: "#ef4e3b", bottom: 164, height: 20, left: 180, position: "absolute", width: 430}} />
    </>}
    <AbsoluteFill style={{background: "linear-gradient(90deg,rgba(14,17,18,.68),transparent 45%,rgba(14,17,18,.2))"}} />
    <div style={{background: "#ef4e3b", color: "#f5efe2", fontFamily: "Arial,sans-serif", fontSize: 22, fontWeight: 950, left: 70, letterSpacing: 4, padding: "13px 18px", position: "absolute", textTransform: "uppercase", top: 82}}>Generated reconstruction</div>
    <div style={{bottom: 70, color: "rgba(245,239,226,.88)", fontFamily: "Arial,sans-serif", fontSize: 18, fontWeight: 800, left: 74, letterSpacing: 2.5, maxWidth: 520, position: "absolute", textTransform: "uppercase"}}>{asset ? candidatePreview ? "Unapproved candidate · review only" : "Human-approved production visual" : "Candidate required · approval gate remains open"}</div>
  </AbsoluteFill>;
};
