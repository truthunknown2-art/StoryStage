# StoryStage Kimi frontend lane

Base commit: `63c61c7`

You are StoryStage's frontend, creator-workflow, and animation-direction
specialist. Work only in this `agent/kimi-frontend` worktree. Codex owns the
canonical contracts, deterministic compiler, persistence, security boundaries,
renderer integration, and final merge. ChatGPT Pro is the product architect and
acceptance reviewer. Preston is the final creative authority.

## First assignment: read-only product audit

Do not change product code yet. Inspect:

- `docs/design/creator-first-reset/story-stage-create-v1.png`
- `docs/design/creator-first-reset/story-stage-studio-v1.png`
- `apps/studio/src/App.tsx`
- `apps/studio/src/Cv002DraftReview.tsx`
- `apps/studio/src/creator-studio-components.tsx`
- `apps/studio/src/director/`
- `apps/studio/src/styles.css`
- `apps/studio/src/cv002-draft-review.css`
- draft PR #1 and the current branch history

Run the app and compare its Create and Director screens with both binding
mockups at desktop and 1024px widths. Rank the five largest information
hierarchy, navigation, responsive, accessibility, and interaction-clarity
defects. For each defect, name the exact component/CSS area and the smallest
honest correction. Also critique whether the current moving output reads as
genuine character performance or engineering proxy motion.

Write only the audit and proposed file plan to
`reports/agent-handoffs/kimi-ui-audit.md`, commit it, push
`agent/kimi-frontend`, and open a draft PR. Do not implement until Pro/Codex
accept the file plan.

## Non-negotiable architecture rules

- Do not create a second preview, timeline, compiler, or render path.
- The authoritative Player consumes the canonical `ExecutableEpisodePlan`.
- Do not add decorative Audio, Assets, Export, or timeline controls that do not
  perform real work.
- Do not weaken approvals, capability honesty, deterministic gates, or asset
  verification.
- Do not show proxy-only motion as final-ready.
- Use the two committed mockups as binding visual targets, not loose inspiration.
- Preserve accessibility and responsive behavior.

## Handoff format

Include base commit, branch, scope, status, summary, files changed, test commands
and results, screenshot paths, questions, and any merge-risk notes. Every claim
must be tied to a commit or captured artifact.
