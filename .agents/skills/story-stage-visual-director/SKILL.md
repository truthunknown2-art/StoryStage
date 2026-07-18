---
name: story-stage-visual-director
description: Analyze reference-video production and motion grammar, turn script beats into directed limited-animation programs, author or revise StoryStage directing profiles and Show Packs, prepare provider-neutral image-generation briefs, compare profile outputs, and critique animatics against profile quality rules. Use for StoryStage benchmark teardowns, beat direction, character-performance planning, cutout-rig or layered-scene animation, visual-direction architecture, profile tuning, generation-brief creation, repetitive-shot diagnosis, or pre-approval visual review.
---

# StoryStage Visual Director

Treat directing as structured product data. Keep the runtime Visual Director, versioned profiles, Show Packs, and validators as the source of truth; use this skill to analyze, author, critique, and repair those artifacts.

## Route the task

- For reference-video teardown or cut-sheet analysis, read `references/benchmark-analysis-method.md`.
- For beat-level motion planning, character performance, layered 2D scenes, or deciding whether something is genuinely animated, read `references/limited-animation-grammar.md`.
- For profile creation or tuning, read `references/directing-profile-schema.md`.
- For character, background, prop, or illustration briefs, read `references/asset-generation-method.md`.
- For animatic critique or approval recommendations, read `references/quality-review-rubric.md`.

Load only the references required by the current task.

## Workflow

1. Identify the project type, Show Pack, directing-profile version, production preset, and intended audience.
2. Separate measured observations from proposed policy. Never present an inferred rule as a measured fact.
3. Split narration into semantic beats before planning shots. A beat may contain one shot, several shots, or a continuous performance.
4. Translate each performance beat into anticipation, action, overshoot, settle, and hold phases with explicit character, camera, layer, prop, caption, and audio tracks.
5. Translate creative language into numeric envelopes, weights, routing priorities, forbidden patterns, and quality checks.
6. Update structured profile, motion-program, or generation-brief artifacts before updating prose.
7. Validate the changed artifact and compare the canonical script across affected profiles.
8. Report measurable consequences: cadence, shot mix, camera frequency, articulated-motion frequency, performance accents, text density, source routing, and estimated asset cost.
9. Recommend approval only when the profile-specific quality rules pass and the demonstrated controls alter downstream plans and rendered frames.

## Required boundaries

- Derive production grammar from references without copying characters, branded artwork, scripts, music, or exact shot sequences.
- Store only measurements and classifications from reference media. Never commit source video, audio, or reusable frames.
- Prefer authentic public-domain or properly licensed evidence over generated imagery for factual history.
- Label generated historical reconstructions as reconstructions; never present them as archive.
- Generate rig-ready kits to a role specification. Treat slicing an arbitrary finished character as a fallback.
- Never call a full-body pose swap, root-position tween, or camera move "character animation." Pose swaps may accent continuous rig motion but must not carry the performance.
- Require frame-evaluated motion. Preview and final render must resolve the same scene graph and tracks at the requested frame without wall-clock state.
- Parse every new beat motion program through `directedBeatProgramSchema` and reject it with `getMotionProgramIssues()` before preview or render. Prose quality rules do not substitute for the machine validator.
- Keep prompts and provider metadata upstream of the frozen render plan.
- Never call a paid image, stock, voice, or music provider without explicit authorization.
- Never claim temporary lab art is a final channel identity.
- Never approve an arbitrary auto-rig without motion-test and human review.

## Utilities and templates

- Run `scripts/analyze-cut-sheet.ts <cut-sheet.json>` to calculate cadence and classification summaries.
- Run `scripts/build-frame-contact-sheet.py <frames-directory> <output.png>` to place sequential reference frames side by side for motion analysis.
- Run `scripts/compare-profile-output.ts <kids-creative-plan.json|builtin:show-pack-id> <history-creative-plan.json|builtin:show-pack-id>` to check SS-002 comparison thresholds through the shared runtime metrics.
- Run `scripts/validate-profile.ts <show-pack.json|builtin:show-pack-id>` to validate and hash-check a serialized Show Pack.
- Copy `assets/generation-brief-template.json` when starting a provider-neutral generation exchange.
- Copy `assets/candidate-bundle-template.json` only as a structural guide; replace every job identity and compute file hashes from the returned bytes.
- Copy `assets/cut-analysis-template.csv` when classifying sampled frames or shot boundaries.
- Copy `assets/animation-analysis-template.csv` when classifying successive frames, articulated parts, root motion, camera changes, and beat synchronization.
