import { describe, expect, it } from "vitest";
import {
  getTrustedWindowsPowerShell,
  resolveLocalAppDataKnownFolder,
} from "./windows-system";

describe("trusted Windows system boundary", () => {
  it("resolves the OS Local AppData known folder through absolute System32 PowerShell", async () => {
    const system = await getTrustedWindowsPowerShell();
    expect(system.executable.toLowerCase()).toContain(
      "\\system32\\windowspowershell\\v1.0\\powershell.exe",
    );
    expect(system.environment).not.toHaveProperty("OPENAI_API_KEY");
    expect(system.environment).not.toHaveProperty("CODEX_ACCESS_TOKEN");
    expect(await resolveLocalAppDataKnownFolder()).toBe(
      process.env.LOCALAPPDATA,
    );
  });
});
