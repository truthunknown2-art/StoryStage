import {readFileSync} from "node:fs";

type Shot = {startSeconds: number; endSeconds: number; shotSize: string; visualTreatment: string; cameraMotion: string; transition: string};
const path = process.argv[2];
if (!path) throw new Error("Usage: analyze-cut-sheet.ts <cut-sheet.json>");
const shots = JSON.parse(readFileSync(path, "utf8")) as Shot[];
if (!Array.isArray(shots) || shots.length === 0) throw new Error("Cut sheet must contain at least one shot.");
const durations = shots.map((shot) => shot.endSeconds - shot.startSeconds).sort((a, b) => a - b);
if (durations.some((duration) => !Number.isFinite(duration) || duration <= 0)) throw new Error("Every shot needs a positive duration.");
const tally = (key: keyof Shot) => Object.fromEntries([...new Set(shots.map((shot) => String(shot[key])))].sort().map((value) => [value, shots.filter((shot) => String(shot[key]) === value).length]));
const result = {
  shotCount: shots.length,
  durationSeconds: shots.at(-1)!.endSeconds - shots[0]!.startSeconds,
  meanShotSeconds: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
  medianShotSeconds: durations[Math.floor(durations.length / 2)],
  cutsPerMinute: shots.length / ((shots.at(-1)!.endSeconds - shots[0]!.startSeconds) / 60),
  shotSizes: tally("shotSize"),
  treatments: tally("visualTreatment"),
  cameraMotions: tally("cameraMotion"),
  transitions: tally("transition"),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
