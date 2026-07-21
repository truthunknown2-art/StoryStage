import { describe, expect, it } from "vitest";
import { getOfficialChatGptBrowserLaunch } from "./browser-auth";

describe("official ChatGPT browser handoff", () => {
  it("uses a fixed executable and argument array without a shell", () => {
    const url = "https://chatgpt.com/auth/login?state=opaque-e1";
    const launch = getOfficialChatGptBrowserLaunch(
      url,
      "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    );
    expect(launch.executable).toMatch(/^[A-Z]:\\/i);
    expect(launch.args.join(" ")).not.toContain(url);
    expect(launch.input).toBe(`${url}\n`);
  });

  it("rejects a non-official origin before constructing a launch", () => {
    expect(() =>
      getOfficialChatGptBrowserLaunch(
        "https://chatgpt.com.evil.example/auth/login",
        "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ),
    ).toThrow("official ChatGPT sign-in URL was invalid");
  });
});
