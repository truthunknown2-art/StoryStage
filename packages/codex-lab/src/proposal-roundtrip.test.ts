import { beforeAll, describe, expect, it, vi } from "vitest";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AppServerClient } from "./app-server";
import {
  E1_MCP_RESOURCE_URI,
  E1_MCP_SERVER_NAME,
  createE1McpSceneContextServer,
} from "./mcp-scene-context";
import {
  E1_PROPOSAL_SCOPE,
  E1ProposalEventAdapter,
  assertExactE1McpInventory,
  assertOfficialChatGptAuthUrl,
  runE1ProposalRoundTrip,
} from "./proposal-roundtrip";
import { FakeChild, answerRequests, asChild } from "./test-helpers";

const proposal = {
  schemaVersion: 1 as const,
  ...E1_PROPOSAL_SCOPE,
  summary: "Move closer as the wind bell finds its courage.",
  rationale: "The tighter framing supports the reassuring performance beat.",
  changes: [
    { kind: "camera-intent" as const, intent: "close-reaction" },
    {
      kind: "performance-cue" as const,
      entityId: "character-windbell",
      capability: "tiny-chime",
      cue: "first-tiny-chime",
    },
  ],
};

const receipt = {
  schemaVersion: 1 as const,
  status: "validated-ephemeral" as const,
  applied: false as const,
  persisted: false as const,
  canonical: false as const,
  proposal,
  notice: "Synthetic lab proposal only.",
};

const threadId = "thread-e1";
const turnId = "turn-e1";
const dedicatedCodexHome = "C:\\local-app-data\\StoryStage\\codex\\0.144.1";
let exactMcpStatus: unknown;

function notification(method: string, params: unknown) {
  return { kind: "notification" as const, method, params };
}

function startedTurn() {
  return {
    threadId,
    turn: { id: turnId, items: [], status: "inProgress" },
  };
}

function completedTurn(status: "completed" | "interrupted" = "completed") {
  return { threadId, turn: { id: turnId, items: [], status } };
}

function lifecycle(
  type: "item/started" | "item/completed",
  item: Record<string, unknown>,
) {
  return notification(type, { threadId, turnId, item });
}

function toolItem(
  id: string,
  tool: "get_scene_context" | "submit_direction_proposal",
  status: "inProgress" | "completed",
  result?: unknown,
) {
  return {
    id,
    type: "mcpToolCall",
    server: E1_MCP_SERVER_NAME,
    tool,
    arguments: {},
    status,
    result,
  };
}

function driveSuccessfulAdapter(adapter: E1ProposalEventAdapter): void {
  adapter.startSession(threadId);
  adapter.consume(notification("turn/started", startedTurn()));
  adapter.consume(
    lifecycle(
      "item/started",
      toolItem("tool-context", "get_scene_context", "inProgress"),
    ),
  );
  adapter.consume(
    lifecycle(
      "item/completed",
      toolItem("tool-context", "get_scene_context", "completed", {
        content: [],
      }),
    ),
  );
  adapter.consume(
    notification("item/agentMessage/delta", {
      threadId,
      turnId,
      itemId: "message-1",
      delta: "I will make one bounded revision.",
    }),
  );
  adapter.consume(
    lifecycle(
      "item/started",
      toolItem("tool-proposal", "submit_direction_proposal", "inProgress"),
    ),
  );
  adapter.consume(
    notification("item/mcpToolCall/progress", {
      threadId,
      turnId,
      itemId: "tool-proposal",
      message: "Validating proposal",
    }),
  );
  adapter.consume(
    lifecycle(
      "item/completed",
      toolItem("tool-proposal", "submit_direction_proposal", "completed", {
        content: [],
        structuredContent: receipt,
      }),
    ),
  );
  adapter.consume(notification("turn/completed", completedTurn()));
}

