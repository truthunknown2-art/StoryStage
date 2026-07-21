import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it, vi } from "vitest";
import {
  E1_MCP_MAX_INPUT_RECORD_BYTES,
  E1_MCP_MAX_OUTPUT_RECORD_BYTES,
  E1McpBoundedStdioTransport,
} from "./mcp-stdio-transport";

describe("E1-WP2 bounded MCP stdio transport", () => {
  it("accepts one UTF-8 JSON-RPC object per CRLF-delimited record", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const transport = new E1McpBoundedStdioTransport(input, output);
    const received = vi.fn();
    transport.onmessage = received;
    await transport.start();
    input.write('{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}\r\n');
    expect(received).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      id: 1,
      method: "ping",
      params: {},
    });
    await transport.close();
  });

  it("fails once on oversized, invalid UTF-8, malformed, or batched input", async () => {
    for (const record of [
      Buffer.alloc(E1_MCP_MAX_INPUT_RECORD_BYTES + 1, 0x20),
      Buffer.from([0xc3, 0x28, 0x0a]),
      Buffer.from("not-json\n"),
      Buffer.from("[]\n"),
    ]) {
      const input = new PassThrough();
      const transport = new E1McpBoundedStdioTransport(
        input,
        new PassThrough(),
      );
      const errors = vi.fn();
      transport.onerror = errors;
      await transport.start();
      input.write(record);
      input.write("still ignored\n");
      expect(errors).toHaveBeenCalledTimes(1);
      expect(errors.mock.calls[0]?.[0]).toMatchObject({
        code:
          record.length > E1_MCP_MAX_INPUT_RECORD_BYTES
            ? "INPUT_LIMIT_EXCEEDED"
            : "MALFORMED_JSONL",
      });
      await transport.close();
    }
  });

  it("refuses an oversized output record before writing any bytes", async () => {
    const output = new PassThrough();
    const written: Buffer[] = [];
    output.on("data", (chunk: Buffer) => written.push(chunk));
    const transport = new E1McpBoundedStdioTransport(new PassThrough(), output);
    await expect(
      transport.send({
        jsonrpc: "2.0",
        id: 1,
        result: { text: "x".repeat(E1_MCP_MAX_OUTPUT_RECORD_BYTES) },
      }),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
    expect(written).toHaveLength(0);
  });

  it("completes a real stdio lifecycle and discovers only the two bounded tools", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(import.meta.resolve("tsx/cli")),
        fileURLToPath(new URL("./mcp-cli.ts", import.meta.url)),
      ],
      stderr: "pipe",
    });
    const client = new Client({
      name: "storystage-e1-wp2-stdio-test",
      version: "1.0.0",
    });
    await client.connect(transport);
    await expect(client.listTools()).resolves.toMatchObject({
      tools: [
        { name: "get_scene_context" },
        { name: "submit_direction_proposal" },
      ],
    });
    await client.close();
  });
});
