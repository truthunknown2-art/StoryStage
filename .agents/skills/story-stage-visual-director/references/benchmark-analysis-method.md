# Benchmark analysis method

## Evidence rules

Use decoded local analysis copies only when permitted. Keep source media and derived frames under ignored artifacts. Commit measurements, classifications, and summary statistics only.

## Sampling

1. Record title, duration, aspect ratio, and sample interval.
2. Sample the full work at a coarse interval.
3. Build a labeled contact sheet from the coarse samples.
4. Sample at least five representative motion windows at four to six frames per second. Cover locomotion or entrance, dialogue acting, obstacle or prop interaction, transition, and payoff.
5. Run a scene-change detector when decoded local media is available and record its threshold; treat the result as an approximate hard-reset measure.
6. Manually classify enough samples to cover opening, exposition, reveal, transition, climax, and ending.
7. For each successive-frame window, separate hard cuts from root motion, articulated-part motion, facial change, camera motion, layer motion, and effects.

## Shot record

For each detected or manually confirmed beat, record:

- start and end time
- shot size
- visual treatment
- camera motion
- transition
- text word count
- performance event count
- asset source class
- audio-event class
- articulated parts and root-motion class
- facial or phoneme change
- layer, parallax, or foreground motion
- anticipation, action, overshoot, settle, and hold phase
- confidence and notes

## Output

Separate `measured` from `proposedProfile`. Include sample count, detector threshold, likely false-positive or false-negative conditions, median interval, mean interval, and treatment distribution.
