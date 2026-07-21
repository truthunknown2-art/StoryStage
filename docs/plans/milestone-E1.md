# E1 - ChatGPT-subscription StoryStage agent bridge feasibility

## Authority

- Governing roadmap: `docs/PRODUCT_ROADMAP.md`, milestone E1
- Required predecessor: accepted G0 amendment
- Owner: Codex
- Auditor: ChatGPT Pro
- Product acceptance: Preston
- Decomposition approval: Preston accepted G0 and the dependency-ordered
  E1-WP1 through E1-WP4 plan on 2026-07-20
- Current authorization: E1-WP3 is accepted at exact PR #64 head
  `681eeb4d7c28405ead53cb8afc16a048c749c53d` and integrated at
  `ac2357d2e1419124d832fe26b67e26875f3821e8`. Issue #69 and the merged
  status transition authorize only E1-WP4 from exact base
  `8d9a47a4898df81db7630e2f0b7d4eecc88f7157` on
  `agent/codex-e1-wp4-failure-security-gate`. Standing continuation authority
  does not waive exact-SHA review, hosted checks, Pro review, or Preston's final
  E1 `PASS`/`FAIL` decision.
- Kimi state: WAIT; no `apps/studio` implementation during E1
- Implementation class: isolated, non-shipping feasibility lab

## Evidence sources and fixed interpretation

The product-facing hierarchy that E1 must make feasible is retained in
[`../design/ai-copilot-studio/README.md`](../design/ai-copilot-studio/README.md)
and its linked
[`concept board`](../design/ai-copilot-studio/ai-copilot-concept-board.webp):
New Project offers **Paste a script** or **What's your idea?**, and the same
dockable AI Director becomes selection-aware inside Studio. E1 does not build
that Product v1 UI; it proves the event, scope, auth, and proposal states F3 will
render truthfully.

