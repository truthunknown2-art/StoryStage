import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ZodType } from "zod";
import {
  launchE1ProposalAppServer,
  listConfiguredMcpServerNames,
  verifyE1McpIsolation,
  type AppServerClient,
  type AppServerInboundMessage,
} from "./app-server";
import { CodexLabError } from "./errors";
import {
  E1_MCP_SERVER_NAME,
  e1ProposalReceiptSchema,
  type E1DirectionProposal,
} from "./mcp-scene-context";
import {
  appServerAgentDeltaNotificationSchema,
  appServerErrorNotificationSchema,
  appServerItemLifecycleNotificationSchema,
  appServerMcpProgressNotificationSchema,
  appServerMcpToolCallItemSchema,
  initializeResponseSchema,
  mcpServerStatusListResponseSchema,
  threadStartResponseSchema,
  turnCompletedNotificationSchema,
  turnStartResponseSchema,
  turnStartedNotificationSchema,
} from "./protocol-schemas";
import { verifyPinnedRuntime, type VerifiedRuntime } from "./runtime";

export const E1_PROPOSAL_SCOPE = {
  projectId: "project-ollo-cloud-parade-lab",
  sceneId: "scene-cloud-garden",
  beatId: "beat-windbell-discovery",
} as const;

export const E1_PROPOSAL_TOOLS = [
  "get_scene_context",
  "submit_direction_proposal",
] as const;

const proposalPrompt = `You are the StoryStage AI Director inside the E1 synthetic proposal-only lab.
Use only the ${E1_MCP_SERVER_NAME} MCP server. First call get_scene_context with schemaVersion 1. Then create exactly one bounded direction revision for the selected beat and call submit_direction_proposal exactly once. Use only IDs, capabilities, and proposal vocabulary returned by get_scene_context. Do not run commands, read files, browse, create images, delegate, persist, apply, approve, render, or call any other tool. After the validated receipt, briefly summarize the proposal and stop.`;

const E1_PROPOSAL_TURN_TIMEOUT_MS = 120_000;

type Sequenced<T> = T & { sequence: number };
type WithoutSequence<T> = T extends unknown ? Omit<T, "sequence"> : never;

export type E1ProposalEvent =
  | Sequenced<{
      kind: "session-started";
      scope: typeof E1_PROPOSAL_SCOPE;
    }>
  | Sequenced<{ kind: "turn-started" }>
  | Sequenced<{ kind: "agent-delta"; text: string }>
  | Sequenced<{
      kind: "tool-started";
      toolCallId: string;
      tool: (typeof E1_PROPOSAL_TOOLS)[number];
    }>
  | Sequenced<{
      kind: "tool-progress";
      toolCallId: string;
      message: string;
    }>
  | Sequenced<{
      kind: "tool-completed";
      toolCallId: string;
      tool: (typeof E1_PROPOSAL_TOOLS)[number];
    }>
  | Sequenced<{ kind: "approval-blocked"; method: string }>
  | Sequenced<{ kind: "cancellation-requested" }>
  | Sequenced<{
      kind: "turn-completed";
      status: "completed" | "interrupted" | "failed";
    }>
  | Sequenced<{ kind: "error"; code: string; message: string }>;

export type E1ProposalRoundTripResult = {
  schemaVersion: 1;
  state: "completed" | "cancelled";
  scope: typeof E1_PROPOSAL_SCOPE;
  proposal: E1DirectionProposal | null;
  events: readonly E1ProposalEvent[];
  reviewAuthority: {
    previewAvailable: boolean;
    rejectAvailable: boolean;
    applyEnabled: false;
    applyReason: string;
  };
  isolation: {
    onlyStoryStageMcpEnabled: true;
    inheritedServerCount: number;
  };
};

function parseResponse<T>(
  schema: ZodType<T>,
  value: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      `The Codex App Server returned incompatible ${label} data.`,
      "incompatible",
    );
  }
  return parsed.data;
}

