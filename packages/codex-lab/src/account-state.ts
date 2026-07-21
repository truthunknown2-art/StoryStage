import { CodexLabError, type PreflightState } from "./errors";

export type AccountObservation = {
  account: { type: "apiKey" | "chatgpt" | "amazonBedrock" } | null;
  requiresOpenaiAuth: boolean;
};

export function classifyAccountState(
  observation: AccountObservation,
): PreflightState {
  if (observation.account?.type === "chatgpt") return "authenticated";
  if (observation.account === null && observation.requiresOpenaiAuth) {
    return "signed-out";
  }
  return "incompatible";
}

export function classifyFailure(error: unknown): PreflightState {
  if (error instanceof CodexLabError && error.stateHint) return error.stateHint;
  return "incompatible";
}

export function classifyRpcFailure(
  method: string,
  rawError: unknown,
): PreflightState {
  const text = JSON.stringify(rawError).toLowerCase();
  if (/rate.?limit|usage.?limit|quota|too many requests|\b429\b/.test(text)) {
    return "usage-limited";
  }
  if (
    /revoked|expired|unauthori[sz]ed|login required|refresh token|\b401\b/.test(
      text,
    )
  ) {
    return "revoked-or-expired";
  }
  if (/offline|network|dns|connect|timed? out|unreachable/.test(text)) {
    return "offline";
  }
  if (method === "account/read") return "revoked-or-expired";
  return "incompatible";
}
