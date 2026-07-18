import {
  evaluateMotionProgram,
  type DirectedBeatProgram,
  type EvaluatedMotionProgram,
} from "@storystage/story-engine";

type Point = { x: number; y: number };

export const cv001RigLayout = {
  rootOrigin: { x: 535, y: 760 },
  upperArmPivot: { x: 78, y: -170 },
  forearmPivot: { x: 116, y: 0 },
  handPivot: { x: 104, y: 0 },
  lanternOffset: { x: 44, y: 42 },
  upperArmRotationOffset: 40,
  lowerArmRotationOffset: 70,
} as const;

const rotatePoint = (point: Point, degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
};

const addPoint = (point: Point, offset: Point): Point => ({
  x: point.x + offset.x,
  y: point.y + offset.y,
});

export function getCv001LanternHandAnchor(
  evaluated: EvaluatedMotionProgram,
): Point {
  const rootScale = evaluated.root.scale ?? 1;
  let point: Point = { ...cv001RigLayout.lanternOffset };
  point = rotatePoint(point, evaluated.bones["hand-right"]?.rotation ?? 0);
  point = addPoint(point, cv001RigLayout.handPivot);
  point = rotatePoint(
    point,
    cv001RigLayout.lowerArmRotationOffset +
      (evaluated.bones["lower-arm-right"]?.rotation ?? 0),
  );
  point = addPoint(point, cv001RigLayout.forearmPivot);
  point = rotatePoint(
    point,
    cv001RigLayout.upperArmRotationOffset -
      (evaluated.bones["upper-arm-right"]?.rotation ?? 0),
  );
  point = addPoint(point, cv001RigLayout.upperArmPivot);
  point = rotatePoint(point, evaluated.bones.torso?.rotation ?? 0);
  point = { x: point.x * rootScale, y: point.y * rootScale };
  point = rotatePoint(point, evaluated.root.rotation ?? 0);
  return addPoint(point, {
    x: cv001RigLayout.rootOrigin.x + (evaluated.root.x ?? 0),
    y: cv001RigLayout.rootOrigin.y + (evaluated.root.y ?? 0),
  });
}

type AttachmentTrack = Extract<
  DirectedBeatProgram["tracks"][number],
  { type: "attachment" }
>;

const lanternAttachment = (
  program: DirectedBeatProgram,
): AttachmentTrack | undefined =>
  program.tracks.find(
    (track): track is AttachmentTrack =>
      track.type === "attachment" &&
      track.propId === "lantern" &&
      track.boneId === "hand-right",
  );

export function getCv001LanternPickupAnchor(
  program: DirectedBeatProgram,
): Point {
  const attachment = lanternAttachment(program);
  if (!attachment)
    throw new Error("CV-001 program has no lantern-to-hand attachment.");
  return getCv001LanternHandAnchor(
    evaluateMotionProgram(program, attachment.startFrame),
  );
}

export function getCv001AttachmentContinuity(program: DirectedBeatProgram) {
  const attachment = lanternAttachment(program);
  if (!attachment)
    throw new Error("CV-001 program has no lantern-to-hand attachment.");
  const before = getCv001LanternPickupAnchor(program);
  const after = getCv001LanternHandAnchor(
    evaluateMotionProgram(program, attachment.startFrame),
  );
  return {
    startFrame: attachment.startFrame,
    before,
    after,
    distance: Math.hypot(after.x - before.x, after.y - before.y),
  };
}
