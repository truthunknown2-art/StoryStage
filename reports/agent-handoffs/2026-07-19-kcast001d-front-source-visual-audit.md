# KCAST-001D front-source visual audit

Date: 2026-07-19
Scope: candidate-C split source sheets, before deterministic normalization or staging
Verdict: **NO P0; P1 CORRECTIONS REQUIRED**

## Inventory result

- Core: 8 of 8 declared roles present.
- Limbs: 12 of 12 declared roles present.
- Eyes/lids/brows: 14 of 14 declared roles present.
- Mouths: 8 of 8 declared roles present.
- Canonical total: 20 body-part roles and 22 face roles exactly once.
- Exposure total: all 13 canonical exposures represented.
- Upper/lower limbs are genuinely separated.
- Left/right face and body source art is independently present.
- All raw objects are globally isolated and unclipped.

## P1 findings

1. Mathematical equal-grid extraction clips candidate-C core and eye objects. Generated semantic grids are not pixel-layout authority. The normalization boundary must use exact hash-bound dimensions plus either a grid that passes the safety inset or sealed, human-audited non-overlapping source rectangles.
2. Raw sheets do not share assembly scale or head registration. Source atlases must not be described as registration-ready; proposed output canvases, scales, pivots, anchors, and composite diagnostics are required.
3. Candidate-C mouth cells contain the nose and cream muzzle despite their mouth-only prompt. Pro subsequently permitted this only as an exclusive full lower-face replacement patch with byte-identical static pixels outside a declared mouth-change rectangle.

## P2 identity findings

- Candidate-C hands read as five-lobed and were rejected by Pro. Replacement art must use Ollo's four-digit mitten paw: three fingers plus one thumb.
- The candidate-C rear scarf flap is broader and more wing-like than the accepted registration view.
- Generated magenta keys are close to, but not exactly, `#ff00ff`; matte tolerance and red-costume despill remain explicit review items.

## Source-level recommendation

- Candidate-C core: semantically acceptable untrusted evidence, but rejected for equal-grid extraction.
- Candidate-C limbs: semantically separated, but rejected for paw identity and boundary margin.
- Candidate-C eyes: semantically acceptable untrusted evidence; retain for sealed-rectangle normalization because left/right variants are visibly distinct.
- Candidate-C mouths: rejected as independent generated full patches because static nose/muzzle pixels vary across cells.
- Candidate-D/E/F sources exist to correct those geometry, paw, and lower-face issues.

None of these sources is prepared, riggable, approved, or production-bindable. Complete seven-item intake, import receipt, sealed recipes, prepared views, rig-family validation, moving diagnostic, and Preston approval remain mandatory.
