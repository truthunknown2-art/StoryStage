import {
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  type RenderWorkerMessage,
} from "@storystage/contracts";
import {renderProduction, renderRigDiagnostic, renderSample} from "./render-service";

type PostMessage = (message: RenderWorkerMessage) => void;
type Render = typeof renderSample;
type ProductionRender = typeof renderProduction;
type DiagnosticRender = typeof renderRigDiagnostic;

export async function runWorkerCommand(raw: unknown, post: PostMessage, render: Render = renderSample, productionRender: ProductionRender = renderProduction, diagnosticRender: DiagnosticRender = renderRigDiagnostic): Promise<void> {
  const parsed = renderWorkerCommandSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The render worker received an invalid command.");

  const {workspaceRoot} = parsed.data;
  const jobId = parsed.data.request.jobId;
  try {
    if (parsed.data.type === "start-production") {
      const {request} = parsed.data;
      await productionRender({jobId: request.jobId, workspaceRoot, bundleContentHash: request.bundleContentHash, scope: request.scope, trustedProductionRoot: parsed.data.trustedProductionRoot, bundleFile: parsed.data.bundleFile, assetsRoot: parsed.data.assetsRoot, outputRoot: parsed.data.outputRoot, onEvent: (event) => post(renderWorkerMessageSchema.parse({type: "event", payload: event}))});
      return;
    }
    if (parsed.data.type === "start-rig-diagnostic") {
      const {request} = parsed.data;
      await diagnosticRender({jobId: request.jobId, entityName: request.entityName, workspaceRoot, importRoot: parsed.data.importRoot, manifestFile: parsed.data.manifestFile, outputFile: parsed.data.outputFile, onEvent: (event) => post(renderWorkerMessageSchema.parse({type: "event", payload: event}))});
      return;
    }
    const {request} = parsed.data;
    await render({
      jobId: request.jobId,
      workspaceRoot,
      simulateFailure: request.simulateFailure,
      onEvent: (event) => post(renderWorkerMessageSchema.parse({type: "event", payload: event})),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The render worker stopped unexpectedly.";
    post(renderWorkerMessageSchema.parse({
      type: "event",
      payload: {jobId, status: "failed", progress: null, message, error: {code: "RENDER_FAILED", message}},
    }));
  }
}
