# E1 Codex feasibility lab

## E1-WP2 bounded synthetic-scene MCP server

`pnpm --filter @storystage/codex-lab mcp:e1-scene-context` starts the local
JSONL stdio server. Startup reads exactly one hash-pinned synthetic fixture
under the fixed lab root. The server exposes one immutable scene-context
resource, one read-only `get_scene_context` tool for Codex, and one read-only
`submit_direction_proposal` tool that validates and echoes an ephemeral
proposal. It has no apply, persistence, approval, renderer, asset-generation,
filesystem, shell, or network authority.

This is isolated E1 feasibility code. App Server configuration and a real Codex
round trip belong to E1-WP3 and are deliberately absent.

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
