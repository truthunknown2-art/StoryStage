import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { createContext, useContext } from "react";
import { Audio } from "@remotion/media";
import maraRunAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1/atlas-manifest.json";
import maraSneakAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/sneak-v1/atlas-manifest.json";
import miloRunAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/milo/run-right-v1/atlas-manifest.json";
import miloSneakAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/milo/sneak-v1/atlas-manifest.json";
import maraPerformanceAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1/atlas-manifest.json";
import maraReactionAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/reaction-v1/atlas-manifest.json";
import miloPerformanceAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/milo/performance-v1/atlas-manifest.json";
import miloReactionAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/milo/reaction-v1/atlas-manifest.json";
import guardianPerformanceAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/performance-v1/atlas-manifest.json";
import guardianChaseAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/chase-v1/atlas-manifest.json";
import guardianCloseupAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/closeup-v1/atlas-manifest.json";
import guardianSneezeAtlasManifest from "../public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/sneeze-v1/atlas-manifest.json";

export const KIDS_SHOWCASE_FPS = 30;
export const KIDS_SHOWCASE_DURATION_IN_FRAMES = 900;
export const KIDS_SHOWCASE_WIDTH = 1280;
export const KIDS_SHOWCASE_HEIGHT = 720;

export type KidsShowcaseShot = {
  id: string;
  startFrame: number;
  durationInFrames: number;
  title: string;
  intent: string;
  narration: string;
};

export type KidsShowcaseCompositionProps = {
  showCaptions?: boolean;
  showProofLabel?: boolean;
  sneezeIntensity?: number;
  scheduledSoundCues?: Array<{
    id: string;
    from: number;
    assetId:
      | "showcase-footstep"
      | "showcase-rustle"
      | "showcase-moth-chime"
      | "showcase-wake"
      | "showcase-sneeze"
      | "showcase-spark"
      | "showcase-resolve";
    gain: number;
  }>;
};

const showcaseSoundFiles = {
  "showcase-footstep": "footstep.wav",
  "showcase-rustle": "rustle.wav",
  "showcase-moth-chime": "moth-chime.wav",
  "showcase-wake": "wake.wav",
  "showcase-sneeze": "sneeze.wav",
  "showcase-spark": "spark.wav",
  "showcase-resolve": "resolve.wav",
} as const;

const ShowcaseOptionsContext = createContext({
  showCaptions: false,
  showProofLabel: false,
  sneezeIntensity: 1,
});

export const kidsShowcaseShots: KidsShowcaseShot[] = [
  {
    id: "run-to-the-ruin",
    startFrame: 0,
    durationInFrames: 84,
    title: "Follow the glow",
    intent: "Offset run cycles and a readable destination",
    narration:
      "The little light slipped through the oldest arch in the forest.",
  },
  {
    id: "cross-the-threshold",
    startFrame: 84,
    durationInFrames: 48,
    title: "Cross the threshold",
    intent: "Foot-cycle insert and foreground wipe",
    narration: "Mara and Milo hurried after it.",
  },
  {
    id: "listen-in-the-dark",
    startFrame: 132,
    durationInFrames: 78,
    title: "Did you hear that?",
    intent: "Gaze-led acting with a comprehension hold",
    narration: "Then the ruin whispered back.",
  },
  {
    id: "empty-corridor",
    startFrame: 210,
    durationInFrames: 48,
    title: "Let the room breathe",
    intent: "Empty-environment reset and traveling light",
    narration: "For one tiny moment, nobody moved.",
  },
  {
    id: "sneak-entrance",
    startFrame: 258,
    durationInFrames: 84,
    title: "Into the moon hall",
    intent: "Staggered entrances, sneak cycles, and camera push",
    narration: "So they followed the glow into the moon hall.",
  },
  {
    id: "creature-reveal",
    startFrame: 342,
    durationInFrames: 60,
    title: "Something wakes",
    intent: "Medium reveal with layered head and limb motion",
    narration: "A hill of moss opened two enormous eyes.",
  },
  {
    id: "eye-close-up",
    startFrame: 402,
    durationInFrames: 48,
    title: "Eye-line payoff",
    intent: "Extreme close-up, blink, and reframe",
    narration: "It looked straight at Mara.",
  },
  {
    id: "kids-reaction",
    startFrame: 450,
    durationInFrames: 72,
    title: "Read the reaction",
    intent: "Anticipation, recoil, settle, and shared eye-line",
    narration: "Mara gasped. Milo forgot how knees worked.",
  },
  {
    id: "spark-sneeze",
    startFrame: 522,
    durationInFrames: 108,
    title: "The spark sneeze",
    intent: "Anticipation, action, overshoot, particles, and hold",
    narration:
      "The creature puffed up its cheeks... and sneezed a skyful of sparks.",
  },
  {
    id: "escape-run",
    startFrame: 630,
    durationInFrames: 120,
    title: "Run through the wipe",
    intent: "Grounded escape cycles, parallax, and foreground wipes",
    narration: "That was more than enough adventure for one hallway.",
  },
  {
    id: "friendly-payoff",
    startFrame: 750,
    durationInFrames: 150,
    title: "It only wanted to play",
    intent: "Daylight reveal, secondary action, and comprehension hold",
    narration: "But the moss giant only wanted someone to catch its light.",
  },
];

