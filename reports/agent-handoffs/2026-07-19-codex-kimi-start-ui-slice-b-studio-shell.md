# Kimi assignment — UI Slice B: real Studio shell

Issued by: Codex  
Task: `KIMI-UI-SLICE-B-STUDIO-SHELL`  
Status: `START-NOW`  
Required work branch: `agent/kimi-ui-slice-b-studio-shell`  
Exact base: `agent/integrate-kimi-ui-slice-a@21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`

Git is the source of truth. This task is intentionally separate from Codex's
character-source and evidence work.

## Start protocol

1. Fetch `origin`.
2. Create or resume `agent/kimi-ui-slice-b-studio-shell` from exact base
   `21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`.
3. Post this exact claim on GitHub Issue #11:
   `CLAIMED agent/kimi-ui-slice-b-studio-shell @ 21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`
4. Work only on the assigned branch and scope.

Issue: <https://github.com/truthunknown2-art/StoryStage/issues/11>

## Product target

Implement the real post-create animation workspace, not another Create-screen
revision. StoryStage is an AI-automated animation studio. The shell must make a
sealed episode easy to understand and direct:

- left: Scenes and beats;
- center: the dominant, authoritative Player;
- right: real Director controls;
- bottom: a compact, genuine timeline.

The same shell must serve Kids Adventure and Weird History projects. Use the
existing real episode, player, and patch systems. Do not fabricate media,
waveforms, controls, or production authority.

## Allowed scope

- `apps/studio/src/Cv001CreatorStudio.tsx`
- `apps/studio/src/Cv002DraftReview.tsx`
- `apps/studio/src/director/*`
- `apps/studio/src/creator-studio-components*`
- `apps/studio/src/cv001-creator-studio.css`
- related `apps/studio/src/*.test.tsx`

Do not modify:

- `apps/studio/src/Cv001CreatorApp.tsx`
- `packages/story-engine/**`
- `packages/asset-pipeline/**`
- `packages/remotion-runtime/**`
- `apps/render-worker/**`
- KCAST contracts or evidence

## Required behavior

- Image-led scene and beat cards come from the sealed episode.
- The existing real `StoryStageProduction` Player is the dominant canvas.
- Existing patch-backed Director controls are reorganized clearly.
- Selecting a rail beat or beat-strip card seeks the Player to its exact start.
- Playback updates the active beat and timeline playhead.
- A genuine event marker seeks to its resolved event frame.
- Director patches rebuild affected thumbnails and timeline data.
- Undo/redo restore exact project hashes while retaining the selected beat.
- The selected-beat timeline is collapsed by default and contains only real
  Shots, Events, and Camera data.
- Advanced controls are closed by default.
- Use honest labels: `Draft animatic`, `Proxy performance`, and
  `Final character rig unavailable`.
- Do not show Audio, Assets, Export, waveform, trim, or keyframe controls unless
  they execute real behavior.
- Do not relabel Mara artwork as Ollo.

## Responsive and accessibility gates

- No horizontal page overflow at 1440x900, 1024x768, or 820x900.
- Interactive targets are at least 44px.
- Keyboard focus is visible.
- Axe reports zero critical or serious findings.
- The browser console reports zero warnings or errors.

## Required verification

```text
pnpm --filter @storystage/studio test
pnpm --filter @storystage/studio typecheck
pnpm lint
pnpm verify
pnpm build
git diff --check
```

## Required evidence and handback

Create `reports/agent-handoffs/2026-07-19-kimi-ui-slice-b-studio-shell/`
containing:

- `HANDOFF.md`
- `control-to-state-map.md`
- `proof-report.json`
- `kids-1440x900.png`
- `history-1440x900.png`
- `kids-1024x768.png`
- `kids-820x900.png`

Commit and push the exact branch, open a draft PR, and post the exact SHA and PR
on Issue #11. In `HANDOFF.md`, list changed files, commands and results,
screenshots, known limitations, and integration instructions. State whether every
visible control is real, intentionally disabled with a reason, or omitted.

Do not merge. Codex and Pro will perform the authority and integration review.
