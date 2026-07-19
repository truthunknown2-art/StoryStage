# Kimi fresh-eyes product gap audit

- **Received from:** Preston, quoting Kimi
- **Recorded by:** Codex
- **Date:** 2026-07-19
- **Purpose:** preserve the exact product diagnosis for Pro/Codex roadmap review

## Kimi's assessment

Kimi's fresh-eyes conclusion is that StoryStage is on the correct architectural
track. Its component scorecard is:

| Component                   | State                            | Assessment                                                                             |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| AI art pipeline             | Working                          | GPT-to-character/background/prop exchange is manual but real and verified.             |
| Asset chain of custody      | Exceptional                      | Hash, approval, and verification work is unusually strong and has long-term value.     |
| Part slicing and rigging    | Approximately 80%                | 29-part Ollo atlases exist; pivot registration is the current visible blocker.         |
| Remotion renderer           | Correct choice                   | Deterministic frames match the product philosophy.                                     |
| Continuity system           | Strong                           | World state, camera, and timing authority are a major strength.                        |
| Studio UI                   | Good skeleton                    | Create is approaching the mockup; Studio still needs real art and an episode timeline. |
| Editorial brain             | Previously missing, now accepted | ADR and Scene Craft exist; the contract is being built.                                |
| Rigged motion library       | Contract-ready, rig-blocked      | Walk, acting, and visible lip-sync motion follow registration.                         |
| Voice/TTS and real lip sync | Largest true gap                 | Contracts exist, but nothing creator-audible is integrated.                            |
| Music and SFX               | Missing                          | Cue infrastructure exists without approved assets or a complete timeline grid.         |
| Screenplay-scale ingest     | Current ceiling                  | The short-script parser does not yet represent a 5–20 minute episode hierarchy.        |
| Long-form rendering         | Unscheduled engineering          | Chunking and stitching long frame ranges remains to be built.                          |
| Quality gates               | Partly advisory                  | Kimi proposes promoting Scene Craft checks.                                            |

Kimi identifies the remaining pain in this order:

1. sound and character-specific voice;
2. screenplay-scale ingest and chunked long-form rendering;
3. implementation rather than architectural replacement.

Kimi's proposed sequence is:

```text
rig registration
  → first articulated Ollo motion proof
  → editorial pilot
  → voice
  → scale
```

## Codex reconciliation questions for Pro

### 1. Quality enforcement

Kimi's statement that Scene Craft `[CHECK]` rules are ready to become blocking
conflicts with Pro's exact Scene Craft ruling and the accepted v1.1 taxonomy.

Codex recommends:

- hard-block only lineage, timing/read-window, continuity/geography/lifecycle,
  capability, action/contact, and dishonest-render failures;
- keep shot mix, duration variance, repeated framing/gesture, reveal coverage,
  and static-idea duration as graded findings until blind evidence calibrates
  them.

### 2. Guide voice ordering

Codex questions placing all voice work after the editorial pilot. A blind
editorial A/B should use one identical guide-voice timing basis for both cuts so
coverage and cut decisions can follow spoken clauses rather than word-count
estimates. Polished character casting and final performance may follow the
pilot, but the guide clock may be a prerequisite.

### 3. Motion proof boundary

The first articulated Ollo proof should remain a bounded performance proof after
Preston approves registration. It must not be mistaken for the ordinary-path
episode benchmark or grant capability merely because a hand-authored motion can
render.

### 4. Scale-out sequence

Screenplay hierarchy and long-form chunk/stitch remain required product lanes,
but should follow the two perceptual proofs unless they are needed to avoid
locking the editorial proposal into a short-script-only shape.

## Requested Pro ruling

Confirm or amend:

1. whether a shared guide-voice clock is required before the blind editorial
   pilot;
2. which exact quality classes may block before pilot calibration;
3. whether hierarchical screenplay contracts must precede the v1 editorial
   proposal contract even if long-form execution follows later;
4. whether the product sequence should be
   `registration → articulated proof → guide clock → editorial pilot → polished audio → scale`.