const narrationAt = (index: number) =>
  kidsShowcaseShots[index]?.narration ?? "";

type KidVariant = "mara" | "milo";

const clampInterpolate = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, {
    easing: Easing.bezier(0.22, 0.8, 0.2, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const PaperGrain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "radial-gradient(circle at 17% 23%, rgba(255,255,255,.2) 0 1px, transparent 1.7px), radial-gradient(circle at 74% 61%, rgba(15,31,29,.13) 0 1px, transparent 1.6px)",
      backgroundSize: "19px 19px, 27px 27px",
      mixBlendMode: "soft-light",
      opacity: 0.34,
      pointerEvents: "none",
    }}
  />
);

const ForestBackdrop: React.FC<{
  mode: "forest" | "threshold" | "cave" | "clearing";
  push?: number;
  travel?: number;
}> = ({ mode, push = 0, travel = 0 }) => {
  const cave = mode === "cave";
  const clearing = mode === "clearing";
  const threshold = mode === "threshold";
  const platePath = cave
    ? "show-packs/kids/moonlit-ruins/v1/sets/moon-hall/background-v1.png"
    : clearing
      ? "show-packs/kids/moonlit-ruins/v1/sets/dawn-clearing/background-v1.png"
      : "show-packs/kids/moonlit-ruins/v1/sets/moonlit-forest/background-v1.png";
  const skyA = cave ? "#071d27" : clearing ? "#9be4cf" : "#173f48";
  const skyB = cave ? "#172b32" : clearing ? "#f2d381" : "#6b9e82";
  const ground = cave ? "#182e2d" : clearing ? "#315f49" : "#24493e";
  const scale = 1 + push * 0.09;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${skyA}, ${skyB} 62%, ${ground})`,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(platePath)}
        style={{
          height: "106%",
          left: "-3%",
          objectFit: "cover",
          position: "absolute",
          top: "-3%",
          transform: `scale(${1 + push * 0.025}) translateX(${travel * -16}px)`,
          transformOrigin: "55% 58%",
          width: "106%",
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{
          opacity: 0.1,
          position: "absolute",
          transform: `scale(${scale}) translateX(${travel * -38}px)`,
          transformOrigin: "50% 54%",
        }}
      >
        <defs>
          <radialGradient id={`moon-${mode}`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0"
              stopColor={clearing ? "#fff6bf" : "#d3f4de"}
              stopOpacity=".92"
            />
            <stop
              offset="1"
              stopColor={clearing ? "#ffdc79" : "#7ad3be"}
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient id={`ruin-${mode}`} x1="0" x2="1">
            <stop stopColor={cave ? "#132527" : "#294a42"} />
            <stop offset="1" stopColor={cave ? "#223937" : "#426b55"} />
          </linearGradient>
        </defs>
        <circle
          cx={clearing ? 980 : 760}
          cy={clearing ? 170 : 204}
          fill={`url(#moon-${mode})`}
          r={clearing ? 235 : 180}
        />
        {cave ? (
          <path
            d="M0 0h1280v720H0z M310 720V316Q640 25 970 316v404z"
            fill="#09191d"
            fillRule="evenodd"
            opacity=".88"
          />
        ) : null}
        {threshold ? (
          <path
            d="M365 720V272Q640 38 915 272v448"
            fill="none"
            stroke="#122d2d"
            strokeWidth="170"
          />
        ) : null}
        {!cave
          ? [0, 1, 2, 3, 4, 5, 6].map((index) => (
              <g
                key={index}
                transform={`translate(${index * 215 - 90 + travel * (index % 2 ? -16 : -8)} 0)`}
              >
                <path
                  d="M74 720C59 574 80 410 62 270C48 163 84 70 118-20H226C178 101 162 189 176 300C195 453 162 596 181 720Z"
                  fill={index % 2 ? "#183934" : "#20473c"}
                />
                <path
                  d="M112 148C12 111-5 55 31 18C96 8 151 49 175 104C242 41 305 49 324 101C299 165 221 190 143 185Z"
                  fill={index % 2 ? "#2c5e47" : "#386c50"}
                  opacity=".94"
                />
              </g>
            ))
          : null}
        {clearing ? (
          <path
            d="M0 478C258 419 393 496 604 461C845 421 1026 399 1280 459V720H0Z"
            fill="#2f654a"
          />
        ) : null}
        <path
          d="M0 603C224 562 400 620 628 582C851 545 1056 550 1280 601V720H0Z"
          fill={ground}
        />
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <g
            key={`plant-${index}`}
            transform={`translate(${80 + index * 235 - travel * 42} ${610 + (index % 2) * 24})`}
          >
            <path
              d="M0 98C5 57 1 20 13-10"
              fill="none"
              stroke={clearing ? "#173f37" : "#0d2a29"}
              strokeWidth="11"
            />
            <ellipse
              cx="-18"
              cy="30"
              fill={index % 2 ? "#3a7555" : "#2f654d"}
              rx="32"
              ry="15"
              transform="rotate(32 -18 30)"
            />
            <ellipse
              cx="30"
              cy="7"
              fill={index % 2 ? "#447f5d" : "#356d50"}
              rx="35"
              ry="16"
              transform="rotate(-26 30 7)"
            />
          </g>
        ))}
      </svg>
      <div
        style={{
          background: cave
            ? "linear-gradient(90deg, transparent, rgba(94,218,195,.12), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,238,168,.11), transparent)",
          height: "100%",
          left: `${34 + travel * 12}%`,
          position: "absolute",
          rotate: "-8deg",
          top: 0,
          width: 210,
        }}
      />
      <PaperGrain />
    </AbsoluteFill>
  );
};

