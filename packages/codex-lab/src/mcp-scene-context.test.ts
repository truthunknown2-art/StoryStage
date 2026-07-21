import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  E1_MCP_FIXTURE_SHA256,
  E1_MCP_INSTRUCTIONS,
  E1_MCP_MAX_FIXTURE_BYTES,
  E1_MCP_MAX_PROPOSAL_CHANGES,
  E1_MCP_PROTOCOL_VERSION,
  E1_MCP_REQUEST_TIMEOUT_MS,
  E1_MCP_RESOURCE_URI,
  createE1McpSceneContextServer,
  e1ProposalReceiptSchema,
  e1SceneContextSchema,
} from "./mcp-scene-context";

const fixtureUrl = new URL(
  "../fixtures/e1-wp2-synthetic-scene.json",
  import.meta.url,
);

const validProposal = {
  schemaVersion: 1 as const,
  projectId: "project-ollo-cloud-parade-lab",
  sceneId: "scene-cloud-garden",
  beatId: "beat-windbell-discovery",
  summary: "Let Ollo notice the wind bell before offering reassurance.",
  rationale: "The pause makes the emotional turn readable for young viewers.",
  changes: [
    { kind: "camera-intent" as const, intent: "close-reaction" },
    {
      kind: "performance-cue" as const,
      entityId: "character-ollo",
      capability: "head-turn",
      cue: "notice-windbell",
    },
    {
      kind: "layer-emphasis" as const,
      layerId: "layer-silver-fern",
      emphasis: "foreground-soften",
    },
  ],
};

async function fixtureHash(): Promise<string> {
  return createHash("sha256")
    .update(await readFile(fixtureUrl))
    .digest("hex");
}

