# [CODEX] START NOW — creator UI Slice A

Kimi: you are explicitly unblocked. Begin the frontend implementation now and own this slice through a pushed, tested handback.

## Safe base and branch

1. Create a **fresh branch** named `agent/kimi-ui-slice-a` at exact accepted root commit `cc5f8a5`.
2. Do not merge `agent/kimi-frontend` wholesale; its merge base is older than the accepted authority work.
3. Use this handoff branch only as reference. Read the Ollo identity and environment boards with `git show` or copy the two image assets deliberately.

## Product outcome

Build the first honest, easy-to-understand creator surface for StoryStage, an AI-assisted animation studio. It should visually approach the two user-approved StoryStage mockups while staying connected to real application state.

The first screen must make the workflow obvious:

1. paste/import a script;
2. preview natural story beats;
3. choose the project grammar (`Kids Adventure` or `Weird History Explainer`);
4. choose an art direction;
5. choose voice/format basics;
6. create an editable first cut, with review-before-generation clearly stated.

For Kids Adventure, public-facing sample content should use the canonical `Ollo & Friends` cast — Ollo, Tix, Dot, and the Storylight — and the supplied cut-paper/mixed-media environment direction. Mara remains engineering proof art and must not be presented as channel branding. Do not relabel existing Mara images as Ollo.

The reference `docs/design/ollo-friends-show-pack/environment-art-direction-v1.png` establishes a layered paper stage: background, midground, character plane, near scenic pieces, foreground occluders, interactive props, and lighting/effects. The UI should communicate layered-scene intent without adding a decorative asset browser or pretending layers have already been generated.

## Authoritative files

Implement against the current creator surface, not legacy `App.tsx`:

- `apps/studio/src/Cv001CreatorApp.tsx`
- `apps/studio/src/Cv001CreatorStudio.tsx`
- `apps/studio/src/cv001-creator-studio.css`
- nearby focused tests only where needed

You may create small, clearly named components under `apps/studio/src/` when that improves structure. Do not alter Director/continuity/compiler authority contracts in this slice.

## Interaction requirements

- The script input, grammar selection, art-style selection, beat preview, and primary create/review action must be real stateful controls.
- The primary action must invoke an existing real callback/workflow or honestly say what required step is unavailable; no dead buttons.
- Keep terminology human: `Script`, `Scenes`, `Characters`, `Voice`, `Music & SFX`, `Preview`, `Export`.
- Use progressive disclosure. Do not show production confidence matrices, capability hashes, or engineering diagnostics in the default creator flow.
- Preserve keyboard access, visible focus, meaningful labels, and responsive behavior at laptop widths.
- No generated secrets, API keys, account cookies, or ChatGPT-session automation.

## Acceptance and handback

Before pushing:

1. run focused Studio tests;
2. run Studio typecheck, lint, formatting, and production build;
3. inspect the real UI at `http://127.0.0.1:5173/` at desktop and narrow widths;
4. confirm every visible control works or is explicitly disabled with a reason;
5. capture screenshots for the handback;
6. commit and push `agent/kimi-ui-slice-a`;
7. write a handback with the exact SHA, files, tests, screenshots, limitations, and merge instructions.

Do not wait for another approval message. Start this slice now.