function createSuccessfulClient(
  closeCode = 0,
  login?: {
    authUrl: string;
    complete?: boolean;
    crashAfterStart?: boolean;
    onCancel?: () => void;
  },
): AppServerClient {
  const child = new FakeChild();
  let accountReads = 0;
  child.stdin.once("finish", () => child.emit("exit", closeCode, null));
  answerRequests(child, (method) => {
    switch (method) {
      case "initialize":
        return {
          userAgent: "test",
          codexHome: dedicatedCodexHome,
          platformFamily: "windows",
          platformOs: "windows",
        };
      case "account/read":
        accountReads += 1;
        if (login && accountReads === 1) {
          return { account: null, requiresOpenaiAuth: true };
        }
        return {
          account: { type: "chatgpt", email: null, planType: "pro" },
          requiresOpenaiAuth: false,
        };
      case "account/login/start":
        if (!login) throw new Error("Unexpected sign-in request");
        if (login.crashAfterStart) {
          setTimeout(() => child.emit("exit", 2, null), 0);
        } else if (login.complete !== false) {
          queueMicrotask(() =>
            child.stdout.write(
              `${JSON.stringify({
                jsonrpc: "2.0",
                method: "account/login/completed",
                params: { success: true, loginId: "login-e1", error: null },
              })}\n`,
            ),
          );
        }
        return {
          type: "chatgpt",
          loginId: "login-e1",
          authUrl: login.authUrl,
        };
      case "account/login/cancel":
        login?.onCancel?.();
        return { status: "canceled" };
      case "thread/start":
        return { thread: { id: threadId } };
      case "mcpServerStatus/list":
        return exactMcpStatus;
      case "turn/start": {
        const emit = (methodName: string, params: unknown) =>
          child.stdout.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: methodName, params })}\n`,
          );
        emit("turn/started", startedTurn());
        for (const event of [
          lifecycle(
            "item/started",
            toolItem("tool-context", "get_scene_context", "inProgress"),
          ),
          lifecycle(
            "item/completed",
            toolItem("tool-context", "get_scene_context", "completed", {
              content: [],
            }),
          ),
          lifecycle(
            "item/started",
            toolItem(
              "tool-proposal",
              "submit_direction_proposal",
              "inProgress",
            ),
          ),
          lifecycle(
            "item/completed",
            toolItem(
              "tool-proposal",
              "submit_direction_proposal",
              "completed",
              { content: [], structuredContent: receipt },
            ),
          ),
        ]) {
          emit(event.method, event.params);
        }
        emit("turn/completed", completedTurn());
        return { turn: completedTurn().turn };
      }
      default:
        throw new Error(`Unexpected test request ${method}`);
    }
  });
  return new AppServerClient(asChild(child));
}

function createInterruptibleClient(
  mode: "before-tool" | "during-stream" | "forbidden" | "late-after-terminal",
): { client: AppServerClient; getInterruptCount: () => number } {
  const child = new FakeChild();
  let interruptCount = 0;
  let finished = false;
  let resolveTurn:
    | ((value: { turn: ReturnType<typeof completedTurn>["turn"] }) => void)
    | null = null;
  child.stdin.once("finish", () => child.emit("exit", 0, null));
  const emit = (method: string, params: unknown) =>
    child.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`,
    );
  const finish = (status: "completed" | "interrupted") => {
    if (finished) return;
    finished = true;
    const completed = completedTurn(status);
    emit("turn/completed", completed);
    resolveTurn?.({ turn: completed.turn });
  };

  answerRequests(child, (method) => {
    switch (method) {
      case "initialize":
        return {
          userAgent: "test",
          codexHome: dedicatedCodexHome,
          platformFamily: "windows",
          platformOs: "windows",
        };
      case "account/read":
        return {
          account: { type: "chatgpt", email: null, planType: "pro" },
          requiresOpenaiAuth: false,
        };
      case "thread/start":
        return { thread: { id: threadId } };
      case "mcpServerStatus/list":
        return exactMcpStatus;
      case "turn/start":
        return new Promise<{ turn: ReturnType<typeof completedTurn>["turn"] }>(
          (resolve) => {
            resolveTurn = resolve;
            queueMicrotask(() => {
              emit("turn/started", startedTurn());
              if (mode === "late-after-terminal") {
                finish("interrupted");
                emit("item/agentMessage/delta", {
                  threadId,
                  turnId,
                  itemId: "message-late",
                  delta: "Too late",
                });
                return;
              }
              if (mode === "before-tool" || finished) return;
              emit("item/agentMessage/delta", {
                threadId,
                turnId,
                itemId: "message-1",
                delta: "Drafting",
              });
              if (mode === "during-stream" || finished) return;
              emit("item/started", {
                threadId,
                turnId,
                item: { id: "command-1", type: "commandExecution" },
              });
            });
          },
        );
      case "turn/interrupt":
        interruptCount += 1;
        finish("interrupted");
        return {};
      default:
        throw new Error(`Unexpected test request ${method}`);
    }
  });
  return {
    client: new AppServerClient(asChild(child)),
    getInterruptCount: () => interruptCount,
  };
}

