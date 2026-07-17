import type {Caption} from "@remotion/captions";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

type CaptionsProps = {
  captions: Caption[];
};

export const Captions: React.FC<CaptionsProps> = ({captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const caption = captions.find((item) => timeMs >= item.startMs && timeMs < item.endMs);

  if (!caption) {
    return null;
  }

  const opacity = interpolate(
    timeMs,
    [caption.startMs, caption.startMs + 180, caption.endMs - 220, caption.endMs],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 120px 86px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(12, 19, 21, 0.88)",
          border: "2px solid rgba(244, 224, 181, 0.28)",
          borderRadius: 18,
          boxShadow: "0 14px 34px rgba(0,0,0,0.26)",
          color: "#fff6e6",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: -0.8,
          lineHeight: 1.15,
          maxWidth: 1240,
          opacity,
          padding: "22px 34px",
          textAlign: "center",
        }}
      >
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};
