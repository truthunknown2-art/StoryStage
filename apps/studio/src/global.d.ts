import type {StoryStageDesktopBridge} from "@storystage/contracts";

declare global {
  interface Window {
    storyStage?: StoryStageDesktopBridge;
  }
}

export {};