const ForegroundFoliagePass: React.FC<{
  travel: number;
}> = ({ travel }) => {
  return (
    <Img
      aria-label="Foreground plant occlusion layer"
      src={staticFile(
        "show-packs/kids/moonlit-ruins/v1/sets/moonlit-forest/foreground-v1.png",
      )}
      style={{
        bottom: -28,
        height: "70%",
        left: "5%",
        objectFit: "contain",
        objectPosition: "center bottom",
        position: "absolute",
        transform: `translateX(${travel * -8}px)`,
        width: "90%",
      }}
    />
  );
};

const GeneratedSetForeground: React.FC<{
  mode: "cave" | "clearing";
  travel?: number;
}> = ({ mode, travel = 0 }) => {
  const path =
    mode === "cave"
      ? "show-packs/kids/moonlit-ruins/v1/sets/moon-hall/foreground-v1.png"
      : "show-packs/kids/moonlit-ruins/v1/sets/dawn-clearing/foreground-v1.png";
  return (
    <Img
      aria-label={`${mode} generated foreground occlusion layer`}
      src={staticFile(path)}
      style={{
        height: "103%",
        left: "-1.5%",
        objectFit: "cover",
        pointerEvents: "none",
        position: "absolute",
        top: "-1.5%",
        transform: `scale(1.012) translateX(${travel * -10}px)`,
        transformOrigin: "50% 70%",
        width: "103%",
      }}
    />
  );
};

const GlowMoth: React.FC<{
  x: number;
  y: number;
  scale?: number;
  phase?: number;
}> = ({ x, y, scale = 1, phase = 0 }) => {
  const flap = Math.sin(phase * Math.PI * 2) * 24;
  return (
    <g
      filter="drop-shadow(0 0 15px #ffe36d)"
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <ellipse
        cx="-15"
        cy="0"
        fill="#fff2a0"
        opacity=".86"
        rx="18"
        ry="8"
        transform={`rotate(${-26 + flap})`}
      />
      <ellipse
        cx="15"
        cy="0"
        fill="#fff2a0"
        opacity=".86"
        rx="18"
        ry="8"
        transform={`rotate(${26 - flap})`}
      />
      <circle fill="#ffe05b" r="8" />
      <circle fill="#fffbd0" r="3" />
    </g>
  );
};

const profileRunAtlas = {
  mara: {
    ...maraRunAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1/atlas.png",
    loopRootDistance: 400,
  },
  milo: {
    ...miloRunAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/milo/run-right-v1/atlas.png",
    loopRootDistance: 385,
  },
} as const;

/**
 * View-aware, frame-drawn locomotion. Root travel is supplied by the shot;
 * cycle timing is derived from it so planted feet do not skate in place.
 */
