# E1-WP4 security-boundary audit

**Evidence class:** isolated feasibility lab

**Runtime:** pinned Codex CLI / App Server `0.144.1` on Windows x64

**Claim boundary:** fail-closed E1 evidence, not production security

| Boundary                        | Implemented E1 control                                                                                                                                                                | Executable evidence                                                                               | Retained limitation                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Child arguments and environment | Direct native spawn, fixed App Server/MCP arguments, allowlisted environment, inherited `CODEX_HOME` and credential variables removed                                                 | `app-server.test.ts` — fixed MCP args; credential variables not forwarded                         | Release discovery/bundling is R1                                                        |
| Account availability            | Official ChatGPT account required; revoked, offline, incompatible, and usage-limit states stop before thread or turn creation                                                         | `proposal-roundtrip.test.ts` — signed-out, account availability, and usage-limit pre-prompt tests | Production reconnect policy is B3/F3                                                    |
| App Server stdio                | Fatal UTF-8, JSON object, `jsonrpc: 2.0`, one result-or-error, known response ID, record/stream/count/text limits                                                                     | `app-server.test.ts` — malformed envelope, ID, and budget tests                                   | Versioned installed-build fuzzing is R2                                                 |
| Bounded MCP                     | Exactly one server, one resource, two exact schemas; tool arguments validated at start/completion; scene context must equal the pinned fixture; proposal arguments must equal receipt | `proposal-roundtrip.test.ts` — schema-valid semantic drift and argument/receipt correlation       | Durable project context is B3                                                           |
| Tool and approval authority     | Unknown tools, command items, approval/client requests, retry requests, and unknown turn/item/MCP activity fail visibly and interrupt once                                            | `proposal-roundtrip.test.ts` — forbidden work, retry, prompt-injection, and interruption tests    | Production command/apply authority is B3                                                |
| Path containment                | Workspace is created beneath the validated StoryStage LocalAppData lineage; no `TEMP`/`TMP` path selection; links/junctions rejected                                                  | `lab-workspace.test.ts`                                                                           | Packaged job/process sandbox is R2                                                      |
| Redaction                       | Allowlisted receipts; sensitive keys redact values of every type; email, bearer/JWT, UUID, and Windows-path shapes rejected                                                           | `redaction.test.ts` and root privacy verifier                                                     | Installed support-bundle audit is R2                                                    |
| Cleanup and restart             | Clean stdin/exit, bounded timeout termination, workspace removal, crash-to-new-client restart, and primary-plus-cleanup failure preservation                                          | `process-cleanup.json` and cited tests                                                            | Forced descendant containment via Windows job objects is R2; `productionReady` is false |
| No project mutation             | Nine real proposal-roundtrip failure seams execute beside a decoy project; a full tree snapshot detects changed, deleted, added, or non-file entries                                  | `no-project-mutation.json` and cited test                                                         | This is not a production-project integration test                                       |

The negative-state catalog is generated at `failure-matrix.json`. Each row has a
unique stable presentation code and creator message, explicit recovery outcome,
an executable test anchor, and false authority for automatic retry, hidden
fallback, credential access, and project mutation. The E1 Director lab renders
the catalog as deterministic fixtures and labels production services as
disconnected. Apply remains disabled.

Known limits are intentional and blocking for later release claims: App Server
is experimental; runtime distribution is unresolved; the lab is not connected
to a real StoryStage project; and production-grade Windows process-tree,
installer, update, diagnostics, and support controls remain R1/R2 work.
