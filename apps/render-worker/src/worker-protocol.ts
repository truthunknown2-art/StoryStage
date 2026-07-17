import {
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  type RenderWorkerMessage,
} from "@storystage/contracts";
import {renderSample} from "./render-service";

type PostMessage = (message: RenderWorkerMessage) => void;
type Render = typeof renderSample;

export async function runWorkerCommand(raw: unknown, post: PostMessage, render: Render = renderSample): Promise<void> {
  const parsed = renderWorkerCommandSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The render worker received an invalid command.");

  const {request, workspaceRoot} = parsed.data;
  try {
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
      payload: {jobId: request.jobId, status: "failed", progress: null, message, error: {code: "RENDER_FAILED", message}},
    }));
  }
}
