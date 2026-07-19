import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  compileDirectorProject,
  createCv002Project,
  createCv002ArtDirectionSelection,
  Cv002AlphaDirectorPlanner,
  type DirectorCameraMovement,
  type DirectorPlanner,
  type DirectorProposalDraft,
  type DirectorShotSize,
} from "@storystage/story-engine/director-alpha";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(
  workspaceRoot,
  "artifacts/DSA-002c1/camera-semantics",
);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const script = `Nia and Rowan sneak into the greenhouse after a silver seed begins tapping against the window. Nia lifts the latch, but the seed hops away and rolls beneath a tower of flowerpots. Rowan points toward the wobbling stack while Nia takes one careful step closer.

The seed suddenly sprouts two bright leaves and the children freeze. A tiny vine curls around Nia's boot, pauses, then points toward a dry fountain at the back of the room. Nia follows while Rowan hangs behind, watching the flowerpots tremble again.

At the fountain, Nia pours one drop of water onto the seed. Golden roots race through the cracked tiles and every sleeping plant opens at once. Rowan gasps a moment later, then laughs when the smallest blossom sneezes a cloud of blue pollen. The new garden settles into a warm glow, and the vine draws a doorway home.`;

const cameraSizes = [
  "extreme-wide",
  "wide",
  "medium",
  "close-up",
  "insert",
] as const satisfies readonly DirectorShotSize[];
const cameraMovements = [
  "locked",
  "pan",
  "track",
  "push",
  "pull",
  "reframe",
] as const satisfies readonly DirectorCameraMovement[];

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const storyProject = createCv002Project(
    "Camera semantic closure",
    script,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
  );
  const base = compileDirectorProject({
    storyProject,
    format: { width: 640, height: 360, fps: 30 },
  });
  const captionedShotIds = new Set(
    base.executableEpisodePlan.proxyCaptionPrograms?.map(
      (program) => program.shotId,
    ) ?? [],
  );
  const targetShot =
    base.directorPlan.shots.find((shot) => !captionedShotIds.has(shot.id)) ??
    base.directorPlan.shots[0]!;
  const targetBeatId = targetShot.beatIds[0]!;
  const defaultPlanner = new Cv002AlphaDirectorPlanner();
  const compileVariant = (
    shotSize: DirectorShotSize,
    cameraMovement: DirectorCameraMovement,
  ) => {
    const planner: DirectorPlanner = {
      propose(context): DirectorProposalDraft {
        return {
          ...defaultPlanner.propose(context),
          plannerId: "camera-semantics-proof",
          shotOverrides: [
            {
              beatId: targetBeatId,
              shotId: targetShot.id,
              shotSize,
              cameraMovement,
            },
          ],
        };
      },
    };
    return compileDirectorProject({
      storyProject,
      planner,
      format: { width: 640, height: 360, fps: 30 },
    });
  };
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });

  const renderVariant = async (
    family: "size" | "movement",
    value: DirectorShotSize | DirectorCameraMovement,
    shotSize: DirectorShotSize,
    cameraMovement: DirectorCameraMovement,
  ) => {
    const project = compileVariant(shotSize, cameraMovement);
    const shotRange = project.timingSolution.resolvedShots.find(
      (range) => range.shotId === targetShot.id,
    )!;
    const localFrame = Math.round(
      (shotRange.endFrameExclusive - shotRange.startFrame - 1) * 0.72,
    );
    const frame = shotRange.startFrame + localFrame;
    const inputProps: ProductionCompositionProps = {
      mode: "director-episode",
      episodePlan: project.executableEpisodePlan,
    };
    const composition = await selectComposition({
      serveUrl,
      id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
      inputProps,
    });
    const file = `${family}-${value}.png`;
    const output = resolve(outputRoot, file);
    await renderStill({ composition, frame, inputProps, output, serveUrl });
    const camera = project.executableEpisodePlan.proxyCameraPrograms!.find(
      (program) => program.shotId === targetShot.id,
    )!;
    return {
      value,
      file,
      frame,
      contentHash: sha256(await readFile(output)),
      cameraProgramContentHash: camera.contentHash,
      keyframes: camera.keyframes,
    };
  };

  const sizes = [];
  for (const size of cameraSizes)
    sizes.push(await renderVariant("size", size, size, "locked"));
  const movements = [];
  for (const movement of cameraMovements)
    movements.push(
      await renderVariant("movement", movement, "medium", movement),
    );

  if (new Set(sizes.map((entry) => entry.contentHash)).size !== sizes.length)
    throw new Error(
      "Two exposed shot sizes collapsed to the same rendered frame.",
    );
  if (
    new Set(movements.map((entry) => entry.contentHash)).size !==
    movements.length
  )
    throw new Error(
      "Two exposed camera movements collapsed to the same rendered frame.",
    );

  const report = {
    proof: "DSA-002c.1 Camera and Framing Semantic Closure",
    storyGraphContentHash: storyProject.graph.contentHash,
    targetShotId: targetShot.id,
    rendererConsumes: ["camera.keyframes[].x", "y", "scale"],
    sizes,
    movements,
  };
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({
      outputRoot,
      distinctSizeFrames: sizes.length,
      distinctMovementFrames: movements.length,
    })}\n`,
  );
}

await main();