const ProfileRunRig: React.FC<{
  facing?: "left" | "right";
  frame: number;
  motionBlur?: boolean;
  phaseOffset?: number;
  rootPixelsPerFrame: number;
  scale: number;
  variant: KidVariant;
  x: number;
  y: number;
}> = ({
  facing = "right",
  frame,
  motionBlur = false,
  phaseOffset = 0,
  rootPixelsPerFrame,
  scale,
  variant,
  x,
  y,
}) => {
  const atlas = profileRunAtlas[variant];
  // The authored contact poses define the distance covered by one two-step
  // loop. Keeping this tied to root speed is what prevents foot skating.
  const cycleFrames = Math.max(
    12,
    Math.min(24, (atlas.loopRootDistance * scale) / rootPixelsPerFrame),
  );
  const normalizedCycle =
    ((((frame + phaseOffset) % cycleFrames) + cycleFrames) % cycleFrames) /
    cycleFrames;
  const poseIndex = Math.min(7, Math.floor(normalizedCycle * 8));
  const frameSpec = atlas.frames[poseIndex]!;
  const sourceX = frameSpec.source.x;
  const frameWidth = frameSpec.source.width;
  const renderedWidth = frameWidth * scale;
  const renderedHeight = atlas.height * scale;
  const spriteX = x - frameSpec.anchor.x * scale;
  const spriteY = y - atlas.groundY * scale;
  const mirror =
    facing === "left" ? `translate(${x * 2} 0) scale(-1 1)` : undefined;

  const sprite = (opacity: number, offsetX: number, blur: number) => (
    <svg
      height={renderedHeight}
      opacity={opacity}
      overflow="hidden"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`${sourceX} 0 ${frameWidth} ${atlas.height}`}
      width={renderedWidth}
      x={spriteX + offsetX}
      y={spriteY}
      style={{ filter: blur ? `blur(${blur}px)` : undefined }}
    >
      <image
        height={atlas.height}
        href={staticFile(atlas.path)}
        width={atlas.width}
        x="0"
        y="0"
      />
    </svg>
  );

  return (
    <g aria-label={`${variant} profile frame-drawn run rig`} transform={mirror}>
      {motionBlur ? sprite(0.12, -rootPixelsPerFrame * 1.6, 2.4) : null}
      {motionBlur ? sprite(0.08, -rootPixelsPerFrame * 2.8, 4.2) : null}
      {sprite(1, 0, 0)}
    </g>
  );
};

type PerformanceVariant =
  | KidVariant
  | "mara-reaction"
  | "mara-sneak"
  | "milo-reaction"
  | "milo-sneak"
  | "guardian"
  | "guardian-chase"
  | "guardian-closeup"
  | "guardian-sneeze";

const performanceAtlases = {
  mara: {
    ...maraPerformanceAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1/atlas.png",
  },
  "mara-reaction": {
    ...maraReactionAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/mara/reaction-v1/atlas.png",
  },
  "mara-sneak": {
    ...maraSneakAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/mara/sneak-v1/atlas.png",
  },
  milo: {
    ...miloPerformanceAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/milo/performance-v1/atlas.png",
  },
  "milo-reaction": {
    ...miloReactionAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/milo/reaction-v1/atlas.png",
  },
  "milo-sneak": {
    ...miloSneakAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/milo/sneak-v1/atlas.png",
  },
  guardian: {
    ...guardianPerformanceAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/performance-v1/atlas.png",
  },
  "guardian-chase": {
    ...guardianChaseAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/chase-v1/atlas.png",
  },
  "guardian-closeup": {
    ...guardianCloseupAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/closeup-v1/atlas.png",
  },
  "guardian-sneeze": {
    ...guardianSneezeAtlasManifest,
    path: "show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/sneeze-v1/atlas.png",
  },
} as const;

/**
 * A manifest-measured performance pose. Every pose owns its exact transparent
 * column run and upper-body anchor, so uneven generated sheets cannot leak an
 * adjacent face or clip a silhouette at an assumed cell edge.
 */
const PerformanceSprite: React.FC<{
  facing?: "left" | "right";
  opacity?: number;
  poseIndex: number;
  rotation?: number;
  scale: number;
  squash?: number;
  variant: PerformanceVariant;
  x: number;
  y: number;
}> = ({
  facing = "right",
  opacity = 1,
  poseIndex,
  rotation = 0,
  scale,
  squash = 1,
  variant,
  x,
  y,
}) => {
  const atlas = performanceAtlases[variant];
  const safePose = Math.max(0, Math.min(atlas.frames.length - 1, poseIndex));
  const frameSpec = atlas.frames[safePose]!;
  const flip = facing === "left" ? -1 : 1;
  return (
    <g
      aria-label={`${variant} generated performance pose ${safePose}`}
      opacity={opacity}
      style={{ filter: "drop-shadow(10px 15px 8px rgba(4,18,18,.28))" }}
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${flip * scale * squash} ${scale / squash})`}
    >
      <svg
        height={frameSpec.source.height}
        overflow="hidden"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${frameSpec.source.x} ${frameSpec.source.y} ${frameSpec.source.width} ${frameSpec.source.height}`}
        width={frameSpec.source.width}
        x={-frameSpec.anchor.x}
        y={-frameSpec.anchor.y}
      >
        <image
          height={atlas.height}
          href={staticFile(atlas.path)}
          width={atlas.width}
          x="0"
          y="0"
        />
      </svg>
    </g>
  );
};

