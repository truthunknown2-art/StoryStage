/**
 * F5-WP1 Audio workspace — deterministic session-local planning fixtures for
 * the Narration, Dialogue, SFX, and Music track hierarchy.
 *
 * Everything in this module is a labelled local demo planning card: no
 * recording, import, file, decoded media, playback, waveform, lip sync,
 * mixing, persistence, provider, worker, backend, Godot, Remotion, render, or
 * export exists for any item, and nothing here can create one. The cards are
 * grounded in the accepted Ollo demo hierarchy (`demo-project.ts`) so the
 * scene/beat scope is exactly the scope the Studio shell already selects.
 *
 * Timing truth: every card carries only provisional guide timing derived from
 * the demo beat plan. Final timing does not exist in this package and is
 * always labelled unavailable; guide timing can never be read as final.
 */

import { OLLO_DEMO_SCENES, type DemoScene } from "./demo-project";

/** The one mandatory honesty label on every audio planning card. */
export const AUDIO_FIXTURE_LABEL = "Local demo planning card — no audio exists";

/** Workspace-level truth note, always visible without hover. */
export const AUDIO_TRUTH_NOTE =
  "Every take and cue here is a local demo planning card grounded in the bounded Ollo demo plan — no audio exists for any card, and nothing here records, imports, decodes, plays, mixes, or saves media.";

/** Status vocabulary per track kind. These words are planning states only;
 * they never claim that media exists. */
export const AUDIO_CARD_STATUS = {
  take: "Planned take — nothing recorded",
  cue: "Planned cue — no audio placed",
} as const;

/** Exact timing truth language. Guide timing is provisional planning
 * information; final timing is unavailable until later accepted audio work. */
export const GUIDE_TIMING_LABEL =
  "Guide timing — provisional planning only, not final timing";
export const FINAL_TIMING_LABEL =
  "Final timing — unavailable until later accepted audio work";

/* ------------------------------------------------------------------ */
/* Track hierarchy                                                     */
/* ------------------------------------------------------------------ */

export const AUDIO_TRACKS = [
  { id: "narration", label: "Narration", kind: "voice", cardNoun: "take" },
  { id: "dialogue", label: "Dialogue", kind: "voice", cardNoun: "take" },
  { id: "sfx", label: "SFX", kind: "cue", cardNoun: "cue" },
  { id: "music", label: "Music", kind: "cue", cardNoun: "cue" },
] as const;

export type AudioTrackId = (typeof AUDIO_TRACKS)[number]["id"];
export type AudioTrackKind = (typeof AUDIO_TRACKS)[number]["kind"];

export const audioTrack = (id: AudioTrackId) =>
  AUDIO_TRACKS.find((track) => track.id === id)!;

export const audioTrackLabel = (id: AudioTrackId): string =>
  audioTrack(id).label;

/** Human description of the track kind, used by the inspector. */
export const AUDIO_TRACK_KIND_LABEL: Record<AudioTrackKind, string> = {
  voice: "Voice track — planning takes only",
  cue: "Cue track — planning cues only",
};

/* ------------------------------------------------------------------ */
/* Planning card fixtures                                              */
/* ------------------------------------------------------------------ */

export interface AudioCardFixture {
  id: string;
  trackId: AudioTrackId;
  sceneId: string;
  /** Zero-based beat index inside the scene, matching the Studio shell. */
  beatIndex: number;
  name: string;
  /** What this planning card intends, in plain language. */
  intent: string;
  /** Provisional guide placement inside the beat, in seconds from beat
   * start, derived from the demo beat plan. Never final timing. */
  guideStartSeconds: number;
  guideDurationSeconds: number;
}

const take = (
  id: string,
  trackId: AudioTrackId,
  sceneId: string,
  beatIndex: number,
  name: string,
  intent: string,
  guideStartSeconds: number,
  guideDurationSeconds: number,
): AudioCardFixture => ({
  id,
  trackId,
  sceneId,
  beatIndex,
  name,
  intent,
  guideStartSeconds,
  guideDurationSeconds,
});

