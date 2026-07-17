import {Audio} from "@remotion/media";
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import type {PlaybackAsset} from "./ProductionComposition";

export type RigDiagnosticCompositionProps = {asset: PlaybackAsset; entityName: string};

export const RigDiagnosticComposition: React.FC<RigDiagnosticCompositionProps> = ({asset, entityName}) => {
  const frame = useCurrentFrame();
  const phase = frame < 30 ? "neutral registration" : frame < 72 ? "talk / gesture swap" : "reaction / movement";
  return <AbsoluteFill style={{background: "linear-gradient(145deg,#101718,#25332f)", color: "#edf3ef", fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
    <div style={{border: "2px solid rgba(149,213,173,.24)", inset: 48, position: "absolute"}} />
    {asset.type === "character-rig" ? <>
      <div style={{bottom: 70, height: 500, left: 390, position: "absolute", translate: `${interpolate(frame, [0, 30, 72, 119], [0, 0, 55, -30], {extrapolateRight: "clamp"})}px ${interpolate(frame, [0, 60, 90, 119], [0, -8, -34, 0], {extrapolateRight: "clamp"})}px`, width: 500}}>
        <Img src={frame < 30 ? asset.neutral : frame < 72 ? asset.talk : asset.reaction} style={{height: "100%", objectFit: "contain", objectPosition: "bottom", scale: interpolate(frame, [0, 119], [1, 1.08], {extrapolateRight: "clamp"}), width: "100%"}} />
      </div>
      <div style={{background: "#87cda1", bottom: 67, height: 3, left: 300, position: "absolute", width: 680}} />
    </> : asset.type === "background-layers" ? <>
      <Img src={asset.far} style={{height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 119], [1, 1.08]), translate: `${interpolate(frame, [0, 119], [0, -16])}px 0`, width: "100%"}} />
      <Img src={asset.midground} style={{height: "100%", objectFit: "contain", position: "absolute", scale: interpolate(frame, [0, 119], [1, 1.16]), translate: `${interpolate(frame, [0, 119], [0, -42])}px 0`, width: "100%"}} />
      <Img src={asset.foreground} style={{height: "100%", objectFit: "contain", position: "absolute", scale: interpolate(frame, [0, 119], [1, 1.25]), translate: `${interpolate(frame, [0, 119], [0, -82])}px 0`, width: "100%"}} />
    </> : <Img src={asset.cutout} style={{bottom: 90, height: 390, objectFit: "contain", position: "absolute", right: interpolate(frame, [0, 70, 119], [640, 420, 250]), rotate: `${interpolate(frame, [0, 60, 119], [-7, 5, 0])}deg`, translate: `0 ${interpolate(frame, [0, 55, 80, 119], [0, -90, -60, 0])}px`, width: 390}} />}
    <div style={{background: "rgba(9,14,14,.84)", left: 72, padding: "20px 24px", position: "absolute", top: 68}}><div style={{color: "#8bd0a5", fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase"}}>Selected rig diagnostic</div><div style={{fontFamily: "Georgia,serif", fontSize: 48, fontWeight: 700, marginTop: 8}}>{entityName}</div><div style={{color: "#9ba7a1", fontSize: 22, marginTop: 7, textTransform: "capitalize"}}>{phase}</div></div>
    <Audio loop src={staticFile("audio/paper-flip.wav")} volume={0.035} />
  </AbsoluteFill>;
};
