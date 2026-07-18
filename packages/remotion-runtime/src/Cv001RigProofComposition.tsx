import {
  assertMotionProgram,
  evaluateMotionProgram,
  type DirectedBeatProgram,
} from "@storystage/story-engine";
import { useCurrentFrame } from "remotion";
import {
  cv001RigLayout,
  getCv001LanternPickupAnchor,
} from "./cv001-rig-kinematics";

export type Cv001RigProofCompositionProps = { program: DirectedBeatProgram };

const Lantern: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g transform={`scale(${scale})`}>
    <path
      d="M-26 -34 Q0 -68 26 -34"
      fill="none"
      stroke="#5a3a22"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <rect
      fill="#5f3d24"
      height="86"
      rx="14"
      stroke="#2e2118"
      strokeWidth="8"
      width="68"
      x="-34"
      y="-30"
    />
    <rect fill="#ffd76b" height="58" rx="8" width="42" x="-21" y="-16" />
    <circle cx="0" cy="10" fill="#fff5ad" opacity=".9" r="34" />
    <path
      d="M-42 -31 H42 M-42 58 H42"
      stroke="#2e2118"
      strokeWidth="8"
      strokeLinecap="round"
    />
  </g>
);

const CutPaperLeaf: React.FC<{
  fill: string;
  rotate: number;
  x: number;
  y: number;
}> = ({ fill, rotate, x, y }) => (
  <ellipse
    cx={x}
    cy={y}
    fill={fill}
    opacity=".96"
    rx="44"
    ry="95"
    transform={`rotate(${rotate} ${x} ${y})`}
  />
);

export const Cv001RigProofComposition: React.FC<
  Cv001RigProofCompositionProps
