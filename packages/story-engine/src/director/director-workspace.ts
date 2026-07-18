import { z } from "zod";
import { cv002ProjectSchema, type Cv002Project } from "../cv002-story-draft";
import { hashSchema, identifierSchema } from "../model";
import { applyDirectorPatch } from "./apply-director-patch";
import type { CapabilityRegistry } from "./capability-report";
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

export const DIRECTOR_WORKSPACE_STORAGE_KEY_PREFIX =
  "storystage.director-workspace.v1";

export const directorWorkspaceStorageKey = (storyProjectContentHash: string) =>
  `${DIRECTOR_WORKSPACE_STORAGE_KEY_PREFIX}:${hashSchema.parse(storyProjectContentHash)}`;

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
  expectedStoryProject: Cv002Project,
  capabilities?: CapabilityRegistry,
): DirectorWorkspaceState {
  const workspace = directorWorkspaceStateSchema.parse(JSON.parse(serialized));
  const storyProject = cv002ProjectSchema.parse(expectedStoryProject);
  if (workspace.storyProjectContentHash !== storyProject.contentHash)
    throw new Error(
      "Saved Director workspace belongs to another story project.",
    );
  let replayed = workspace.history.entries[0]!.directorProject;
  if (
    replayed.directorPlan.storyGraphContentHash !==
      storyProject.graph.contentHash ||
    replayed.planningArtifact.storyGraphContentHash !==
      storyProject.graph.contentHash ||
    replayed.planningArtifact.grammar !== storyProject.grammar
  )
    throw new Error("Saved Director first cut belongs to another story graph.");
  for (let index = 1; index < workspace.history.entries.length; index += 1) {
    const entry = workspace.history.entries[index]!;
    if (!entry.patch)
      throw new Error(
        "Saved Director workspace revision is missing its patch.",
      );
    const computed = applyDirectorPatch({
      storyProject,
      baseDirectorProject: replayed,
      patch: entry.patch,
      capabilities,
    });
    if (computed.contentHash !== entry.directorProject.contentHash)
      throw new Error(
        `Saved Director workspace revision ${index} failed semantic replay.`,
      );
    replayed = computed;
  }
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
