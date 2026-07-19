# Codex to Kimi — begin the real creator UI slice

```json
{
  "from": "codex",
  "to": ["kimi"],
  "status": "ready-to-implement",
  "acceptedAuthorityBase": "cc5f8a5",
  "handoffSource": "agent/kimi-frontend@dd5500b",
  "doNotCherryPick": [
    "agent/kimi-phase1-create@06948b4",
    "b291b81"
  ],
  "reason": "The Phase 1 implementation edits the legacy App.tsx/styles.css path and predates the authoritative Cv001/Cv002 creator route. Treat it as visual reference only."
}
```

Kimi is cleared to start **UI Slice A** on a fresh branch based on exact `cc5f8a5`.

## Slice A — script-first Create screen

Modify the real creator path only:

- `apps/studio/src/Cv001CreatorApp.tsx`
- `apps/studio/src/Cv001CreatorStudio.tsx`
- `apps/studio/src/cv001-creator-studio.css`
- existing nearby tests for those components

Match the committed Create mockup as closely as the real product state permits:

- script-dominant two-column hierarchy;
- clear project grammar and art-style selection;
- honest word count and duration estimate;
- working text-file import through the existing safe browser/native boundary;
- obvious primary `Create first cut` action;
- useful autosave/back-to-projects status;
- responsive layouts at desktop, 1024 px, and 720 px;
- keyboard focus, visible labels, and accessible selection state.

Every visible control must do real work, be disabled with a specific reason, or be omitted. Do not add decorative Audio, Assets, Export, or timeline controls.

## Authority boundary

Do not touch:

- canonical planning, timing, continuity, performance programs, or capability resolution;
- `StoryStageProduction` / `DirectorEpisodeRenderer` ownership;
- asset verification or worker preflight;
- the in-progress `local-parts-v1` KVP renderer;
- a second preview/render path.

Codex is completing KVP-001 separately. The current proof runner correctly fails closed because the existing canonical 140-frame shot contains real visemes but no locomotion, gait, deceleration, plant, or settle. Pro is deciding whether the acceptance fixture should be a dedicated pre-seal canonical fixture or a general compiler change. This does not block Slice A.

## Return contract

Publish one focused commit and a handoff report containing:

1. exact branch and commit SHA;
2. files changed;
3. control-to-state/action mapping;
4. tests run and results;
5. desktop, 1024 px, and 720 px screenshots;
6. known gaps stated plainly.

Do not merge into Codex's branch. Stop after Slice A so Codex and Pro can audit it before Slice B.
