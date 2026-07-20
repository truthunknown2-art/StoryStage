# Quality bar

Every StoryStage package preserves explicit process boundaries, validates its
inputs, runs the narrowest relevant checks, records limitations/deviations, and
captures the evidence required by its ticket. Evidence depends on what the
package claims; a docs or frontend ticket does not manufacture a media render.

| Ticket class | Required checks | Required evidence | Media render |
| --- | --- | --- | --- |
| Governance/docs | formatting, links, source precedence, milestone/status consistency, stale-authority scan | exact diff, consistency report, cold-start transcript | No |
| Frontend/UI | focused tests, typecheck, build, browser click-through, accessibility, console/page errors | required viewport screenshots and state report | No |
| Contracts/persistence | unit/integration, invalid input, migration, restart, crash/recovery, privacy | structured test report and visible owning UI state | Only when render data changes |
| Asset/rig | byte/provenance/preparation validation, diagnostics, human gate | contact sheets, rig stills/reel, hashes | Diagnostic media required |
| Godot/Remotion/audio | exact inputs, repeatability, decode/probe, A/V sync, worker failure | MP4/WAV/frame hashes and metadata | Yes |
| Long-form | dependency invalidation, cache, chunking, cancel/resume, resource measurement | exact full MP4 and endurance report | Yes |
| Packaging/release | installer, clean machine, migration, backup, security, licenses, rollback | installer/checksum/videos/reports and packaged outputs | As required by release gate |

Additional rules:

- Remotion output is frame-driven and offline-capable.
- Studio/browser and desktop capabilities stay behind typed host adapters.
- Determinism is tested only where deterministic outputs are claimed.
- Any advertised long-running worker path has visible failure, cancellation, and
  retry/recovery behavior.
- Candidate assets, local UI state, and planning outputs never receive false
  approval, save, playback, render, or delivery authority.
- Only the accepted milestone plan may name the next package. A handback does
  not self-authorize more work.