- [Codex App Server](https://learn.chatgpt.com/docs/app-server.md) is the official
  deep-integration surface for authentication, conversation history, approvals,
  and streamed events. E1 uses its local stdio transport and generated schemas;
  it does not depend on experimental WebSocket transport.
- [Codex authentication](https://learn.chatgpt.com/docs/auth.md) supports **Sign
  in with ChatGPT** for subscription access. Codex owns the resulting auth cache;
  StoryStage does not import or reinterpret it.
- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp) establishes
  the external tool/context boundary. StoryStage is the MCP server; Codex is the
  client that calls its bounded tools.
- HearthEngine is product inspiration for launching an existing agent and
  converging UI/CLI/MCP on one command layer. Its binaries or source are not a
  StoryStage dependency and are not copied or reverse-engineered.

## Objective and primary invariant

Prove the exact local agent/auth/tool/event pattern that F3 and B3 will use.
A pinned Codex App Server, authenticated by Codex through official **Sign in
with ChatGPT**, must read one synthetic StoryStage scene through a read-only MCP
server and return one schema-valid direction proposal. StoryStage must never
receive credentials or allow the proposal to mutate a project.

The ordinary product remains unchanged. The E1 lab must be removable without
affecting Projects, Create, Studio, Godot, Remotion, or project persistence.

## Dependency-ordered work packages

### E1-WP1 - Runtime, protocol, and auth preflight

**Primary invariant:** StoryStage can supervise a known Codex App Server process
and observe Codex-owned account state without owning authentication material.

**Tasks**

- select and record one Codex/App Server version and executable hash;
- generate and commit the exact non-experimental protocol schema used by the
  client; record any unavoidable experimental dependency as a blocking risk;
- launch over local stdio, initialize, list the account/model/usage state needed
  by the lab, start one thread/turn, interrupt it, and shut down cleanly;
- use Codex's official browser/device ChatGPT sign-in and sign-out lifecycle;
- expose plain not-installed, signed-out, authenticated, revoked/expired,
  offline, usage-limited, incompatible, and crashed states; and
- ensure logs and receipts redact prompts, account identifiers, tokens, and
  local Codex state by default.

**Non-goals**

- No API key field, token broker, website/webview login, cookie copying, remote
  WebSocket listener, production installer, or normal creator UI.
- No inference that ChatGPT Images, Sora, or Voice are available through Codex.

**Targeted verification and completion**

- process lifecycle and malformed-JSON tests;
- exact initialize/thread/turn/interrupt/shutdown transcript with redaction;
- account-state matrix recorded without credentials;
- no-secret scan over the worktree and evidence bundle; and
- completion only when the exact runtime/schema can be reproduced from a clean
  lab checkout or the package fails with a documented blocker.

**Accepted package status (2026-07-20):** PR #55 implements only E1-WP1 at
content commit `dcd75cf1affb8547c74bdbd66a4d7614761c2cc9`. The pinned
Windows runtime/hash, canonical stable schema, authenticated account/model/
usage observation, ephemeral thread/turn interrupt, matching interrupted
completion, clean shutdown, unchanged isolated workspace, redacted receipt, 26
focused tests, installed-schema check, privacy check, and root verification pass
locally. The exact-head audit corrections make usage-limit snapshots,
early-reject promise orderings, missing/mismatched completion, unsupported
optional-field assumptions, and account-method incompatibility fail closed.
ChatGPT Pro accepted exact PR head
`8b74d6486fe46a891d1217bfcd9e98da6e1f932f`, hosted run `29798603209`
passed, and the package merged into `product/v1` at
`ed457eada98dfeecfacb9e081a9803ecf97906ca`. The App Server command's
experimental label remains a production-packaging risk, the complete E1
milestone is not accepted, and no later package was authorized by the WP1
acceptance. Preston subsequently directed Codex to continue the dependency-
ordered work; issue #57 and the separate `START_NOW` ledger update authorize
only E1-WP2 from exact base `a246987fb678712af022b46f3b23ad22f4d22b2a`.

### E1-WP2 - Read-only StoryStage MCP scene context

**Primary invariant:** Codex can see only the bounded synthetic context and
cannot request a durable, rendering, approval, shell, or arbitrary file action.

**Tasks**

- create one original, visibly labelled synthetic scene fixture under the E1 lab;
- expose the minimum read vocabulary: project summary, selected scene, selected
  beat, direction state, demo assets/rig capabilities, location layers, and
  continuity state;
- expose one `submit_direction_proposal` operation that validates and returns a
  proposal to the lab without applying it;
- enforce lab-root path containment, byte/item limits, cancellation, timeouts,
  schema versions, and fail-closed MCP startup; and
- use MCP instructions to state the proposal-only authority and prohibit
  invented IDs, hashes, frames, assets, approvals, or capabilities.

**Non-goals**

- No real projects, general filesystem/shell tool, renderer, Godot/Remotion job,
  asset creation/approval, persistence, or generic MCP framework.

**Targeted verification and completion**

- tool-list snapshot and schema tests;
- adversarial path, oversize, unknown-tool, malformed-proposal, and startup-
  failure tests;
- assertions that the lab fixture is byte-identical after every run; and
- completion only when the server is read-only by construction and every
  denied authority produces a clear failure.

**Accepted package status (2026-07-20):** PR #59 implements only E1-WP2 at
candidate head `e8fcaa7e550f82e073dbbec7a7f8cca78a6b8f21`. The official
MCP SDK is pinned; one visibly synthetic Ollo scene fixture is path-contained,
raw-byte hash-pinned, and byte-identical on Windows; and the exact server surface
is one immutable resource plus `get_scene_context` and
`submit_direction_proposal`. Strict IDs/vocabulary, complete schema fingerprints,
false-only apply/persist/canonical receipt fields, byte/item limits,
cancellation/deadlines, fail-closed startup, bounded JSONL stdio, and real child
process tests keep the lab proposal-only by construction. Local root verification,
8 files/40 focused tests, hosted run `29803474883`, and independent exact-head
scope and security audits passed. ChatGPT Pro accepted exact head `e8fcaa7...`,
and the package merged into `product/v1` at
`ec050cce094fd5adc1a50a132f76795b4543ac73`. This accepts only E1-WP2,
not the complete E1 milestone. The WP2 acceptance did not itself authorize App
Server configuration, prompting, a streamed round trip, a proposal-review
surface, E1-WP3, or Kimi implementation. Preston subsequently authorized only
E1-WP3 through issue #62 and a separate exact-base `START_NOW` update.

### E1-WP3 - Streamed structured-proposal round trip

**Primary invariant:** the host can turn App Server events into an understandable
proposal/approval experience without interpreting conversation/agent terminal
text or applying it. No compatibility exception exists: all terminal-based MCP
discovery is prohibited. Isolation must come from the dedicated Codex-owned
state root and be proven through typed App Server APIs before any prompt.

**Tasks**

- configure the E1 MCP server for the pinned Codex process;
- start one project-scoped thread and ask for a bounded direction revision;
- stream agent messages, tool activity, progress, completion, cancellation, and
  approval/error requests through a typed host adapter;
- validate the returned proposal against the pinned E1 schema; and
- show a small isolated lab surface with selected scope, proposal summary,
  affected items, Preview/Apply/Reject-style states, and a permanently disabled
  Apply action explaining that E1 is read-only.

**Non-goals**

- No Product v1 UI, screenplay generation, image generation, live project
  mutation, rendering, autonomous loop, background run, or terminal requirement.

**Targeted verification and completion**

- deterministic host-adapter fixtures for event ordering and reconnect/error
  handling;
- one actual recorded round trip with the pinned runtime;
- cancel-before-tool, cancel-during-stream, malformed-output, and restart tests;
- visual capture at 1440x900 showing scope, progress, proposal, and read-only
  truth; and
- completion only when the creator-facing event model can be stated precisely
  enough for F3 to design without guessing.

**Authorized package status (2026-07-20):** issue #62 authorizes only E1-WP3 on
`agent/codex-e1-wp3-streamed-proposal-roundtrip` from exact base
`4319967eac13dd628eb863dfb29f7bff3c83ffeb`. The deliverable is the bounded
App Server-to-MCP proposal round trip, typed host event model, and isolated
read-only review surface. E1-WP4, F3, backend product work, and Kimi
implementation remain blocked.

**Superseded blocked feasibility status (2026-07-20):** PR #64 content
`b134cc62bda0055a857cf82b5a48ba57dd2ebc14` removes the unsafe structured MCP
inventory path and fails before App Server launch. Final Sol-high audit and
ChatGPT Pro confirmed that pinned Codex 0.144.1 emits raw configured MCP
environment/header values from `mcp list --json`; receiving that payload, even
only to retain names, violates E1's credential boundary. Empty-table/profile
overrides do not replace inherited MCPs, isolated `CODEX_HOME` loses ChatGPT
authentication, and credential aliasing or terminal-table parsing violate the
accepted constraints. Focused verification passes 57 Codex-lab tests, 1
blocked-state lab test and its production build, privacy, scoped lint, and diff
check. The prior live round trip, only-StoryStage isolation claim, and accepted
proposal-review evidence are invalidated. The replacement 1440x900 capture
shows the truthful fail-closed state with zero console errors or warnings.
That state awaited Preston's platform or architecture decision.

**Superseded compatibility amendment (2026-07-21):** Preston explicitly permitted
a tested internal adapter over only the redacted human `codex mcp list` name
table, with fail-closed verification and no credential access. The adapter may
extract only server name and enabled/disabled state, must reject unknown headers,
columns, row shapes, control characters, duplicates, redaction-marker drift, or
nonzero exits, and must never execute or parse `mcp list --json`. A live receipt
may restore the isolation claim only after pre-launch configuration and the
pinned runtime both prove that StoryStage is the sole enabled MCP. Preston also
granted standing authority to continue through dependency-ordered packages
while away; that authority does not waive hosted checks, exact-SHA Pro review,
milestone gates, or the rule that E1-WP4 cannot start before E1-WP3 is accepted.

**Credential-boundary result:** adversarial testing rejected that adapter before
implementation. Pinned Codex 0.144.1 prints stdio Command and Args and HTTP
URL/query columns verbatim. Synthetic sentinels proved that those fields can
contain credential material, while `mcp list --help` offers no supported
names/status-only projection. Capturing, streaming, proxying, or partially
parsing the table would expose those bytes to a StoryStage-owned process before
discard, so the adapter cannot satisfy its own no-credential-access condition.

**Dedicated-state successor for Pro review:** under Preston's standing
dependency-ordered continuation authority, Codex selects a dedicated Codex-owned
state root with no inherited user `config.toml`. StoryStage supplies only the
fixed `storystage_e1` MCP on the App Server command line. When signed out, the
host uses the pinned typed `account/login/start` ChatGPT flow and opens only its
returned official auth URL; Codex owns credential creation, storage, refresh,
and logout inside its dedicated state root. StoryStage must never read, copy,
link, log, back up, export, or migrate those credential files. Acceptance still
requires exact-one MCP proof before prompting, a successful official interactive
login, the live schema-valid proposal round trip, hosted verification, and an
exact-SHA Pro verdict. This architecture candidate does not start E1-WP4.

**Pro architecture verdict (2026-07-21):** ACCEPTED at exact
`07d2ccf735edc11b6a8de129bd478a986551aa9a`, conditional on this removal of the
obsolete human-table exception and hosted PASS on the corrected exact head.
Implementation must remove inherited `CODEX_HOME`, set only the canonical
dedicated root, and require `initialize.codexHome` to match. StoryStage may
create/select/pass the root but must treat all child state as opaque. The host
must use only typed ChatGPT account/login events, retain auth URL/login ID only
in memory, validate and correlate them exactly, prove one fixed MCP globally
and thread-scoped, and prohibit every `turn/start` until both proofs pass.

**Live successor result (2026-07-21):** official ChatGPT authentication
completed inside the dedicated Codex-owned state root. The first authenticated
inventory proof failed closed because the direct MCP client and App Server
serialized identical JSON Schema object keys in different orders. The
successor now hashes a recursive canonical JSON representation: object keys are
sorted, array order and every schema value remain exact, and semantic drift is
still rejected. A regression proves deep key reordering passes while a changed
schema literal fails. The corrected live run proved exactly one fixed
StoryStage MCP globally and thread-scoped before prompting, called only
`get_scene_context` and `submit_direction_proposal`, returned one validated
ephemeral proposal, persisted no raw protocol/account/thread/turn/token data,
and kept Apply disabled. The sanitized live receipt and replacement 1440x900
capture are committed with their hashes. This is candidate evidence for final
exact-head review; it does not accept E1-WP3 or start E1-WP4.

**Accepted package status (2026-07-21):** PR #64 implements and proves only
E1-WP3 at exact head `681eeb4d7c28405ead53cb8afc16a048c749c53d`.
The object-key-canonical schema fingerprint retains array order and every value;
the completed lifecycle permits exactly one `get_scene_context` followed by
exactly one `submit_direction_proposal` and rejects a second proposal call at
start. The official authenticated live receipt, exact 1440x900 capture, 84
Codex-lab tests, Director-lab tests/build, root verification, two independent
audits, and hosted run `29839630770` passed. ChatGPT Pro accepted the complete
package with no blocker, and it merged into `product/v1` at
`ac2357d2e1419124d832fe26b67e26875f3821e8`. This does not accept the complete
E1 milestone or start E1-WP4, F3, backend product work, or Kimi implementation.

### E1-WP4 - Failure, security, and feasibility gate

**Primary invariant:** every unsupported, hostile, unavailable, or interrupted
condition fails visibly without credential exposure, project mutation, or hidden
fallback.

**Tasks**

- exercise not-installed, revoked/expired, offline, usage-limit, incompatible-
  schema, MCP-startup, malformed/adversarial proposal, prompt-injection, timeout,
  cancellation, child crash, and restart cases;
- audit spawned-process arguments/environment, stdio parsing, path containment,
  tool allowlist, approval routing, redaction, and cleanup;
- record Codex/App Server distribution and license questions for R1;
- list the exact productization delta for F3, B3, R1, and R2; and
- publish one immutable evidence handback for Pro and Preston.

**Non-goals**

- No claim of production security, bundling decision, backend product code,
  automatic fix of later risks, or broader agent/provider support.

**Targeted verification and completion**

- complete negative-state matrix with expected codes/messages;
- no-secret, no-project-mutation, path-containment, and process-cleanup checks;
- actual lab recording, screenshots, exact runtime/schema/tool receipts, test
  commands/results, and known limitations; and
- completion only when Pro finds the evidence truthful and Preston records
  `PASS` or `FAIL` against the exact pushed SHA.

## Milestone non-goals

- F3 UI implementation, B1/B3 backend product work, project schema changes,
  production render/asset/audio work, arbitrary Codex file access, generic agent
  plugins, or automatic image/video/voice generation.

## Milestone evidence and gate

Required evidence is the pinned runtime/hash and generated schema, redacted auth
and process receipts, MCP contract/tests, one recorded streamed proposal, visual
lab capture, complete negative-state matrix, no-secret/no-mutation proof, exact
remote SHA, hosted checks, Pro audit, and Preston decision.

`PASS` authorizes only a separately ticketed F3-WP1. `FAIL` keeps F3 paused and
requires a roadmap amendment. Neither result starts B1/B3 or wakes Kimi without
a higher inbox version.
