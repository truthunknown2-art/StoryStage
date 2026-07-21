export type PreflightState =
  | "not-installed"
  | "signed-out"
  | "authenticated"
  | "revoked-or-expired"
  | "offline"
  | "usage-limited"
  | "incompatible"
  | "crashed";

export type CodexLabErrorCode =
  | "APP_SERVER_CRASHED"
  | "APP_SERVER_TIMEOUT"
  | "MALFORMED_JSON"
  | "OUTPUT_LIMIT_EXCEEDED"
  | "PROTOCOL_INCOMPATIBLE"
  | "PROTOCOL_REQUEST_FAILED"
  | "RUNTIME_INCOMPATIBLE"
  | "RUNTIME_NOT_INSTALLED"
  | "WRITE_FAILED";

export type CodexLabFailureReason =
  | "invalid-params"
  | "method-not-found"
  | "turn-not-active"
  | "turn-not-found"
  | "unclassified";

export class CodexLabError extends Error {
  public constructor(
    public readonly code: CodexLabErrorCode,
    message: string,
    public readonly stateHint?: PreflightState,
    public readonly reason?: CodexLabFailureReason,
    public readonly rpcCode?: number,
  ) {
    super(message);
    this.name = "CodexLabError";
  }
}
