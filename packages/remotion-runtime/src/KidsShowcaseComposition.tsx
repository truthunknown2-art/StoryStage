import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { createContext, useContext } from "react";
import { Audio } from "@remotion/media";
import {
  KIDS_SHOWCASE_DIRECTED_SHOTS,
  type DirectorTimeline,
} from "@storystage/story-engine";
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
  directorTimeline?: DirectorTimeline;
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
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[0].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[0].durationInFrames,
    title: "Run through the arch",
    intent: "One continuous pursuit, visible threshold, and planted exit contact",
    narration:
      "The little light slipped through the oldest arch in the forest.",
  },
  {
    id: "listen-in-the-dark",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[1].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[1].durationInFrames,
    title: "Did you hear that?",
    intent: "Inherited roots, visible deceleration, shared gaze, and comprehension hold",
    narration: "Then the ruin whispered back.",
  },
  {
    id: "sneak-entrance",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[2].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[2].durationInFrames,
    title: "Into the moon hall",
    intent: "Visible entrance, continuous moth path, staggered sneaks, and planted reveal marks",
    narration: "So they followed the glow into the moon hall.",
  },
  {
    id: "creature-reveal",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[3].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[3].durationInFrames,
    title: "Something wakes",
    intent: "Medium reveal with layered head and limb motion",
    narration: "A hill of moss opened two enormous eyes.",
  },
  {
    id: "eye-close-up",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[4].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[4].durationInFrames,
    title: "Eye-line payoff",
    intent: "Extreme close-up, blink, and reframe",
    narration: "It looked straight at Mara.",
  },
  {
    id: "kids-reaction",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[5].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[5].durationInFrames,
    title: "Read the reaction",
    intent: "Anticipation, recoil, settle, and shared eye-line",
    narration: "Mara gasped. Milo forgot how knees worked.",
  },
  {
    id: "spark-sneeze",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[6].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[6].durationInFrames,
    title: "Sneeze, turn, and catch",
    intent: "Anticipation, sneeze, delayed reaction, visible pivot, moth catch, and planted step",
    narration:
      "The creature puffed up its cheeks... and sneezed a skyful of sparks.",
  },
  {
    id: "escape-run",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[7].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[7].durationInFrames,
    title: "Escape through the portal",
    intent: "Matched gait, visible arch crossing, physical occlusion, and on-screen deceleration",
    narration: "That was more than enough adventure for one hallway.",
  },
  {
    id: "friendly-offer",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[8].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[8].durationInFrames,
    title: "Offer and hesitate",
    intent: "Guardian offer, Mara gaze-led reach, and continuous moth handoff",
    narration: "In the clearing, the creature held out the little light.",
  },
  {
    id: "understand-and-play",
    startFrame: KIDS_SHOWCASE_DIRECTED_SHOTS[9].startFrame,
    durationInFrames: KIDS_SHOWCASE_DIRECTED_SHOTS[9].durationInFrames,
    title: "Understand and play",
    intent: "Action cut, moth release, staggered wave, and living hold",
    narration: "It had only wanted someone to play.",
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
    <foreignObject
      height={renderedHeight}
      opacity={opacity}
      width={renderedWidth}
      x={spriteX + offsetX}
      y={spriteY}
      style={{ filter: blur ? `blur(${blur}px)` : undefined }}
    >
      <div
        style={{
          height: renderedHeight,
          overflow: "hidden",
          position: "relative",
          width: renderedWidth,
        }}
      >
        <Img
          src={staticFile(atlas.path)}
          style={{
            height: atlas.height * scale,
            left: -sourceX * scale,
            maxWidth: "none",
            position: "absolute",
            top: 0,
            width: atlas.width * scale,
          }}
        />
      </div>
    </foreignObject>
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
      <foreignObject
        height={frameSpec.source.height}
        width={frameSpec.source.width}
        x={-frameSpec.anchor.x}
        y={-frameSpec.anchor.y}
      >
        <div
          style={{
            height: frameSpec.source.height,
            overflow: "hidden",
            position: "relative",
            width: frameSpec.source.width,
          }}
        >
          <Img
            src={staticFile(atlas.path)}
            style={{
              height: atlas.height,
              left: -frameSpec.source.x,
              maxWidth: "none",
              position: "absolute",
              top: -frameSpec.source.y,
              width: atlas.width,
            }}
          />
        </div>
      </foreignObject>
    </g>
  );
};

type PuppetSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const payoffPuppetSheets = {
  mara: "show-packs/kids/moonlit-ruins/v1/rigs/mara/payoff-puppet-v1/puppet-parts.png",
  milo: "show-packs/kids/moonlit-ruins/v1/rigs/milo/payoff-puppet-v1/puppet-parts.png",
  guardian:
    "show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/payoff-puppet-v1/puppet-parts.png",
} as const;

const puppetParts = {
  mara: {
    head: { x: 30, y: 20, width: 490, height: 430 },
    body: { x: 730, y: 35, width: 350, height: 410 },
    upperArmLeft: { x: 520, y: 45, width: 180, height: 275 },
    upperArmRight: { x: 1110, y: 40, width: 180, height: 280 },
    lowerArmLeft: { x: 520, y: 290, width: 200, height: 245 },
    lowerArmRight: { x: 1080, y: 290, width: 210, height: 250 },
    thighLeft: { x: 710, y: 430, width: 190, height: 180 },
    thighRight: { x: 900, y: 430, width: 200, height: 180 },
    legLeft: { x: 660, y: 560, width: 250, height: 270 },
    legRight: { x: 920, y: 560, width: 270, height: 270 },
  },
  milo: {
    head: { x: 130, y: 25, width: 390, height: 390 },
    body: { x: 680, y: 65, width: 400, height: 450 },
    upperArmLeft: { x: 500, y: 115, width: 180, height: 250 },
    upperArmRight: { x: 1120, y: 105, width: 190, height: 260 },
    lowerArmLeft: { x: 340, y: 340, width: 250, height: 245 },
    lowerArmRight: { x: 1160, y: 330, width: 280, height: 230 },
    thighLeft: { x: 590, y: 490, width: 220, height: 160 },
    thighRight: { x: 890, y: 480, width: 220, height: 170 },
    legLeft: { x: 560, y: 600, width: 220, height: 260 },
    legRight: { x: 930, y: 600, width: 230, height: 260 },
  },
  guardian: {
    head: { x: 70, y: 35, width: 540, height: 430 },
    body: { x: 680, y: 80, width: 540, height: 390 },
    tuft: { x: 1250, y: 190, width: 270, height: 220 },
    armLeft: { x: 270, y: 480, width: 470, height: 240 },
    armRight: { x: 1000, y: 450, width: 430, height: 250 },
    footLeft: { x: 660, y: 620, width: 230, height: 210 },
    footRight: { x: 900, y: 620, width: 240, height: 210 },
  },
} as const;

const PuppetSheetPart: React.FC<{
  flipX?: boolean;
  pivot: { x: number; y: number };
  rotation?: number;
  sheet: keyof typeof payoffPuppetSheets;
  source: PuppetSourceRect;
  x: number;
  y: number;
}> = ({ flipX = false, pivot, rotation = 0, sheet, source, x, y }) => (
  <g
    transform={`translate(${x} ${y}) rotate(${rotation}) scale(${flipX ? -1 : 1} 1)`}
  >
    <foreignObject
      height={source.height}
      width={source.width}
      x={-pivot.x}
      y={-pivot.y}
    >
      <div
        style={{
          height: source.height,
          overflow: "hidden",
          position: "relative",
          width: source.width,
        }}
      >
        <Img
          src={staticFile(payoffPuppetSheets[sheet])}
          style={{
            height: 941,
            left: -source.x,
            maxWidth: "none",
            position: "absolute",
            top: -source.y,
            width: 1672,
          }}
        />
      </div>
    </foreignObject>
  </g>
);

