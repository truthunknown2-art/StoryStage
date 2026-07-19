# Scene Craft v1 — how StoryStage makes scenes GOOD

- **Status:** Editorial knowledge base — companion to ADR-EDI-001
- **Author:** Kimi (animation-direction lane), 2026-07-19
- **Consumers:** (a) the AI Editorial Director as planning knowledge; (b) Codex validators as measurable checks; (c) the rig/motion layer as capability requirements; (d) humans reviewing cuts.
- **Source:** distilled from the project's own reference analyses (`docs/reference-analysis/*.json`, `REFERENCE-DIRECTION-STUDY.md`) plus standard editorial grammar, mapped to what the pipeline can execute today vs. what it must grow.

Each rule is tagged: **[PLAN]** = planner must decide it · **[CHECK]** = validator can measure it · **[RIG]** = motion layer must be able to render it · **[AUDIO]** = needs the audio lane.

---

## 1. The one law: every shot has exactly one job

A shot must do ONE of: **establish** (where are we), **advance** (story moves), **feel** (emotion, usually a face), or **punctuate** (an insert/accent). If a shot does none, it is cut; if it tries to do two, it is split. **[PLAN]** · **[CHECK]** (shot without a declared job fails review)

## 2. Coverage grammar — the shot-size vocabulary

- **Wide** establishes space and geography; use on scene entry, and again whenever blocking changes significantly. Never default to wide for everything — wide is a *decision*, not a container.
- **Medium** is the conversational workhorse; characters' body language lives here.
- **Close-up** is emotion; it is *spent*, not defaulted. A close-up means "this feeling matters right now."
- **Insert** is information: the prop, the map, the glowing thing. Inserts make reveals land.
- **Mix targets** (kids profile, from measured reference): ≈ 25% wide / 40% medium / 25% close / 10% insert. **[PLAN]** · **[CHECK]** (episode mix outside ±10% of target flags review)
- **Dialogue coverage:** speaker medium/close → **listener reaction** → two-shot to re-ground. Reaction shots come from *who is listening*, not from a role label. **[PLAN]**

## 3. Cut on action, not after it

Cuts land *during* motion, never on stillness-by-default: mid-run, mid-reach, mid-turn. The viewer's eye follows the motion across the cut and never notices the seam. Holds are for *intentional* stillness (see §5). **[PLAN]** · **[CHECK]** (cut frames should fall inside an action-phase window, not a hold, unless justified)

## 4. The camera only moves when the story moves