function protocolError(message: string): CodexLabError {
  return new CodexLabError("PROTOCOL_INCOMPATIBLE", message, "incompatible");
}

export class E1ProposalEventAdapter {
  private readonly observed: E1ProposalEvent[] = [];
  private sequence = 0;
  private threadId: string | null = null;
  private turnId: string | null = null;
  private proposal: E1DirectionProposal | null = null;
  private turnCompleted = false;
  private readonly toolCalls = new Map<
    string,
    {
      tool: (typeof E1_PROPOSAL_TOOLS)[number];
      completed: boolean;
    }
  >();

  public constructor(
    private readonly onEvent?: (event: E1ProposalEvent) => void,
  ) {}

  public startSession(threadId: string): void {
    if (this.threadId)
      throw protocolError("The proposal session started twice.");
    this.threadId = threadId;
    this.emit({ kind: "session-started", scope: E1_PROPOSAL_SCOPE });
  }

  public requestCancellation(): void {
    if (this.observed.some((event) => event.kind === "cancellation-requested"))
      return;
    this.emit({ kind: "cancellation-requested" });
  }

  public reportError(error: unknown): void {
    const failure =
      error instanceof CodexLabError
        ? error
        : protocolError("The proposal stream failed closed.");
    this.emit({ kind: "error", code: failure.code, message: failure.message });
  }

  public consume(message: AppServerInboundMessage): void {
    const terminalSensitiveMethods = new Set([
      "turn/started",
      "turn/completed",
      "item/agentMessage/delta",
      "item/mcpToolCall/progress",
      "item/started",
      "item/completed",
      "error",
    ]);
    if (
      this.turnCompleted &&
      (message.kind === "blocked-request" ||
        terminalSensitiveMethods.has(message.method))
    ) {
      throw protocolError(
        "The proposal stream emitted typed activity after terminal completion.",
      );
    }
    if (message.kind === "blocked-request") {
      this.emit({ kind: "approval-blocked", method: message.method });
      throw protocolError(
        "The proposal turn requested unsupported approval or client input.",
      );
    }

    switch (message.method) {
      case "turn/started": {
        const started = parseResponse(
          turnStartedNotificationSchema,
          message.params,
          "turn/started",
        );
        this.assertThread(started.threadId);
        if (this.turnId && this.turnId !== started.turn.id) {
          throw protocolError("The proposal stream changed turn identity.");
        }
        if (this.turnId) {
          throw protocolError(
            "The proposal stream started the same turn twice.",
          );
        }
        this.turnId = started.turn.id;
        this.emit({ kind: "turn-started" });
        return;
      }
      case "item/agentMessage/delta": {
        const delta = parseResponse(
          appServerAgentDeltaNotificationSchema,
          message.params,
          message.method,
        );
        this.assertTurn(delta.threadId, delta.turnId);
        this.emit({ kind: "agent-delta", text: delta.delta });
        return;
      }
      case "item/mcpToolCall/progress": {
        const progress = parseResponse(
          appServerMcpProgressNotificationSchema,
          message.params,
          message.method,
        );
        this.assertTurn(progress.threadId, progress.turnId);
        const progressingTool = this.toolCalls.get(progress.itemId);
        if (!progressingTool || progressingTool.completed) {
          throw protocolError(
            "The proposal stream reported progress for an unknown or completed tool call.",
          );
        }
        this.emit({
          kind: "tool-progress",
          toolCallId: progress.itemId,
          message: progress.message,
        });
        return;
      }
      case "item/started":
      case "item/completed": {
        this.consumeItem(message.method, message.params);
        return;
      }
      case "turn/completed": {
        const completed = parseResponse(
          turnCompletedNotificationSchema,
          message.params,
          message.method,
        );
        this.assertTurn(completed.threadId, completed.turn.id);
        if (completed.turn.status === "inProgress") {
          throw protocolError(
            "The completed proposal turn remained in progress.",
          );
        }
        if (this.turnCompleted) {
          throw protocolError(
            "The proposal stream completed the same turn twice.",
          );
        }
        this.turnCompleted = true;
        if (
          completed.turn.status === "completed" &&
          (this.completedToolCount("get_scene_context") !== 1 ||
            this.completedToolCount("submit_direction_proposal") !== 1)
        ) {
          throw protocolError(
            "The proposal turn did not complete exactly one bounded tool sequence.",
          );
        }
        this.emit({ kind: "turn-completed", status: completed.turn.status });
        return;
      }
      case "error": {
        const failure = parseResponse(
          appServerErrorNotificationSchema,
          message.params,
          message.method,
        );
        this.assertTurn(failure.threadId, failure.turnId);
        if (!failure.willRetry) {
          throw protocolError(
            `The proposal turn failed: ${failure.error.message}`,
          );
        }
        return;
      }
      default:
        return;
    }
  }

