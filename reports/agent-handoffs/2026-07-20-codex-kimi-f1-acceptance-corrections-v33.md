# Kimi F1 — acceptance corrections (inbox v33)

## Authority

- Product plan: `product/v1@e759c54d513b628ff04b4d7782cb1522b7beec85`
- Rejected candidate: `00299eb351f24a1cf1be5b34cb08f6c77c039af5`
- Required work branch: `agent/kimi-ui-v2`
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/33`
- Task issue and claim thread: `https://github.com/truthunknown2-art/StoryStage/issues/34`
- Phase: **F1 — Projects + Create**
- Owner: **Kimi**
- Status: `START-NOW`

Claim issue #34, continue on the existing branch without rebasing or rewriting
history, apply only the corrections below, push an immutable successor to PR
#33, leave the exact handback, and stop. Do not begin F2 or backend work.

## Why `00299eb` is rejected

1. The committed `create-1440x900.png` still shows the sticky footer covering
   the required Language control.
2. `--faint: #58635f` on `--panel: #121718` remains approximately 2.90:1,
   below the binding 4.5:1 normal-text requirement.
3. The five screenshots and capture report predate the required visual
   corrections and therefore do not prove the candidate.
4. The handback is still labelled v31 and records 39 deterministic failures in
   the two legacy Studio suites.
5. `App.tsx` removed the existing `LegacyApp` implementation while the handback
   claims the legacy proof surfaces remain. A route change does not authorize
   deleting their tested implementation or leaving the repository suite red.

## Required corrections

### 1. Preserve the old proof application while Product v1 remains default

Restore `apps/studio/src/App.tsx` from the accepted base version at `9f3d6fa`
so its existing imports, helpers, and exported `LegacyApp` remain unchanged.
Add the `ProductV1App` import and make only the final exported `App` render
`ProductV1App` as the new default.

In only these two legacy proof harnesses, change the import to use the preserved
legacy application under the local name expected by the tests:

- `apps/studio/src/Cv001CreatorStudio.test.tsx`
- `apps/studio/src/Cv002DraftReview.test.tsx`

Use `LegacyApp as App`; do not rewrite assertions, fixtures, or product logic.
The new `App.test.tsx` must continue to exercise the Product v1 default.

### 2. Make the 1440×900 Create controls fully usable

Correct the layout so Language and its value are not covered by the action
footer at 1440×900. Scrolling is acceptable; overlap is not. Preserve one clear
Create-first-cut action and useful 1920×1080 and 1024 px behavior.

### 3. Meet the normal-text contrast gate

Raise `--faint` (or replace its required-information uses) so every required
11–12 px label, count, description, and handoff fact is at least 4.5:1 against
its actual background. Preserve a visible hierarchy and document the exact
foreground/background pairs and ratios used for the gate.

### 4. Replace stale evidence and make the handback truthful

Recapture all five required actual-app screenshots after the successor code is
committed. Update `capture-report.json` and the handback to inbox v33 with exact
implementation/evidence SHAs, URLs, viewport states, hashes, console/page
errors, commands, results, limitations, and PR/issue links. Do not describe
failed deterministic tests as an accepted limitation.

## Allowed files

- `apps/studio/src/App.tsx`
- `apps/studio/src/App.test.tsx` only if its existing v31 assertions need a
  mechanical import adjustment after restoring `App.tsx`; no new behavior
- `apps/studio/src/Cv001CreatorStudio.test.tsx` — import line only
- `apps/studio/src/Cv002DraftReview.test.tsx` — import line only
- `apps/studio/src/styles.css`
- existing `apps/studio/src/product-v1/**` only where required to remove the
  verified footer overlap; no new feature
- existing F1 handback, capture report, and five screenshot files

No dependencies, manifests, packages, schemas, services, rendering contracts,
backend code, F2 surfaces, or unrelated cleanup.

## Verification

From the repository root, run and report exactly:

```text
pnpm --filter @storystage/studio test
pnpm --filter @storystage/studio typecheck
pnpm --filter @storystage/studio build
pnpm verify
```

Also prove visually:

- Projects at 1440×900 and 1920×1080;
- Create at 1440×900 and 1920×1080, after the correction, with Language and
  the action footer unobscured;
- honest handoff at 1440×900;
- 1024 px responsive behavior by an explicit browser assertion or additional
  noncommitted inspection noted in the handback;
- no console errors, page errors, or required text below 4.5:1.

Completion requires a pushed successor on `agent/kimi-ui-v2`, updated draft PR
#33, exact handback, green required commands, and a stop. F1 remains unaccepted
until Codex and Pro review that exact successor.