- **Push-in** = approaching something: a secret, a realization, rising tension. Slow (scale ~0.96→1.04 over 1.5–3s).
- **Pull-back** = context or loneliness; endings and "oh no" zoom-outs.
- **Pan/track** = follow a moving character or reveal space; a run across frame *wants* a traveling pan, not a static camera.
- **Locked** = stability, comedy timing, dialogue ping-pong.
- One motivated move per shot; never stack push+pan without a stated reason. **[PLAN]** · **[CHECK]** (`motivatedMovementRequired` becomes enforced: every camera program requires a motivation class matching the beat's declared job)

## 5. Pacing is a curve, not a metronome

- Every scene has an **energy curve**: settle → build → peak → release. Shot durations track it: longer holds early (let the viewer arrive), accelerating cuts into the peak, one held beat of *stillness before a scare or reveal*, then a breather after.
- The held frame before a reveal is the cheapest drama in editing: 8–16 frames of near-stillness makes the pop 3× stronger.
- Reference cadence (kids): beats of 2.5–5s, but *variance* is the point — a plan whose shot-duration CV < 0.15 is flagged as metronomic. **[PLAN]** · **[CHECK]** (duration-CV floor; pre-reveal hold required before `reveal`-class beats)

## 6. Variety rules (break repetition before it becomes visible)

- No more than **2 consecutive shots** of the same size without a stated justification. **[CHECK]**
- No identical **gesture or pose** repeated within 6 seconds. (The moonlit-ruins cut repeats the same hand-to-ear listen twice in 6s — this rule exists because of that frame.) **[CHECK]** · **[RIG]** (needs ≥6 distinct gesture programs per character)
- Focal staging (left/center/right) must not resolve to a detectable rotation pattern; justify repeats, don't rotate by index. **[CHECK]**
- Reference rule of thumb: **no unchanged visual idea > 4 seconds** (framing, pose, or camera must evolve). **[CHECK]**

## 7. Transition grammar

- **Hard cut** — the default; 80%+ of boundaries. Invisible when cut on action.
- **Dissolve** — time passing or place shifting *with the same subject*; 8–16 frames, and the subject must CHANGE pose/position across it. A dissolve where characters hold identical poses while the background swaps is a known cheat and is **banned**. **[CHECK]** (dissolve with <N px character delta across the boundary fails)
- **Foreground-occlusion wipe** — an object/person passes the lens and hides the cut; the wipe is locked to the occluder's motion, 6–10 frames. Right idea in moonlit-ruins (arch mask) — must execute as a wipe, not a slow fade. **[PLAN]** · **[RIG]**
- **Match cut** — links ideas (moon → glowing stone eye); reserve for intentional rhymes.

## 8. The reveal pattern (the most valuable 4 shots in kids' content)

1. **Noticing close-up** — character's eyes/face; hold; a blink is allowed.
2. **Insert/POV** — what they see (the creature, the lantern), framed as their view.
3. **Reaction close-up** — the gasp, the grin, the recoil wind-up.
4. **Wide** — re-ground geography; play the physical reaction (recoil, step-back, approach).
Skipping steps 1–2 (wide → giant face → wide, as in the current test) is why the moonlit-ruins reveal has no wind-up and no payoff. **[PLAN]** · **[CHECK]** (a `reveal`-class beat must expand to ≥3 of the 4 pattern shots)

## 9. Performance micro-rules for the rig **[RIG]**

- Pose or expression evolves every **1–2 seconds** during holds (breathing, blink, weight shift, gaze drift).
- **Gaze leads motion**: eyes move 2–4 frames before the head, head 2–4 frames before the body.
- Every gesture: **anticipation → action → overshoot → settle**.
- Blinks every 2.5–4.5s, never on a metronome.
- No semi-transparent multi-pose "smear" frames (the ghosting at 0:16/0:20 of the test render); speed is conveyed by spacing and background streaks, not stacked exposures.

## 10. Sound is half the edit **[AUDIO]** (forward-looking, consume when the lane lands)

- Narration/dialogue is the **master clock**: shot durations derive from spoken clauses; cuts land on clause boundaries, not word-count estimates.
- **J-cut/L-cut**: the next scene's audio starts under the current shot (or vice versa) — the cheapest professional polish there is.
- Every reveal, footfall-set, whoosh, and magical accent gets an SFX cue synced to its frame; music functions per scene beat (wonder, tension, play, resolve) with ducking under dialogue.

---

## Worked example — the rules applied (illustrative only)

**This section is NOT a request to redo any existing scene or render.** It takes one previously produced 30-second test (different cast, throwaway showcase) purely to demonstrate what the general rules in §1–§10 *do* when applied to arbitrary content. The point of this document is the general capability: any screenplay fed to the planner should come out cut like the right-hand column below, whatever its characters or setting.

Same story, same assets, 30 seconds. The heuristic cut ≈ 6 static wide tableaux. The craft cut:

| # | Shot | Size | Camera | Content | Why (rule) |
|---|---|---|---|---|---|
| 1 | 0.0–3.5s | Wide | slow pan L→R tracking | Kids run through forest, firefly light leads | Establish + cut-on-action (§1,§3,§4) |
| 2 | 3.5–5.5s | Medium | travels, settles | Kids run, girl glances back at boy — *character* in the run | Reframe on action (§2,§3) |
| 3 | 5.5–7.0s | Close (girl) | locked | She slows, hand rises — **hold 12f still** | Pre-reveal stillness (§5) |
| 4 | 7.0–8.0s | Insert | push-in slow | The stone arch, glowing; moth spirals in | POV/insert step of reveal (§8) |
| 5 | 8.0–9.5s | Close (boy) | locked | Boy's eyes widen; blink; breath | Reaction step of reveal (§8) |
| 6 | 9.5–12s | Wide | locked | Both burst through arch — **occlusion wipe on the arch edge** | Real wipe, motion-locked (§7) |
| 7 | 12–14.5s | Medium | pan with sneak | Interior; they sneak, girl *new* gesture (finger to lips — not the repeated ear-cup) | Variety (§6), cut on action |
| 8 | 14.5–15.5s | Close (girl) | locked | She freezes — hold | Stillness before scare (§5) |
| 9 | 15.5–17s | Insert, low angle | push-in | Creature's eye opens among leaves | Insert step of reveal (§8) |
| 10 | 17–18.5s | Close (both kids) | slight pull | Recoil wind-up faces | Reaction step (§8) |
| 11 | 18.5–21s | Wide | locked | Full recoil + scramble; creature sits up, clumsy-friendly | Wide payoff (§8), no ghosting (§9) |
| 12 | 21–23s | Medium | pan L | Kids dash off; creature watches, head tilt | Exit on action (§3) |
| 13 | 23–24.5s | Wide→(dissolve) | locked | Kids run through sunlit meadow — 12f dissolve, kids *change* pose across it | Honest dissolve (§7) |
| 14 | 24.5–27s | Medium two-shot | slow push | Kids slow, turn; girl waves | Re-ground, warmth (§2) |
| 15 | 27–30s | Wide | slow pull-back | Creature waves back among flowers; hold on tableau | Pull-back ending (§4,§5) |

Same 30 seconds, same drawings: 15 shots instead of 6, every size doing a job, camera moving only with story, reveal built in 4 steps, zero repeated gestures, zero cheat transitions. **This table is the pilot's scoring rubric made concrete** — Cut B should be judged against these rows, not against taste in the abstract.

## Adoption path

1. Pro/Codex: accept as the normative editorial spec alongside ADR-EDI-001.
2. Codex: encode **[CHECK]** rules into `quality-report.ts` (blocking level for the banned patterns: pose-identical dissolve, >2 same-size streak, CV < 0.15, reveal without pattern, static idea > 4s).
3. Kimi: encode **[PLAN]** rules as the AI Editorial Director's planning knowledge; **[RIG]** rules feed the rig proof acceptance criteria.
4. Audio lane: consume §10 when narration lands.
