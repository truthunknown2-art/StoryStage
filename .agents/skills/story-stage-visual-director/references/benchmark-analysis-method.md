# Benchmark analysis method

## Evidence rules

Use decoded local analysis copies only when permitted. Keep source media and derived frames under ignored artifacts. Commit measurements, classifications, and summary statistics only.

## Sampling

1. Record title, duration, aspect ratio, and sample interval.
2. Sample the full work at a coarse interval.
3. Sample at least one representative 30-second section every second.
4. Run a scene-change detector and record its threshold; treat the result as an approximate hard-reset measure.
5. Manually classify enough samples to cover opening, exposition, reveal, transition, climax, and ending.

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
- confidence and notes

## Output

Separate `measured` from `proposedProfile`. Include sample count, detector threshold, likely false-positive or false-negative conditions, median interval, mean interval, and treatment distribution.
