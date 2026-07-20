# E0 handoff

- Branch: `agent/godot-remotion-spike-v1`
- Exact base: `product/v1@e759c54d513b628ff04b4d7782cb1522b7beec85`
- Scope: isolated Godot/Remotion feasibility evidence only.
- Shipping changes: none; all tracked changes stay under
  `experiments/godot-remotion-e0/**`.
- Frame result: 120 + 120 RGBA frames, 1920×1080, mismatch count 0.
- Final video: H.264, 1920×1080, 30 fps, 120 frames, 4.000000-second video
  stream.
- Visual review: representative settle/step/reach/react/hold stills were
  inspected at full composition size; the performer stays inside the frame and
  the stationary root prevents whole-character sliding.
- Gate statement: E0 evidence only. This does not accept Ollo art/rig quality,
  the Frontend Gate, B1, or B2.

See [`README.md`](README.md) for commands, versions, hashes, paths, and known
limitations. The immutable commit SHA and draft PR URL are reported externally
after push to avoid a self-referential handoff commit.
