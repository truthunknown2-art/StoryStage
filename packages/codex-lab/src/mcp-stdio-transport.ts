import process from "node:process";
import type { Readable, Writable } from "node:stream";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";

export const E1_MCP_MAX_INPUT_RECORD_BYTES = 64 * 1024;
export const E1_MCP_MAX_OUTPUT_RECORD_BYTES = 256 * 1024;

export class E1McpStdioTransportError extends Error {
  public constructor(
    public readonly code:
      | "INPUT_LIMIT_EXCEEDED"
      | "MALFORMED_JSONL"
      | "OUTPUT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "E1McpStdioTransportError";
  }
}

export class E1McpBoundedStdioTransport implements Transport {
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  private buffer = Buffer.alloc(0);
  private started = false;
  private failed = false;

  public constructor(
    private readonly input: Readable = process.stdin,
    private readonly output: Writable = process.stdout,
  ) {}

  public async start(): Promise<void> {
    if (this.started)
      throw new Error("E1 MCP stdio transport already started.");
    this.started = true;
    this.input.on("data", this.onData);
    this.input.on("error", this.onInputError);
    this.input.on("end", this.onEnd);
  }

  public async close(): Promise<void> {
    this.input.off("data", this.onData);
    this.input.off("error", this.onInputError);
    this.input.off("end", this.onEnd);
    this.buffer = Buffer.alloc(0);
    if (!this.input.destroyed) this.input.destroy();
    this.onclose?.();
  }

  public async send(message: JSONRPCMessage): Promise<void> {
    const record = `${JSON.stringify(message)}\n`;
    if (Buffer.byteLength(record, "utf8") > E1_MCP_MAX_OUTPUT_RECORD_BYTES) {
      throw new E1McpStdioTransportError(
        "OUTPUT_LIMIT_EXCEEDED",
        "The MCP output record exceeded its fixed byte limit.",
      );
    }
    await new Promise<void>((resolve, reject) => {
      this.output.write(record, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private readonly onData = (chunk: Buffer | string): void => {
    if (this.failed) return;
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.buffer = Buffer.concat([this.buffer, bytes]);
    this.processRecords();
  };

  private readonly onInputError = (): void => {
    this.fail(
      new E1McpStdioTransportError(
        "MALFORMED_JSONL",
        "The MCP input stream failed.",
      ),
    );
  };

  private readonly onEnd = (): void => {
    if (this.buffer.length > 0 && !this.failed) {
      this.fail(
        new E1McpStdioTransportError(
          "MALFORMED_JSONL",
          "The MCP input ended with an incomplete record.",
        ),
      );
      return;
    }
    this.onclose?.();
  };

  private processRecords(): void {
    while (!this.failed) {
      const newline = this.buffer.indexOf(0x0a);
      if (newline < 0) {
        if (this.buffer.length > E1_MCP_MAX_INPUT_RECORD_BYTES) {
          this.fail(
            new E1McpStdioTransportError(
              "INPUT_LIMIT_EXCEEDED",
              "The MCP input record exceeded its fixed byte limit.",
            ),
          );
        }
        return;
      }
      if (newline > E1_MCP_MAX_INPUT_RECORD_BYTES) {
        this.fail(
          new E1McpStdioTransportError(
            "INPUT_LIMIT_EXCEEDED",
            "The MCP input record exceeded its fixed byte limit.",
          ),
        );
        return;
      }
      let line = this.buffer.subarray(0, newline);
      this.buffer = this.buffer.subarray(newline + 1);
      if (line.at(-1) === 0x0d) line = line.subarray(0, -1);
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(line);
        const parsed: unknown = JSON.parse(text);
        const message = JSONRPCMessageSchema.parse(parsed);
        this.onmessage?.(message);
      } catch {
        this.fail(
          new E1McpStdioTransportError(
            "MALFORMED_JSONL",
            "The MCP input was not one valid JSON-RPC object.",
          ),
        );
      }
    }
  }

  private fail(error: E1McpStdioTransportError): void {
    if (this.failed) return;
    this.failed = true;
    this.buffer = Buffer.alloc(0);
    this.input.off("data", this.onData);
    this.onerror?.(error);
  }
}