const verifiedRuntime = {
  executablePath: "pinned-codex.exe",
  executableSha256: "sha",
  packageVersion: "0.144.1",
  cliVersion: "codex-cli 0.144.1",
  protocolSha256: "protocol-sha",
};

const isolatedTestOptions = {
  verifyRuntime: async () => verifiedRuntime,
  prepareCodexHome: async () => dedicatedCodexHome,
};

async function loadExactMcpStatus(): Promise<unknown> {
  const server = await createE1McpSceneContextServer();
  const mcpClient = new Client(
    { name: "storystage-e1-inventory-test", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await mcpClient.connect(clientTransport);
  const [{ tools }, { resources }, { resourceTemplates }] = await Promise.all([
    mcpClient.listTools(),
    mcpClient.listResources(),
    mcpClient.listResourceTemplates(),
  ]);
  await mcpClient.close();
  await server.close();

  return {
    data: [
      {
        name: E1_MCP_SERVER_NAME,
        authStatus: "unsupported",
        serverInfo: {
          name: "storystage-e1-synthetic-scene",
          version: "1.0.0",
        },
        tools: Object.fromEntries(tools.map((tool) => [tool.name, tool])),
        resources,
        resourceTemplates,
      },
    ],
    nextCursor: null,
  };
}

beforeAll(async () => {
  exactMcpStatus = await loadExactMcpStatus();
});

describe("E1 streamed proposal round trip", () => {
  it("accepts only exact-origin official ChatGPT sign-in URLs", () => {
    expect(() =>
      assertOfficialChatGptAuthUrl(
        "https://chatgpt.com/auth/login?state=opaque",
      ),
    ).not.toThrow();
    for (const hostile of [
      "http://chatgpt.com/auth/login",
      "https://chatgpt.com.evil.example/auth/login",
      "https://user@chatgpt.com/auth/login",
      "https://chatgpt.com:444/auth/login",
      "https://chatgpt.com/auth/login\nhttps://evil.example",
    ]) {
      expect(() => assertOfficialChatGptAuthUrl(hostile)).toThrow(
        "official ChatGPT sign-in URL was invalid",
      );
    }
  });

  it("accepts the exact live MCP server schemas and fixed resource only", async () => {
    const child = new FakeChild();
    answerRequests(child, () => exactMcpStatus);
    const client = new AppServerClient(asChild(child));
    await expect(
      assertExactE1McpInventory(client, null),
    ).resolves.toBeUndefined();
    expect(E1_MCP_RESOURCE_URI).toBe(
      "storystage-e1://synthetic/scene-context/v1",
    );
  });

  it("uses the typed official ChatGPT login lifecycle without persisting its URL", async () => {
    const authUrl = "https://chatgpt.com/auth/login?state=opaque-e1";
    const openAuthUrl = vi.fn(async () => undefined);
    const result = await runE1ProposalRoundTrip({
      ...isolatedTestOptions,
      openAuthUrl,
      launch: () => createSuccessfulClient(0, { authUrl }),
    });

    expect(result.state).toBe("completed");
    expect(openAuthUrl).toHaveBeenCalledOnce();
    expect(openAuthUrl).toHaveBeenCalledWith(authUrl);
  });

  it("rejects a hostile login URL before opening it and cancels the attempt", async () => {
    const openAuthUrl = vi.fn(async () => undefined);
    const onCancel = vi.fn();
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        openAuthUrl,
        launch: () =>
          createSuccessfulClient(0, {
            authUrl: "https://chatgpt.com.evil.example/auth/login",
            onCancel,
          }),
      }),
    ).rejects.toThrow("official ChatGPT sign-in URL was invalid");
    expect(openAuthUrl).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not launch or prompt when already cancelled", async () => {
    const controller = new AbortController();
    const launch = vi.fn(() => createSuccessfulClient());
    controller.abort();
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        signal: controller.signal,
        launch,
      }),
    ).rejects.toMatchObject({ code: "OPERATION_CANCELLED" });
    expect(launch).not.toHaveBeenCalled();
  });

  it("cancels the correlated login when aborted during sign-in", async () => {
    const controller = new AbortController();
    const onCancel = vi.fn();
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        signal: controller.signal,
        openAuthUrl: async () => controller.abort(),
        launch: () =>
          createSuccessfulClient(0, {
            authUrl: "https://chatgpt.com/auth/login?state=abort-e1",
            complete: false,
            onCancel,
          }),
      }),
    ).rejects.toMatchObject({ code: "OPERATION_CANCELLED" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("reports an App Server crash during login without waiting for timeout", async () => {
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        loginTimeoutMs: 10_000,
        openAuthUrl: async () => undefined,
        launch: () =>
          createSuccessfulClient(0, {
            authUrl: "https://chatgpt.com/auth/login?state=crash-e1",
            crashAfterStart: true,
          }),
      }),
    ).rejects.toMatchObject({ code: "APP_SERVER_CRASHED" });
  });

  it("emits deterministic creator events and validates the ephemeral proposal", () => {
    const adapter = new E1ProposalEventAdapter();
    driveSuccessfulAdapter(adapter);

    expect(adapter.getEvents().map((event) => event.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(adapter.getEvents().map((event) => event.kind)).toEqual([
      "session-started",
      "turn-started",
      "tool-started",
      "tool-completed",
      "agent-delta",
      "tool-started",
      "tool-progress",
      "tool-completed",
      "turn-completed",
    ]);
    expect(adapter.getProposal()).toEqual(proposal);
  });

  it("represents cancellation before any tool starts", () => {
    const adapter = new E1ProposalEventAdapter();
    adapter.startSession(threadId);
    adapter.consume(notification("turn/started", startedTurn()));
    adapter.requestCancellation();
    adapter.consume(
      notification("turn/completed", completedTurn("interrupted")),
    );

    expect(adapter.getEvents().map((event) => event.kind)).toEqual([
      "session-started",
      "turn-started",
      "cancellation-requested",
      "turn-completed",
    ]);
    expect(adapter.getProposal()).toBeNull();
  });

  it("preserves cancellation order during an agent stream", () => {
    const adapter = new E1ProposalEventAdapter();
    adapter.startSession(threadId);
    adapter.consume(notification("turn/started", startedTurn()));
    adapter.consume(
      notification("item/agentMessage/delta", {
        threadId,
        turnId,
        itemId: "message-1",
        delta: "Drafting",
      }),
    );
    adapter.requestCancellation();
    adapter.consume(
      notification("turn/completed", completedTurn("interrupted")),
    );

    expect(adapter.getEvents().map((event) => event.kind)).toEqual([
      "session-started",
      "turn-started",
      "agent-delta",
      "cancellation-requested",
      "turn-completed",
    ]);
  });

  it("fails closed on malformed output, forbidden work, and approval requests", () => {
    const malformed = new E1ProposalEventAdapter();
    malformed.startSession(threadId);
    malformed.consume(notification("turn/started", startedTurn()));
    malformed.consume(
      lifecycle(
        "item/started",
        toolItem("tool-context", "get_scene_context", "inProgress"),
      ),
    );
    malformed.consume(
      lifecycle(
        "item/completed",
        toolItem("tool-context", "get_scene_context", "completed", {
          content: [],
        }),
      ),
    );
    malformed.consume(
      lifecycle(
        "item/started",
        toolItem("tool-proposal", "submit_direction_proposal", "inProgress"),
      ),
    );
    expect(() =>
      malformed.consume(
        lifecycle(
          "item/completed",
          toolItem("tool-proposal", "submit_direction_proposal", "completed", {
            content: [],
            structuredContent: { applied: true },
          }),
        ),
      ),
    ).toThrow("malformed output");

    const forbidden = new E1ProposalEventAdapter();
    forbidden.startSession(threadId);
    forbidden.consume(notification("turn/started", startedTurn()));
    expect(() =>
      forbidden.consume(
        lifecycle("item/started", {
          id: "command-1",
          type: "commandExecution",
        }),
      ),
    ).toThrow("forbidden item type commandExecution");

    const approval = new E1ProposalEventAdapter();
    approval.startSession(threadId);
    expect(() =>
      approval.consume({
        kind: "blocked-request",
        id: "approval-1",
        method: "item/requestApproval",
        params: { private: "not retained" },
      }),
    ).toThrow("unsupported approval");
    expect(approval.getEvents()).toMatchObject([
      { kind: "session-started" },
      { kind: "approval-blocked", method: "item/requestApproval" },
    ]);
  });

  it("rejects duplicate, out-of-order, and unknown-progress tool events", () => {
    const outOfOrder = new E1ProposalEventAdapter();
    outOfOrder.startSession(threadId);
    outOfOrder.consume(notification("turn/started", startedTurn()));
    expect(() =>
      outOfOrder.consume(
        lifecycle(
          "item/started",
          toolItem("tool-proposal", "submit_direction_proposal", "inProgress"),
        ),
      ),
    ).toThrow("out of bounded order");

    const unknownProgress = new E1ProposalEventAdapter();
    unknownProgress.startSession(threadId);
    unknownProgress.consume(notification("turn/started", startedTurn()));
    expect(() =>
      unknownProgress.consume(
        notification("item/mcpToolCall/progress", {
          threadId,
          turnId,
          itemId: "missing-tool",
          message: "Not allowed",
        }),
      ),
    ).toThrow("unknown or completed tool call");

    const duplicate = new E1ProposalEventAdapter();
    duplicate.startSession(threadId);
    duplicate.consume(notification("turn/started", startedTurn()));
    const started = lifecycle(
      "item/started",
      toolItem("tool-context", "get_scene_context", "inProgress"),
    );
    duplicate.consume(started);
    expect(() => duplicate.consume(started)).toThrow(
      "repeated a tool-call identity",
    );
  });

  it("rejects typed deltas, items, and progress after terminal completion", () => {
    const makeTerminal = () => {
      const adapter = new E1ProposalEventAdapter();
      adapter.startSession(threadId);
      adapter.consume(notification("turn/started", startedTurn()));
      adapter.consume(
        notification("turn/completed", completedTurn("interrupted")),
      );
      return adapter;
    };

    expect(() =>
      makeTerminal().consume(
        notification("item/agentMessage/delta", {
          threadId,
          turnId,
          itemId: "message-late",
          delta: "Too late",
        }),
      ),
    ).toThrow("after terminal completion");
    expect(() =>
      makeTerminal().consume(
        lifecycle("item/started", {
          id: "late-item",
          type: "reasoning",
        }),
      ),
    ).toThrow("after terminal completion");

    const completedTool = new E1ProposalEventAdapter();
    completedTool.startSession(threadId);
    completedTool.consume(notification("turn/started", startedTurn()));
    completedTool.consume(
      lifecycle(
        "item/started",
        toolItem("tool-context", "get_scene_context", "inProgress"),
      ),
    );
    completedTool.consume(
      lifecycle(
        "item/completed",
        toolItem("tool-context", "get_scene_context", "completed", {
          content: [],
        }),
      ),
    );
    expect(() =>
      completedTool.consume(
        notification("item/mcpToolCall/progress", {
          threadId,
          turnId,
          itemId: "tool-context",
          message: "Late progress",
        }),
      ),
    ).toThrow("unknown or completed tool call");
  });

  it("runs the complete bounded lifecycle and starts cleanly again", async () => {
    const launch = () => createSuccessfulClient();
    const run = () =>
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        launch,
      });

    const first = await run();
    const restarted = await run();

    expect(first.state).toBe("completed");
    expect(first.proposal).toEqual(proposal);
    expect(first.reviewAuthority).toMatchObject({
      previewAvailable: true,
      rejectAvailable: true,
      applyEnabled: false,
    });
    expect(first.isolation).toEqual({
      onlyStoryStageMcpEnabled: true,
      inheritedServerCount: 0,
    });
    expect(restarted.events[0]).toMatchObject({
      sequence: 1,
      kind: "session-started",
    });
    expect(restarted.proposal).toEqual(proposal);
  });

  it("fails before launch when the dedicated Codex state root is unsafe", async () => {
    let launched = false;

    await expect(
      runE1ProposalRoundTrip({
        verifyRuntime: async () => verifiedRuntime,
        prepareCodexHome: async () => {
          throw new Error("unsafe dedicated state root");
        },
        launch: () => {
          launched = true;
          return createSuccessfulClient();
        },
      }),
    ).rejects.toThrow("unsafe dedicated state root");

    expect(launched).toBe(false);
  });

  it.each([
    ["before-tool", "turn-started"],
    ["during-stream", "agent-delta"],
  ] as const)(
    "interrupts exactly once when cancelled %s",
    async (mode, abortKind) => {
      const fixture = createInterruptibleClient(mode);
      const controller = new AbortController();
      const result = await runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.kind === abortKind) controller.abort();
        },
        launch: () => fixture.client,
      });

      expect(result.state).toBe("cancelled");
      expect(fixture.getInterruptCount()).toBe(1);
      expect(result.events.map((event) => event.kind)).toContain(
        "cancellation-requested",
      );
    },
  );

  it("interrupts a late forbidden event exactly once and fails visibly", async () => {
    const fixture = createInterruptibleClient("forbidden");
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        launch: () => fixture.client,
      }),
    ).rejects.toThrow("forbidden item type commandExecution");
    expect(fixture.getInterruptCount()).toBe(1);
  });

  it("fails visibly on typed activity after terminal completion", async () => {
    const fixture = createInterruptibleClient("late-after-terminal");
    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        launch: () => fixture.client,
      }),
    ).rejects.toThrow("after terminal completion");
    expect(fixture.getInterruptCount()).toBe(0);
  });

  it("removes the isolated workspace even when shutdown fails", async () => {
    const listWorkspaces = async () =>
      (await readdir(tmpdir()))
        .filter((name) => name.startsWith("storystage-e1-wp3-workspace-"))
        .sort();
    const before = await listWorkspaces();

    await expect(
      runE1ProposalRoundTrip({
        ...isolatedTestOptions,
        launch: () => createSuccessfulClient(1),
      }),
    ).rejects.toMatchObject({ code: "APP_SERVER_CRASHED" });

    expect(await listWorkspaces()).toEqual(before);
  });
});
