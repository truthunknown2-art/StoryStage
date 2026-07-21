import { describe, expect, it } from "vitest";
import { getOfficialChatGptBrowserLaunch } from "./browser-auth";

describe("official ChatGPT browser handoff", () => {
  it("uses a fixed executable and argument array without a shell", () => {
    const url = "https://chatgpt.com/auth/login?state=opaque-e1";
    expect(getOfficialChatGptBrowserLaunch(url)).toEqual({
      executable: "rundll32.exe",
      args: ["url.dll,FileProtocolHandler", url],
    });
  });

  it("rejects a non-official origin before constructing a launch", () => {
    expect(() =>
      getOfficialChatGptBrowserLaunch(
        "https://chatgpt.com.evil.example/auth/login",
      ),
    ).toThrow("official ChatGPT sign-in URL was invalid");
  });
});
