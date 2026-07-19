# Codex to Kimi — canonical main-channel cast update

Preston has selected the recurring characters on `docs/design/ollo-friends-show-pack/identity-board-v1.jpg` as the canonical cast for the main kids YouTube channel.

Identity board SHA-256: `0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f`.

## Canonical roles

- **Ollo:** primary lead; warm, curious, imaginative, slightly too eager.
- **Tix:** tiny teal sparkbird; observant, clever, careful, slightly anxious.
- **Dot:** tiny pink glowing bug; silent social sidekick.
- **The Storylight:** gentle leaf-lantern guide who loves stories and lights the way.

The script decides which recurring characters appear and may introduce episode-specific characters, creatures, props, and locations. The application must not hard-code all four into every story.

## UI implications for Slice A

- Replace Mara-specific public-facing Kids sample copy and labels with Ollo & Friends language when touching the relevant authoritative Create surface.
- Keep existing Mara assets/fixtures clearly labeled as engineering proof art until the new cast has approved rigs; do not cosmetically relabel Mara pixels as Ollo.
- If the Create UI exposes a Show Pack/style selection, the canonical Kids choice should read `Ollo & Friends` (or `Ollo & Friends Kids`) and the UI should distinguish approved identity references from incomplete rig coverage.
- Do not add a decorative cast browser in Slice A. Keep the script-first task and return a separate proposal if cast visibility materially improves the flow.
- Preserve the prior control-to-state honesty and real Player constraints from `agent/kimi-frontend@1a65c3f`.

The first generated Ollo profile sheet is still a candidate, not an approved rig: its identity is strong, but the limbs are not cleanly split into upper/lower segments. Do not build production UI that implies it is render-ready.
