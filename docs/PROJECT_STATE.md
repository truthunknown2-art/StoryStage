# Project state

## Accepted baseline

SS-001 remains accepted workstation infrastructure: browser studio, secure Electron host, isolated render worker, deterministic regression fixture, real MP4 output, progress, file reveal, and retryable failure state. Its geometric sample is not a product-quality visual target.

## Active milestone

`SS-002: Two-Profile Script-to-Animatic + Generated Asset Seam` is active.

`SS-004: Verified Delivery Bundle + Durable Render Receipt` is implemented and locally proven, awaiting Pro audit. Full renders now produce a probed content-hashed receipt and an atomic seven-file delivery binding the exact production, master, captions, rights/provenance, and toolchain. Delivery status survives restart and is re-verified before open/reveal; imported audio cannot pass the final gate without explicit content-bound clearance.

The SS-003 Rook pilot opening slice is engineering-complete and was accepted by Pro at `6bcd590`. It provides a fixed 26.33-second history production, a complete public Rook candidate, and a trusted terminal review/promotion path. The remaining Rook visual, final voice, timing, and mix decisions are real human gates rather than hidden implementation claims.

Pro's narrow re-audit of follow-up commit `1c0d6a2` accepted Gate 4, marked D resolved, found no remaining code-level blocker in scope, and called the result an honest durable foundation for continued product work. That acceptance covers the import, preparation, selection, promotion, approval-recovery, and approved-frame foundation; it does not claim product completion or final visual quality.

