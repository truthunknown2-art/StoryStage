import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from "remotion";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const FRAME_COUNT = 120;

const PaperEnvironment: React.FC = () => {
  const frame = useCurrentFrame();
  const storylightX = interpolate(
    frame,
    [0, 52, 78, 88, 119],
    [1220, 1260, 1208, 1180, 1200],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const storylightY = interpolate(
    frame,
    [0, 52, 78, 88, 119],
    [440, 420, 454, 405, 430],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const storylightScale = interpolate(
    frame,
    [0, 63, 78, 88, 101, 119],
    [0.82, 0.9, 1.1, 1.42, 1.0, 0.92],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#ead7ad", overflow: "hidden" }}>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="paper-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8d8ce" />
            <stop offset="1" stopColor="#f1d7a1" />
          </linearGradient>
          <filter
            id="paper-shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="8"
              floodColor="#263735"
              floodOpacity="0.22"
            />
          </filter>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#paper-sky)" />
        <circle cx="1530" cy="180" r="92" fill="#f4ba62" opacity="0.9" />
        <path
          d="M0 560L250 380L520 520L780 330L1040 520L1320 365L1600 520L1920 340V760H0Z"
          fill="#779f87"
        />
        <path
          d="M0 670L330 510L610 665L920 485L1220 650L1490 500L1920 660V910H0Z"
          fill="#507e70"
        />
        <path
          d="M0 795C300 745 525 805 760 770C1010 730 1300 795 1540 755C1710 728 1840 750 1920 760V1080H0Z"
          fill="#d89a62"
        />
        <path
          d="M0 862C310 805 545 880 800 840C1080 798 1360 882 1630 830C1760 805 1870 818 1920 830V1080H0Z"
          fill="#e9bd79"
        />
        <g filter="url(#paper-shadow)">
          <path
            d="M250 760L222 270L300 174L370 286L348 760Z"
            fill="#395d55"
            stroke="#29323a"
            strokeWidth="12"
          />
          <path
            d="M1565 760L1542 250L1610 155L1695 270L1670 760Z"
            fill="#395d55"
            stroke="#29323a"
            strokeWidth="12"
          />
          <path
            d="M315 240L165 335L245 395L80 485L358 470Z"
            fill="#5f9276"
            stroke="#29323a"
            strokeWidth="10"
          />
          <path
            d="M1618 220L1760 320L1688 382L1850 485L1585 462Z"
            fill="#5f9276"
            stroke="#29323a"
            strokeWidth="10"
          />
        </g>
        <path
          d="M1065 843C1110 725 1245 670 1395 713C1505 744 1575 806 1595 865Z"
          fill="#6f4937"
          stroke="#29323a"
          strokeWidth="12"
        />
        <ellipse cx="1348" cy="797" rx="108" ry="74" fill="#263735" />
        <path
          d="M1180 755C1240 698 1340 685 1430 718"
          fill="none"
          stroke="#a9774f"
          strokeWidth="26"
          strokeLinecap="round"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: storylightX,
          top: storylightY,
          width: 58,
          height: 58,
          borderRadius: "50%",
          backgroundColor: "#fff1a2",
          boxShadow: "0 0 30px 14px rgba(255, 222, 104, 0.72)",
          scale: storylightScale,
        }}
      />

      <Img
        src={staticFile(`frames/frame-${String(frame).padStart(4, "0")}.png`)}
        style={{
          position: "absolute",
          inset: 0,
          width: WIDTH,
          height: HEIGHT,
          objectFit: "contain",
        }}
      />

      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d="M0 1080V870C120 790 210 820 302 930C205 932 118 985 58 1080Z"
          fill="#3f7564"
          stroke="#29323a"
          strokeWidth="12"
        />
        <path
          d="M1920 1080V860C1804 800 1715 840 1622 946C1742 932 1832 994 1880 1080Z"
          fill="#3f7564"
          stroke="#29323a"
          strokeWidth="12"
        />
        <path
          d="M70 1010C140 900 226 885 302 944C212 970 150 1015 110 1080Z"
          fill="#74a36f"
        />
        <path
          d="M1850 1005C1785 900 1695 895 1622 950C1710 975 1772 1020 1810 1080Z"
          fill="#74a36f"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 92,
          top: 96,
          color: "#29323a",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 2 }}>
          GODOT 4.7.1 → REMOTION
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 10,
            color: "#47635c",
          }}
        >
          ENGINE FEASIBILITY • NOT FINAL CHARACTER ART
        </div>
      </div>
    </AbsoluteFill>
  );
};

const E0Root: React.FC = () => (
  <Composition
    id="E0GodotRemotion"
    component={PaperEnvironment}
    durationInFrames={FRAME_COUNT}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);

registerRoot(E0Root);
