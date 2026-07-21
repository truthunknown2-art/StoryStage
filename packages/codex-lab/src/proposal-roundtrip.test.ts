import { describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { AppServerClient } from "./app-server";
import { E1_MCP_SERVER_NAME } from "./mcp-scene-context";
import {
  E1_PROPOSAL_SCOPE,
  E1ProposalEventAdapter,
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

function createSuccessfulClient(closeCode = 0): AppServerClient {
  const child = new FakeChild();
  child.stdin.once("finish", () => child.emit("exit", closeCode, null));
  answerRequests(child, (method) => {
    switch (method) {
      case "initialize":
        return {
          userAgent: "test",
          codexHome: "private-test-home",
          platformFamily: "windows",
          platformOs: "windows",
        };
      case "thread/start":
        return { thread: { id: threadId } };
      case "mcpServerStatus/list":
        return {
          data: [
            {
              name: E1_MCP_SERVER_NAME,
              authStatus: "notRequired",
              resourceTemplates: [],
              resources: [],
              tools: {
                get_scene_context: {},
                submit_direction_proposal: {},
              },
            },
          ],
          nextCursor: null,
        };
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
          codexHome: "private-test-home",
          platformFamily: "windows",
          platformOs: "windows",
        };
      case "thread/start":
        return { thread: { id: threadId } };
      case "mcpServerStatus/list":
        return {
          data: [
            {
              name: E1_MCP_SERVER_NAME,
              authStatus: "notRequired",
              resourceTemplates: [],
              resources: [],
              tools: {
                get_scene_context: {},
                submit_direction_proposal: {},
              },
            },
          ],
        };
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

describe("E1 streamed proposal round trip", () => {
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
        verifyRuntime: async () => verifiedRuntime,
        listConfiguredMcpServers: async () => [],
        verifyMcpIsolation: async () => undefined,
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

  it("fails before launch when the pinned runtime cannot isolate MCPs without credentials", async () => {
    let launched = false;

    await expect(
      runE1ProposalRoundTrip({
        verifyRuntime: async () => verifiedRuntime,
        launch: () => {
          launched = true;
          return createSuccessfulClient();
        },
      }),
    ).rejects.toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
      stateHint: "incompatible",
    });

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
        signal: controller.signal,
        onEvent: (event) => {
          if (event.kind === abortKind) controller.abort();
        },
        verifyRuntime: async () => verifiedRuntime,
        listConfiguredMcpServers: async () => [],
        verifyMcpIsolation: async () => undefined,
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
        verifyRuntime: async () => verifiedRuntime,
        listConfiguredMcpServers: async () => [],
        verifyMcpIsolation: async () => undefined,
        launch: () => fixture.client,
      }),
    ).rejects.toThrow("forbidden item type commandExecution");
    expect(fixture.getInterruptCount()).toBe(1);
  });

  it("fails visibly on typed activity after terminal completion", async () => {
    const fixture = createInterruptibleClient("late-after-terminal");
    await expect(
      runE1ProposalRoundTrip({
        verifyRuntime: async () => verifiedRuntime,
        listConfiguredMcpServers: async () => [],
        verifyMcpIsolation: async () => undefined,
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
        verifyRuntime: async () => verifiedRuntime,
        listConfiguredMcpServers: async () => [],
        verifyMcpIsolation: async () => undefined,
        launch: () => createSuccessfulClient(1),
      }),
    ).rejects.toMatchObject({ code: "APP_SERVER_CRASHED" });

    expect(await listWorkspaces()).toEqual(before);
  });
});
