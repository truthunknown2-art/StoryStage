import { describe, expect, it } from "vitest";
import {
  accountResponseSchema,
  modelListResponseSchema,
  rateLimitsResponseSchema,
  usageResponseSchema,
} from "./protocol-schemas";

describe("pinned stable protocol response schemas", () => {
  it("accepts fields that the canonical JSON Schema marks optional", () => {
    expect(
      accountResponseSchema.safeParse({ requiresOpenaiAuth: true }).success,
    ).toBe(true);
    expect(modelListResponseSchema.safeParse({ data: [] }).success).toBe(true);
    expect(rateLimitsResponseSchema.safeParse({ rateLimits: {} }).success).toBe(
      true,
    );
    expect(usageResponseSchema.safeParse({ summary: {} }).success).toBe(true);
  });
});