const MaraPayoffPuppet: React.FC<{
  frame: number;
  mode: "offer" | "play";
  x: number;
  y: number;
}> = ({ frame, mode, x, y }) => {
  const reach =
    mode === "offer" ? clampInterpolate(frame, [12, 58], [0, 1]) : 1;
  const wave = mode === "play" ? clampInterpolate(frame, [10, 32], [0, 1]) : 0;
  const hold = mode === "play" ? clampInterpolate(frame, [48, 71], [0, 1]) : 0;
  const releaseReach =
    mode === "play" ? clampInterpolate(frame, [0, 16], [0, 1]) : 0;
  const rightShoulder =
    mode === "offer"
      ? clampInterpolate(reach, [0, 1], [8, -68])
      : clampInterpolate(releaseReach, [0, 1], [-68, -96]) +
        Math.sin(frame / 3.2) * 9 * wave * (1 - hold * 0.7);
  const headRotation =
    mode === "offer"
      ? clampInterpolate(frame, [5, 20, 58, 77], [-1, -7, 2, 0])
      : Math.sin(frame / 18) * 1.2;
  return (
    <g
      aria-label="Mara articulated payoff puppet"
      style={{ filter: "drop-shadow(10px 15px 8px rgba(4,18,18,.24))" }}
      transform={`translate(${x} ${y}) scale(.36)`}
    >
      <PuppetSheetPart
        pivot={{ x: 125, y: 255 }}
        sheet="mara"
        source={puppetParts.mara.legLeft}
        x={-62}
        y={-44}
      />
      <PuppetSheetPart
        pivot={{ x: 135, y: 255 }}
        sheet="mara"
        source={puppetParts.mara.legRight}
        x={68}
        y={-44}
      />
      <PuppetSheetPart
        pivot={{ x: 95, y: 165 }}
        sheet="mara"
        source={puppetParts.mara.thighLeft}
        x={-62}
        y={-245}
      />
      <PuppetSheetPart
        pivot={{ x: 100, y: 165 }}
        sheet="mara"
        source={puppetParts.mara.thighRight}
        x={68}
        y={-245}
      />
      <g transform={`translate(-142 -690) rotate(${-3 + hold})`}>
        <PuppetSheetPart
          pivot={{ x: 90, y: 20 }}
          rotation={8}
          sheet="mara"
          source={puppetParts.mara.upperArmLeft}
          x={0}
          y={0}
        />
        <g transform="translate(20 205) rotate(8)">
          <PuppetSheetPart
            pivot={{ x: 90, y: 20 }}
            sheet="mara"
            source={puppetParts.mara.lowerArmLeft}
            x={0}
            y={0}
          />
        </g>
      </g>
      <PuppetSheetPart
        pivot={{ x: 175, y: 385 }}
        rotation={clampInterpolate(reach, [0, 1], [-2, 4])}
        sheet="mara"
        source={puppetParts.mara.body}
        x={0}
        y={-400}
      />
      <g transform={`translate(145 -690) rotate(${rightShoulder})`}>
        <PuppetSheetPart
          pivot={{ x: 90, y: 20 }}
          sheet="mara"
          source={puppetParts.mara.upperArmRight}
          x={0}
          y={0}
        />
        <g transform={`translate(0 205) rotate(${-18 - reach * 10})`}>
          <PuppetSheetPart
            pivot={{ x: 105, y: 20 }}
            sheet="mara"
            source={puppetParts.mara.lowerArmRight}
            x={0}
            y={0}
          />
        </g>
      </g>
      <PuppetSheetPart
        pivot={{ x: 245, y: 410 }}
        rotation={headRotation}
        sheet="mara"
        source={puppetParts.mara.head}
        x={0}
        y={-755}
      />
    </g>
  );
};

