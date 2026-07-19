# CV-001 creator workflow proof

Verified on July 17, 2026 against the fixed three-paragraph lantern prototype.

## Outcomes

- The app launches into the creator-facing Create screen, not the engineering cockpit.
- A verified saved project reopens paused at the first frame of its saved beat.
- A newly created first cut plays the full ten-second scene from frame 0; Continue reopens paused at the saved beat start.
- The Studio keeps the real `ProductionComposition` dominant at 1440×900 and 1024×768.
- The 1024px layout has no horizontal overflow and exposes Director as a 360px drawer.
- The required direction, `Make the reaction bigger and hold it longer.`, changes only Beat 3 and supports exact undo/redo.
- Every supported direction changes renderer-consumed motion on each of the three beats and remains validator-clean.
- A Beat 2 performance edit preserves the lantern pickup world transform exactly.
- Rehashed but semantically inconsistent scripts, commands, history, cursors, and compiled hashes fail closed.

## Rendered locality audit

Run:

```text
pnpm render:cv001-creator-locality-proof
```

The command renders baseline and edited production frames for `Make it bigger` on Beat 2. The generated report lives under the ignored `artifacts/CV-001/creator-direction-locality-proof` directory.

- Beat 1 binding and rendered frames 0, 30, and 89: exact SHA-256 matches.
- Beat 2 binding: changed; rendered frames 120, 150, 180, and 209 have different SHA-256 hashes.
- Beat 3 binding and rendered frames 210, 240, and 299: exact SHA-256 matches.
- Baseline and edited pickup transform: exact numeric match at x `957.400104814489`, y `722.1076803037399`, rotation `17.666389004581426`, scale `1`.

## Browser QA

Run the complete, repeatable Chromium proof:

```text
pnpm proof:cv001-creator
```

It writes regenerated screenshots and a machine-readable report to `output/playwright/cv001-creator/`. The latest passing report and all five required captures are also committed in this directory.

- 1440×900: document width 1440px, no horizontal overflow, preview 761.84×429.41px, Director 318px.
- 1024×768: document width 1024px, no horizontal overflow, preview 741×417.69px, Director drawer x=664px, width=360px, right edge=1024px.
- In-app browser console: zero error-level messages.
- Real-browser axe WCAG 2 A/AA/2.1 AA audits on both Create and Studio, including color contrast: zero critical or serious violations.
- Real-browser ergonomic audit: zero visible interactive targets below 44×44px and zero creator-facing text below 10px.
- Entry proof: frame 0 on Create, playback advances beyond Beat 1, and Continue remains paused at exact frame 210.
- Beat selection proof: exact frame 90 for Beat 2 and exact frame 210 for Beat 3.

## Captures

- `create-1440x900.png` — default creator-facing project setup.
- `studio-default-1440x900.png` — default Studio with Advanced closed.
- `studio-beat-3-edited-1440x900.png` — required Beat 3 direction applied.
- `studio-advanced-open-1440x900.png` — technical evidence isolated in Advanced.
- `studio-1024x768.png` — responsive Director drawer over the production preview.

## Full verification

`pnpm verify` passes privacy checks, lint, all workspace typechecks, and 233 tests, including 98 story-engine tests and 55 Studio tests.
