# Performance and rigging

## Select the source

| Need                                                  | Source                    | Required evidence                                                                |
| ----------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| Repeating walk, run, sneak, or fly                    | `atlas-cycle`             | chronological frames, view, root distance, contacts, loop seam                   |
| Sneeze, jump, turn, reveal, impact                    | `drawing-sequence`        | authored anticipation/action/overshoot/settle, exposure durations, event markers |
| Acting, dialogue, eyelines, reaching, prop continuity | `articulated-performance` | renderable bones/meshes/facial channels and view-specific textures               |
| Short comprehension or reaction hold                  | `living-hold`             | gaze, blink, mouth/head, breathing, secondary motion; no stage translation       |
| Silhouette-changing hero action plus acting           | multiple sources          | explicit phase handoff and entrance/exit continuity hashes                       |

Use a living hold for roughly two seconds or less at 30 fps unless the final comprehension image intentionally holds longer. Do not slow a run into a sneak or reuse a calm run for a panic escape.

## Manifest requirements

Every clip or rig reference must declare:

- exact asset and manifest content hashes;
- performer identity and view;
- crop bounds and root anchor per drawing;
- frame exposures, not only frame order;
- foot/hand/prop contact windows;
- distance per loop for locomotion;
- named events such as `foot-contact-left`, `inhale-apex`, `impact`, `spark-onset`, `reaction-apex`, and `settle`;
- loop versus one-shot semantics;
- entrance and exit continuity hashes;
- channels the runtime truly renders.

## Motion review

- Drive locomotion phase from root distance so feet do not slide.
- Face the travel direction; use a profile or three-quarter travel view rather than a front-facing moonwalk.
- Use arcs, spacing, anticipation, overshoot, settle, overlap, drag, and follow-through intentionally.
- Offset multiple characters. Shared timing looks mechanical and destroys hierarchy.
- Keep planted contacts stable through camera and sprite transforms.
- Apply motion blur only when motivated. Prefer background or directional smear for speed; do not blur the entire performer by default.
- Change view at a cut or through an authored turn, never through mismatched whole-body crossfades.
- Inspect consecutive frames around crop boundaries and occluders.

## Dialogue performance

An articulated dialogue rig needs gaze, blink, head, torso, mouth, and at least one asymmetric gesture channel. Derive visemes from the exact approved take. Blend mouth shapes with coarticulation; keep consonant closures brief and readable. Performance beats lead or lag words according to intent rather than snapping on every syllable.