  public getEvents(): readonly E1ProposalEvent[] {
    return this.observed;
  }

  public getProposal(): E1DirectionProposal | null {
    return this.proposal;
  }

  public getTurnId(): string | null {
    return this.turnId;
  }

  public hasTurnCompleted(): boolean {
    return this.turnCompleted;
  }

  private consumeItem(
    method: "item/started" | "item/completed",
    value: unknown,
  ) {
    const lifecycle = parseResponse(
      appServerItemLifecycleNotificationSchema,
      value,
      method,
    );
    this.assertTurn(lifecycle.threadId, lifecycle.turnId);
    const item = lifecycle.item;
    if (
      ["userMessage", "reasoning", "plan", "agentMessage"].includes(item.type)
    )
      return;
    if (item.type !== "mcpToolCall") {
      throw protocolError(
        `The bounded proposal turn attempted forbidden item type ${item.type}.`,
      );
    }

    const toolCall = parseResponse(
      appServerMcpToolCallItemSchema,
      item,
      `${method} MCP tool call`,
    );
    if (
      toolCall.server !== E1_MCP_SERVER_NAME ||
      !E1_PROPOSAL_TOOLS.includes(
        toolCall.tool as (typeof E1_PROPOSAL_TOOLS)[number],
      )
    ) {
      throw protocolError(
        "The proposal turn attempted an unapproved MCP tool.",
      );
    }
    const tool = toolCall.tool as (typeof E1_PROPOSAL_TOOLS)[number];
    if (method === "item/started") {
      if (this.toolCalls.has(toolCall.id)) {
        throw protocolError(
          "The proposal stream repeated a tool-call identity.",
        );
      }
      if (
        (tool === "get_scene_context" && this.toolCalls.size !== 0) ||
        (tool === "submit_direction_proposal" &&
          this.completedToolCount("get_scene_context") !== 1)
      ) {
        throw protocolError(
          "The proposal turn used tools out of bounded order.",
        );
      }
      this.toolCalls.set(toolCall.id, { tool, completed: false });
      this.emit({
        kind: "tool-started",
        toolCallId: toolCall.id,
        tool,
      });
      return;
    }
    const startedTool = this.toolCalls.get(toolCall.id);
    if (!startedTool || startedTool.tool !== tool || startedTool.completed) {
      throw protocolError(
        "The proposal stream completed an unknown or repeated tool call.",
      );
    }
    if (toolCall.status !== "completed") {
      throw protocolError(
        `The ${tool} MCP call did not complete successfully.`,
      );
    }
    if (tool === "submit_direction_proposal") {
      const receipt = e1ProposalReceiptSchema.safeParse(
        toolCall.result?.structuredContent,
      );
      if (!receipt.success) {
        throw protocolError(
          "The submitted direction proposal returned malformed output.",
        );
      }
      this.proposal = receipt.data.proposal;
    }
    startedTool.completed = true;
    this.emit({
      kind: "tool-completed",
      toolCallId: toolCall.id,
      tool,
    });
  }

  private assertThread(threadId: string): void {
    if (!this.threadId || threadId !== this.threadId) {
      throw protocolError("The proposal stream used an unexpected thread.");
    }
  }

