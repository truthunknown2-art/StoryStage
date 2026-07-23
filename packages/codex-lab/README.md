# E1 Codex feasibility lab

## E1-WP4 failure, security, and feasibility gate

`pnpm generate:e1-wp4-failure-matrix` writes the deterministic negative-state
and security-boundary index. `pnpm verify:e1-wp4-failure-matrix` fails if that
committed evidence is absent or stale. Every row names a stable code, truthful
creator message, recovery action, executable test anchor, and explicit denial
of automatic retry, hidden fallback, credential access, and project mutation.

The E1 Director lab exposes these records as selectable deterministic fixtures.
They are not live production failures and do not establish production security,
packaging, distribution, or private-launch readiness.

## E1-WP3 streamed proposal round trip

The lab launches the pinned Codex App Server in an isolated Codex-owned state
root, verifies the exact bounded StoryStage MCP inventory, and records one
officially authenticated proposal-only round trip. The creator can preview or
reject the validated ephemeral proposal; Apply is permanently disabled. No
project, asset, renderer, or saved state is mutated.

## E1-WP2 bounded synthetic-scene MCP server

`pnpm --filter @storystage/codex-lab mcp:e1-scene-context` starts the local
JSONL stdio server. Startup reads exactly one hash-pinned synthetic fixture
under the fixed lab root. The server exposes one immutable scene-context
resource, one read-only `get_scene_context` tool for Codex, and one read-only
`submit_direction_proposal` tool that validates and echoes an ephemeral
proposal. It has no apply, persistence, approval, renderer, asset-generation,
filesystem, shell, or network authority.

This remains isolated E1 feasibility code. The real E1-WP3 round trip consumes
this server through the pinned App Server, but production integration remains
outside E1.

## E1-WP1 Codex App Server preflight

This removable, non-shipping lab verifies the exact local runtime pattern that
StoryStage may later use for its AI Director. It does not implement the
creator-facing AI Director, MCP scene access, proposal streaming, or project
mutation.

The pinned Windows x64 Codex 0.144.1 native executable is launched directly
over documented JSONL stdio. The lab never reads Codex credential files and
passes only an allowlisted environment to the child. Account details, prompts,
thread/turn identifiers, local paths, usage values, and raw server payloads are
not written to the receipt.

Commands:

- `pnpm verify:e1-app-server-schema` verifies the checked-in stable schema
  artifact without requiring Codex on a hosted runner.
- `pnpm verify:e1-app-server-schema-installed` verifies the installed binary,
  regenerates the non-experimental schema, and compares it byte-for-byte.
- `pnpm preflight:e1-app-server` runs the live lifecycle and writes the
  redacted receipt named by `--receipt`, defaulting to
  `reports/evidence/E1-WP1/runtime-receipt.json`.

Codex CLI 0.144.1 still labels `app-server` experimental. The lab records that
as a production-packaging blocker; a successful preflight is feasibility
evidence, not private-launch acceptance.
