import type { DirectorPatch } from "./director-patch";
import type { DirectorProject } from "./director-project";

export type DirectorHistoryEntry = {
  directorProject: DirectorProject;
  patch: DirectorPatch | null;
};

export type DirectorHistory = {
  entries: DirectorHistoryEntry[];
  cursor: number;
};

export const createDirectorHistory = (
  directorProject: DirectorProject,
): DirectorHistory => ({
  entries: [{ directorProject, patch: null }],
  cursor: 0,
});

export function recordDirectorRevision(
  history: DirectorHistory,
  patch: DirectorPatch,
  directorProject: DirectorProject,
): DirectorHistory {
  return {
    entries: [
      ...history.entries.slice(0, history.cursor + 1),
      { directorProject, patch },
    ],
    cursor: history.cursor + 1,
  };
}

export const canUndoDirectorHistory = (history: DirectorHistory) =>
  history.cursor > 0;
export const canRedoDirectorHistory = (history: DirectorHistory) =>
  history.cursor < history.entries.length - 1;

export const undoDirectorHistory = (
  history: DirectorHistory,
): DirectorHistory =>
  canUndoDirectorHistory(history)
    ? { ...history, cursor: history.cursor - 1 }
    : history;

export const redoDirectorHistory = (
  history: DirectorHistory,
): DirectorHistory =>
  canRedoDirectorHistory(history)
    ? { ...history, cursor: history.cursor + 1 }
    : history;

export const currentDirectorProject = (history: DirectorHistory) =>
  history.entries[history.cursor]!.directorProject;
