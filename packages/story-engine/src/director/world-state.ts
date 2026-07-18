import { z } from "zod";
import { identifierSchema } from "../model";

export const entityLifecycleSchema = z.enum([
  "offstage",
  "entering",
  "onstage",
  "occluded",
  "exiting",
]);

const transformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    scale: z.number().positive(),
    rotation: z.number(),
  })
  .strict();

const entityWorldStateSchema = z
  .object({
    entityId: identifierSchema,
    lifecycle: entityLifecycleSchema,
    transform: transformSchema,
    facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
    gazeTargetId: identifierSchema.nullable(),
    velocity: z
      .object({ x: z.number(), y: z.number(), z: z.number() })
      .strict(),
  })
  .strict();

export const propWorldStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("offstage") }).strict(),
  z.object({ kind: z.literal("free"), transform: transformSchema }).strict(),
  z
    .object({
      kind: z.literal("in-flight"),
      transform: transformSchema,
      velocity: z
        .object({ x: z.number(), y: z.number(), z: z.number() })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("attached"),
      ownerId: identifierSchema,
      socketId: identifierSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("offered"),
      ownerId: identifierSchema,
      socketId: identifierSchema,
      offeredToId: identifierSchema,
    })
    .strict(),
]);

export const directorWorldStateSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    entities: z.record(identifierSchema, entityWorldStateSchema),
    props: z.record(identifierSchema, propWorldStateSchema),
  })
  .strict();

export type DirectorWorldState = z.infer<typeof directorWorldStateSchema>;

export const worldEventSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-enter"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-entry-complete"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-occlude"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-reveal"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-exit"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("entity-exit-complete"),
      entityId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("prop-launch"),
      propId: identifierSchema,
      transform: transformSchema,
      velocity: z
        .object({ x: z.number(), y: z.number(), z: z.number() })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("prop-attach"),
      propId: identifierSchema,
      ownerId: identifierSchema,
      socketId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("prop-offer"),
      propId: identifierSchema,
      ownerId: identifierSchema,
      socketId: identifierSchema,
      offeredToId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("prop-transfer"),
      propId: identifierSchema,
      fromOwnerId: identifierSchema,
      toOwnerId: identifierSchema,
      socketId: identifierSchema,
    })
    .strict(),
  z
    .object({
      id: identifierSchema,
      frame: z.number().int().nonnegative(),
      kind: z.literal("prop-release"),
      propId: identifierSchema,
      ownerId: identifierSchema,
      transform: transformSchema,
    })
    .strict(),
]);

export type WorldEvent = z.infer<typeof worldEventSchema>;

const requireEntity = (state: DirectorWorldState, entityId: string) => {
  const entity = state.entities[entityId];
  if (!entity) throw new Error(`Unknown world entity ${entityId}.`);
  return entity;
};

const requireProp = (state: DirectorWorldState, propId: string) => {
  const prop = state.props[propId];
  if (!prop) throw new Error(`Unknown world prop ${propId}.`);
  return prop;
};

export function applyWorldEvent(
  input: DirectorWorldState,
  rawEvent: WorldEvent,
): DirectorWorldState {
  const state = structuredClone(directorWorldStateSchema.parse(input));
  const event = worldEventSchema.parse(rawEvent);
  if (event.frame < state.frame)
    throw new Error(`World event ${event.id} moves backward in time.`);
  state.frame = event.frame;

  if (
    event.kind === "entity-enter" ||
    event.kind === "entity-entry-complete" ||
    event.kind === "entity-occlude" ||
    event.kind === "entity-reveal" ||
    event.kind === "entity-exit" ||
    event.kind === "entity-exit-complete"
  ) {
    const entity = requireEntity(state, event.entityId);
    const [from, to]: [typeof entity.lifecycle, typeof entity.lifecycle] =
      event.kind === "entity-enter"
        ? ["offstage", "entering"]
        : event.kind === "entity-entry-complete"
          ? ["entering", "onstage"]
          : event.kind === "entity-occlude"
            ? ["onstage", "occluded"]
            : event.kind === "entity-reveal"
              ? ["occluded", "onstage"]
              : event.kind === "entity-exit"
                ? ["onstage", "exiting"]
                : ["exiting", "offstage"];
    if (entity.lifecycle !== from)
      throw new Error(
        `${event.entityId} cannot apply ${event.kind} from ${entity.lifecycle}.`,
      );
    entity.lifecycle = to;
    return directorWorldStateSchema.parse(state);
  }

  const prop = requireProp(state, event.propId);
  if (event.kind === "prop-launch") {
    if (prop.kind !== "free")
      throw new Error(`${event.propId} must be free before launch.`);
    state.props[event.propId] = {
      kind: "in-flight",
      transform: event.transform,
      velocity: event.velocity,
    };
  }
  if (event.kind === "prop-attach") {
    if (!new Set(["free", "in-flight"]).has(prop.kind))
      throw new Error(`${event.propId} cannot attach from ${prop.kind}.`);
    requireEntity(state, event.ownerId);
    state.props[event.propId] = {
      kind: "attached",
      ownerId: event.ownerId,
      socketId: event.socketId,
    };
  }
  if (event.kind === "prop-offer") {
    if (prop.kind !== "attached" || prop.ownerId !== event.ownerId)
      throw new Error(`${event.propId} is not attached to ${event.ownerId}.`);
    requireEntity(state, event.offeredToId);
    state.props[event.propId] = {
      kind: "offered",
      ownerId: event.ownerId,
      socketId: event.socketId,
      offeredToId: event.offeredToId,
    };
  }
  if (event.kind === "prop-transfer") {
    if (
      prop.kind !== "offered" ||
      prop.ownerId !== event.fromOwnerId ||
      prop.offeredToId !== event.toOwnerId
    )
      throw new Error(`${event.propId} transfer has no matching offer.`);
    requireEntity(state, event.toOwnerId);
    state.props[event.propId] = {
      kind: "attached",
      ownerId: event.toOwnerId,
      socketId: event.socketId,
    };
  }
  if (event.kind === "prop-release") {
    if (prop.kind !== "attached" || prop.ownerId !== event.ownerId)
      throw new Error(`${event.propId} is not owned by ${event.ownerId}.`);
    state.props[event.propId] = { kind: "free", transform: event.transform };
  }
  return directorWorldStateSchema.parse(state);
}

export function reduceWorldEvents(
  initial: DirectorWorldState,
  events: WorldEvent[],
): DirectorWorldState {
  return [...events]
    .sort((left, right) => left.frame - right.frame)
    .reduce(applyWorldEvent, directorWorldStateSchema.parse(initial));
}