  private assertTurn(threadId: string, turnId: string): void {
    this.assertThread(threadId);
    if (!this.turnId || turnId !== this.turnId) {
      throw protocolError("The proposal stream used an unexpected turn.");
    }
  }

  private completedToolCount(tool: (typeof E1_PROPOSAL_TOOLS)[number]): number {
    return [...this.toolCalls.values()].filter(
      (entry) => entry.tool === tool && entry.completed,
    ).length;
  }

  private emit(event: WithoutSequence<E1ProposalEvent>): void {
    const sequenced = {
      ...event,
      sequence: ++this.sequence,
    } as E1ProposalEvent;
    this.observed.push(sequenced);
    this.onEvent?.(sequenced);
  }
}

export async function runE1ProposalRoundTrip(
  options: {
    signal?: AbortSignal;
    onEvent?: (event: E1ProposalEvent) => void;
    verifyRuntime?: () => Promise<VerifiedRuntime>;
    listConfiguredMcpServers?: (
      executablePath: string,
    ) => Promise<readonly string[]>;
    verifyMcpIsolation?: (
      executablePath: string,
      configuredServerNames: readonly string[],
    ) => Promise<void>;
    launch?: (
      executablePath: string,
      configuredServerNames: readonly string[],
    ) => AppServerClient;
  } = {},
): Promise<E1ProposalRoundTripResult> {
  const adapter = new E1ProposalEventAdapter(options.onEvent);
  let client: AppServerClient | null = null;
  let workspace: string | null = null;
  let streamFailure: unknown = null;
  let interruptPromise: Promise<unknown> | null = null;

  try {
    const runtime = await (options.verifyRuntime ?? verifyPinnedRuntime)();
    const configuredServerNames = await (
      options.listConfiguredMcpServers ?? listConfiguredMcpServerNames
    )(runtime.executablePath);
    await (options.verifyMcpIsolation ?? verifyE1McpIsolation)(
      runtime.executablePath,
      configuredServerNames,
    );
    client = (options.launch ?? launchE1ProposalAppServer)(
      runtime.executablePath,
      configuredServerNames,
    );
    parseResponse(
      initializeResponseSchema,
      await client.request("initialize", {
        clientInfo: {
          name: "storystage-e1-wp3",
          title: "StoryStage E1 proposal round trip",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: false,
          requestAttestation: false,
          mcpServerOpenaiFormElicitation: false,
          optOutNotificationMethods: [],
        },
      }),
      "initialize",
    );
    client.notify("initialized", {});

    workspace = await mkdtemp(join(tmpdir(), "storystage-e1-wp3-workspace-"));
    const thread = parseResponse(
      threadStartResponseSchema,
      await client.request("thread/start", {
        cwd: workspace,
        approvalPolicy: "never",
        sandbox: "read-only",
        ephemeral: true,
        model: "gpt-5.6-terra",
        developerInstructions:
          "This is a proposal-only synthetic lab. Use only the configured StoryStage MCP tools. Never use commands, file changes, network, images, delegation, persistence, approval, or rendering.",
      }),
      "thread/start",
    );
    const threadId = thread.thread.id;
    adapter.startSession(threadId);

    const mcpStatus = parseResponse(
      mcpServerStatusListResponseSchema,
      await client.request("mcpServerStatus/list", {
        threadId,
        limit: 10,
        detail: "toolsAndAuthOnly",
      }),
      "mcpServerStatus/list",
    );
    const inventory = mcpStatus.data;
    const storyStageInventory = inventory.find(
      (entry) => entry.name === E1_MCP_SERVER_NAME,
    );
    const unexpectedInventory = inventory.filter(
      (entry) =>
        entry.name !== E1_MCP_SERVER_NAME &&
        !configuredServerNames.includes(entry.name),
    );
    if (
      !storyStageInventory ||
      unexpectedInventory.length > 0 ||
      JSON.stringify(Object.keys(storyStageInventory.tools).sort()) !==
        JSON.stringify([...E1_PROPOSAL_TOOLS].sort())
    ) {
      throw protocolError(
        "The App Server did not expose exactly the bounded StoryStage MCP inventory.",
      );
    }

    const requestInterrupt = () => {
      if (
        interruptPromise ||
        !client ||
        !adapter.getTurnId() ||
        adapter.hasTurnCompleted()
      )
        return;
      adapter.requestCancellation();
      interruptPromise = client.request("turn/interrupt", {
        threadId,
        turnId: adapter.getTurnId(),
      });
    };
    const unsubscribe = client.subscribeInbound((message) => {
      if (streamFailure) return;
      try {
        adapter.consume(message);
        if (options.signal?.aborted) requestInterrupt();
      } catch (error) {
        streamFailure = error;
        adapter.reportError(error);
        requestInterrupt();
      }
    });
    const abortListener = () => requestInterrupt();
    options.signal?.addEventListener("abort", abortListener);
    const startedNotification = client.waitForNotification(
      "turn/started",
      E1_PROPOSAL_TURN_TIMEOUT_MS,
    );
    const completedNotification = client.waitForNotification(
      "turn/completed",
      E1_PROPOSAL_TURN_TIMEOUT_MS,
    );
    const turnRequest = client.request(
      "turn/start",
      {
        threadId,
        input: [{ type: "text", text: proposalPrompt, text_elements: [] }],
        cwd: workspace,
        approvalPolicy: "never",
        effort: "medium",
        model: "gpt-5.6-terra",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
      },
      E1_PROPOSAL_TURN_TIMEOUT_MS,
    );

    try {
      const started = parseResponse(
        turnStartedNotificationSchema,
        await startedNotification,
        "turn/started",
      );
      if (
        started.threadId !== threadId ||
        started.turn.id !== adapter.getTurnId()
      ) {
        throw protocolError(
          "The proposal turn start identities did not match.",
        );
      }
      if (options.signal?.aborted || streamFailure) requestInterrupt();

      const turn = parseResponse(
        turnStartResponseSchema,
        await turnRequest,
        "turn/start",
      );
      const completed = parseResponse(
        turnCompletedNotificationSchema,
        await completedNotification,
        "turn/completed",
      );
      if (
        turn.turn.id !== adapter.getTurnId() ||
        completed.threadId !== threadId ||
        completed.turn.id !== adapter.getTurnId()
      ) {
        throw protocolError(
          "The completed proposal turn identities did not match.",
        );
      }
      if (interruptPromise) await interruptPromise;
      if (streamFailure) throw streamFailure;

      const cancelled = completed.turn.status === "interrupted";
      const proposal = adapter.getProposal();
      if (!cancelled && (completed.turn.status !== "completed" || !proposal)) {
        throw protocolError(
          "The proposal turn completed without one validated direction proposal.",
        );
      }
      if ((await readdir(workspace)).length !== 0) {
        throw protocolError(
          "The proposal turn changed its isolated workspace.",
        );
      }
      return {
        schemaVersion: 1,
        state: cancelled ? "cancelled" : "completed",
        scope: E1_PROPOSAL_SCOPE,
        proposal: cancelled ? null : proposal,
        events: [...adapter.getEvents()],
        reviewAuthority: {
          previewAvailable: !cancelled,
          rejectAvailable: !cancelled,
          applyEnabled: false,
          applyReason:
            "E1-WP3 validates an ephemeral proposal only; apply and persistence are outside this package.",
        },
        isolation: {
          onlyStoryStageMcpEnabled: true,
          inheritedServerCount: configuredServerNames.filter(
            (name) => name !== E1_MCP_SERVER_NAME,
          ).length,
        },
      };
    } finally {
      options.signal?.removeEventListener("abort", abortListener);
      unsubscribe();
    }
  } catch (error) {
    if (!adapter.getEvents().some((event) => event.kind === "error")) {
      adapter.reportError(error);
    }
    throw error;
  } finally {
    try {
      if (client) await client.close();
    } finally {
      if (workspace) await rm(workspace, { recursive: true, force: true });
    }
  }
}
