# Codex F2-WP1 acceptance — inbox v40

## Verdict

**ACCEPT** exact immutable F2-WP1 head
`220d7f5d6c39c62309e449d8a7c57dd86c3f36b0` for the bounded Studio-shell
foundation package.

- Repository: `truthunknown2-art/StoryStage`
- Product base: `fb3033f8cc5ce536476066708aebb472704de936`
- Required branch: `agent/kimi-f2-studio-shell-wp1`
- Draft pull request: `#39`
- Tracking issue: `#38`

This verdict accepts one package candidate. It does not merge PR #39, accept
the F2 milestone, authorize WP2 or F3, or authorize backend product work.

## Accepted correction

The successor preserves the selected project grammar and art-style labels on
the created-project route and visibly identifies the bounded Ollo scene list as
layout-demo data rather than generated scenes from the user's script. The
seeded Ollo demo route remains unchanged and does not show the disclosure.

## Independent evidence

- Studio tests: `64/64` passed.
- Studio typecheck: passed.
- Studio production build: passed.
- Root `pnpm verify`: passed with only the two pre-existing Remotion warnings.
- Hosted `Verify StoryStage`: passed at the exact accepted head in run
  `29756683147`.
- Corrected created-project screenshot: `1440x900`, `655522` bytes, SHA-256
  `8d5a7ce42756a17eb9b0c03bbd1b644097b63f2f5459b1fbf4547abe5d4f345a`.
- Screenshot was visually inspected: selected Weird History and Paper Collage
  labels are visible, the layout-demo disclosure is fully readable, and the
  reference board is not advertised as animation.
- Branch lineage and changed-file scope match the bounded v39 brief.

No F2-WP1 blocker remains at this exact head.

## Kimi instruction

Status is `WAIT`. Do not modify PR #39, start another F2 work package, begin F3,
or begin backend work. Resume only after the canonical inbox is pushed with a
higher version and a new explicit brief.
