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
    account: accountSchema.nullable().optional(),
    requiresOpenaiAuth: z.boolean(),
  })
  .strict();

export const accountLoginStartResponseSchema = z
  .object({
    type: z.literal("chatgpt"),
    loginId: z.string().min(1).max(256),
    authUrl: z.string().min(1).max(2048),
  })
  .strict();

export const accountLoginCompletedNotificationSchema = z
  .object({
    success: z.boolean(),
    loginId: z.string().min(1).max(256).nullable().optional(),
    error: z.string().nullable().optional(),
  })
  .strict();

export const accountLoginCancelResponseSchema = z
  .object({ status: z.enum(["canceled", "notFound"]) })
  .strict();

export const modelListResponseSchema = z
  .object({
    data: z.array(z.object({ id: z.string() }).passthrough()),
    nextCursor: z.string().nullable().optional(),
  })
  .strict();

export const rateLimitsResponseSchema = z
  .object({
    rateLimits: z
      .object({ rateLimitReachedType: z.string().nullable().optional() })
      .passthrough(),
    rateLimitsByLimitId: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
    rateLimitResetCredits: z.unknown().nullable().optional(),
  })
  .strict();

export const usageResponseSchema = z
  .object({
    summary: z.record(z.string(), z.unknown()),
    dailyUsageBuckets: z.array(z.unknown()).nullable().optional(),
  })
  .strict();

export const threadStartResponseSchema = z
  .object({
    thread: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();

const turnSchema = z
  .object({
    id: z.string(),
    items: z.array(z.unknown()),
    status: z.enum(["completed", "interrupted", "failed", "inProgress"]),
  })
  .passthrough();

export const turnStartResponseSchema = z
  .object({
    turn: turnSchema,
  })
  .strict();

export const turnStartedNotificationSchema = z
  .object({
    threadId: z.string(),
    turn: turnSchema,
  })
  .strict();

export const turnCompletedNotificationSchema = z
  .object({
    threadId: z.string(),
    turn: turnSchema,
  })
  .strict();

export const mcpServerStatusListResponseSchema = z
  .object({
    data: z.array(
      z
        .object({
          name: z.string(),
          authStatus: z.enum([
            "unsupported",
            "notLoggedIn",
            "bearerToken",
            "oAuth",
          ]),
          serverInfo: z
            .object({ name: z.string(), version: z.string() })
            .passthrough()
            .nullable()
            .optional(),
          tools: z.record(
            z.string(),
            z
              .object({
                name: z.string(),
                inputSchema: z.unknown(),
                outputSchema: z.unknown().optional(),
              })
              .passthrough(),
          ),
          resources: z.array(z.object({ uri: z.string() }).passthrough()),
          resourceTemplates: z.array(z.unknown()),
        })
        .passthrough(),
    ),
    nextCursor: z.null(),
  })
  .strict();

export const appServerItemEnvelopeSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough();

export const appServerItemLifecycleNotificationSchema = z
  .object({
    threadId: z.string(),
    turnId: z.string(),
    item: appServerItemEnvelopeSchema,
  })
  .passthrough();

export const appServerAgentDeltaNotificationSchema = z
  .object({
    threadId: z.string(),
    turnId: z.string(),
    itemId: z.string(),
    delta: z.string(),
  })
  .strict();

export const appServerMcpProgressNotificationSchema = z
  .object({
    threadId: z.string(),
    turnId: z.string(),
    itemId: z.string(),
    message: z.string(),
  })
  .strict();

export const appServerMcpToolCallItemSchema = z
  .object({
    id: z.string(),
    type: z.literal("mcpToolCall"),
    server: z.string(),
    tool: z.string(),
    arguments: z.unknown(),
    status: z.enum(["inProgress", "completed", "failed"]),
    result: z
      .object({
        content: z.array(z.unknown()),
        structuredContent: z.unknown().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    error: z.unknown().nullable().optional(),
  })
  .passthrough();

export const appServerErrorNotificationSchema = z
  .object({
    threadId: z.string(),
    turnId: z.string(),
    error: z.object({ message: z.string() }).passthrough(),
    willRetry: z.boolean(),
  })
  .strict();