- Production bundles are finalized by Electron main, saved through per-production/revision queues, and rejected unless the complete stored render plan canonically equals a fresh compile of the included resolved plan.
- Generation exports are bound to the exact acknowledged production-bundle content hash and authoritative generation briefs. Restart comparison normalizes only the valid brief lifecycle status change from draft to exported.
- Import evidence is a schema-checked, cross-file-bound, atomic directory transaction. Bundle metadata, import records, and validation reports bind role, codec, dimensions, rights, source hash, and staged hash. Crash-point tests cover failure after each write and after atomic commit, followed by idempotent retry.
- Durable exchange states are schema-refined and rehydrated only when their required artifacts verify. Structured and loose staged bytes are reopened in the isolated worker before later trust transitions.
- Sharp performs real decode, orientation normalization, metadata stripping, trim/padding, canonical canvas registration, alpha checks, prepared PNG writes, and contact-sheet generation.
- Coherent contact sheets are compared before rigging. Only the selected set receives a role-specific manifest, technical validation, and a four-second moving diagnostic.
- Final human approval binds the exact prepared bytes, manifest, validation report, watched diagnostic MP4, provenance, and immutable local asset version.
- Approval is an idempotently recoverable review -> production revision -> approved-state transaction. Startup reconciliation completes any crash-stranded approval, and tests cover all three checkpoints.
- Selected-rig construction and promotion are independently replay-safe before that transaction begins. Retries verify and reuse existing manifests, validation reports, diagnostic videos/reports, stable timestamps, and the resulting `ApprovedAssetVersion`.
- Immutable artifact publication uses complete temporary files plus atomic hard links, so a process exit cannot leave a partially written final filename.
- Approval creates a new production revision through the same shared operation used by the desktop and proof runner, then recompiles the complete frame-accurate plan.
- The SS-002 Remotion composition consumes the saved plan and approved local pixels. The render worker independently rechecks containment, symlinks, PNG codec/dimensions/alpha, hashes, validation, diagnostic evidence, and production-bundle derivation.
- The Electron bundle now includes every workspace TypeScript package it executes. A build-time check rejects unresolved `@storystage/*` runtime imports, covering the launch crash found during the live desktop pass.
- Direction review now has a functional frame playhead, play/pause transport, exact shot-boundary jumps, and synchronized shot inspector. It remains an explicitly labeled planning timeline until approved artwork exists.
- Per-shot transition overrides compile through the resolved plan into semantic hard-cut or foreground-wipe actions and deterministic Remotion entrance treatment. Visual-treatment overrides now reroute the active creative shot, treatment-specific visual requirements, generation briefs, bindings, metrics, semantic kinetic-type action where applicable, and frozen render hash. Any approved asset version whose requirement disappears is removed from the edited session instead of being silently rebound to a different visual job.
- A dedicated spoken-timing workspace derives narration/dialogue cues from the parsed script, identifies speakers, edits rendered caption text, retimes shots in exact frames, shifts every downstream boundary deterministically, and records explicit editor timing locks. Preflight counts only reviewed locks; the UI clearly does not treat them as recorded or approved voice performances.
- The desktop now imports bounded uncompressed WAV voice masters through a native picker, validates RIFF chunks and PCM/float metadata, publishes immutable private bytes, binds their SHA-256 and runtime metadata to the production, streams them into an in-app audition player, and requires a listen-through before main-process approval. The isolated render worker independently reopens and verifies an approved track before Remotion encodes it into AAC.
- Dialogue actions now compile profile-specific, timing-driven mouth cues into the immutable render plan. Approved neutral/talk poses alternate on exact deterministic frames (a slower 4-open/3-closed cadence for Kids and a tighter 3-open/2-closed cadence for History). This is honest two-pose lip sync, not phoneme analysis.
- Audio now has a profile-aware mix-decision card. Voice gain, the explicit music decision, transition-SFX selection, and SFX gain are saved and hash-bound; any change clears review. Remotion no longer inserts a fake guide loop when no voice or music exists.
- Music masters now use the same bounded native-WAV, immutable private publication, in-app listen-through, explicit approval, and independent render-worker reverification chain as voice. An approved master can be selected at an exact gain with an explicit loop decision; otherwise the saved choice remains pending or intentionally dry.
- Custom SFX now use reusable approved WAV assets plus shot-relative cues. Each cue stores the target shot, exact frame offset, gain, and label; retiming moves the cue with its shot, while the worker independently reopens every approved effect before Remotion places it.
- Existing pre-mouth-cue production snapshots remain strictly verifiable through a single legacy-plan shape (the only permitted difference is absent mouth-cue metadata). Opening one recompiles and resaves the current plan, preserving private local projects across the compiler upgrade.
- Completed approved renders now stream back into the sandboxed studio through a narrow, validated `storystage-media` route. The in-app H.264 player has native playback plus exact-frame and shot-boundary review controls; it exposes only verified completed MP4s from registered render roots.
- Production render requests now choose an explicit `engineering-slice` or `full-production` scope. The full path uses the complete frozen frame duration, receives a longer bounded worker deadline, and is guarded by one shared readiness policy in both the studio and isolated worker: unresolved acquisition, placeholder bindings, missing art approval, unlocked spoken timing, unaligned voice, unreviewed mix, or unapproved custom SFX blocks the export. Completed full renders use the same exact-frame player across the complete plan.
- A root renderer error boundary replaces blank-window failures with a local recovery screen, preserves saved production data, and offers an explicit reload action with optional technical detail.
- The former disabled Preflight placeholder is now an evidence-backed readiness view. It distinguishes compiled/saved/renderer checks, required asset approvals, deferred sources, engineering-slice eligibility, and the still-closed finished-episode gate.
- Exported manual image jobs now become a resumable ChatGPT subscription prompt queue. Each candidate-set file has a role-specific, continuity-locked prompt and suggested filename; prompts leave StoryStage only through an explicit copy action, and the app never reads or stores the ChatGPT session.
- The first original Frankly Weird History Show Pack candidate now exists. Rook has a canonical identity sheet and three transparent identity-locked poses generated with the built-in ChatGPT image tool, exact prompts and SHA-256 provenance, canonical 1600x1800 normalization, common-ground registration, a passed rig manifest, and a real four-second moving diagnostic. The Assets workspace exposes the identity sheet, normalized poses, technical evidence, and playable diagnostic while correctly retaining the human-review gate.

