import { hashCanonical } from "./canonical-hash";
import {
  cv001ThreeBeatSceneInputSchema,
  type Cv001ThreeBeatSceneInput,
} from "./cv001-scene-compiler";
import {
  frameAccurateRenderPlanSchema,
  type FrameAccurateRenderPlan,
} from "./model";
import { buildAnimaticSync, createProductionDraft } from "./pipeline";
import { sampleWorkshopScript } from "./sample-script";

const beatDurations = [90, 120, 90] as const;
const beatShotIds = [
  "shot-cv001-notice",
  "shot-cv001-pickup",
  "shot-cv001-present",
] as const;
export const CV001_THREE_BEAT_SCENE_ID = "scene-cv001-lantern";

export type Cv001ThreeBeatProofFixture = {
  renderPlan: FrameAccurateRenderPlan;
  input: Cv001ThreeBeatSceneInput;
};

export function createCv001ThreeBeatProofFixture(): Cv001ThreeBeatProofFixture {
  const basePlan = buildAnimaticSync({
    draft: createProductionDraft({
      productionId: "production-cv001-three-beat-proof",
      title: "The Lantern Discovery",
      projectType: "kids",
      showPackId: "kids-adventure-v1",
      preset: "studio",
      script: sampleWorkshopScript,
    }),
  }).renderPlan;
  const sourceShot = basePlan.shots[0]!;
  let cursor = 0;
  const shots = beatDurations.map((durationInFrames, index) => {
    const startFrame = cursor;
    cursor += durationInFrames;
    const id = beatShotIds[index]!;
    return {
      ...sourceShot,
      id,
      sceneId: CV001_THREE_BEAT_SCENE_ID,
      number: `1.0${index + 1}`,
      title: ["Notice the lantern", "Reach and pick it up", "Present the find"][
        index
      ]!,
      startFrame,
      durationInFrames,
      actions: sourceShot.actions.map((action, actionIndex) => ({
        ...action,
        id: `${id}-action-${actionIndex + 1}`,
        startFrame,
        endFrame: startFrame + durationInFrames,
      })),
    };
  });
  const { contentHash: _baseContentHash, ...basePayload } = basePlan;
  void _baseContentHash;
  const planPayload = {
    ...basePayload,
    id: "plan-cv001-three-beat-proof",
    title: "The Lantern Discovery",
    durationInFrames: cursor,
    shots,
  };
  const renderPlan = frameAccurateRenderPlanSchema.parse({
    ...planPayload,
    contentHash: hashCanonical(planPayload),
  });
  const input = cv001ThreeBeatSceneInputSchema.parse({
    schemaVersion: "1.0",
    sceneId: CV001_THREE_BEAT_SCENE_ID,
    planContentHash: renderPlan.contentHash,
    fps: 30,
    rigContractId: "cv001-paper-cut-rig-v1",
    beats: [
      {
        id: "beat-cv001-notice",
        order: 1,
        sceneId: CV001_THREE_BEAT_SCENE_ID,
        shotId: beatShotIds[0],
        text: "Mara notices a strange lantern glowing beside the path.",
        intent: "notice-prop",
        characterId: "cv001-character",
        propId: "lantern",
        emotion: "curious",
        durationInFrames: beatDurations[0],
        cameraIntent: "gentle-push",
      },
      {
        id: "beat-cv001-pickup",
        order: 2,
        sceneId: CV001_THREE_BEAT_SCENE_ID,
        shotId: beatShotIds[1],
        text: "She leans in, reaches carefully, and lifts it from the ground.",
        intent: "reach-and-pick-up",
        characterId: "cv001-character",
        propId: "lantern",
        emotion: "cautious",
        durationInFrames: beatDurations[1],
        cameraIntent: "reframe",
      },
      {
        id: "beat-cv001-present",
        order: 3,
        sceneId: CV001_THREE_BEAT_SCENE_ID,
        shotId: beatShotIds[2],
        text: "It flickers awake, and Mara proudly shows it to us.",
        intent: "react-and-present",
        characterId: "cv001-character",
        propId: "lantern",
        emotion: "pleased",
        durationInFrames: beatDurations[2],
        cameraIntent: "hold",
      },
    ],
  });
  return { renderPlan, input };
}
