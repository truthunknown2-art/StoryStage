import { z } from "zod";
import { hashSchema, identifierSchema } from "../model";
import {
  canRedoDirectorHistory,
  canUndoDirectorHistory,
  createDirectorHistory,
  currentDirectorProject,
  recordDirectorRevision,
  redoDirectorHistory,
  undoDirectorHistory,
  type DirectorHistory,
} from "./director-history";
import { directorPatchSchema, type DirectorPatch } from "./director-patch";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";

export const DIRECTOR_WORKSPACE_STORAGE_KEY =
  "storystage.director-workspace.v1";

const directorHistoryEntrySchema = z
  .object({
    directorProject: directorProjectSchema,
    patch: directorPatchSchema.nullable(),
  })
  .strict();

const directorHistorySchema = z
  .object({
    entries: z.array(directorHistoryEntrySchema).min(1),
    cursor: z.number().int().nonnegative(),
  })
  .strict();

export const directorWorkspaceStateSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    storyProjectContentHash: hashSchema,
    history: directorHistorySchema,
    selectedBeatId: identifierSchema,
  })
  .strict()
  .superRefine((workspace, context) => {
    const { entries, cursor } = workspace.history;
    if (cursor >= entries.length)
      context.addIssue({
        code: "custom",
        path: ["history", "cursor"],
        message: "Director workspace history cursor is out of range.",
      });
    entries.forEach((entry, index) => {
      if (
        entry.directorProject.storyProjectContentHash !==
        workspace.storyProjectContentHash
      )
        context.addIssue({
          code: "custom",
          path: ["history", "entries", index, "directorProject"],
          message: "Director workspace entry belongs to another story project.",
        });
      if (index === 0) {
        if (entry.patch !== null || entry.directorProject.revision !== null)
          context.addIssue({
            code: "custom",
            path: ["history", "entries", index],
            message:
              "Director workspace must begin with an unpatched first cut.",
          });
        return;
      }
      const previous = entries[index - 1]!;
      if (
        !entry.patch ||
        entry.patch.baseDirectorProjectContentHash !==
          previous.directorProject.contentHash ||
        entry.directorProject.revision?.baseDirectorProjectContentHash !==
          previous.directorProject.contentHash ||
        entry.directorProject.revision?.directorPatchContentHash !==
          entry.patch.contentHash
      )
        context.addIssue({
          code: "custom",
          path: ["history", "entries", index],
          message: "Director workspace revision lineage is discontinuous.",
        });
    });
    const current = entries[cursor]?.directorProject;
    if (
      current &&
      !current.directorPlan.beats.some(
        (beat) => beat.beatId === workspace.selectedBeatId,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["selectedBeatId"],
        message: "Selected beat does not exist in the current Director plan.",
      });
  });

export type DirectorWorkspaceState = z.infer<
  typeof directorWorkspaceStateSchema
>;

export function createDirectorWorkspaceState(
  directorProject: DirectorProject,
  selectedBeatId: string,
): DirectorWorkspaceState {
  return directorWorkspaceStateSchema.parse({
    schemaVersion: "1.0",
    storyProjectContentHash: directorProject.storyProjectContentHash,
    history: createDirectorHistory(directorProject),
    selectedBeatId,
  });
}

export function restoreDirectorWorkspaceState(
  serialized: string,
  expectedStoryProjectContentHash: string,
): DirectorWorkspaceState {
  const workspace = directorWorkspaceStateSchema.parse(JSON.parse(serialized));
  if (workspace.storyProjectContentHash !== expectedStoryProjectContentHash)
    throw new Error(
      "Saved Director workspace belongs to another story project.",
    );
  return workspace;
}

export const serializeDirectorWorkspaceState = (
  workspace: DirectorWorkspaceState,
) => JSON.stringify(directorWorkspaceStateSchema.parse(workspace));

export const currentDirectorWorkspaceProject = (
  workspace: DirectorWorkspaceState,
) => currentDirectorProject(workspace.history);

export function selectDirectorWorkspaceBeat(
  workspace: DirectorWorkspaceState,
  selectedBeatId: string,
): DirectorWorkspaceState {
  return directorWorkspaceStateSchema.parse({ ...workspace, selectedBeatId });
}

export function recordDirectorWorkspaceRevision(
  workspace: DirectorWorkspaceState,
  patch: DirectorPatch,
  directorProject: DirectorProject,
): DirectorWorkspaceState {
  return directorWorkspaceStateSchema.parse({
    ...workspace,
    history: recordDirectorRevision(
      workspace.history as DirectorHistory,
      patch,
      directorProject,
    ),
  });
}

export const canUndoDirectorWorkspace = (workspace: DirectorWorkspaceState) =>
  canUndoDirectorHistory(workspace.history);
export const canRedoDirectorWorkspace = (workspace: DirectorWorkspaceState) =>
  canRedoDirectorHistory(workspace.history);

export function undoDirectorWorkspace(
  workspace: DirectorWorkspaceState,
): DirectorWorkspaceState {
  return directorWorkspaceStateSchema.parse({
    ...workspace,
    history: undoDirectorHistory(workspace.history),
  });
}

export function redoDirectorWorkspace(
  workspace: DirectorWorkspaceState,
): DirectorWorkspaceState {
  return directorWorkspaceStateSchema.parse({
    ...workspace,
    history: redoDirectorHistory(workspace.history),
  });
}
