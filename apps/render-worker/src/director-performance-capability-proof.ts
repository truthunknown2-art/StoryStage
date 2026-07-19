import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import {
  createBundledKidsCapabilityRegistry,
  type BundledKidsCapabilityTarget,
} from "@storystage/remotion-runtime/director";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  compileDirectorProject,
  createCv002Project,
  createCv002ArtDirectionSelection,
} from "@storystage/story-engine/director-alpha";
import { verifyDirectorEpisodeCapabilityAssets } from "./director-capability-assets";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(
  workspaceRoot,
  "artifacts/ACP-001/generic-performance",
);
const publicRoot = resolve(workspaceRoot, "packages/remotion-runtime/public");
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const script = `Mara and Pip study a trail of glowing leaves beside the village garden before sunrise. A paper lantern swings beneath the old oak while the friends listen for the tiny bell hidden in the branches.

Mara ran across the clearing, jumped over a narrow stream, and carried the lantern toward a mossy stone gate. Pip follows behind and points when the light skips ahead, but both friends stay on the same visible path.

Behind the gate, Mara discovers a secret painted marker and reveals that the missing bell is tucked inside a nest of silver grass. She reaches toward it, pauses when the grass rustles, and smiles as a sleepy moth lifts the bell into the air.

The patient friends explain why the lantern answered the bell and how every glow marked one safe step home. Pip nods, Mara holds the lantern steady, and the garden settles into a gentle golden shimmer around them.`;

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const storyProject = createCv002Project(
    "Arbitrary Kids capability proof",
    script,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
  );
  const format = { width: 960, height: 540, fps: 30 };
  const proxyProject = compileDirectorProject({ storyProject, format });
  const requirements = proxyProject.directorPlan.beats.flatMap((beat) =>
    beat.performanceRequirements.map((requirement) => ({
      beatId: beat.beatId,
      requirement,
    })),
  );
  const kinds = ["living-hold", "atlas-cycle", "articulated-rig"] as const;
  const targets = kinds.map((kind) => {
    const match = requirements.find(
      ({ requirement }) => requirement.source === kind,
    );
    if (!match)
      throw new Error(`Arbitrary Kids script did not request ${kind}.`);
    return {
      kind,
      requirementId: match.requirement.id,
      entityId: match.requirement.entityId,
    } satisfies BundledKidsCapabilityTarget;
  });
  const registry = createBundledKidsCapabilityRegistry(targets);
  const finalProject = compileDirectorProject({
    storyProject,
    format,
    capabilities: registry,
  });
  if (finalProject.capabilityReport.summary.supported !== kinds.length)
    throw new Error(
      "The concrete capability report did not close all targets.",
    );
  if (
    finalProject.capabilityReport.summary.proxyOnly !==
    finalProject.executableEpisodePlan.performancePrograms.length - kinds.length
  )
    throw new Error(
      "Unmatched requirements were not kept honestly proxy-only.",
    );
  const verifiedAssets = await verifyDirectorEpisodeCapabilityAssets(
    finalProject.executableEpisodePlan,
    publicRoot,
  );

  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: publicRoot,
  });
  const renderProject = async (
    project: typeof finalProject,
    output: string,
    frame: number,
  ) => {
    await verifyDirectorEpisodeCapabilityAssets(
      project.executableEpisodePlan,
      publicRoot,
    );
    const inputProps: ProductionCompositionProps = {
      mode: "director-episode",
      episodePlan: project.executableEpisodePlan,
    };
    const composition = await selectComposition({
      serveUrl,
      id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
      inputProps,
    });
    await renderStill({ composition, frame, inputProps, output, serveUrl });
    return sha256(await readFile(output));
  };

  const proofs = [];
  for (const target of targets) {
    const targetRegistry = createBundledKidsCapabilityRegistry([target]);
    const targetProject = compileDirectorProject({
      storyProject,
      format,
      capabilities: targetRegistry,
    });
    if (
      targetProject.capabilityReport.summary.supported !== 1 ||
      targetProject.capabilityReport.summary.proxyOnly !==
        targetProject.executableEpisodePlan.performancePrograms.length - 1
    )
      throw new Error(`${target.kind} did not preserve the hybrid boundary.`);
    const program =
      targetProject.executableEpisodePlan.performancePrograms.find(
        (candidate) => candidate.id === target.requirementId,
      );
    if (!program?.execution || program.execution.kind !== target.kind)
      throw new Error(
        `${target.kind} did not compile to its executable program.`,
      );
    const captionedShotIds = new Set(
      targetProject.executableEpisodePlan.proxyCaptionPrograms?.map(
        (caption) => caption.shotId,
      ) ?? [],
    );
    const shotId =
      program.sourceShotIds?.find(
        (candidate) => !captionedShotIds.has(candidate),
      ) ?? program.sourceShotIds?.[0];
    const range = targetProject.timingSolution.resolvedShots.find(
      (candidate) => candidate.shotId === shotId,
    );
    if (!range)
      throw new Error(`${target.kind} has no renderable source shot.`);
    const duration = range.endFrameExclusive - range.startFrame;
    const frames = [
      range.startFrame + Math.max(1, Math.round(duration * 0.22)),
      range.startFrame + Math.max(2, Math.round(duration * 0.68)),
    ];
    const rendered = [];
    for (const [index, frame] of frames.entries()) {
      const finalFile = resolve(outputRoot, `${target.kind}-${index + 1}.png`);
      const proxyFile = resolve(
        outputRoot,
        `${target.kind}-${index + 1}-proxy.png`,
      );
      const finalHash = await renderProject(targetProject, finalFile, frame);
      const proxyHash = await renderProject(proxyProject, proxyFile, frame);
      if (finalHash === proxyHash)
        throw new Error(`${target.kind} collapsed to the proxy renderer.`);
      rendered.push({
        frame,
        finalFile: finalFile.slice(workspaceRoot.length + 1),
        finalHash,
        proxyFile: proxyFile.slice(workspaceRoot.length + 1),
        proxyHash,
      });
    }
    proofs.push({
      kind: target.kind,
      requirementId: target.requirementId,
      entityId: target.entityId,
      rendererId: program.rendererId,
      rendererVersion: program.rendererVersion,
      executionContentHash: program.contentHash,
      capabilityRegistryContentHash: targetRegistry.contentHash,
      assetIds: program.assetIds,
      rendered,
    });
  }

  const report = {
    proof: "ACP-001.1 Capability Asset and Registry Authority Closure",
    storyProjectContentHash: storyProject.contentHash,
    registryContentHash: registry.contentHash,
    episodePlanContentHash: finalProject.executableEpisodePlan.contentHash,
    capabilitySummary: finalProject.capabilityReport.summary,
    assetAuthority: {
      mode: "sha256-and-byte-length-verified-before-render",
      verifiedAssets,
    },
    supportedKinds: kinds,
    rendererPath:
      "StoryStageProduction -> DirectorEpisodeRenderer -> generic executable performance",
    proofs,
  };
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({ outputRoot, capabilitySummary: report.capabilitySummary, proofs: proofs.length })}\n`,
  );
}

await main();