export const AUDIO_FIXTURES: readonly AudioCardFixture[] = [
  take(
    "nar-scene1-b1-take-a",
    "narration",
    "scene-1",
    0,
    "Take A · Morning welcome narration",
    "The narrator welcomes the morning light over the Home Nook.",
    0,
    12,
  ),
  take(
    "nar-scene1-b1-take-b",
    "narration",
    "scene-1",
    0,
    "Take B · Morning welcome, slower read",
    "A slower planning read of the same welcome for comparison.",
    0,
    15,
  ),
  take(
    "nar-scene1-b2-take-a",
    "narration",
    "scene-1",
    1,
    "Take A · Shelf of stories narration",
    "The narrator introduces the shelf of unfinished stories.",
    0,
    14,
  ),
  take(
    "nar-scene2-b1-take-a",
    "narration",
    "scene-2",
    0,
    "Take A · Forest path opening narration",
    "The narrator sets Ollo bouncing ahead on the forest path.",
    0,
    11,
  ),
  take(
    "nar-scene5-b2-take-a",
    "narration",
    "scene-5",
    1,
    "Take A · The small voice answered",
    "The narrator answers the small voice on Lantern Bridge.",
    0,
    10,
  ),
  take(
    "dia-scene2-b1-take-a",
    "dialogue",
    "scene-2",
    0,
    "Take A · Ollo calls back to Tix",
    "Ollo calls back to Tix from ahead on the path.",
    2,
    6,
  ),
  take(
    "dia-scene5-b2-take-a",
    "dialogue",
    "scene-5",
    1,
    "Take A · A small voice says hello",
    "The small voice greets Ollo from beside the lanterns.",
    1,
    5,
  ),
  take(
    "dia-scene5-b2-take-b",
    "dialogue",
    "scene-5",
    1,
    "Take B · A small voice, softer",
    "A softer planning read of the same greeting.",
    1,
    5,
  ),
  take(
    "sfx-scene1-b1-cue-a",
    "sfx",
    "scene-1",
    0,
    "Soft window-light chime",
    "A gentle chime as the morning light reaches the round window.",
    4,
    3,
  ),
  take(
    "sfx-scene1-b2-cue-a",
    "sfx",
    "scene-1",
    1,
    "Page flutter past the shelf",
    "A page flutters as the camera passes the unfinished stories.",
    9,
    2,
  ),
  take(
    "sfx-scene2-b1-cue-a",
    "sfx",
    "scene-2",
    0,
    "Two light footsteps",
    "Two light footsteps ahead of Tix on the forest path.",
    2,
    4,
  ),
  take(
    "sfx-scene2-b1-cue-b",
    "sfx",
    "scene-2",
    0,
    "Soft leaf rustle",
    "A soft rustle in the ferns as the golden glow appears.",
    7,
    5,
  ),
  take(
    "sfx-scene4-b2-cue-a",
    "sfx",
    "scene-4",
    1,
    "Low root hum",
    "A low hum under the roots beside the stepping stones.",
    0,
    8,
  ),
  take(
    "mus-scene1-b1-cue-a",
    "music",
    "scene-1",
    0,
    "Morning theme — guide placement",
    "The morning theme rests under the Home Nook opening.",
    0,
    30,
  ),
  take(
    "mus-scene5-b1-cue-a",
    "music",
    "scene-5",
    0,
    "Lantern bridge motif — guide placement",
    "The lantern motif wakes with the bridge lanterns.",
    0,
    24,
  ),
  take(
    "mus-scene8-b2-cue-a",
    "music",
    "scene-8",
    1,
    "Homecoming reprise — guide placement",
    "A quiet reprise once the lantern rests by the den door.",
    0,
    28,
  ),
];

/* ------------------------------------------------------------------ */
/* Scope matching and deterministic selection                          */
/* ------------------------------------------------------------------ */

/** The visible planning cards for one track and one exact scene/beat scope,
 * in fixture order. A card is visible only when its track, scene, and beat
 * all match — cards can never leak across tracks or scopes. */
export const audioCardsForScope = (
  trackId: AudioTrackId,
  sceneId: string,
  beatIndex: number,
  fixtures: readonly AudioCardFixture[] = AUDIO_FIXTURES,
): readonly AudioCardFixture[] =>
  fixtures.filter(
    (card) =>
      card.trackId === trackId &&
      card.sceneId === sceneId &&
      card.beatIndex === beatIndex,
  );

/** One deterministic selection rule: keep the selected card while it is
 * visible in the current track and scope; otherwise fall to the first
 * visible card, or to none. A track, scene, or beat change can therefore
 * never retain hidden stale detail. */