> = ({ program }) => {
  const validated = assertMotionProgram(program, { cv001Proof: true });
  const frame = useCurrentFrame();
  const evaluated = evaluateMotionProgram(validated, frame);
  const rootX = evaluated.root.x ?? 0;
  const rootY = evaluated.root.y ?? 0;
  const rootRotation = evaluated.root.rotation ?? 0;
  const rootScale = evaluated.root.scale ?? 1;
  const torsoRotation = evaluated.bones.torso?.rotation ?? 0;
  const headRotation = evaluated.bones.head?.rotation ?? 0;
  const upperArmRotation =
    cv001RigLayout.upperArmRotationOffset -
    (evaluated.bones["upper-arm-right"]?.rotation ?? 0);
  const lowerArmRotation =
    cv001RigLayout.lowerArmRotationOffset +
    (evaluated.bones["lower-arm-right"]?.rotation ?? 0);
  const handRotation = evaluated.bones["hand-right"]?.rotation ?? 0;
  const gazeX = evaluated.face["gaze-x"] ?? 0;
  const blink = Math.max(0, Math.min(1, evaluated.face.blink ?? 0));
  const mouthOpen = Math.max(0, Math.min(1, evaluated.face["mouth-open"] ?? 0));
  const cameraScale = evaluated.camera.scale ?? 1;
  const cameraX = evaluated.camera.x ?? 0;
  const lanternPickupAnchor = getCv001LanternPickupAnchor(validated);
  const lanternAttached = evaluated.attachments.some(
    (attachment) =>
      attachment.propId === "lantern" && attachment.boneId === "hand-right",
  );
  const foregroundX = cameraX * -0.75;
  const midgroundX = cameraX * -0.42;
  const farX = cameraX * -0.15;

  return (
    <svg
      aria-label="CV-001 deterministic articulated animation proof"
      height="100%"
      role="img"
      viewBox="0 0 1920 1080"
      width="100%"
    >
      <defs>
        <linearGradient id="cv001-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#234d50" />
          <stop offset="1" stopColor="#86b982" />
        </linearGradient>
        <radialGradient id="cv001-glow">
          <stop offset="0" stopColor="#fff4a8" stopOpacity=".9" />
          <stop offset=".45" stopColor="#ffc955" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffc955" stopOpacity="0" />
        </radialGradient>
        <filter id="cv001-shadow">
          <feDropShadow
            dx="14"
            dy="20"
            floodColor="#0b211d"
            floodOpacity=".32"
            stdDeviation="10"
          />
        </filter>
        <filter id="cv001-paper">
          <feTurbulence
            baseFrequency=".7"
            numOctaves="2"
            result="noise"
            seed="7"
            type="fractalNoise"
          />
          <feColorMatrix
            in="noise"
            result="grain"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .07 0"
          />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
      </defs>
      <rect fill="#102d2f" height="1080" width="1920" />
      <g transform={`translate(${farX} 0)`}>
        <rect fill="url(#cv001-sky)" height="1080" width="2100" x="-90" />
        <circle cx="1450" cy="230" fill="#f7d98d" opacity=".42" r="190" />
        <path
          d="M-80 720 Q260 420 580 660 T1120 630 T2010 620 V1080 H-80Z"
          fill="#315f4d"
        />
      </g>
      <g filter="url(#cv001-paper)" transform={`translate(${midgroundX} 0)`}>
        <path
          d="M0 890 Q260 700 480 840 T900 790 T1370 820 T1920 750 V1080 H0Z"
          fill="#1f5143"
        />
        <path
          d="M0 0 H300 Q420 280 325 610 Q250 790 160 1080 H0Z"
          fill="#3f2d25"
        />
        <path
          d="M1920 0 H1650 Q1510 300 1600 650 Q1680 850 1760 1080 H1920Z"
          fill="#4a3227"
        />
        {Array.from({ length: 11 }, (_, index) => (
          <CutPaperLeaf
            fill={index % 2 ? "#2f7658" : "#448766"}
            key={index}
            rotate={-58 + index * 13}
            x={150 + index * 170}
            y={180 + (index % 3) * 95}
          />
        ))}
      </g>
      <g
        transform={`translate(${cameraX} 0) translate(960 540) scale(${cameraScale}) translate(-960 -540)`}
      >
        <circle
          cx={lanternPickupAnchor.x}
          cy={lanternPickupAnchor.y}
          fill="url(#cv001-glow)"
          r="210"
        />
        {!lanternAttached ? (
          <g
            filter="url(#cv001-shadow)"
            transform={`translate(${lanternPickupAnchor.x} ${lanternPickupAnchor.y})`}
          >
            <Lantern scale={0.92} />
          </g>
        ) : null}
        <g
          data-phase={evaluated.phase ?? "none"}
          filter="url(#cv001-shadow)"
          transform={`translate(${cv001RigLayout.rootOrigin.x + rootX} ${cv001RigLayout.rootOrigin.y + rootY}) rotate(${rootRotation}) scale(${rootScale})`}
        >
          <g transform={`rotate(${torsoRotation})`}>
            <path
              d="M-88 -205 Q0 -250 90 -205 L105 -20 Q0 42 -108 -18Z"
              fill="#e4a748"
              stroke="#5b3b28"
              strokeWidth="9"
            />
            <path
              d="M-56 -198 Q0 -222 58 -194 L45 -62 Q0 -22 -54 -66Z"
              fill="#56855d"
              opacity=".92"
            />
            <g transform={`translate(0 -250) rotate(${headRotation})`}>
              <ellipse
                cx="0"
                cy="-25"
                fill="#d8894f"
                rx="98"
                ry="105"
                stroke="#5b3b28"
                strokeWidth="9"
              />
              <path
                d="M-92 -66 Q-60 -148 5 -125 Q88 -132 98 -58 Q52 -92 22 -72 Q-20 -112 -92 -66Z"
                fill="#3d2a28"
              />
              <ellipse
                cx="-34"
                cy="-30"
                fill="#fff9e8"
                rx="20"
                ry={Math.max(2, 25 * (1 - blink))}
              />
              <ellipse
                cx="35"
                cy="-30"
                fill="#fff9e8"
                rx="20"
                ry={Math.max(2, 25 * (1 - blink))}
              />
              <circle
                cx={-34 + gazeX * 8}
                cy="-26"
                fill="#1c2f31"
                r={Math.max(2, 10 * (1 - blink))}
              />
              <circle
                cx={35 + gazeX * 8}
                cy="-26"
                fill="#1c2f31"
                r={Math.max(2, 10 * (1 - blink))}
              />
              <path
                d="M-55 -65 Q-34 -78 -14 -64 M14 -64 Q35 -77 56 -62"
                fill="none"
                stroke="#472f2b"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <ellipse
                cx="8"
                cy="37"
                fill="#5a2b2d"
                rx={18 + mouthOpen * 7}
                ry={5 + mouthOpen * 18}
              />
            </g>
            <g
              transform={`translate(${cv001RigLayout.upperArmPivot.x} ${cv001RigLayout.upperArmPivot.y}) rotate(${upperArmRotation})`}
            >
              <rect
                fill="#e0a34c"
                height="58"
                rx="29"
                stroke="#5b3b28"
                strokeWidth="8"
                width="132"
                x="-8"
                y="-29"
              />
              <g
                transform={`translate(${cv001RigLayout.forearmPivot.x} ${cv001RigLayout.forearmPivot.y}) rotate(${lowerArmRotation})`}
              >
                <rect
                  fill="#d8894f"
                  height="52"
                  rx="26"
                  stroke="#5b3b28"
                  strokeWidth="8"
                  width="116"
                  x="-4"
                  y="-26"
                />
                <g
                  transform={`translate(${cv001RigLayout.handPivot.x} ${cv001RigLayout.handPivot.y}) rotate(${handRotation})`}
                >
                  <ellipse
                    cx="18"
                    cy="0"
                    fill="#d8894f"
                    rx="34"
                    ry="29"
                    stroke="#5b3b28"
                    strokeWidth="8"
                  />
                  {lanternAttached ? (
                    <g
                      transform={`translate(${cv001RigLayout.lanternOffset.x} ${cv001RigLayout.lanternOffset.y})`}
                    >
                      <Lantern scale={0.92} />
                    </g>
                  ) : null}
                </g>
              </g>
            </g>
            <g opacity=".72" transform="translate(-70 -155) rotate(72)">
              <rect
                fill="#d8894f"
                height="48"
                rx="24"
                stroke="#5b3b28"
                strokeWidth="8"
                width="120"
              />
            </g>
            <g transform="translate(-56 -16)">
              <path
                d="M0 0 L-34 160"
                stroke="#513832"
                strokeWidth="55"
                strokeLinecap="round"
              />
              <path
                d="M92 0 L128 160"
                stroke="#513832"
                strokeWidth="55"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>
      </g>
      <g filter="url(#cv001-paper)" transform={`translate(${foregroundX} 0)`}>
        <path
          d="M0 900 Q250 720 480 910 T910 900 T1360 930 T2000 850 V1080 H0Z"
          fill="#123d35"
        />
        {Array.from({ length: 8 }, (_, index) => (
          <CutPaperLeaf
            fill={index % 2 ? "#245f4b" : "#1a4d40"}
            key={`foreground-${index}`}
            rotate={-50 + index * 18}
            x={40 + index * 275}
            y={960 - (index % 2) * 70}
          />
        ))}
      </g>
      <g transform="translate(70 72)">
        <rect
          fill="#10211f"
          height="72"
          opacity=".88"
          rx="20"
          stroke="#5c8e70"
          strokeWidth="2"
          width="520"
        />
        <text
          fill="#9de3b8"
          fontFamily="Arial, sans-serif"
          fontSize="24"
          fontWeight="700"
          x="28"
          y="30"
        >
          CV-001-A · FRAME-EVALUATED RIG
        </text>
        <text
          fill="#d8e7dc"
          fontFamily="Arial, sans-serif"
          fontSize="20"
          x="28"
          y="56"
        >
          {evaluated.phase ?? "hold"} · frame {frame} /{" "}
          {validated.durationInFrames - 1}
        </text>
      </g>
    </svg>
  );
};
