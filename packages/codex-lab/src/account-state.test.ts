import { describe, expect, it } from "vitest";
import {
  classifyAccountState,
  classifyFailure,
  classifyRpcFailure,
} from "./account-state";
import { CodexLabError } from "./errors";

describe("E1 account-state truth", () => {
  it("distinguishes the only supported subscription state from signed-out and unsupported auth", () => {
    expect(
      classifyAccountState({
        account: { type: "chatgpt" },
        requiresOpenaiAuth: true,
      }),
    ).toBe("authenticated");
    expect(
      classifyAccountState({ account: null, requiresOpenaiAuth: true }),
    ).toBe("signed-out");
    expect(
      classifyAccountState({
        account: { type: "apiKey" },
        requiresOpenaiAuth: false,
      }),
    ).toBe("incompatible");
  });

  it("keeps every required failure state explicit instead of collapsing to unavailable", () => {
    expect(
      classifyRpcFailure("account/read", { message: "token revoked" }),
    ).toBe("revoked-or-expired");
    expect(
      classifyRpcFailure("model/list", { message: "network offline" }),
    ).toBe("offline");
    expect(classifyRpcFailure("account/rateLimits/read", { code: 429 })).toBe(
      "usage-limited",
    );
    expect(
      classifyFailure(
        new CodexLabError("RUNTIME_NOT_INSTALLED", "missing", "not-installed"),
      ),
    ).toBe("not-installed");
    expect(
      classifyFailure(
        new CodexLabError("APP_SERVER_CRASHED", "crashed", "crashed"),
      ),
    ).toBe("crashed");
    expect(
      classifyFailure(
        new CodexLabError("PROTOCOL_INCOMPATIBLE", "changed", "incompatible"),
      ),
    ).toBe("incompatible");
  });
});
