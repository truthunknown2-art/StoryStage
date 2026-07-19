import { z } from "zod";
import { identifierSchema } from "../model";

const eventDefinitionSchema = z
  .object({
    id: identifierSchema,
    fixedFrame: z.number().int().nonnegative().optional(),
  })
  .strict();

const eventConstraintSchema = z
  .object({
    fromEventId: identifierSchema,
    toEventId: identifierSchema,
    minimumDelayFrames: z.number().int().nonnegative(),
    preferredDelayFrames: z.number().int().nonnegative(),
    maximumDelayFrames: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (constraint) =>
      constraint.minimumDelayFrames <= constraint.preferredDelayFrames &&
      constraint.preferredDelayFrames <= constraint.maximumDelayFrames,
    { message: "Event delay must satisfy minimum <= preferred <= maximum." },
  );

export const eventConstraintProblemSchema = z
  .object({
    startFrame: z.number().int().nonnegative(),
    events: z.array(eventDefinitionSchema).min(1),
    constraints: z.array(eventConstraintSchema),
  })
  .strict();

export type EventConstraintProblem = z.infer<
  typeof eventConstraintProblemSchema
>;

export type EventTimingSolution = {
  resolvedEvents: Array<{ eventId: string; frame: number }>;
};

export function solveEventConstraints(
  rawProblem: EventConstraintProblem,
): EventTimingSolution {
  const problem = eventConstraintProblemSchema.parse(rawProblem);
  const eventById = new Map(problem.events.map((event) => [event.id, event]));
  if (eventById.size !== problem.events.length)
    throw new Error("Event constraint problem contains duplicate event IDs.");
  const incoming = new Map<string, typeof problem.constraints>();
  const outgoing = new Map<string, typeof problem.constraints>();
  const indegree = new Map(problem.events.map((event) => [event.id, 0]));
  problem.constraints.forEach((constraint) => {
    if (
      !eventById.has(constraint.fromEventId) ||
      !eventById.has(constraint.toEventId)
    )
      throw new Error("Event constraint references an unknown event.");
    incoming.set(constraint.toEventId, [
      ...(incoming.get(constraint.toEventId) ?? []),
      constraint,
    ]);
    outgoing.set(constraint.fromEventId, [
      ...(outgoing.get(constraint.fromEventId) ?? []),
      constraint,
    ]);
    indegree.set(constraint.toEventId, indegree.get(constraint.toEventId)! + 1);
  });
  const queue = problem.events
    .filter((event) => indegree.get(event.id) === 0)
    .map((event) => event.id)
    .sort();
  const order: string[] = [];
  while (queue.length) {
    const eventId = queue.shift()!;
    order.push(eventId);
    for (const edge of outgoing.get(eventId) ?? []) {
      const next = edge.toEventId;
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
    queue.sort();
  }
  if (order.length !== problem.events.length)
    throw new Error("Event constraint graph contains a cycle.");

  const frames = new Map<string, number>();
  order.forEach((eventId) => {
    const event = eventById.get(eventId)!;
    const dependencies = incoming.get(eventId) ?? [];
    const preferred = Math.max(
      problem.startFrame,
      ...dependencies.map(
        (constraint) =>
          frames.get(constraint.fromEventId)! + constraint.preferredDelayFrames,
      ),
    );
    const earliest = Math.max(
      problem.startFrame,
      ...dependencies.map(
        (constraint) =>
          frames.get(constraint.fromEventId)! + constraint.minimumDelayFrames,
      ),
    );
    const frame = event.fixedFrame ?? Math.max(preferred, earliest);
    dependencies.forEach((constraint) => {
      const fromFrame = frames.get(constraint.fromEventId)!;
      const delay = frame - fromFrame;
      if (
        delay < constraint.minimumDelayFrames ||
        delay > constraint.maximumDelayFrames
      )
        throw new Error(
          `${eventId} cannot satisfy its timing envelope from ${constraint.fromEventId}.`,
        );
    });
    frames.set(eventId, frame);
  });
  return {
    resolvedEvents: problem.events.map((event) => ({
      eventId: event.id,
      frame: frames.get(event.id)!,
    })),
  };
}