const MiloPayoffPuppet: React.FC<{
  frame: number;
  mode: "offer" | "play";
  x: number;
  y: number;
}> = ({ frame, mode, x, y }) => {
  const relax = mode === "play" ? clampInterpolate(frame, [8, 25], [0, 1]) : 0;
  const wave = mode === "play" ? clampInterpolate(frame, [24, 45], [0, 1]) : 0;
  return (
    <g
      aria-label="Milo articulated payoff puppet"
      style={{ filter: "drop-shadow(10px 15px 8px rgba(4,18,18,.24))" }}
      transform={`translate(${x} ${y}) scale(.34)`}
    >
      <PuppetSheetPart
        pivot={{ x: 110, y: 245 }}
        sheet="milo"
        source={puppetParts.milo.legLeft}
        x={-65}
        y={-25}
      />
      <PuppetSheetPart
        pivot={{ x: 115, y: 245 }}
        sheet="milo"
        source={puppetParts.milo.legRight}
        x={66}
        y={-25}
      />
      <PuppetSheetPart
        pivot={{ x: 110, y: 150 }}
        sheet="milo"
        source={puppetParts.milo.thighLeft}
        x={-65}
        y={-280}
      />
      <PuppetSheetPart
        pivot={{ x: 110, y: 155 }}
        sheet="milo"
        source={puppetParts.milo.thighRight}
        x={66}
        y={-280}
      />
      <g transform={`translate(-155 -720) rotate(${-10 + relax * 9})`}>
        <PuppetSheetPart
          pivot={{ x: 90, y: 25 }}
          sheet="milo"
          source={puppetParts.milo.upperArmLeft}
          x={0}
          y={0}
        />
        <g transform="translate(0 205) rotate(20)">
          <PuppetSheetPart
            pivot={{ x: 125, y: 25 }}
            sheet="milo"
            source={puppetParts.milo.lowerArmLeft}
            x={0}
            y={0}
          />
        </g>
      </g>
      <PuppetSheetPart
        pivot={{ x: 200, y: 425 }}
        rotation={-2 + relax * 2}
        sheet="milo"
        source={puppetParts.milo.body}
        x={0}
        y={-415}
      />
      <g
        transform={`translate(155 -720) rotate(${8 - relax * 18 - wave * 74})`}
      >
        <PuppetSheetPart
          pivot={{ x: 95, y: 25 }}
          sheet="milo"
          source={puppetParts.milo.upperArmRight}
          x={0}
          y={0}
        />
        <g transform={`translate(0 205) rotate(${-12 - wave * 18})`}>
          <PuppetSheetPart
            pivot={{ x: 140, y: 25 }}
            sheet="milo"
            source={puppetParts.milo.lowerArmRight}
            x={0}
            y={0}
          />
        </g>
      </g>
      <PuppetSheetPart
        pivot={{ x: 195, y: 370 }}
        rotation={-3 + relax * 4 + Math.sin(frame / 18) * 0.7}
        sheet="milo"
        source={puppetParts.milo.head}
        x={0}
        y={-785 + relax * 7}
      />
    </g>
  );
};