async function connect(
  dependencies: Parameters<typeof createE1McpSceneContextServer>[0] = {},
) {
  const server = await createE1McpSceneContextServer(dependencies);
  const client = new Client(
    { name: "storystage-e1-wp2-tests", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    server,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function firstText(result: unknown): string {
  const content =
    result && typeof result === "object" && "content" in result
      ? result.content
      : undefined;
  const first = Array.isArray(content) ? content[0] : undefined;
  if (
    !first ||
    typeof first !== "object" ||
    !("type" in first) ||
    first.type !== "text" ||
    !("text" in first) ||
    typeof first.text !== "string"
  ) {
    throw new Error("Expected one MCP text content block.");
  }
  return first.text;
}

afterEach(() => {
  vi.useRealTimers();
});

describe.sequential("E1-WP2 bounded synthetic-scene MCP server", () => {
  it("starts only from the exact immutable synthetic fixture", async () => {
    expect(await fixtureHash()).toBe(E1_MCP_FIXTURE_SHA256);
    let reads = 0;
    const fixture = await readFile(fixtureUrl);
    const connection = await connect({
      readFixture: async () => {
        reads += 1;
        return fixture;
      },
    });
    expect(reads).toBe(1);
    expect(await fixtureHash()).toBe(E1_MCP_FIXTURE_SHA256);
    await connection.close();
  });

  it("advertises the pinned protocol instructions and exact fixed inventory", async () => {
    expect(E1_MCP_PROTOCOL_VERSION).toBe("2025-06-18");
    expect(E1_MCP_INSTRUCTIONS.length).toBeLessThanOrEqual(512);
    expect(E1_MCP_INSTRUCTIONS).toContain("PROPOSAL-ONLY SYNTHETIC LAB");

    const connection = await connect();
    expect(connection.client.getServerCapabilities()).toEqual({
      resources: {},
      tools: {},
    });
    expect(connection.client.getServerVersion()).toEqual({
      name: "storystage-e1-synthetic-scene",
      version: "1.0.0",
    });
    expect(connection.client.getInstructions()).toBe(E1_MCP_INSTRUCTIONS);
    const resources = await connection.client.listResources();
    expect(resources).toEqual({
      resources: [
        {
          name: "synthetic-scene-context",
          title: "StoryStage E1 synthetic scene context",
          uri: E1_MCP_RESOURCE_URI,
          description:
            "One immutable synthetic StoryStage scene for the E1 feasibility lab.",
          mimeType: "application/json",
          annotations: { audience: ["assistant"], priority: 1 },
        },
      ],
    });
    await expect(connection.client.listResourceTemplates()).resolves.toEqual({
      resourceTemplates: [],
    });

    const tools = await connection.client.listTools();
    expect(
      tools.tools.map(({ name, annotations }) => ({ name, annotations })),
    ).toEqual([
      {
        name: "get_scene_context",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "submit_direction_proposal",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
    ]);
    expect(tools.tools).toHaveLength(2);
    expect(tools.tools[0]?.inputSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion"],
    });
    expect(tools.tools[1]?.inputSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: [
        "schemaVersion",
        "projectId",
        "sceneId",
        "beatId",
        "summary",
        "rationale",
        "changes",
      ],
    });
    await connection.close();
  });

  it("returns the same seven bounded context sections through resource and tool reads", async () => {
    const before = await fixtureHash();
    const connection = await connect();
    const resource = await connection.client.readResource({
      uri: E1_MCP_RESOURCE_URI,
    });
    const firstResource = resource.contents[0];
    const resourceText =
      firstResource && "text" in firstResource ? firstResource.text : undefined;
    expect(typeof resourceText).toBe("string");
    const resourceContext = e1SceneContextSchema.parse(
      JSON.parse(resourceText as string),
    );

    const tool = await connection.client.callTool({
      name: "get_scene_context",
      arguments: { schemaVersion: 1 },
    });
    expect(tool.isError).not.toBe(true);
    const toolContext = e1SceneContextSchema.parse(tool.structuredContent);
    expect(toolContext).toEqual(resourceContext);
    expect(JSON.parse(firstText(tool))).toEqual(resourceContext);
    expect(Object.keys(toolContext)).toEqual([
      "schemaVersion",
      "synthetic",
      "label",
      "projectSummary",
      "selectedScene",
      "selectedBeat",
      "directionState",
      "demoAssetsAndRigCapabilities",
      "locationLayers",
      "continuityState",
    ]);

    (toolContext.selectedScene as { title: string }).title =
      "mutated client copy";
    const reread = await connection.client.callTool({
      name: "get_scene_context",
      arguments: { schemaVersion: 1 },
    });
    expect(
      e1SceneContextSchema.parse(reread.structuredContent).selectedScene.title,
    ).toBe("The Cloud Garden Wakes");
    expect(await fixtureHash()).toBe(before);
    await connection.close();
  });

  it("validates one ephemeral proposal without generating durable authority", async () => {
    const before = await fixtureHash();
    const connection = await connect();
    const result = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: validProposal,
    });
    expect(result.isError).not.toBe(true);
    const receipt = e1ProposalReceiptSchema.parse(result.structuredContent);
    expect(receipt).toMatchObject({
      status: "validated-ephemeral",
      applied: false,
      persisted: false,
      canonical: false,
      proposal: validProposal,
    });
    expect(JSON.parse(firstText(result))).toEqual(receipt);
    expect(JSON.stringify(receipt)).not.toMatch(
      /contentHash|createdAt|updatedAt|renderJob|approvalId|filePath|applyId/i,
    );
    expect(await fixtureHash()).toBe(before);
    await connection.close();
  });

  it("denies unknown IDs, capabilities, authority fields, bytes, and items", async () => {
    const before = await fixtureHash();
    const connection = await connect();

    const unknownId = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: { ...validProposal, sceneId: "scene-invented" },
    });
    expect(unknownId.isError).toBe(true);
    expect(unknownId.structuredContent).toMatchObject({
      error: { code: "UNKNOWN_ID" },
    });

    const unknownCapability = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: {
        ...validProposal,
        changes: [
          {
            kind: "performance-cue",
            entityId: "character-ollo",
            capability: "teleport",
            cue: "teleport-now",
          },
        ],
      },
    });
    expect(unknownCapability.isError).toBe(true);
    expect(unknownCapability.structuredContent).toMatchObject({
      error: { code: "AUTHORITY_DENIED" },
    });

    const authorityField = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: { ...validProposal, apply: true },
    });
    expect(authorityField.isError).toBe(true);
    expect(firstText(authorityField)).toMatch(/unrecognized key|apply/i);

    const oversized = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: { ...validProposal, rationale: "x".repeat(5_000) },
    });
    expect(oversized.isError).toBe(true);
    expect(oversized.structuredContent).toMatchObject({
      error: { code: "BYTE_LIMIT_EXCEEDED" },
    });

    const tooManyItems = await connection.client.callTool({
      name: "submit_direction_proposal",
      arguments: {
        ...validProposal,
        changes: Array.from(
          { length: E1_MCP_MAX_PROPOSAL_CHANGES + 1 },
          () => ({ kind: "camera-intent", intent: "wide-gentle" }),
        ),
      },
    });
    expect(tooManyItems.isError).toBe(true);
    expect(firstText(tooManyItems)).toContain("ITEM_LIMIT_EXCEEDED");

    expect(await fixtureHash()).toBe(before);
    await connection.close();
  });

  it("rejects arbitrary resources, paths, URI variants, and unknown tools", async () => {
    const before = await fixtureHash();
    const connection = await connect();
    for (const uri of [
      "file:///C:/Windows/System32/drivers/etc/hosts",
      "storystage-e1://synthetic/../scene-context/v1",
      "storystage-e1://synthetic/%2e%2e/scene-context/v1",
      `${E1_MCP_RESOURCE_URI}?path=../../outside`,
      `${E1_MCP_RESOURCE_URI}#alternate`,
      E1_MCP_RESOURCE_URI.toUpperCase(),
    ]) {
      await expect(connection.client.readResource({ uri })).rejects.toThrow(
        /not found|unknown/i,
      );
    }
    const unknownTool = await connection.client.callTool({
      name: "render_scene",
      arguments: {},
    });
    expect(unknownTool.isError).toBe(true);
    expect(firstText(unknownTool)).toMatch(/not found/i);
    expect(await fixtureHash()).toBe(before);
    await connection.close();
  });

  it("cancels in-flight work and enforces the fixed handler deadline", async () => {
    const before = await fixtureHash();
    let observedSignal: AbortSignal | undefined;
    const cancelledConnection = await connect({
      beforeRequest: async (method, signal) => {
        if (method !== "get_scene_context") return;
        observedSignal = signal;
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      },
    });
    const controller = new AbortController();
    const cancelled = cancelledConnection.client.callTool(
      {
        name: "get_scene_context",
        arguments: { schemaVersion: 1 },
      },
      undefined,
      { signal: controller.signal, timeout: 10_000 },
    );
    await vi.waitFor(() => expect(observedSignal).toBeDefined());
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ code: -32_001 });
    await vi.waitFor(() => expect(observedSignal?.aborted).toBe(true));
    await cancelledConnection.close();

    vi.useFakeTimers();
    const timeoutConnection = await connect({
      beforeRequest: async (method) => {
        if (method === "get_scene_context") await new Promise(() => undefined);
      },
    });
    const timedOut = timeoutConnection.client.callTool(
      {
        name: "get_scene_context",
        arguments: { schemaVersion: 1 },
      },
      undefined,
      { timeout: 10_000 },
    );
    await vi.advanceTimersByTimeAsync(E1_MCP_REQUEST_TIMEOUT_MS + 1);
    const timeoutResult = await timedOut;
    expect(timeoutResult.isError).toBe(true);
    expect(timeoutResult.structuredContent).toMatchObject({
      error: { code: "REQUEST_TIMEOUT" },
    });
    await timeoutConnection.close();
    expect(await fixtureHash()).toBe(before);
  });

  it("fails closed before registration when fixture startup validation fails", async () => {
    const fixture = await readFile(fixtureUrl);
    await expect(
      createE1McpSceneContextServer({
        readFixture: async () => Buffer.from("not-json"),
      }),
    ).rejects.toMatchObject({ code: "MCP_STARTUP_FAILED" });
    await expect(
      createE1McpSceneContextServer({
        readFixture: async () => Buffer.concat([fixture, Buffer.from(" ")]),
      }),
    ).rejects.toMatchObject({ code: "MCP_STARTUP_FAILED" });
    await expect(
      createE1McpSceneContextServer({
        readFixture: async () =>
          Buffer.alloc(E1_MCP_MAX_FIXTURE_BYTES + 1, 0x20),
      }),
    ).rejects.toMatchObject({ code: "MCP_STARTUP_FAILED" });
    await expect(
      createE1McpSceneContextServer({
        readFixture: async () => {
          throw new Error("host path must not escape");
        },
      }),
    ).rejects.toMatchObject({
      code: "MCP_STARTUP_FAILED",
      message: "The fixed synthetic scene failed startup validation.",
    });
    expect(await fixtureHash()).toBe(E1_MCP_FIXTURE_SHA256);
  });

  it("has no write, process, renderer, network, or project dependency surface", async () => {
    const source = await readFile(
      new URL("./mcp-scene-context.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /from\s+["'](?:node:child_process|.*render-worker|.*story-engine|.*apps\/studio)["']|\b(?:writeFile|appendFile|rename|mkdir|rm|fetch)\s*\(/,
    );
  });
});
