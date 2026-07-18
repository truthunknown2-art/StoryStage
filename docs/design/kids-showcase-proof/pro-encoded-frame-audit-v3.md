# Pro encoded-frame audit v3

Source audited: `artifacts/CV-003/kids-showcase/moonlit-ruins-30s.mp4`

Verified output: 1920x1080 H.264, 30 fps, 900 frames, 30.000 second video stream.

Verdict: **NO-GO**. This is not a retiming problem. The encoded file contains atlas/exposure dropouts and multiple unmotivated continuity breaks.

## Blocking failures

- Frames 83/84: the opening run restarts at a new root and scale. Merge the run and threshold into one shot.
- Frames 131/132: running becomes idle with no deceleration or plant.
- Frames 342-360: reveal teleports the children and contains blank or partial sprite exposures.
- Frames 402-406: guardian disappears at the close-up boundary.
- Frames 449-452: Mara and Milo reverse order and disappear.
- Frames 521-524: the sneeze setup collapses and moth position jumps.
- Frames 640-664: a wipe hides a wholesale teleport rather than a physical crossing.
- Frames 749-754: moving subjects disappear and dissolve into a static payoff.

## Replacement 900-frame cut

| Shot | Frames | Named cut event | Purpose |
| --- | ---: | --- | --- |
| Run through the arch | 0-119 | planted-threshold-foot | One continuous left-to-right pursuit and physical arch crossing. |
| Listen at threshold | 120-209 | moth-crosses-threshold | Inherit roots; decelerate for 10-14 frames; Milo left, Mara right. |
| Hall sneak and plant | 210-341 | moth-lands-on-nose | Establish visible entrance; continuous moth path; children enter left and plant. |
| Guardian wake | 342-413 | guardian-eye-open-apex | Preserve child marks/order and complete the wake without blank exposures. |
| Guardian close-up | 414-461 | gaze-lock | Keep moth attached to a guardian-relative nose socket. |
| Kids reaction | 462-533 | reaction-settle | Milo left, Mara right; Mara leads, Milo follows 4-6 frames later; hold. |
| Sneeze, turn, catch | 534-653 | first-escape-foot-contact | Tickled nose, inhale, sneeze, delayed reaction, visible pivot, guardian catches moth. |
| Escape through portal | 654-773 | clearing-foot-plant | Inherit marks and gait; run right-to-left through a real visible arch. |
| Offer and hesitate | 774-845 | mara-hand-contact | Decelerate into payoff marks on screen; gaze, head, torso, then hand. |
| Understand and play | 846-899 | living-hold | Moth release, mirrored wave, Milo joins late, readable living hold. |

## Fixed geography

- Forest: entry left, arch right.
- Hall: entrance/exit left; Milo stop mark left; Mara center-left; guardian right.
- Moth path: left to guardian nose, airborne after sneeze, held by guardian, offered, held by Mara, released.
- Escape: visible right-to-left pivot back through the same entrance.
- Mara and Milo never exchange left/right order inside the hall.

## Product consequence

The Director must compile named picture events, stage state, screen order, motion/gait, gaze, prop ownership, camera intent, layers, performance programs, and audio anchors before Remotion runs. The compiler must reject visibility dropouts, unexplained root/scale changes, order reversals, travel-to-idle cuts without deceleration, ownership jumps, fake wipes, incomplete read windows, and untested atlas exposures. The same checks must run against decoded MP4 frames.

