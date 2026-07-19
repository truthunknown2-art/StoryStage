import type {FrameAccurateRenderPlan} from "@storystage/story-engine";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";

type RenderShot = FrameAccurateRenderPlan["shots"][number];

export const HistoryDiagram: React.FC<{shot: RenderShot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const text = shot.editorialText ?? shot.caption ?? shot.title;
  const stagePolicy = /stage/i.test(text);
  const nodes = stagePolicy ? ["PUBLIC PANIC", "HIRE MUSIC", "BUILD A STAGE"] : ["EXHAUSTION", "KEEP DANCING", "FEVER OUT?"];
  const entrance = Math.max(1, Math.min(10, shot.durationInFrames - 1));
  const reveal = (index: number) => index === 0 ? 1 : interpolate(frame, [(index - 1) * 6, (index - 1) * 6 + entrance], [0, 1], {easing: Easing.bezier(.2, .8, .2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return <AbsoluteFill style={{background: "#e3dccd", color: "#171b1d", fontFamily: "Arial,sans-serif", overflow: "hidden", padding: "92px 100px"}}>
    <div style={{fontSize: 19, fontWeight: 950, letterSpacing: 6, textTransform: "uppercase"}}>Official logic · Strasbourg 1518</div>
    <div style={{background: "#ef4e3b", height: 13, marginTop: 25, width: interpolate(frame, [0, entrance + 8], [0, 620], {extrapolateRight: "clamp"})}} />
    <div style={{alignItems: "center", display: "grid", gridTemplateColumns: "1fr 120px 1fr 120px 1fr", marginTop: 160}}>
      {nodes.map((node, index) => <div key={node} style={{display: "contents"}}>
        <div style={{background: index === 2 ? "#ef4e3b" : "#171b1d", color: "#f5efe2", fontSize: 42, fontWeight: 950, lineHeight: .92, minHeight: 210, opacity: reveal(index), padding: "58px 34px", rotate: `${index === 1 ? -2 : index === 2 ? 2 : 0}deg`, textAlign: "center", translate: `0 ${interpolate(reveal(index), [0, 1], [35, 0])}px`}}>{node}</div>
        {index < nodes.length - 1 ? <div style={{fontSize: 74, fontWeight: 300, opacity: reveal(index + 1), textAlign: "center"}}>→</div> : null}
      </div>)}
    </div>
  </AbsoluteFill>;
};
