import { spawn } from "node:child_process";
import { win32 } from "node:path";
import { CodexLabError } from "./errors";
import { assertOfficialChatGptAuthUrl } from "./proposal-roundtrip";
import { getTrustedWindowsPowerShell } from "./windows-system";

const openCommand =
  "$url=[Console]::In.ReadLine(); if ($null -eq $url) { exit 2 }; Start-Process -FilePath $url";

export function getOfficialChatGptBrowserLaunch(
  url: string,
  executable: string,
): {
  executable: string;
  args: readonly string[];
  input: string;
} {
  assertOfficialChatGptAuthUrl(url);
  return {
    executable,
    args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", openCommand],
    input: `${url}\n`,
  };
}

/** Sends the transient sign-in capability over stdin to trusted System32 code. */
export async function openOfficialChatGptAuthUrl(url: string): Promise<void> {
  const system = await getTrustedWindowsPowerShell();
  const launch = getOfficialChatGptBrowserLaunch(url, system.executable);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(launch.executable, launch.args, {
      cwd: win32.dirname(launch.executable),
      env: system.environment,
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });
    child.once("error", () => {
      reject(
        new CodexLabError(
          "WRITE_FAILED",
          "The official ChatGPT sign-in page could not be opened.",
          "signed-out",
        ),
      );
    });
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CodexLabError(
            "WRITE_FAILED",
            "The official ChatGPT sign-in page could not be opened.",
            "signed-out",
          ),
        );
    });
    child.stdin.end(launch.input);
  });
}
