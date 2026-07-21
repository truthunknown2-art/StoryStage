const sensitiveKey =
  /(?:account.*id|auth(?:cache|data|path|token)|codexhome|cwd|email|input|localpath|prompt|token|thread.*id|turn.*id)/i;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const secret =
  /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~+/-]{24,}={0,2})\b/gi;
const jwt = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const windowsPath = /\b[A-Za-z]:\\[^\r\n"]+/g;
const uuid =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function redactString(value: string): string {
  return value
    .replace(email, "[REDACTED_EMAIL]")
    .replace(secret, "[REDACTED_SECRET]")
    .replace(jwt, "[REDACTED_TOKEN]")
    .replace(windowsPath, "[REDACTED_PATH]")
    .replace(uuid, "[REDACTED_ID]");
}

export function redactForReceipt(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactForReceipt);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKey.test(key) && typeof entry === "string"
          ? "[REDACTED]"
          : redactForReceipt(entry),
      ]),
    );
  }
  return value;
}

export function assertReceiptContainsNoSensitiveFragments(
  receipt: unknown,
  sensitiveFragments: string[],
): void {
  const text = JSON.stringify(receipt);
  for (const fragment of sensitiveFragments.filter(Boolean)) {
    if (text.includes(fragment)) {
      throw new Error("The preflight receipt contains a sensitive fragment.");
    }
  }
  for (const pattern of [email, secret, jwt, windowsPath, uuid]) {
    pattern.lastIndex = 0;
  }
  if (
    email.test(text) ||
    secret.test(text) ||
    jwt.test(text) ||
    windowsPath.test(text) ||
    uuid.test(text)
  ) {
    throw new Error("The preflight receipt contains a sensitive data shape.");
  }
}
