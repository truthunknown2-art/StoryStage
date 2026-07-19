# Ollo & Friends — environment and stage bible

## Canonical reference

- File: `environment-art-direction-v1.png`
- SHA-256: `d8fb05e2eeb63b2d8a1397f4aa43a5c4ad28d3cac333ce5b48f0a9bb7b41c30d`
- Dimensions: `1536 × 1024`
- Byte length: `2940395`
- Source status: user-supplied art-direction reference. It establishes the show's world language; it is not itself a production-ready layered set.

## Primary visual direction

The canonical environment construction is **cut-paper collage and mixed media**, supported by soft storybook watercolor where it helps the characters sit naturally in the world.

The target is a warm, tactile storybook stage built from paper, fabric, cardboard, watercolor, and lightly imperfect handmade shapes. It should feel dimensional and cozy without becoming visually noisy. The recurring characters remain the clearest, highest-contrast performance elements.

This direction is favored because it is both attractive and animation-friendly: recognizable paper elements can be isolated, stacked in depth, occlude characters, receive light, and move independently without pretending a single flattened background is a 3D set.

## Required layered-scene package

A production environment is not one JPEG. Every approved set package must define independently addressable layers, in back-to-front order:

1. sky or deepest plate;
2. distant geography or architecture;
3. primary background set plate;
4. midground scenic pieces;
5. character and owned-prop stage plane;
6. near scenic pieces that may pass behind or in front of characters;
7. foreground occluders such as branches, plants, doorframes, furniture, or rocks;
8. interactive props with their own identity, pivots, sockets, and ownership state;
9. light, shadow, atmosphere, and effects mattes;
10. optional lens or transition treatment, controlled by the Director rather than baked into the art.

Each layer must carry its content bounds, alpha safety border, normalized depth, safe camera-travel range, anchor or pivot, and immutable asset hash. Occlusion order is explicit data. A character disappearing behind a plant is intentional staging; clipping behind an invisible crop edge is a failed asset.

## Generation and preparation rules

- Generate a clean master plate and a matching isolation kit for the objects the Director expects to stage, animate, or place in the foreground.
- Preserve perspective, scale, texture, lighting direction, and palette across the plate and isolated pieces.
- Do not infer hidden pixels and silently call the result complete. If an isolated tree reveals missing background, generate or paint a clean plate before approval.
- Keep baked-in characters, text, watermarks, motion blur, and camera blur out of reusable environment plates.
- Motion blur is a shot-level artistic choice. For a running shot, prefer controlled background or foreground streaking while keeping the performing character readable.
- Reusable locations receive a locked identity sheet and approved variants for time of day, weather, and story state. Episode-specific locations enter the same candidate → validate → review → approve pipeline.
- A flattened image may be used as concept art, but it cannot be promoted as a layered set until its production pieces and clean plate are validated.

## Director rules

- The script establishes the location, action, emotional beat, and required props. The Director selects or requests the smallest set package that can stage those facts clearly.
- Camera choice comes before decorative movement. Parallax follows camera motion and declared layer depth; scenic pieces must not drift merely to make the frame feel animated.
- Every cut must preserve or deliberately reset screen direction, character geography, prop state, and lighting logic.
- Foreground elements are used to frame action, reveal depth, motivate transitions, or provide intentional occlusion. They are not random overlays.
- Characters must remain on a declared stage plane unless a shot explicitly changes depth. Profile or three-quarter rigs are selected from movement direction; a front-facing puppet must not be slid sideways as locomotion.
- Interactive props remain separate from the environment and move through explicit ownership and continuity events.

## Recurring world families

The reference suggests useful recurring families — a cozy home/story nook, forest paths and streams, handmade story realms, meadows, bridges, hills, and lookouts. These are visual precedents, not hard-coded episode requirements. The screenplay may introduce any location, provided its design inherits this material language and passes the same layered-set contract.

## Acceptance checks

An environment package is production-ready only when:

- the clean plate contains no accidental holes after isolating movable pieces;
- every alpha layer has safe transparent bleed and no neighboring-image leakage;
- declared foreground occluders cover characters only where their visible pixels exist;
- depth and z-order reproduce identically in Player and render worker;
- camera travel stays within the approved reveal bounds;
- props and lights do not acquire undeclared continuity authority;
- two renders of selected frames produce identical canonical scene state and pixel hashes.
