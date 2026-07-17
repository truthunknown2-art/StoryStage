import type {FrameAccurateRenderPlan} from "@storystage/story-engine";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

type RenderShot = FrameAccurateRenderPlan["shots"][number];

export const HistoryEditorialStage: React.FC<{shot: RenderShot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const ordinal = Number(shot.number.split(".").at(-1) ?? 1);
  const reverse = ordinal % 2 === 0 && shot.treatment !== "kinetic-type";
  const drift = interpolate(frame, [0, shot.durationInFrames], [0, -34], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const push = shot.actions.some((action) => action.detail.type === "cameraPush") ? interpolate(frame, [0, shot.durationInFrames], [1, 1.06], {extrapolateRight: "clamp"}) : 1;
  return <AbsoluteFill style={{background: "#ddd5c5", overflow: "hidden"}}>
    <AbsoluteFill style={{backgroundImage: "radial-gradient(circle at 18% 24%, rgba(23,27,29,.14) 0 1.4px, transparent 1.8px), linear-gradient(118deg, rgba(255,255,255,.34), transparent 42%, rgba(22,26,28,.08))", backgroundSize: "12px 12px, 100% 100%", scale: push, translate: `${drift}px 0`}} />
    <div style={{background: "#171b1d", height: reverse ? 270 : 210, left: reverse ? 820 : -80, opacity: .94, position: "absolute", rotate: reverse ? "4deg" : "-5deg", top: reverse ? 70 : 100, translate: `${drift * .35}px 0`, width: 1160}} />
    <div style={{background: "#ef4e3b", height: reverse ? 44 : 34, left: reverse ? 540 : 0, position: "absolute", top: reverse ? 330 : 300, translate: `${drift * .5}px 0`, width: 1380}} />
    <div style={{border: "4px solid rgba(23,27,29,.35)", bottom: 120, height: 330, left: reverse ? 120 : undefined, position: "absolute", right: reverse ? undefined : 120, rotate: reverse ? "-3deg" : "3deg", width: 450}}>
      <div style={{background: "rgba(23,27,29,.18)", height: 18, margin: "54px 42px 0", width: 280}} />
      <div style={{background: "rgba(23,27,29,.12)", height: 15, margin: "24px 42px 0", width: 340}} />
      <div style={{background: "rgba(239,78,59,.72)", height: 70, margin: "48px 42px 0", width: 70}} />
    </div>
    <div style={{bottom: 60, color: "rgba(23,27,29,.55)", fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 900, left: reverse ? 90 : undefined, letterSpacing: 7, position: "absolute", right: reverse ? undefined : 90, textTransform: "uppercase"}}>StoryStage archive stage</div>
  </AbsoluteFill>;
};
