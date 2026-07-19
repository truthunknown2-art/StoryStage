# Audio and dialogue direction

## Spot against picture events

Create named picture events before placing cues. Examples:

```text
foot-contact-left
threshold-leaf-contact
guardian-inhale-apex
sneeze-impact
spark-onset
child-reaction
moth-offer
comprehension-settle
```

Anchor Foley and hard effects to events. Use frame offsets only as compiled results or deliberate prelap/tail adjustments.

## Audio roles

- **Dialogue/vocalization:** exact approved performance, word alignment, visemes, intelligibility priority.
- **Foley:** contact and material detail derived from animation events.
- **Ambience:** location continuity across cuts, with loop and crossfade regions.
- **Sound effects:** causal impacts, magic, transitions, and designed emphasis with attack and tail.
- **Music:** scene function, mood, instrumentation, tempo, energy curve, entry/exit, loop/stem requirements, and ducking intent.

The official Suno Platform REST API is a valid music acquisition route when configured. Local recording, manual import, licensed stock, and other official providers remain equivalent acquisition routes. All routes end at the same immutable approved 48 kHz source boundary and deterministic local mixer.

## Voice and lip movement

- Prefer owner-recorded performances for the private app, with non-destructive character presets.
- Treat youthful voice as performance direction; do not clone a real child.
- Bind a take to the exact line-text hash and character identity.
- Align words and visemes after the exact audio bytes are approved.
- Animate gaze, breath, head and gesture phrases around meaning; mouth shapes alone are not acting.
- Verify the scene still communicates when dialogue is muted.

## Music and mix intelligence

- Describe dramatic function rather than imitating a named artist.
- Build an energy curve against beats and reserve silence when it improves suspense or comedy.
- Duck music under dialogue or important vocal reactions with explicit attack/release.
- Avoid restarting ambience or music at every cut.
- Pan Foley/effects only when screen position supports it; keep dialogue center-priority.
- Render dialogue/vocal, effects, and music stems plus one stereo master.

## Acceptance

- canonical 48 kHz sources with hashes, rights, provenance, audition, and approval;
- exact integer frame-to-sample boundaries;
- legal trims, loops, fades, and tails;
- measured loudness and true peak, zero clipped samples;
- deterministic decoded PCM hash across repeated offline mixes;
- preview and final video consume the same approved master hash;
- creator listens through and approves the exact master.
