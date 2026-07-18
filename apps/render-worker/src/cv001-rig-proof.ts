import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import type { Cv001RigProofCompositionProps } from "@storystage/remotion-runtime";
import {
  cv001LanternMotionProgram,
  evaluateMotionProgram,
  getMotionProgramIssues,
} from "@storystage/story-engine";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(workspaceRoot, "artifacts/CV-001/rig-kernel-proof");
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

async function main(): Promise<void> {
  const issues = getMotionProgramIssues(cv001LanternMotionProgram, {
    cv001Proof: true,
  });
  if (issues.length > 0)
    throw new Error(
      `CV-001 proof program failed validation: ${issues.map((issue) => issue.code).join(", ")}`,
    );
  await mkdir(outputRoot, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const inputProps: Cv001RigProofCompositionProps = {
    program: cv001LanternMotionProgram,
  };
  const composition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID,
    inputProps,
  });
  const frames = [0, 24, 48, 70, 100, 119];
  const stills = [];
  for (const frame of frames) {
    const output = resolve(
      outputRoot,
      `frame-${String(frame).padStart(3, "0")}.png`,
    );
    await renderStill({ composition, frame, inputProps, output, serveUrl });
    stills.push({
      frame,
      relativeFile: `frame-${String(frame).padStart(3, "0")}.png`,
      contentHash: sha256(await readFile(output)),
      evaluated: evaluateMotionProgram(cv001LanternMotionProgram, frame),
    });
  }
  const video = resolve(outputRoot, "cv001-rig-kernel-proof.mp4");
  await renderMedia({
    codec: "h264",
    composition,
    inputProps,
    outputLocation: video,
    serveUrl,
  });
  const report = {
    schemaVersion: "1.0",
    status: "engineering-motion-proof",
    compositionId: STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID,
    programId: cv001LanternMotionProgram.id,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
    width: composition.width,
    height: composition.height,
    validatorIssues: issues,
    requiredBehaviors: [
      "frame-evaluated hierarchy",
      "head leads torso",
      "offset arm articulation",
      "gaze and mouth tracks",
      "bounded hand-to-lantern attachment",
      "camera and parallax tracks",
      "anticipation-action-overshoot-settle-hold",
    ],
    video: {
      relativeFile: "cv001-rig-kernel-proof.mp4",
      contentHash: sha256(await readFile(video)),
    },
    stills,
  };
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(`Rendered CV-001 rig proof to ${outputRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
