/**
 * Deterministic local beat preview for the Create screen.
 *
 * Splits the entered script into natural beats for preview only: paragraphs
 * in source order, falling back to sentences when the script is a single
 * paragraph. This is not the production Director and introduces no shared
 * contract — it exists so creators can sanity-check their text before the
 * first cut.
 */

export interface BeatPreviewResult {
  /** All detected beats, in original order. */
  beats: string[];
  /** The beats shown in the preview (capped). */
  visible: string[];
  /** How many additional beats are hidden behind the "and N more" note. */
  hidden: number;
}

const MAX_VISIBLE_BEATS = 4;

const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

export function previewBeats(script: string): BeatPreviewResult {
  const paragraphs = script
    .split(/\n\s*\n+|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const beats =
    paragraphs.length > 1 ? paragraphs : splitSentences(script.trim());
  const visible = beats.slice(0, MAX_VISIBLE_BEATS);
  return {
    beats,
    visible,
    hidden: beats.length - visible.length,
  };
}

export function countWords(script: string): number {
  return script.trim().split(/\s+/).filter(Boolean).length;
}

/** Honest spoken-duration estimate at ~150 words per minute. */
export function estimateDurationSeconds(words: number): number {
  if (words <= 0) return 0;
  return Math.max(5, Math.round((words / 150) * 60));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `about ${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0
    ? `about ${minutes} min`
    : `about ${minutes} min ${remainder} s`;
}

/** Short beat caption for preview cards: the first few words, never invented. */
export function beatCaption(beat: string): string {
  const words = beat.split(/\s+/).filter(Boolean);
  const caption = words.slice(0, 4).join(" ");
  return words.length > 4 ? `${caption}…` : caption;
}
