import {Audio} from "@remotion/media";
import type {LegacyEpisodePlan} from "@storystage/fixtures";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {Captions} from "./Captions";
import {CutoutCharacter} from "./CutoutCharacter";

export type StoryStageCompositionProps = {
  plan: LegacyEpisodePlan;
};

const PaperGrain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "radial-gradient(circle at 18% 24%, rgba(255,255,255,.16) 0 1px, transparent 2px), radial-gradient(circle at 76% 68%, rgba(0,0,0,.12) 0 1px, transparent 2px)",
      backgroundSize: "17px 17px, 23px 23px",
      mixBlendMode: "soft-light",
      opacity: 0.44,
      pointerEvents: "none",
    }}
  />
);

const TownBackdrop: React.FC<{afterCut: boolean}> = ({afterCut}) => {
  const frame = useCurrentFrame();
  const cloudDrift = interpolate(frame, [0, 360], [-80, 120]);

  return (
    <AbsoluteFill
      style={{
        background: afterCut
          ? "linear-gradient(180deg, #633c3d 0%, #b66d4d 57%, #d5a55b 100%)"
          : "linear-gradient(180deg, #274955 0%, #6f9998 58%, #d4b06d 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{background: "#f2d79b", borderRadius: "50%", height: 170, opacity: afterCut ? 0.38 : 0.76, position: "absolute", right: 214, top: 118, width: 170}} />
      <div style={{background: "rgba(240,228,191,.32)", borderRadius: 999, height: 58, left: 220, position: "absolute", top: 156, translate: `${cloudDrift}px 0`, width: 330}} />
      <div style={{background: "rgba(240,228,191,.24)", borderRadius: 999, height: 44, left: 620, position: "absolute", top: 250, translate: `${cloudDrift * 0.55}px 0`, width: 260}} />

      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          style={{
            background: afterCut ? (index % 2 ? "#53323a" : "#70433f") : index % 2 ? "#304c50" : "#3d5f5f",
            bottom: 236,
            clipPath: "polygon(0 24%, 48% 0, 100% 28%, 100% 100%, 0 100%)",
            height: 250 + (index % 3) * 48,
            left: index * 330 - 25,
            opacity: 0.9,
            position: "absolute",
            width: 385,
          }}
        >
          <div style={{display: "grid", gap: 28, gridTemplateColumns: "repeat(3, 28px)", left: 72, position: "absolute", top: 92}}>
            {[0, 1, 2, 3, 4, 5].map((windowIndex) => (
              <div key={windowIndex} style={{background: "rgba(241,202,126,.68)", height: 42, width: 28}} />
            ))}
          </div>
        </div>
      ))}

      <div style={{background: afterCut ? "#2d2827" : "#263536", bottom: 0, clipPath: "polygon(0 20%, 100% 0, 100% 100%, 0 100%)", height: 320, position: "absolute", width: "100%"}} />
      <div style={{background: afterCut ? "#50362f" : "#4d665f", bottom: 0, clipPath: "polygon(0 12%, 100% 30%, 100% 100%, 0 100%)", height: 250, opacity: 0.88, position: "absolute", width: "100%"}} />
      <PaperGrain />
    </AbsoluteFill>
  );
};

export const StoryStageComposition: React.FC<StoryStageCompositionProps> = ({plan}) => {
  const frame = useCurrentFrame();
  const afterCut = frame >= 180;
  const cameraScale = interpolate(frame, [180, 359], [1, 1.11], {
    easing: Easing.bezier(0.33, 0, 0.2, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0, 16, 74, 92], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const evidenceOpacity = interpolate(frame, [206, 226], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{background: "#172126", overflow: "hidden"}}>
      <div style={{height: 1080, position: "absolute", transform: `scale(${plan.width / 1920})`, transformOrigin: "top left", width: 1920}}>
      <AbsoluteFill style={{background: "#172126", overflow: "hidden"}}>
      <AbsoluteFill
        style={{
          scale: cameraScale,
          transformOrigin: afterCut ? "63% 47%" : "50% 50%",
        }}
      >
        <TownBackdrop afterCut={afterCut} />
        <CutoutCharacter accent="#4f675e" body="#9e6545" gestureFrom={1000} name="Iris" paper="#e6bd79" side="left" />
        <CutoutCharacter accent="#6f3f3a" body="#c19a52" gestureFrom={272} name="Otto" paper="#d9a86c" side="right" />

        <div
          style={{
            background: "rgba(248,230,191,.93)",
            border: "8px solid rgba(49,36,30,.78)",
            boxShadow: "16px 20px 0 rgba(24,20,18,.28)",
            color: "#372925",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.08,
            opacity: evidenceOpacity,
            padding: "34px 42px",
            position: "absolute",
            right: 520,
            rotate: "-2deg",
            top: 166,
            width: 430,
          }}
        >
          1518
          <div style={{background: "#9d4d42", height: 8, margin: "18px 0", width: 120}} />
          Strasbourg begins to dance.
        </div>
      </AbsoluteFill>

      <div
        style={{
          color: "#fff3d6",
          fontFamily: "Georgia, 'Times New Roman', serif",
          left: 96,
          opacity: titleOpacity,
          position: "absolute",
          textShadow: "0 5px 0 rgba(18,24,24,.24)",
          top: 82,
        }}
      >
        <div style={{fontFamily: "Arial, Helvetica, sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 7, marginBottom: 16, textTransform: "uppercase"}}>Frankly Weird History</div>
        <div style={{fontSize: 82, fontWeight: 700, letterSpacing: -3}}>An ordinary morning.</div>
      </div>

      {afterCut ? (
        <div style={{background: "#f0c96e", height: 10, left: 96, position: "absolute", top: 86, width: 98}} />
      ) : null}

      <Sequence from={180} durationInFrames={40} layout="none">
        <Audio src={staticFile("audio/paper-flip.wav")} volume={0.28} />
      </Sequence>
      <Captions captions={plan.captions} />
      <PaperGrain />
      </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
