# Multi-shot prompt framework to StoryStage crosswalk

- **Status:** governed planning input; not executable product authority
- **Exact source receipt:**
  [`multi-shot-prompt-framework-animation.receipt.md`](../research/source-frameworks/multi-shot-prompt-framework-animation.receipt.md)
- **StoryStage adaptation:**
  [`multi-shot-director-adaptation.md`](./multi-shot-director-adaptation.md)
- **Vocabulary:** `RETAIN`, `ADAPT`, `REJECT`, `GENERATOR-SPECIFIC`

The source framework targets a short prose prompt for generated-video tools.
StoryStage instead directs approved assets, articulated Godot performances,
layered environments, real audio, and one deterministic Remotion episode.
This crosswalk prevents useful directing practice from being lost while keeping
generator constraints out of the production contract.

## Rule crosswalk

| Source rule or behavior | Decision | StoryStage treatment | Planned authority |
| --- | --- | --- | --- |
| Establish each character's recognizable appearance and performance energy | ADAPT | Reference approved character, costume, view, rig, expression, and capability IDs; request missing assets instead of redescribing or inventing them | F4, B2, B3 |
| Infer character details from an uploaded reference | ADAPT | Image intake may propose metadata, but identity and rig readiness remain explicit user-approved asset state | F4, B2 |
| Require character, action/script, location, and time of day | RETAIN | These become typed scene inputs plus grammar, art direction, audio timing, incoming continuity, props, and layer inventory | F3, B3 |
| Ask for missing required story information | ADAPT | Show a scoped direction/asset request or honest fallback; do not silently claim production capability | F3, F4, B3 |
| Bind spoken dialogue to the shot and action where it occurs | RETAIN | Store dialogue/narration cue identity and timing separately, then bind it to shot performance, captions, visemes, and audio lanes | F5, B3, B4 |
| Break a scene into multiple timed shots | RETAIN | Produce editable shot intents inside episode -> sequence -> scene -> beat hierarchy | F3, B3 |
| Make shot count and pacing serve action, dialogue, reaction, and energy | RETAIN | Use guide/final audio, readable action phases, reaction holds, reveal, geography, and dramatic purpose | F3, B3 |
| Always total exactly 15 seconds | REJECT | Scene and shot duration follow screenplay, selected audio, action readability, and deterministic timing constraints | B3, B4 |
| Allow only 3-7 shots of 2-5 seconds | REJECT | No universal quota; deterministic validation enforces valid positive bounds and project duration, not taste by fixed count | B3 |
| Vary shot count each run to feel fresh | REJECT | Distinct plans must follow story purpose, not randomness or novelty for its own sake | B3 |
| Timecode every shot | ADAPT | Store typed timing constraints and derived frame/sample ranges; prose timecodes are an optional display/export format | F3, F6, B3, B4 |
| Specify shot size | RETAIN | Use the accepted Visual vocabulary and camera-safe composition constraints | F3, B3 |
| Specify lens equivalent as compositional shorthand | ADAPT | Optional lens-equivalent intent may describe compression/space but never claims a physical camera simulation the renderer does not provide | F3, B3 |
| Specify camera angle | RETAIN | Use supported angle vocabulary with subject, eyeline, geography, and rig-view validation | F3, B3 |
| Specify one camera movement verb | ADAPT | Camera intent maps to supported Remotion camera programs, duration/easing, safe bounds, and an honest static fallback | F3, B3 |
| Never repeat size, angle, or movement in consecutive shots | REJECT | Repetition is allowed for geography, comparison, dialogue coverage, comedy, tension, or visual rhyme; changes require motivation | B3 |
| Every cut should meaningfully shift perspective | ADAPT | Every cut needs a purpose and motivation, but a hold or matched/repeated composition may be the correct choice | F3, B3 |
| Emit one compressed prose paragraph per shot | GENERATOR-SPECIFIC | Canonical output is typed, editable data; compressed prose may be a derived provider/debug view only | B3 |
| Repeat visual character description across shots | GENERATOR-SPECIFIC | Stable IDs and continuity state replace repeated prose reconstruction | B1, B3 |
| Place dialogue in quotation marks inside shot prose | GENERATOR-SPECIFIC | Preserve exact line identity in typed dialogue/narration cues and derive readable review text | F5, B3, B4 |
| Always append Location metadata | ADAPT | Location, depth planes, time-of-day/lighting state, safe bounds, props, ambience, and continuity are canonical scene data | F4, B1, B3 |
| Force a fixed diegetic-only Audio line | REJECT | Narration, dialogue, ambience, foley/SFX, music, captions, and intentional silence are separate editable lanes | F5, B3, B4 |
| Limit output to 1,500 characters | GENERATOR-SPECIFIC | No canonical plan-size limit; provider requests may derive bounded payloads without truncating required production truth | B3 |
| Trim atmosphere before timing, dialogue, and technical fields | ADAPT | Provider/debug summaries may compress decoration, but canonical state and selected script/audio are never discarded | B3 |
| Deliver a copy-ready fenced prompt plus a short rationale | GENERATOR-SPECIFIC | Studio shows editable proposals, diff/rationale, capability warnings, accept/reject, undo, and range regeneration | F3, B3 |
| Default missing action to walking/exploring/arriving | REJECT | Missing action becomes a question, direction request, or explicitly accepted fallback; the Director cannot invent filler motion silently | F3, B3 |
| Spread dialogue across shots according to readable timing | RETAIN | Dialogue timing constrains coverage, reactions, visemes, J/L cuts, and scene duration | B3, B4 |
| Use over-the-shoulder coverage for multi-character geography | ADAPT | OTS is one option when asset views, scale, eyelines, occlusion, and screen direction make it renderable | F3, F4, B2, B3 |
| Favor fewer/longer shots for contemplative scenes | RETAIN | Treat as an editorial prior, not a blocker or quota | B3 |
| Favor more/shorter shots for high-energy scenes | RETAIN | Treat as an editorial prior bounded by readable action, audio, continuity, and renderability | B3 |
| Favor wider establishing views for exteriors and tighter views for interiors | ADAPT | Treat as a compositional prior; story purpose, set geometry, safe bounds, and scale may override it | B3 |
| Ground surreal scenes with precise camera language | RETAIN | Abstract content still requires supported composition, movement, continuity, and layer behavior | F3, B3 |

