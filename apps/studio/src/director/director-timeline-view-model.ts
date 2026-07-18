import type { DirectorProject } from "@storystage/story-engine/director-alpha";

export type DirectorTimelineShot = {
  id: string;
  label: string;
  startFrame: number;
  endFrameExclusive: number;
  size: string;
};

export type DirectorTimelineEvent = {
  id: string;
  label: string;
  frame: number;
  kind: string;
};

export type DirectorTimelineCamera = {
  id: string;
  label: string;
  shotId: string;
  startFrame: number;
  endFrameExclusive: number;
  keyframes: number[];
};

export type DirectorTimelineViewModel = {
  startFrame: number;
  endFrameExclusive: number;
  shots: DirectorTimelineShot[];
  events: DirectorTimelineEvent[];
  cameras: DirectorTimelineCamera[];
};

const humanize = (value: string) => value.replaceAll("-", " ");

export function createDirectorTimelineViewModel(
  director: DirectorProject,
  beatId: string,
): DirectorTimelineViewModel | null {
  const plannedShots = director.directorPlan.shots.filter((shot) =>
    shot.beatIds.includes(beatId),
  );
  const shotIds = new Set(plannedShots.map((shot) => shot.id));
  const resolvedByShot = new Map(
    director.timingSolution.resolvedShots.map((shot) => [shot.shotId, shot]),
  );
  const resolvedShots = plannedShots
    .map((shot) => ({ planned: shot, resolved: resolvedByShot.get(shot.id) }))
    .filter(
      (
        candidate,
      ): candidate is {
        planned: (typeof plannedShots)[number];
        resolved: NonNullable<typeof candidate.resolved>;
      } => Boolean(candidate.resolved),
    );
  if (!resolvedShots.length) return null;
  const startFrame = Math.min(
    ...resolvedShots.map(({ resolved }) => resolved.startFrame),
  );
  const endFrameExclusive = Math.max(
    ...resolvedShots.map(({ resolved }) => resolved.endFrameExclusive),
  );
  const eventFrames = new Map(
    director.timingSolution.resolvedEvents.map((event) => [
      event.eventId,
      event.frame,
    ]),
  );
  const cameraByShot = new Map(
    (director.executableEpisodePlan.proxyCameraPrograms ?? []).map(
      (program) => [program.shotId, program],
    ),
  );

  return {
    startFrame,
    endFrameExclusive,
    shots: resolvedShots.map(({ planned, resolved }) => ({
      id: planned.id,
      label: humanize(planned.storyFunction),
      startFrame: resolved.startFrame,
      endFrameExclusive: resolved.endFrameExclusive,
      size: humanize(planned.camera.size),
    })),
    events: director.directorPlan.events
      .filter((event) => event.beatId === beatId)
      .map((event) => ({
        id: event.id,
        label: humanize(event.kind),
        frame: eventFrames.get(event.id)!,
        kind: event.kind,
      }))
      .sort((a, b) => a.frame - b.frame),
    cameras: resolvedShots.flatMap(({ planned, resolved }) => {
      const program = cameraByShot.get(planned.id);
      if (!program || !shotIds.has(program.shotId)) return [];
      return [
        {
          id: program.id,
          label: `${humanize(program.size)} · ${humanize(program.movement)}`,
          shotId: planned.id,
          startFrame: resolved.startFrame,
          endFrameExclusive: resolved.endFrameExclusive,
          keyframes: program.keyframes.map(
            (keyframe) => resolved.startFrame + keyframe.frame,
          ),
        },
      ];
    }),
  };
}