export const resolveAudioCardSelection = (
  visible: readonly AudioCardFixture[],
  selectedId: string | null,
): string | null => {
  if (selectedId && visible.some((card) => card.id === selectedId))
    return selectedId;
  return visible[0]?.id ?? null;
};

/* ------------------------------------------------------------------ */
/* Labels and count summary                                            */
/* ------------------------------------------------------------------ */

const sceneIndexOf = (sceneId: string) =>
  OLLO_DEMO_SCENES.findIndex((scene) => scene.id === sceneId);

/** Display scope for the shared selected scene/beat, e.g.
 * `Scene 1 · The Home Nook · Beat 1 · Morning light through the round window`. */
export const audioScopeLabel = (
  scene: DemoScene,
  beatIndex: number,
): string => {
  const beat = scene.beats[beatIndex];
  return `Scene ${sceneIndexOf(scene.id) + 1} · ${scene.title} · Beat ${beatIndex + 1} · ${beat?.title ?? "Unknown beat"}`;
};

/** Display scope for one fixture card, resolved through the demo hierarchy. */
export const audioCardScopeLabel = (card: AudioCardFixture): string => {
  const scene = OLLO_DEMO_SCENES[sceneIndexOf(card.sceneId)];
  if (!scene) return `Unknown scene · Beat ${card.beatIndex + 1}`;
  return audioScopeLabel(scene, card.beatIndex);
};

/** Guide placement text for one card. Always paired with
 * `GUIDE_TIMING_LABEL` wherever it appears so it can never be mistaken for
 * final timing. */
export const audioGuideTimingNote = (card: AudioCardFixture): string =>
  `Guide plan places this ${audioTrack(card.trackId).cardNoun} ${card.guideStartSeconds}s into the beat for about ${card.guideDurationSeconds}s`;

/** Count/state summary that keeps the heading, cards, and inspector in
 * agreement for one track and scope. */
export const audioCountSummary = (
  trackId: AudioTrackId,
  cardCount: number,
): string => {
  const { cardNoun } = audioTrack(trackId);
  if (cardCount === 0)
    return `No planned ${cardNoun}s in this scene/beat scope`;
  return `${cardCount} planned ${cardNoun}${cardCount === 1 ? "" : "s"} in this scene/beat scope`;
};

/* ------------------------------------------------------------------ */
/* Empty states and unavailable orientation actions                    */
/* ------------------------------------------------------------------ */

/** Per-track empty-state copy. Each explains what later accepted work will
 * enable without offering a fake success action. */
export const AUDIO_EMPTY_STATE: Record<AudioTrackId, string> = {
  narration:
    "Later accepted work (F5-WP2) adds narration recording and take-management states. Nothing can be recorded, imported, or played in this package.",
  dialogue:
    "Later accepted work adds dialogue recording states. Nothing can be recorded, imported, or played in this package.",
  sfx: "Later accepted work (F5-WP3) adds SFX placement states. No audio exists to place or play in this package.",
  music:
    "Later accepted work (F5-WP3) adds music placement states. No audio exists to place or play in this package.",
};

export interface AudioOrientationAction {
  action: string;
  unavailableReason: string;
}

const IMPORT_ACTION: AudioOrientationAction = {
  action: "Import audio",
  unavailableReason:
    "Unavailable — file access and import do not exist in this demo.",
};

const PLAYBACK_REASON =
  "Unavailable — no audio exists to play; playback, waveforms, and mixing are outside this package.";

/** The small set of visibly disabled orientation actions per track kind.
 * They exist only so the creator can see what later packages will enable;
 * each carries its specific reason and can never succeed. */
export const audioOrientationActions = (
  trackId: AudioTrackId,
): readonly AudioOrientationAction[] =>
  audioTrack(trackId).kind === "voice"
    ? [
        {
          action: "Record take",
          unavailableReason:
            "Unavailable — microphone and device access do not exist in this demo. Later accepted work (F5-WP2) adds recording states.",
        },
        {
          action: `Audition ${audioTrack(trackId).cardNoun}`,
          unavailableReason: PLAYBACK_REASON,
        },
        IMPORT_ACTION,
      ]
    : [
        IMPORT_ACTION,
        {
          action: `Play ${audioTrack(trackId).cardNoun}`,
          unavailableReason: PLAYBACK_REASON,
        },
      ];
