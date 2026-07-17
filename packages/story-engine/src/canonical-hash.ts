import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashCanonical(value: unknown): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonicalJson(value))));
}
