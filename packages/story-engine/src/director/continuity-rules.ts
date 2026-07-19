import { hashCanonical } from "../canonical-hash";
import type { ContinuitySequencePlanDraft } from "./continuity-sequence-plan";
import type { z } from "zod";

const locomotionModes = new Set(["walking", "sneaking", "running"]);

const circularDistance = (left: number, right: number) => {
  const direct = Math.abs(left - right);
  return Math.min(direct, 1 - direct);
};

const pictureEventId = (
  event: ContinuitySequencePlanDraft["shots"][number]["pictureEvents"][number],
) => (event.source === "director-event" ? event.eventId : event.id);

const visible = (lifecycle: string) =>
  lifecycle === "onstage" ||
  lifecycle === "entering" ||
  lifecycle === "exiting";

const projectedX = (
  shot: ContinuitySequencePlanDraft["shots"][number],
  worldX: number,
) =>
  shot.camera.screenProjection.worldXOffset +
  shot.camera.screenProjection.worldXDirection * worldX;

const propOwner = (
  prop: ContinuitySequencePlanDraft["shots"][number]["entryWorldState"]["props"][string],
) =>
  prop.kind === "attached" || prop.kind === "offered" ? prop.ownerId : null;

export function validateContinuityRules(
  plan: ContinuitySequencePlanDraft,
  context: z.RefinementCtx,
) {
  const issue = (path: (string | number)[], message: string) =>
    context.addIssue({ code: "custom", path, message });
  const shotIds = new Set<string>();
  let expectedStart = 0;

  plan.shots.forEach((shot, shotIndex) => {
    if (shotIds.has(shot.shotId))
      issue(
        ["shots", shotIndex, "shotId"],
        `Duplicate continuity shot ${shot.shotId}.`,
      );
    shotIds.add(shot.shotId);
    if (shot.startFrame !== expectedStart)
      issue(
        ["shots", shotIndex, "startFrame"],
        `${shot.shotId} must start at frame ${expectedStart}.`,
      );
    expectedStart = shot.endFrameExclusive;
    if (shot.entryWorldState.frame !== shot.startFrame)
      issue(
        ["shots", shotIndex, "entryWorldState", "frame"],
        `${shot.shotId} entry world state must use its first frame.`,
      );
    if (shot.exitWorldState.frame !== shot.endFrameExclusive - 1)
      issue(
        ["shots", shotIndex, "exitWorldState", "frame"],
        `${shot.shotId} exit world state must use its final visible frame.`,
      );

    const entryPerformanceIds = shot.entryPerformanceState.map(
      (state) => state.entityId,
    );
    const exitPerformanceIds = shot.exitPerformanceState.map(
      (state) => state.entityId,
    );
    if (new Set(entryPerformanceIds).size !== entryPerformanceIds.length)
      issue(
        ["shots", shotIndex, "entryPerformanceState"],
        `${shot.shotId} has duplicate entry performance entities.`,
      );
    if (new Set(exitPerformanceIds).size !== exitPerformanceIds.length)
      issue(
        ["shots", shotIndex, "exitPerformanceState"],
        `${shot.shotId} has duplicate exit performance entities.`,
      );
    if (
      hashCanonical([...entryPerformanceIds].sort()) !==
      hashCanonical([...exitPerformanceIds].sort())
    )
      issue(
        ["shots", shotIndex, "exitPerformanceState"],
        `${shot.shotId} performance entity sets must match.`,
      );
    const worldEntityIds = Object.keys(shot.entryWorldState.entities).sort();
    if (
      hashCanonical([...entryPerformanceIds].sort()) !==
      hashCanonical(worldEntityIds)
    )
      issue(
        ["shots", shotIndex, "entryPerformanceState"],
        `${shot.shotId} performance state must cover every world entity exactly once.`,
      );

    const eventIds = shot.pictureEvents.map(pictureEventId);
    if (new Set(eventIds).size !== eventIds.length)
      issue(
        ["shots", shotIndex, "pictureEvents"],
        `${shot.shotId} contains duplicate picture event IDs.`,
      );
    shot.pictureEvents.forEach((event, eventIndex) => {
      if (
        event.frame < shot.startFrame ||
        event.frame >= shot.endFrameExclusive
      )
        issue(
          ["shots", shotIndex, "pictureEvents", eventIndex, "frame"],
          `${pictureEventId(event)} falls outside ${shot.shotId}.`,
        );
    });
    if (
      !shot.pictureEvents.some(
        (event) =>
          event.source === "director-event" &&
          event.eventId === shot.cutEventId,
      )
    )
      issue(
        ["shots", shotIndex, "cutEventId"],
        `${shot.shotId} must cut on a bound Director picture event.`,
      );

    const entryPerformance = new Map(
      shot.entryPerformanceState.map((state) => [state.entityId, state]),
    );
    shot.exitPerformanceState.forEach((outgoing, performanceIndex) => {
      const incoming = entryPerformance.get(outgoing.entityId);
      if (!incoming) return;
      if (
        locomotionModes.has(incoming.motionMode) &&
        !locomotionModes.has(outgoing.motionMode)
      ) {
        const subjectEvents = shot.pictureEvents.filter((event) =>
          event.subjectIds.includes(outgoing.entityId),
        );
        const hasDeceleration = subjectEvents.some(
          (event) =>
            event.source === "performance-event" &&
            event.kind === "deceleration",
        );
        const hasPlant = subjectEvents.some(
          (event) =>
            event.source === "performance-event" &&
            (event.kind === "foot-contact" || event.kind === "plant"),
        );
        if (!hasDeceleration || !hasPlant)
          issue(
            ["shots", shotIndex, "exitPerformanceState", performanceIndex],
            `${outgoing.entityId} stops locomoting in ${shot.shotId} without named deceleration and plant events.`,
          );
      }
    });

    const propIds = new Set([
      ...Object.keys(shot.entryWorldState.props),
      ...Object.keys(shot.exitWorldState.props),
    ]);
    propIds.forEach((propId) => {
      const before = shot.entryWorldState.props[propId];
      const after = shot.exitWorldState.props[propId];
      if (!before || !after || propOwner(before) === propOwner(after)) return;
      const hasOwnershipEvent = shot.pictureEvents.some((event) => {
        if (event.source === "performance-event")
          return ["prop-contact", "prop-release"].includes(event.kind);
        return event.eventId === shot.cutEventId;
      });
      if (!hasOwnershipEvent)
        issue(
          ["shots", shotIndex, "exitWorldState", "props", propId],
          `${propId} changes owner in ${shot.shotId} without a visible contact or release event.`,
        );
    });
  });

  if (expectedStart !== plan.durationInFrames)
    issue(
      ["durationInFrames"],
      "Continuity shots must cover the production without gaps or overlaps.",
    );
  if (plan.transitions.length !== Math.max(0, plan.shots.length - 1))
    issue(
      ["transitions"],
      "Continuity must contain exactly one transition link for each shot boundary.",
    );

  for (let index = 1; index < plan.shots.length; index += 1) {
    const previous = plan.shots[index - 1]!;
    const current = plan.shots[index]!;
    const transition = plan.transitions[index - 1];
    if (!transition) continue;
    if (
      transition.fromShotId !== previous.shotId ||
      transition.toShotId !== current.shotId ||
      transition.cutEventId !== previous.cutEventId
    )
      issue(
        ["transitions", index - 1],
        `${previous.shotId}/${current.shotId} transition lineage is invalid.`,
      );
    const changedStage = previous.stageId !== current.stageId;
    const changedAxis = previous.camera.axisId !== current.camera.axisId;
    if ((changedStage || changedAxis) && transition.bridgeKind === "none")
      issue(
        ["transitions", index - 1, "bridgeKind"],
        `${current.shotId} changes stage or camera axis without an explicit continuity bridge.`,
      );
    if (
      [
        "axis-reset-event",
        "portal-cross-event",
        "foreground-occlusion",
        "location-transition-event",
      ].includes(transition.bridgeKind) &&
      !transition.bridgeEventId
    )
      issue(
        ["transitions", index - 1, "bridgeEventId"],
        `${transition.bridgeKind} requires a canonical bridge event.`,
      );
    if (
      ["none", "neutral-establishing-shot"].includes(transition.bridgeKind) &&
      transition.bridgeEventId
    )
      issue(
        ["transitions", index - 1, "bridgeEventId"],
        `${transition.bridgeKind} may not claim an unrelated bridge event.`,
      );

    const previousEntities = previous.exitWorldState.entities;
    const currentEntities = current.entryWorldState.entities;
    const previousEntityIds = Object.keys(previousEntities);
    const currentEntityIds = Object.keys(currentEntities);
    const entitySetChanges = [
      ...currentEntityIds.filter(
        (entityId) => previousEntities[entityId] === undefined,
      ),
      ...previousEntityIds.filter(
        (entityId) => currentEntities[entityId] === undefined,
      ),
    ];
    const boundaryFrames = new Set([
      previous.endFrameExclusive - 1,
      current.startFrame,
    ]);
    entitySetChanges.forEach((entityId) => {
      const hasLifecycleEventBinding = [previous, current].some((shot) =>
        shot.pictureEvents.some(
          (event) =>
            event.source === "director-event" &&
            event.subjectIds.includes(entityId) &&
            boundaryFrames.has(event.frame),
        ),
      );
      if (!hasLifecycleEventBinding)
        issue(
          ["shots", index, "entryWorldState", "entities"],
          `${entityId} changes membership at ${current.shotId} without an exact boundary lifecycle event.`,
        );
    });
    const allowSpatialReset = [
      "portal-cross-event",
      "location-transition-event",
      "neutral-establishing-shot",
    ].includes(transition.bridgeKind);
    for (const [entityId, outgoing] of Object.entries(previousEntities)) {
      const incoming = currentEntities[entityId];
      if (!incoming) continue;
      if (!allowSpatialReset) {
        if (hashCanonical(outgoing) !== hashCanonical(incoming))
          issue(
            ["shots", index, "entryWorldState", "entities", entityId],
            `${entityId} changes canonical world state across ${current.shotId}.`,
          );
      }
      if (
        visible(outgoing.lifecycle) !== visible(incoming.lifecycle) &&
        transition.bridgeKind === "none"
      )
        issue(
          ["shots", index, "entryWorldState", "entities", entityId],
          `${entityId} changes visibility at ${current.shotId} without a visible bridge.`,
        );
    }

    const previousProps = previous.exitWorldState.props;
    const currentProps = current.entryWorldState.props;
    for (const propId of new Set([
      ...Object.keys(previousProps),
      ...Object.keys(currentProps),
    ])) {
      const before = previousProps[propId];
      const after = currentProps[propId];
      if (!before || !after || propOwner(before) !== propOwner(after))
        issue(
          ["shots", index, "entryWorldState", "props", propId],
          `${propId} changes ownership across ${current.shotId}; ownership events must remain on screen.`,
        );
    }

    const previousPerformance = new Map(
      previous.exitPerformanceState.map((state) => [state.entityId, state]),
    );
    current.entryPerformanceState.forEach((incoming, performanceIndex) => {
      const outgoing = previousPerformance.get(incoming.entityId);
      if (!outgoing) return;
      if (
        outgoing.motionMode !== incoming.motionMode ||
        outgoing.actionPhase !== incoming.actionPhase
      )
        issue(
          ["shots", index, "entryPerformanceState", performanceIndex],
          `${incoming.entityId} does not inherit motion/action state at ${current.shotId}.`,
        );
      if (
        locomotionModes.has(outgoing.motionMode) &&
        outgoing.gaitPhase !== null &&
        incoming.gaitPhase !== null &&
        circularDistance(outgoing.gaitPhase, incoming.gaitPhase) > 0.13
      )
        issue(
          [
            "shots",
            index,
            "entryPerformanceState",
            performanceIndex,
            "gaitPhase",
          ],
          `${incoming.entityId} breaks gait contact at ${current.shotId}.`,
        );
    });

    if (!allowSpatialReset) {
      const sharedVisible = Object.keys(previousEntities).filter(
        (entityId) =>
          currentEntities[entityId] &&
          visible(previousEntities[entityId]!.lifecycle) &&
          visible(currentEntities[entityId]!.lifecycle),
      );
      for (let left = 0; left < sharedVisible.length; left += 1)
        for (let right = left + 1; right < sharedVisible.length; right += 1) {
          const leftId = sharedVisible[left]!;
          const rightId = sharedVisible[right]!;
          const oldOrder =
            projectedX(previous, previousEntities[leftId]!.transform.x) <
            projectedX(previous, previousEntities[rightId]!.transform.x);
          const newOrder =
            projectedX(current, currentEntities[leftId]!.transform.x) <
            projectedX(current, currentEntities[rightId]!.transform.x);
          if (oldOrder !== newOrder)
            issue(
              ["shots", index, "entryWorldState"],
              `${leftId}/${rightId} reverse camera-relative screen order at ${current.shotId}.`,
            );
        }
    }
  }
}