const GuardianPayoffPuppet: React.FC<{
  frame: number;
  mode: "offer" | "play";
  x: number;
  y: number;
}> = ({ frame, mode, x, y }) => {
  const offer = mode === "offer" ? clampInterpolate(frame, [6, 56], [0, 1]) : 1;
  const wave = mode === "play" ? clampInterpolate(frame, [16, 38], [0, 1]) : 0;
  const hold = mode === "play" ? clampInterpolate(frame, [50, 71], [0, 1]) : 0;
  return (
    <g
      aria-label="Guardian articulated payoff puppet"
      style={{ filter: "drop-shadow(10px 15px 8px rgba(4,18,18,.28))" }}
      transform={`translate(${x} ${y}) scale(.40)`}
    >
      <PuppetSheetPart
        pivot={{ x: 115, y: 190 }}
        sheet="guardian"
        source={puppetParts.guardian.footLeft}
        x={-95}
        y={0}
      />
      <PuppetSheetPart
        pivot={{ x: 120, y: 190 }}
        sheet="guardian"
        source={puppetParts.guardian.footRight}
        x={95}
        y={0}
      />
      <g transform={`translate(-175 -510) rotate(${8 - offer * 12})`}>
        <PuppetSheetPart
          pivot={{ x: 390, y: 125 }}
          rotation={-4 - offer * 5}
          sheet="guardian"
          source={puppetParts.guardian.armRight}
          x={0}
          y={0}
        />
      </g>
      <PuppetSheetPart
        pivot={{ x: 270, y: 365 }}
        rotation={clampInterpolate(offer, [0, 1], [2, -3])}
        sheet="guardian"
        source={puppetParts.guardian.body}
        x={0}
        y={-190}
      />
      <g
        transform={`translate(205 -335) rotate(${8 - wave * 70 + Math.sin(frame / 3.2) * 8 * wave * (1 - hold * 0.7)})`}
      >
        <PuppetSheetPart
          pivot={{ x: 55, y: 125 }}
          sheet="guardian"
          source={puppetParts.guardian.armLeft}
          x={0}
          y={0}
        />
      </g>
      <PuppetSheetPart
        pivot={{ x: 270, y: 405 }}
        rotation={-2 + offer * 5 + Math.sin(frame / 20) * 1.2}
        sheet="guardian"
        source={puppetParts.guardian.head}
        x={0}
        y={-485}
      />
      <PuppetSheetPart
        pivot={{ x: 135, y: 190 }}
        rotation={Math.sin(frame / 7) * 2.2 * (1 - hold * 0.5)}
        sheet="guardian"
        source={puppetParts.guardian.tuft}
        x={20}
        y={-755}
      />
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
  const p = frame / 120;
  const x = clampInterpolate(frame, [0, 82, 108, 119], [-180, 530, 625, 640]);
  const cameraPush = clampInterpolate(frame, [60, 119], [0, 1]);
  const maraScale = clampInterpolate(cameraPush, [0, 1], [0.55, 1.28]);
  const miloScale = clampInterpolate(cameraPush, [0, 1], [0.51, 1.04]);
  const spacing = clampInterpolate(cameraPush, [0, 1], [150, 260]);
  const groundY = clampInterpolate(cameraPush, [0, 1], [612, 674]);
  const rootSpeed = clampInterpolate(
    frame,
    [0, 82, 108, 119],
    [8.7, 8.7, 3.65, 1.35],
  );
  return (
    <ShotShell narration={narrationAt(0)}>
      <ForestBackdrop mode="threshold" push={p * 0.55} travel={p * 0.42} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <GlowMoth
          phase={frame / 8}
          scale={1.05}
          x={clampInterpolate(frame, [0, 90, 119], [70, 810, 850])}
          y={250 + Math.sin(frame / 7) * 24}
        />
        <ProfileRunRig
          frame={frame}
          rootPixelsPerFrame={rootSpeed}
          scale={maraScale}
          variant="mara"
          x={x}
          y={groundY}
        />
        <ProfileRunRig
          frame={frame}
          phaseOffset={5.4}
          rootPixelsPerFrame={rootSpeed}
          scale={miloScale}
          variant="milo"
          x={x - spacing}
          y={groundY + 3}
        />
      </svg>
      <ForegroundFoliagePass travel={p * 0.42} />
    </ShotShell>
  );
};

const ListenShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 90;
  const decelerating = frame < 14;
  const listenPose = frame < 32 ? 0 : 1;
  const maraX = clampInterpolate(frame, [0, 13], [640, 650]);
  const miloX = clampInterpolate(frame, [0, 13], [380, 390]);
  return (
    <ShotShell narration={narrationAt(1)}>
      <ForestBackdrop mode="threshold" push={0.35 + p * 0.35} />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        {decelerating ? (
          <>
            <ProfileRunRig
              frame={frame + 120}
              rootPixelsPerFrame={0.72}
              scale={1.28}
              variant="mara"
              x={maraX}
              y={674}
            />
            <ProfileRunRig
              frame={frame + 120}
              phaseOffset={5.4}
              rootPixelsPerFrame={0.72}
              scale={1.04}
              variant="milo"
              x={miloX}
              y={677}
            />
          </>
        ) : (
          <>
            <PerformanceSprite
              poseIndex={listenPose}
              rotation={-1.5 + Math.sin(frame / 18) * 0.6}
              scale={1.28}
              variant="mara"
              x={650}
              y={674}
            />
            <PerformanceSprite
              poseIndex={frame < 38 ? 0 : 1}
              rotation={1 + Math.sin(frame / 20) * -0.5}
              scale={1.04}
              variant="milo"
              x={390}
              y={677}
            />
          </>
        )}
        <GlowMoth
          phase={frame / 9}
          scale={0.85}
          x={clampInterpolate(frame, [0, 72, 89], [850, 945, 1020])}
          y={268 + Math.cos(frame / 8) * 13}
        />
      </svg>
      <div
        style={{
          border: "3px solid rgba(255,231,132,.25)",
          borderRadius: "50%",
          height: 150 + Math.sin(frame / 8) * 9,
          left: 775,
          position: "absolute",
          top: 192,
          width: 150 + Math.sin(frame / 8) * 9,
        }}
      />
      <ForegroundFoliagePass travel={0.08} />
    </ShotShell>
  );
};

const SneakShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 132;
  const entry = clampInterpolate(frame, [18, 103], [-80, 535]);
  const maraSneakPose = Math.floor(frame / 3) % 8;
  const miloSneakPose = Math.floor((frame + 10) / 3) % 8;
  return (
    <ShotShell narration={narrationAt(2)}>
      <ForestBackdrop mode="cave" push={p * 0.55} travel={p * 0.22} />
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
          x={clampInterpolate(
            frame,
            [0, 95, 120, 131],
            [220, 720, 905, 910],
          )}
          y={
            clampInterpolate(frame, [0, 95, 120], [280, 250, 470]) +
            Math.sin(frame / 7) * (frame < 120 ? 12 : 2)
          }
        />
        <PerformanceSprite
          facing="left"
          poseIndex={0}
          scale={1.55}
          variant="guardian"
          x={930}
          y={672}
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
      <GeneratedSetForeground mode="cave" travel={p * 0.18} />
    </ShotShell>
  );
};

const CreatureRevealShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 72;
  const guardianPose = frame < 12 ? 0 : frame < 27 ? 1 : frame < 44 ? 2 : 3;
  return (
    <ShotShell narration={narrationAt(3)}>
      <ForestBackdrop mode="cave" push={0.55 + p * 0.12} />
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
          poseIndex={frame < 45 ? 1 : 4}
          scale={1.02}
          variant="mara"
          x={535}
          y={646}
        />
        <PerformanceSprite
          poseIndex={frame < 50 ? 1 : 4}
          scale={0.84}
          variant="milo"
          x={385}
          y={650}
        />
        <PerformanceSprite
          facing="left"
          poseIndex={guardianPose}
          rotation={frame < 30 ? 0 : Math.sin(frame / 10) * 0.7}
          scale={1.55}
          squash={clampInterpolate(
            frame,
            [0, 16, 32, 48],
            [1.08, 1.04, 0.96, 1],
          )}
          variant="guardian"
          x={930}
          y={672}
        />
        <GlowMoth
          phase={frame / 8}
          scale={0.78}
          x={910}
          y={470 + Math.sin(frame / 14) * 2}
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
    <ShotShell narration={narrationAt(4)}>
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
    <ShotShell narration={narrationAt(5)}>
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
          poseIndex={miloPose}
          rotation={miloRoot * 0.03}
          scale={0.98}
          variant="milo-reaction"
          x={390 + miloRoot}
          y={716}
        />
        <PerformanceSprite
          facing="left"
          poseIndex={maraPose}
          rotation={maraRoot * -0.035}
          scale={1.15}
          variant="mara-reaction"
          x={650 + maraRoot}
          y={715}
        />
      </svg>
      <GeneratedSetForeground mode="cave" travel={recoilPhase * 0.08} />
    </ShotShell>
  );
};

const SneezeShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { sneezeIntensity } = useContext(ShowcaseOptionsContext);
  const p = frame / 120;
  const guardianPose =
    frame < 16
      ? 0
      : frame < 28
        ? 1
        : frame < 40
          ? 2
          : frame < 48
            ? 3
            : frame < 54
              ? 4
              : frame < 64
                ? 5
                : frame < 92
                  ? 6
                  : 7;
  const shake =
    frame >= 48 && frame < 58
      ? Math.sin((frame - 48) * 2.7) * 2.5 * sneezeIntensity
      : 0;
  const running = frame >= 104;
  const runFrame = Math.max(0, frame - 104);
  const pivot = clampInterpolate(frame, [74, 88], [0, 1]);
  const maraRunX = clampInterpolate(frame, [104, 119], [650, 570]);
  const miloRunX = clampInterpolate(frame, [104, 119], [390, 310]);
  const mothAirborne = frame >= 49 && frame < 92;
  const mothX = mothAirborne
    ? clampInterpolate(frame, [49, 68, 92], [910, 760, 860])
    : frame >= 92
      ? 860
      : 910;
  const mothY = mothAirborne
    ? clampInterpolate(frame, [49, 66, 92], [470, 250, 500])
    : frame >= 92
      ? 500
      : 470;
  return (
    <ShotShell narration={narrationAt(6)}>
      <div
        style={{
          inset: 0,
          position: "absolute",
          transform: `translateX(${shake}px)`,
        }}
      >
        <ForestBackdrop mode="cave" push={0.58 + p * 0.08} />
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
          {running ? (
            <>
              <ProfileRunRig
                facing="left"
                frame={runFrame}
                rootPixelsPerFrame={80 / 15}
                scale={1.15}
                variant="mara"
                x={maraRunX}
                y={715}
              />
              <ProfileRunRig
                facing="left"
                frame={runFrame}
                phaseOffset={5.4}
                rootPixelsPerFrame={80 / 15}
                scale={0.98}
                variant="milo"
                x={miloRunX}
                y={716}
              />
            </>
          ) : (
            <>
              <PerformanceSprite
                facing={pivot > 0.5 ? "left" : "right"}
                poseIndex={frame < 56 ? 7 : frame < 78 ? 5 : 4}
                rotation={clampInterpolate(pivot, [0, 1], [0, -7])}
                scale={0.98}
                variant="milo-reaction"
                x={390}
                y={716}
              />
              <PerformanceSprite
                facing={pivot > 0.5 ? "left" : "right"}
                poseIndex={frame < 52 ? 7 : frame < 74 ? 5 : 4}
                rotation={clampInterpolate(pivot, [0, 1], [0, -8])}
                scale={1.15}
                variant="mara-reaction"
                x={650}
                y={715}
              />
            </>
          )}
          <PerformanceSprite
            facing="left"
            poseIndex={guardianPose}
            rotation={
              frame >= 58 && frame < 76 ? Math.sin(frame * 2.7) * 1.2 : 0
            }
            scale={1.5}
            variant="guardian-sneeze"
            x={930}
            y={672}
          />
          <GlowMoth
            phase={frame / 7}
            scale={0.65}
            x={mothX}
            y={mothY}
          />
        </svg>
        {frame >= 48 ? (
          <SparkBurst
            frame={frame - 48}
            intensity={sneezeIntensity}
            originX={875}
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
  const clearingReveal = clampInterpolate(frame, [44, 72], [0, 1]);
  const maraX = clampInterpolate(frame, [0, 90, 119], [760, 550, 520]);
  const miloX = clampInterpolate(frame, [0, 90, 119], [555, 345, 315]);
  const guardianX = clampInterpolate(frame, [0, 90, 119], [1080, 970, 930]);
  const rootSpeed = clampInterpolate(frame, [0, 90, 119], [3.2, 3.2, 1]);
  const portalTravel = clampInterpolate(frame, [26, 82], [-520, 720]);
  const portalOpacity = clampInterpolate(
    frame,
    [18, 28, 76, 88],
    [0, 1, 1, 0],
  );
  return (
    <ShotShell narration={narrationAt(7)}>
      <ForestBackdrop mode="cave" push={0.42} travel={p * 0.6} />
      <div style={{ inset: 0, opacity: clearingReveal, position: "absolute" }}>
        <ForestBackdrop mode="clearing" push={0.08} travel={p * 0.18} />
      </div>
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <PerformanceSprite
          facing="left"
          poseIndex={Math.floor((frame + 4) / 3) % 8}
          rotation={Math.sin((frame / 24) * Math.PI * 2) * 0.55}
          scale={1.05}
          variant="guardian-chase"
          x={guardianX}
          y={650}
        />
        <GlowMoth
          phase={frame / 8}
          scale={0.62}
          x={guardianX - 38}
          y={492 + Math.sin(frame / 9) * 3}
        />
        <ProfileRunRig
          facing="left"
          frame={frame + 16}
          rootPixelsPerFrame={rootSpeed}
          scale={0.72}
          variant="mara"
          x={maraX}
          y={660}
        />
        <ProfileRunRig
          facing="left"
          frame={frame + 16}
          phaseOffset={5.4}
          rootPixelsPerFrame={rootSpeed}
          scale={0.62}
          variant="milo"
          x={miloX}
          y={663}
        />
      </svg>
      <svg
        aria-label="Physical moon arch foreground occluder"
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{
          opacity: portalOpacity,
          position: "absolute",
          transform: `translateX(${portalTravel}px)`,
        }}
      >
        <path
          d="M515 720V350Q650 175 785 350v370"
          fill="none"
          stroke="rgba(8,27,27,.96)"
          strokeWidth="92"
        />
        <path
          d="M515 720V350Q650 175 785 350v370"
          fill="none"
          opacity=".55"
          stroke="#55715b"
          strokeWidth="18"
        />
      </svg>
      <div style={{ inset: 0, opacity: 1 - clearingReveal, position: "absolute" }}>
        <GeneratedSetForeground mode="cave" travel={p * 0.55} />
      </div>
      <div style={{ inset: 0, opacity: clearingReveal, position: "absolute" }}>
        <GeneratedSetForeground mode="clearing" travel={p * 0.15} />
      </div>
    </ShotShell>
  );
};

const FriendlyOfferShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 72;
  const mothOffer = clampInterpolate(frame, [16, 64], [0, 1]);
  const residualSettle = clampInterpolate(frame, [0, 14], [1, 0]);
  return (
    <ShotShell narration={narrationAt(8)}>
      <ForestBackdrop mode="clearing" push={p * 0.12} />
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
        <g transform={`translate(0 ${Math.sin(frame / 3) * residualSettle * 3})`}>
          <MiloPayoffPuppet frame={frame} mode="offer" x={315} y={662} />
          <MaraPayoffPuppet frame={frame} mode="offer" x={520} y={660} />
          <GuardianPayoffPuppet frame={frame} mode="offer" x={930} y={655} />
          <GlowMoth
            phase={frame / 7}
            scale={0.9}
            x={clampInterpolate(mothOffer, [0, 1], [735, 700])}
            y={clampInterpolate(mothOffer, [0, 1], [405, 390])}
          />
        </g>
      </svg>
      <GeneratedSetForeground mode="clearing" travel={p * 0.035} />
    </ShotShell>
  );
};

