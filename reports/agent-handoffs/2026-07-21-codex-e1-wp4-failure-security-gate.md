# E1-WP4 failure, security, and feasibility gate handback

## Immutable review identity

- Repository: `truthunknown2-art/StoryStage`
- Issue: `#69`
- Required branch: `agent/codex-e1-wp4-failure-security-gate`
- Authorized implementation base: `8d9a47a4898df81db7630e2f0b7d4eecc88f7157`
- Immutable implementation and evidence content: `b43cee1cd8a4db78865988764d48eb8fdbfac9cf`
- Integration target: `product/v1`
- Package recommendation: `PASS`, subject to exact-pushed-SHA independent review, hosted verification, ChatGPT Pro verdict, and Preston's recorded final decision

This handback is a separate metadata commit. Review the immutable content SHA
above for the implementation and evidence. The later PR head may add only this
handback or review corrections; any implementation correction requires a new
immutable content SHA and a corrected handback.

## Delivered scope

E1-WP4 closes the isolated E1 failure/security feasibility package only:

- fourteen required negative and recovery states with unique stable codes,
  creator-safe messages, explicit recovery outcomes, evidence provenance, and
  fail-closed authority flags;
- pre-prompt signed-out, revoked, offline, usage-limited, and incompatible-state
  enforcement before a thread or turn can start;
- exact MCP tool argument, scene-context result, and proposal receipt
  correlation;
- visible rejection of hidden retries, unknown activity, prompt injection,
  malformed proposals, authority escalation, timeout, cancellation, and crash;
- fatal UTF-8 and strict JSON-RPC response validation plus bounded App Server
  notification and streamed-text budgets;
- fixed local lab-root containment, poisoned temporary-directory resistance,
  junction rejection, crash-to-clean-restart proof, cleanup aggregation, and
  nine executable proposal-roundtrip failure seams beside a full-tree decoy
  project, detecting added, removed, changed, or non-file entries;
- creator-visible failure/recovery UI with disabled Apply authority;
- bounded distribution/license questions and exact retained F3, B3, R1, and R2
  productization work.

## Evidence

Entry points:

- `reports/evidence/E1-WP4/failure-matrix.json`
- `reports/evidence/E1-WP4/security-boundary-audit.md`
- `reports/evidence/E1-WP4/no-project-mutation.json`
- `reports/evidence/E1-WP4/process-cleanup.json`
- `reports/evidence/E1-WP4/capture-receipt.json`
- `reports/evidence/E1-WP4/verification.json`
- `reports/evidence/E1-WP4/failure-gate-1440x900.png`

SHA-256:

- failure matrix: `5ffda253d4c115d656f0576904d2dc68fdb7d73fe2e6cdd2b201f00e3da3e9dc`
- no-project-mutation receipt: `100a1c3cab0c7bfdf94b85505cefa19e53aaf446a3da61dd986ccc16ca2d91f1`
- process-cleanup receipt: `e30d178830e3f220ea8868e550f96f27c43d85152d42fa0047de2f7f60be083f`
- 1440x900 capture: `f7c52f1ecbf18050ef1ca286da075edbf410d63c66b4835623622cedf9d9e810`

The captured app selected `prompt-injection-blocked` / `UNAPPROVED_ACTIVITY`.
The browser viewport and document bounds were exactly 1440x900 with zero
horizontal or vertical overflow and zero console warnings or errors.

## Verification at the immutable content SHA

- `pnpm verify:e1-wp4-failure-matrix` — PASS
- `pnpm --filter @storystage/codex-lab typecheck` — PASS
- `pnpm --filter @storystage/codex-lab test` — PASS, 15 files / 103 tests
- `pnpm --filter @storystage/e1-director-lab typecheck` — PASS
- `pnpm --filter @storystage/e1-director-lab test` — PASS, 1 file / 4 tests
- `pnpm --filter @storystage/e1-director-lab build` — PASS, 19 modules
- `pnpm verify` — PASS in 199.3 seconds, including privacy verification over
  967 tracked/publishable files
- `git diff --check` — PASS

Root lint emitted the two pre-existing Remotion non-pure-animation warnings in
`apps/render-worker/src/kvp001-proof.ts`; it emitted zero errors.

## Independent-review corrections

The first immutable content candidate `3abfd354...` was rejected. This successor:

- replaces the static two-file mutation receipt with executable round-trip
  failure seams and full-tree unexpected-file detection;
- requires the returned scene context to equal the complete pinned synthetic
  fixture, rejecting schema-valid semantic drift;
- normalizes unknown synthetic-scene IDs to `AUTHORITY_DENIED` and failed MCP
  tool status to `PROPOSAL_REJECTED`; and
- merges the live `product/v1` authorization ledger without rebase or history
  rewriting, preserving `E1 / E1-WP4 / START_NOW`.

## Creator-visible control truth

- Scenario selection and the `Proposal proof` / `Failure & recovery` views are
  real local lab-state controls.
- Recovery labels describe the verified bounded outcome; they do not launch
  authentication, networking, retries, project writes, or production actions.
- `Apply to scene` is intentionally disabled because E1 has no project-mutation
  authority.
- Rendering, assets, audio, durable project persistence, background autonomy,
  API-key entry, credential access, MCP configuration entry, and production
  approval controls are omitted.

## Known limitations and retained work

- This package is feasibility evidence, not a production-security,
  production-readiness, installer, or private-launch claim.
- Codex CLI 0.144.1 still labels App Server experimental.
- E1 does not decide whether Codex may be bundled or must be discovered from an
  installed client; that decision remains R1.
- Production Windows process-tree isolation, installed-build security,
  support-bundle privacy, and release threat testing remain R2.
- F3 may build fixture-backed creator UX only after E1 is accepted. B3 still
  owns durable project sessions, validated mutation/apply/undo, persistence,
  and real production context.
- No later package, F3, backend work, or Kimi assignment is started here.

## Integration instructions

1. Review the exact pushed PR head and immutable content SHA above.
2. Require hosted `Verify StoryStage` success on the exact PR head.
3. Copy independent-review and ChatGPT Pro exact-SHA verdicts to GitHub.
4. Preston records `PASS` or `FAIL` against that pushed SHA.
5. Only a recorded `PASS` may close E1. F3-WP1 still requires its own bounded
   ticket and does not begin through this handback.
