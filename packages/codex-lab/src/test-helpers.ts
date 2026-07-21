import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { vi } from "vitest";

export class FakeChild extends EventEmitter {
  public readonly stdin = new PassThrough();
  public readonly stdout = new PassThrough();
  public readonly stderr = new PassThrough();
  public readonly kill = vi.fn(() => {
    queueMicrotask(() => this.emit("exit", 1, "SIGTERM"));
    return true;
  });
}

export function asChild(child: FakeChild): ChildProcessWithoutNullStreams {
  return child as unknown as ChildProcessWithoutNullStreams;
}

export function answerRequests(
  child: FakeChild,
  answer: (method: string, params: unknown) => unknown,
): void {
  let buffered = "";
  child.stdin.on("data", (chunk: Buffer) => {
    buffered += chunk.toString("utf8");
    while (buffered.includes("\n")) {
      const newline = buffered.indexOf("\n");
      const line = buffered.slice(0, newline);
      buffered = buffered.slice(newline + 1);
      if (!line) continue;
      const message = JSON.parse(line) as {
        id?: number;
        method: string;
        params: unknown;
      };
      if (message.id === undefined) continue;
      child.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          result: answer(message.method, message.params),
        })}\n`,
      );
    }
  });
}
