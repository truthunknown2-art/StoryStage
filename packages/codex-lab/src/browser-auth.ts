import { spawn } from "node:child_process";
import { CodexLabError } from "./errors";
import { assertOfficialChatGptAuthUrl } from "./proposal-roundtrip";

export function getOfficialChatGptBrowserLaunch(url: string): {
  executable: "rundll32.exe";
  args: ["url.dll,FileProtocolHandler", string];
} {
  assertOfficialChatGptAuthUrl(url);
  return {
    executable: "rundll32.exe",
    args: ["url.dll,FileProtocolHandler", url],
  };
}

/** Opens the already-validated official sign-in capability without a shell. */
export async function openOfficialChatGptAuthUrl(url: string): Promise<void> {
  const launch = getOfficialChatGptBrowserLaunch(url);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(launch.executable, launch.args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
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
  });
}