const SparkBurst: React.FC<{
  frame: number;
  intensity?: number;
  originX: number;
  originY: number;
}> = ({ frame, intensity = 1, originX, originY }) => {
  const reveal = clampInterpolate(frame, [0, 8, 30], [0, 1, 0]);
  return (
    <>
      {Array.from({ length: Math.round(22 * intensity) }, (_, index) => {
        const angle = (index / Math.round(22 * intensity)) * Math.PI * 2;
        const distance = clampInterpolate(
          frame,
          [0, 30],
          [15, (235 + (index % 4) * 24) * intensity],
        );
        const size = 8 + (index % 5) * 3;
        return (
          <div
            key={index}
            style={{
              background:
                index % 3 === 0
                  ? "#ff8e6f"
                  : index % 3 === 1
                    ? "#ffe16a"
                    : "#9ee7bf",
              borderRadius: index % 2 ? "50%" : "2px 80%",
              boxShadow: "0 0 18px rgba(255,226,110,.75)",
              height: size,
              left: originX + Math.cos(angle) * distance,
              opacity: reveal,
              position: "absolute",
              rotate: `${index * 31 + frame * 5}deg`,
              top: originY + Math.sin(angle) * distance,
              width: size,
            }}
          />
        );
      })}
    </>
  );
};

const ShotCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: "rgba(7,22,23,.78)",
      border: "1px solid rgba(233,244,216,.2)",
      borderRadius: 18,
      bottom: 28,
      color: "#fff8df",
      fontFamily: "Arial, sans-serif",
      fontSize: 25,
      fontWeight: 750,
      left: "50%",
      letterSpacing: -0.25,
      maxWidth: 930,
      padding: "13px 24px 14px",
      position: "absolute",
      textAlign: "center",
      transform: "translateX(-50%)",
    }}
  >
    {children}
  </div>
);

const ShotShell: React.FC<{ children: React.ReactNode; narration: string }> = ({
  children,
  narration,
}) => {
  const { showCaptions, showProofLabel } = useContext(ShowcaseOptionsContext);
  return (
    <AbsoluteFill style={{ background: "#071719", overflow: "hidden" }}>
      {children}
      {showProofLabel ? (
        <div
          style={{
            color: "rgba(255,248,223,.76)",
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
            fontWeight: 900,
            left: 28,
            letterSpacing: 3,
            position: "absolute",
            textTransform: "uppercase",
            top: 24,
          }}
        >
          StoryStage Kids · Moonlit Ruins
        </div>
      ) : null}
      {showCaptions ? <ShotCaption>{narration}</ShotCaption> : null}
    </AbsoluteFill>
  );
};

const RunApproachShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 84;
  const x = interpolate(frame, [0, 84], [-180, 965], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <ShotShell narration={narrationAt(0)}>
      <ForestBackdrop mode="forest" push={p * 0.42} travel={p} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <GlowMoth
          phase={frame / 8}
          scale={1.05}
          x={x + 250}
          y={235 + Math.sin(frame / 7) * 32}
        />
        <ProfileRunRig
          frame={frame}
          rootPixelsPerFrame={1145 / 84}
          scale={0.55}
          variant="mara"
          x={x}
          y={612}
        />
        <ProfileRunRig
          frame={frame}
          phaseOffset={5.4}
          rootPixelsPerFrame={1145 / 84}
          scale={0.51}
          variant="milo"
          x={x - 150}
          y={616}
        />
      </svg>
      <ForegroundFoliagePass travel={p} />
    </ShotShell>
  );
};

const ThresholdShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 48;
  const x = interpolate(frame, [0, 48], [-310, 940], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <ShotShell narration={narrationAt(1)}>
      <ForestBackdrop mode="threshold" push={p * 0.5} travel={p * 0.3} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <ProfileRunRig
          frame={frame}
          rootPixelsPerFrame={1250 / 48}
          scale={1.06}
          variant="mara"
          x={x}
          y={850}
        />
        <ProfileRunRig
          frame={frame}
          phaseOffset={5.1}
          rootPixelsPerFrame={1250 / 48}
          scale={0.98}
          variant="milo"
          x={x - 260}
          y={854}
        />
      </svg>
      <ForegroundFoliagePass travel={p * 0.4} />
    </ShotShell>
  );
};

const ListenShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 78;
  const listenPose = frame < 16 ? 0 : 1;
  return (
    <ShotShell narration={narrationAt(2)}>
      <ForestBackdrop mode="threshold" push={0.35 + p * 0.35} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          poseIndex={listenPose}
          rotation={-1.5 + Math.sin(frame / 18) * 0.6}
          scale={1.28}
          variant="mara"
          x={440}
          y={674}
        />
        <PerformanceSprite
          poseIndex={frame < 22 ? 0 : 1}
          rotation={1 + Math.sin(frame / 20) * -0.5}
          scale={1.04}
          variant="milo"
          x={185}
          y={677}
        />
        <GlowMoth
          phase={frame / 9}
          scale={0.85}
          x={650 + Math.sin(frame / 12) * 20}
          y={268 + Math.cos(frame / 8) * 16}
        />
      </svg>
      <div
        style={{
          border: "3px solid rgba(255,231,132,.25)",
          borderRadius: "50%",
          height: 150 + Math.sin(frame / 8) * 9,
          left: 575,
          position: "absolute",
          top: 192,
          width: 150 + Math.sin(frame / 8) * 9,
        }}
      />
      <ForegroundFoliagePass travel={0.08} />
    </ShotShell>
  );
};

const EmptyCorridorShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 48;
  return (
    <ShotShell narration={narrationAt(3)}>
      <ForestBackdrop mode="cave" push={p * 0.25} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <GlowMoth
          phase={frame / 7}
          scale={1.15}
          x={clampInterpolate(frame, [0, 48], [330, 970])}
          y={285 + Math.sin(frame / 5) * 30}
        />
        {Array.from({ length: 14 }, (_, index) => (
          <circle
            cx={270 + index * 63}
            cy={230 + (index % 4) * 57}
            fill="#d6e6c0"
            key={index}
            opacity={0.08 + ((frame + index * 4) % 25) / 260}
            r={2 + (index % 3)}
          />
        ))}
        <ellipse
          cx="1040"
          cy="570"
          fill="#183a35"
          opacity=".72"
          rx={94 + Math.sin(frame / 10) * 3}
          ry={56 + Math.sin(frame / 10) * 6}
        />
      </svg>
      <GeneratedSetForeground mode="cave" travel={p * 0.08} />
    </ShotShell>
  );
};

const SneakShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 84;
  const entry = clampInterpolate(frame, [0, 72], [35, 535]);
  const maraSneakPose = Math.floor(frame / 3) % 8;
  const miloSneakPose = Math.floor((frame + 10) / 3) % 8;
  return (
    <ShotShell narration={narrationAt(4)}>
      <ForestBackdrop mode="cave" push={p} travel={p * 0.4} />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(123,226,201,.32), transparent 68%)",
          height: 440,
          left: 490,
          position: "absolute",
          top: 95,
          width: 440,
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <GlowMoth
          phase={frame / 8}
          scale={1}
          x={790}
          y={270 + Math.sin(frame / 7) * 18}
        />
        <PerformanceSprite
          poseIndex={maraSneakPose}
          rotation={Math.sin((frame / 24) * Math.PI * 2) * 0.65}
          scale={1.02}
          variant="mara-sneak"
          x={entry}
          y={646}
        />
        <PerformanceSprite
          poseIndex={miloSneakPose}
          rotation={Math.sin(((frame + 10) / 24) * Math.PI * 2) * 0.55}
          scale={0.84}
          variant="milo-sneak"
          x={entry - 150}
          y={650}
        />
      </svg>
      <GeneratedSetForeground mode="cave" travel={p * 0.4} />
    </ShotShell>
  );
};

const CreatureRevealShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 60;
  const guardianPose = frame < 15 ? 0 : frame < 30 ? 1 : frame < 47 ? 2 : 3;
  return (
    <ShotShell narration={narrationAt(5)}>
      <ForestBackdrop mode="cave" push={0.25 + p * 0.45} />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(148,232,177,.32), transparent 68%)",
          height: 620,
          position: "absolute",
          right: 60,
          top: 5,
          width: 620,
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          poseIndex={frame < 35 ? 1 : 4}
          scale={0.66}
          variant="mara"
          x={245}
          y={622}
        />
        <PerformanceSprite
          poseIndex={frame < 39 ? 1 : 4}
          scale={0.55}
          variant="milo"
          x={130}
          y={624}
        />
        <PerformanceSprite
          poseIndex={guardianPose}
          rotation={frame < 30 ? 0 : Math.sin(frame / 10) * 0.7}
          scale={1.72}
          squash={clampInterpolate(
            frame,
            [0, 16, 32, 48],
            [1.08, 1.04, 0.96, 1],
          )}
          variant="guardian"
          x={885}
          y={665}
        />
        <GlowMoth
          phase={frame / 8}
          scale={0.78}
          x={clampInterpolate(frame, [0, 22], [790, 885])}
          y={clampInterpolate(frame, [0, 22], [270, 598])}
        />
      </svg>
      <GeneratedSetForeground mode="cave" travel={p * 0.12} />
    </ShotShell>
  );
};

const EyeCloseShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 48;
  const closeupPose =
    frame < 6
      ? 0
      : frame < 12
        ? 1
        : frame < 18
          ? 2
          : frame < 22
            ? 3
            : frame < 26
              ? 4
              : frame < 31
                ? 5
                : frame < 40
                  ? 6
                  : 7;
  return (
    <ShotShell narration={narrationAt(6)}>
      <ForestBackdrop mode="cave" push={0.8 + p * 0.2} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          poseIndex={closeupPose}
          rotation={clampInterpolate(frame, [0, 48], [-0.8, 1.1])}
          scale={2.36 + p * 0.12}
          variant="guardian-closeup"
          x={640 + Math.sin(frame / 12) * 4}
          y={1005}
        />
        <GlowMoth phase={frame / 8} scale={0.55} x={660} y={470} />
      </svg>
    </ShotShell>
  );
};

const KidsReactionShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 72;
  const recoilPhase = clampInterpolate(frame, [0, 52], [0, 1]);
  const reactionPoseAt = (performanceFrame: number) =>
    performanceFrame < 8
      ? 0
      : performanceFrame < 16
        ? 1
        : performanceFrame < 24
          ? 2
          : performanceFrame < 30
            ? 3
            : performanceFrame < 37
              ? 4
              : performanceFrame < 45
                ? 5
                : performanceFrame < 58
                  ? 6
                  : 7;
  const maraPose = reactionPoseAt(frame);
  const miloPose = reactionPoseAt(Math.max(0, frame - 4));
  const maraRoot = clampInterpolate(frame, [8, 30, 45, 62], [0, -20, 6, 0]);
  const miloRoot = clampInterpolate(frame, [12, 34, 49, 66], [0, 22, -6, 0]);
  return (
    <ShotShell narration={narrationAt(7)}>
      <ForestBackdrop mode="cave" push={0.72 + p * 0.15} />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(255,229,112,.28), transparent 68%)",
          height: 560,
          left: 360,
          position: "absolute",
          top: 40,
          width: 560,
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          poseIndex={maraPose}
          rotation={maraRoot * -0.035}
          scale={1.15}
          variant="mara-reaction"
          x={420 + maraRoot}
          y={715}
        />
        <PerformanceSprite
          poseIndex={miloPose}
          rotation={miloRoot * 0.03}
          scale={0.98}
          variant="milo-reaction"
          x={855 + miloRoot}
          y={716}
        />
        <GlowMoth phase={frame / 8} scale={0.8} x={650} y={305} />
      </svg>
      <GeneratedSetForeground mode="cave" travel={recoilPhase * 0.08} />
    </ShotShell>
  );
};

const SneezeShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { sneezeIntensity } = useContext(ShowcaseOptionsContext);
  const p = frame / 108;
  const guardianPose =
    frame < 18
      ? 0
      : frame < 30
        ? 1
        : frame < 43
          ? 2
          : frame < 58
            ? 3
            : frame < 63
              ? 4
              : frame < 69
                ? 5
                : frame < 82
                  ? 6
                  : 7;
  const shake =
    frame >= 62 && frame < 76
      ? Math.sin((frame - 62) * 2.7) * 7 * sneezeIntensity
      : 0;
  return (
    <ShotShell narration={narrationAt(8)}>
      <div
        style={{
          inset: 0,
          position: "absolute",
          transform: `translateX(${shake}px)`,
        }}
      >
        <ForestBackdrop mode="cave" push={0.42 + p * 0.26} />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(255,221,102,.28), transparent 68%)",
            height: 670,
            left: 320,
            position: "absolute",
            top: 0,
            width: 670,
          }}
        />
        <svg
          height="100%"
          viewBox="0 0 1280 720"
          width="100%"
          style={{ position: "absolute" }}
        >
          <PerformanceSprite
            poseIndex={frame > 68 ? 5 : 4}
            rotation={frame > 68 ? -7 : -1}
            scale={0.76}
            variant="mara"
            x={190}
            y={635 - (frame > 68 ? 22 : 0)}
          />
          <PerformanceSprite
            facing="left"
            poseIndex={frame > 72 ? 5 : 4}
            rotation={frame > 72 ? 7 : 1}
            scale={0.66}
            variant="milo"
            x={1080}
            y={637 - (frame > 72 ? 19 : 0)}
          />
          <PerformanceSprite
            poseIndex={guardianPose}
            rotation={
              frame >= 58 && frame < 76 ? Math.sin(frame * 2.7) * 1.2 : 0
            }
            scale={1.55}
            variant="guardian-sneeze"
            x={640}
            y={672}
          />
          <GlowMoth
            phase={frame / 7}
            scale={0.65}
            x={frame < 62 ? 640 : clampInterpolate(frame, [62, 92], [640, 920])}
            y={frame < 62 ? 472 : clampInterpolate(frame, [62, 92], [472, 205])}
          />
        </svg>
        {frame >= 62 ? (
          <SparkBurst
            frame={frame - 62}
            intensity={sneezeIntensity}
            originX={640}
            originY={345}
          />
        ) : null}
        <GeneratedSetForeground mode="cave" travel={p * 0.08} />
      </div>
    </ShotShell>
  );
};

const EscapeShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 120;
  const x = interpolate(frame, [0, 120], [1080, -180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <ShotShell narration={narrationAt(9)}>
      <ForestBackdrop mode="cave" push={0.3} travel={p * 1.5} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          facing="left"
          poseIndex={Math.floor((frame + 4) / 3) % 8}
          rotation={Math.sin((frame / 24) * Math.PI * 2) * 0.7}
          scale={1.05}
          variant="guardian-chase"
          x={x + 385}
          y={650}
        />
        <GlowMoth
          phase={frame / 8}
          scale={0.62}
          x={x + 385}
          y={492 + Math.sin(frame / 9) * 5}
        />
        <ProfileRunRig
          facing="left"
          frame={frame}
          rootPixelsPerFrame={1260 / 120}
          scale={0.55}
          variant="mara"
          x={x}
          y={616}
        />
        <ProfileRunRig
          facing="left"
          frame={frame}
          phaseOffset={5.8}
          rootPixelsPerFrame={1260 / 120}
          scale={0.51}
          variant="milo"
          x={x + 155}
          y={620}
        />
      </svg>
      <GeneratedSetForeground mode="cave" travel={p * 1.5} />
    </ShotShell>
  );
};

const FriendlyPayoffShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = frame / 150;
  const entrance = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 85, mass: 0.7 },
  });
  const offer = clampInterpolate(frame, [28, 82], [0, 1]);
  const realize = clampInterpolate(frame, [64, 104], [0, 1]);
  return (
    <ShotShell narration={narrationAt(10)}>
      <ForestBackdrop mode="clearing" push={p * 0.23} />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(255,244,174,.75), transparent 68%)",
          height: 640,
          left: 315,
          position: "absolute",
          top: -30,
          width: 640,
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          poseIndex={frame < 64 ? 4 : frame < 104 ? 6 : 7}
          rotation={frame < 64 ? -2 : 0}
          scale={1.08}
          variant="mara"
          x={350 + offer * 45}
          y={625 + (1 - entrance) * 80}
        />
        <PerformanceSprite
          poseIndex={frame < 68 ? 4 : frame < 108 ? 6 : 7}
          rotation={frame < 68 ? 2 : 0}
          scale={0.92}
          variant="milo"
          x={605}
          y={629 + (1 - entrance) * 92}
        />
        <PerformanceSprite
          facing="left"
          poseIndex={frame < 42 ? 6 : 7}
          rotation={Math.sin(frame / 24) * 0.8}
          scale={1.25}
          variant="guardian"
          x={835}
          y={650 + (1 - entrance) * 130}
        />
        <GlowMoth
          phase={frame / 7}
          scale={1.05}
          x={
            clampInterpolate(offer, [0, 1], [835, 560]) +
            Math.sin(frame / 14) * 8
          }
          y={
            clampInterpolate(offer, [0, 1], [475, 390]) +
            Math.cos(frame / 11) * 7
          }
        />
      </svg>
      <GeneratedSetForeground mode="clearing" travel={p * 0.08} />
      {frame > 92 ? (
        <div
          style={{
            border: "5px solid rgba(255,247,203,.72)",
            borderRadius: "50%",
            height: 120 + realize * 55,
            left: 555,
            opacity: realize * 0.75,
            position: "absolute",
            top: 315,
            width: 120 + realize * 55,
          }}
        />
      ) : null}
    </ShotShell>
  );
};

const shotComponents: React.FC[] = [
  RunApproachShot,
  ThresholdShot,
  ListenShot,
  EmptyCorridorShot,
  SneakShot,
  CreatureRevealShot,
  EyeCloseShot,
  KidsReactionShot,
  SneezeShot,
  EscapeShot,
  FriendlyPayoffShot,
];

export const KidsShowcaseComposition: React.FC<
  KidsShowcaseCompositionProps
> = ({
  showCaptions = false,
  showProofLabel = false,
  sneezeIntensity = 1,
  scheduledSoundCues = [],
}) => {
  const { width } = useVideoConfig();
  const scale = width / KIDS_SHOWCASE_WIDTH;
  return (
    <ShowcaseOptionsContext
      value={{ showCaptions, showProofLabel, sneezeIntensity }}
    >
      <AbsoluteFill style={{ background: "#071719", overflow: "hidden" }}>
        <div
          style={{
            height: KIDS_SHOWCASE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: KIDS_SHOWCASE_WIDTH,
          }}
        >
          {kidsShowcaseShots.map((shot, index) => {
            const Shot = shotComponents[index] ?? RunApproachShot;
            return (
              <Sequence
                durationInFrames={shot.durationInFrames}
                from={shot.startFrame}
                key={shot.id}
                name={shot.title}
              >
                <Shot />
              </Sequence>
            );
          })}
        </div>
        <Audio
          loop
          src={staticFile("audio/kids-showcase/music-bed.wav")}
          volume={() => 0.24}
        />
        {scheduledSoundCues.map((cue) => (
          <Sequence from={cue.from} key={cue.id} layout="none">
            <Audio
              src={staticFile(
                `audio/kids-showcase/${showcaseSoundFiles[cue.assetId]}`,
              )}
              volume={() => cue.gain}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ShowcaseOptionsContext>
  );
};
