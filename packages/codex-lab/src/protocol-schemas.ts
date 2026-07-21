import { z } from "zod";

export const initializeResponseSchema = z
  .object({
    userAgent: z.string(),
    codexHome: z.string(),
    platformFamily: z.string(),
    platformOs: z.string(),
  })
  .strict();

const accountSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("apiKey") }).strict(),
  z
    .object({
      type: z.literal("chatgpt"),
      email: z.string().nullable(),
      planType: z.string(),
    })
    .strict(),
  z.object({ type: z.literal("amazonBedrock") }).passthrough(),
]);

export const accountResponseSchema = z
  .object({
    account: accountSchema.nullable(),
    requiresOpenaiAuth: z.boolean(),
  })
  .strict();

export const modelListResponseSchema = z
  .object({
    data: z.array(z.object({ id: z.string() }).passthrough()),
    nextCursor: z.string().nullable(),
  })
  .strict();

export const rateLimitsResponseSchema = z
  .object({
    rateLimits: z
      .object({ rateLimitReachedType: z.string().nullable() })
      .passthrough(),
    rateLimitsByLimitId: z.record(z.string(), z.unknown()).nullable(),
    rateLimitResetCredits: z.unknown().nullable(),
  })
  .strict();

export const usageResponseSchema = z
  .object({
    summary: z.record(z.string(), z.unknown()),
    dailyUsageBuckets: z.array(z.unknown()).nullable(),
  })
  .strict();

export const threadStartResponseSchema = z
  .object({
    thread: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();

export const turnStartResponseSchema = z
  .object({
    turn: z.object({ id: z.string() }).passthrough(),
  })
  .strict();

export const turnStartedNotificationSchema = z
  .object({
    threadId: z.string(),
    turn: z.object({ id: z.string() }).passthrough(),
  })
  .strict();