## Real proof

`pnpm render:production-proof` creates a private deterministic engineering fixture and exercises the concrete staging, evidence, Sharp preparation, selected-rig, review, approval transaction, production-revision, and render operations used by the desktop.

Current proof evidence is under `artifacts/SS-002/`:

- two 6.08-second H.264 MP4 renders of the same saved production revision
- 1920x1080 at 30 fps
- 181 probed video frames per render
- stereo AAC stream
- approved hash-bound WAV engineering voice master encoded through the production composition
- separate approved hash-bound WAV engineering music master encoded at the reviewed gain/loop decision
- approved custom WAV effect placed from a shot-relative frame cue
- profile-specific timing-driven mouth cues frozen in the approved render plan
- five exact-index decoded frame pairs with matching SHA-256 hashes
- four-second moving diagnostic and content-bound report
- exact production bundle, approved manifest, and diagnostic hashes
- a real full-production receipt and content-addressed seven-file delivery
- deterministic SRT output, consumed-media rights report, atomic idempotent publication, and restart re-verification

The proof art is deliberately simple local engineering art. It proves the executable path; it is not evidence of the requested visual style or a substitute for original ChatGPT-generated production assets.

## Gate status

- Gate 1 reference cut measurements: complete.
- Gates 2-3 production draft, New Production UI, two-profile planning, metrics, and semantic overrides: accepted by Pro against commit `1c60d93`.
- Gate 4 durable generation/import foundation and executable manual image exchange: accepted by Pro at follow-up commit `1c0d6a2`; A-F and the executable approved-frame slice are resolved within that audit scope.
- Gate 5 original ChatGPT production art for both profiles: the credential-free subscription prompt queue and import path are implemented and live-verified. One original history presenter candidate is generated and visible with exact provenance, but it is deliberately unapproved; Kids art, environment/editorial libraries, and production binding remain pending.
- Gate 6 preparation and validation: implemented for 2D pose-swap characters, background layers, and props. Rook is normalized, ground-registered, technically validated, and has a moving diagnostic awaiting human review; skeletal/part rigging and Blender routing remain pending.
- Gate 7 semantic Remotion animation: the plan-driven renderer supports both a 24-second engineering slice and the complete frozen production duration with approved local voice/music/custom-SFX masters, deterministic two-pose timing-driven lip sync, shot-relative SFX placement, and hash-bound mix decisions. The slice is proven; a gate-complete real-art full render, phoneme/viseme sync, and visual polish remain pending.
- Gate 8 review/override: shot overrides including asset-aware visual-treatment rerouting, real rendered transition direction, spoken cue retiming, asset selection/approval, a functional frame-accurate cut timeline, an editor-lockable narration/caption timing workspace, local WAV import/audition/approval, scope-aware playback of completed approved H.264 output, and evidence-backed production preflight exist; unrendered live Remotion preview and broader performance controls remain incomplete.
- Gate 9 profile-distinct production outputs: pending.

## Product truth

StoryStage is not yet the complete script-to-finished-episode product. It does not yet automatically create final ChatGPT art, record voice acting inside the app, acquire licensed stock/archive media, or route Blender scenes. It can independently import, audition, approve, bind, and render local WAV voice/music/SFX masters; place reusable custom effects on exact shot-relative frames; compile deterministic two-pose mouth timing; and save explicit mix decisions. The manual subscription-backed image workflow is intentional: no API key, browser cookie, password, or ChatGPT session is stored by the app.

A narrow MVP still requires one polished 2-3 minute episode in one approved Show Pack with recurring approved original assets, real voice timing, performance-polished lip sync, captions, final SFX/music masters where selected, appropriate factual or generated visuals, editable locks, provenance, and reproducible 1080p output.
