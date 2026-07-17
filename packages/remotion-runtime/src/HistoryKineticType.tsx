import type {FrameAccurateRenderPlan} from "@storystage/story-engine";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";

type RenderShot = FrameAccurateRenderPlan["shots"][number];

export const HistoryKineticType: React.FC<{shot: RenderShot; reservePresenter: boolean}> = ({shot, reservePresenter}) => {
  const frame = useCurrentFrame();
  const action = shot.actions.find((candidate) => candidate.detail.type === "kineticType");
  if (!action || action.detail.type !== "kineticType") return null;
  const entranceFrames = Math.max(1, Math.min(10, shot.durationInFrames - 1));
  const exitStart = Math.max(entranceFrames + 1, shot.durationInFrames - 8);
  const opacity = interpolate(frame, [0, entranceFrames, exitStart, shot.durationInFrames], [0, 1, 1, 0], {easing: Easing.bezier(.2, .8, .2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const offset = interpolate(frame, [0, entranceFrames], [90, 0], {easing: Easing.bezier(.18, .82, .22, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const words = action.detail.text.trim().split(/\s+/);
  const accentWord = action.detail.emphasis === "word" ? action.detail.text : words.at(-1)!;
  const leading = words.slice(0, -1).join(" ");
  return <AbsoluteFill style={{alignItems: reservePresenter ? "flex-end" : "center", display: "flex", justifyContent: "center", opacity, padding: "120px 110px"}}>
    <div style={{alignItems: reservePresenter ? "flex-start" : "center", display: "flex", flexDirection: "column", marginLeft: reservePresenter ? 650 : 0, maxWidth: reservePresenter ? 1040 : 1460, translate: `${offset}px 0`}}>
      {leading ? <div style={{color: "#171b1d", fontFamily: "Arial, sans-serif", fontSize: 86, fontWeight: 900, letterSpacing: -3, lineHeight: .94, textAlign: reservePresenter ? "left" : "center", textTransform: "uppercase"}}>{leading}</div> : null}
      <div style={{color: "#ef4e3b", fontFamily: "Arial Black, Arial, sans-serif", fontSize: action.detail.emphasis === "word" ? 196 : 160, fontWeight: 950, letterSpacing: -8, lineHeight: .8, marginTop: leading ? 24 : 0, textAlign: reservePresenter ? "left" : "center", textShadow: "10px 10px 0 rgba(244,241,232,.12)", textTransform: "uppercase"}}>{accentWord}</div>
      <div style={{background: "#171b1d", height: 14, marginTop: 42, width: interpolate(frame, [entranceFrames, Math.min(entranceFrames + 10, shot.durationInFrames - 1)], [0, reservePresenter ? 760 : 980], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}} />
    </div>
  </AbsoluteFill>;
};