## StoryStage adoption requirements

1. **G0 - source governance.** Preserve the exact receipt, this crosswalk, the
   adaptation, and roadmap links. Do not let the source become a second product
   contract.
2. **F3 - creator vocabulary.** Direct, Visual, and Motion controls expose the
   useful purpose/composition/camera/action concepts with beat/scene scope,
   undo, and honest unavailable states.
3. **F4 and B2 - production capability.** Character views, rigs, actions,
   locations, depth planes, occluders, props, ambience, and camera-safe bounds
   determine what a proposal can actually request.
4. **B3 - typed Director proposal.** The source's shot breakdown becomes
   structured, editable, capability-aware intent plus deterministic validation;
   generator quotas and prose limits remain rejected.
5. **B4 - audio timing.** Dialogue, narration, captions, visemes, SFX, music,
   and silence are separate synchronized lanes rather than one fixed metadata
   sentence.
6. **B3 benchmark gate.** One unseen Kids script and one materially different
   Weird History script must yield distinct, sensible, editable plans through
   the ordinary product path, with original StoryStage content and assets.

## Stop rules

- This document does not authorize F3, B3, an external provider, generated
  video, or schema work.
- The source's fixed duration, shot quotas, forced variation, character-count
  ceiling, and diegetic-only audio rule must not appear as StoryStage-wide
  validators.
- AI proposals never own stable IDs, frame/sample truth, asset approval,
  continuity, capability, project persistence, or render authority.