const FriendlyPlayShot: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 54;
  const release = clampInterpolate(frame, [0, 28], [0, 1]);
  const halo = clampInterpolate(frame, [6, 22, 53], [0, 1, 0.35]);
  return (
    <ShotShell narration={narrationAt(9)}>
      <ForestBackdrop mode="clearing" push={0.12 + p * 0.11} />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(255,244,174,.82), transparent 68%)",
          height: 670,
          left: 285,
          position: "absolute",
          top: -45,
          width: 700,
        }}
      />
      <svg
        height="100%"
        viewBox="0 0 1280 720"
        width="100%"
        style={{ position: "absolute" }}
      >
        <g transform="translate(-45 -25) scale(1.08)">
          <MiloPayoffPuppet frame={frame} mode="play" x={315} y={662} />
          <MaraPayoffPuppet frame={frame} mode="play" x={520} y={660} />
          <GuardianPayoffPuppet frame={frame} mode="play" x={930} y={655} />
          <GlowMoth
            phase={frame / 6}
            scale={0.95 + release * 0.18}
            x={clampInterpolate(release, [0, 0.55, 1], [690, 715, 755])}
            y={clampInterpolate(release, [0, 0.55, 1], [384, 290, 215])}
          />
        </g>
        <circle
          cx={clampInterpolate(release, [0, 1], [700, 770])}
          cy={clampInterpolate(release, [0, 1], [390, 208])}
          fill="none"
          opacity={halo * 0.68}
          r={42 + halo * 36}
          stroke="rgba(255,247,203,.9)"
          strokeWidth="4"
        />
      </svg>
      <GeneratedSetForeground mode="clearing" travel={0.035 + p * 0.025} />
    </ShotShell>
  );
};

const shotComponents: Record<string, React.FC> = {
  "run-to-the-ruin": RunApproachShot,
  "listen-in-the-dark": ListenShot,
  "sneak-entrance": SneakShot,
  "creature-reveal": CreatureRevealShot,
  "eye-close-up": EyeCloseShot,
  "kids-reaction": KidsReactionShot,
  "spark-sneeze": SneezeShot,
  "escape-run": EscapeShot,
  "friendly-offer": FriendlyOfferShot,
  "understand-and-play": FriendlyPlayShot,
};

export const KidsShowcaseComposition: React.FC<
  KidsShowcaseCompositionProps
> = ({
  directorTimeline,
  showCaptions = false,
  showProofLabel = false,
  sneezeIntensity = 1,
  scheduledSoundCues = [],
}) => {
  const { width } = useVideoConfig();
  const scale = width / KIDS_SHOWCASE_WIDTH;
  const runtimeShots = directorTimeline
    ? directorTimeline.shots.map((shot, index) => ({
        id: shot.id.replace(/^shot-/, ""),
        startFrame: shot.startFrame,
        durationInFrames: shot.durationInFrames,
        title: shot.storyFunction,
        intent: shot.cutMotivation,
        narration: kidsShowcaseShots[index]?.narration ?? "",
      }))
    : kidsShowcaseShots;
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
          {runtimeShots.map((shot) => {
            const Shot = shotComponents[shot.id] ?? RunApproachShot;
            return (
              <Sequence
                durationInFrames={shot.durationInFrames}
                from={shot.startFrame}
                key={shot.id}
                name={shot.title}
                premountFor={KIDS_SHOWCASE_FPS}
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
