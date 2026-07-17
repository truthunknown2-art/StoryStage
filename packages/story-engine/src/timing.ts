import type {ScriptDocument} from "./model";

export type DialogueTiming = {lineId: string; durationInFrames: number};
export type DialogueTimingResult = {fps: number; lines: DialogueTiming[]};

export interface DialogueTimingProvider {
  createTiming(script: ScriptDocument): Promise<DialogueTimingResult>;
}

export function createEstimatedTiming(script: ScriptDocument, fps = 30): DialogueTimingResult {
  const lines = script.elements.filter((element) => element.type === "dialogue").map((line) => {
    const words = line.text.trim().split(/\s+/).length;
    const punctuationPauses = (line.text.match(/[,.!?;:]/g) ?? []).length * 0.12;
    const seconds = Math.max(1.35, words / 2.55 + punctuationPauses);
    return {lineId: line.id, durationInFrames: Math.ceil(seconds * fps)};
  });
  return {fps, lines};
}

export class EstimatedTextTimingProvider implements DialogueTimingProvider {
  constructor(private readonly fps = 30) {}

  async createTiming(script: ScriptDocument): Promise<DialogueTimingResult> {
    return createEstimatedTiming(script, this.fps);
  }
}
