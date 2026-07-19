# Ollo & Friends — canonical Kids Show Pack cast

## Product decision

`Ollo & Friends` is the canonical recurring cast for StoryStage productions made for Preston's main kids YouTube channel. The current Mara/Milo material remains engineering proof art only and must not silently become channel branding.

Proposed Show Pack identity: `ollo-and-friends-kids-v1`.

The script remains authoritative about who appears in an episode. It may use any subset of the recurring cast and may introduce episode-specific characters, creatures, props, and locations. New episode assets must inherit this Show Pack's visual language without replacing or drifting the recurring identities.

## Canonical reference

- File: `identity-board-v1.jpg`
- SHA-256: `0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f`
- Byte length: `126956`
- Source status: user-supplied identity reference; downstream generated sheets remain candidates until local validation and explicit human approval.

## Recurring cast

### Ollo — primary lead

- Warm, curious, imaginative, and slightly too eager.
- Cream-gold woodland creature with two tall orange leaf ears, small tail, large dark eyes, warm blush, and a red scarf/vest with stitched pocket.
- Performance reads through clear silhouette, ear shapes, scarf follow-through, large facial reactions, and childlike full-body poses.
- Never redesign Ollo as a generic human child, rabbit, fox, or branded existing character.

### Tix — observant companion

- Tiny sparkbird; careful, clever, observant, and a little anxious.
- Teal/navy body, pale aqua face and chest, large dark eye, small orange beak/feet, orange-and-teal crest, layered wing and tail feathers.
- Performance reads through head tilts, wing gestures, hops, short flights, feather follow-through, and restrained nervous anticipation.

### Dot — silent social sidekick

- Tiny glowing bug; expert at making friends.
- Round coral-pink body, two antennae with glowing tips, tiny arms and feet, minimal face.
- Silent performance uses squash/stretch, hover arcs, antenna timing, glow intensity, and strong expression changes.

### The Storylight — guiding presence

- Gentle lantern-light who loves stories and helps light the way.
- Warm cream-gold face inside a leaf-lantern silhouette, loop at the top, leaf-like side petals, curled tail of light, soft sparkles.
- Movement is buoyant and deliberate; light, glow, and leaf layers may animate locally but never steal camera or continuity authority.

## Identity-lock requirements

Every approved recurring-character rig must bind back to the exact canonical reference hash and preserve:

- silhouette and proportions;
- palette and material texture;
- facial construction and eye scale;
- Ollo's leaf ears and red clothing;
- Tix's crest, beak, wing, and tail design;
- Dot's round body and antenna bulbs;
- Storylight's leaf-lantern body and curled light tail.

Generated art is an untrusted candidate. A matching label or prompt is not identity evidence. Each view and part sheet must pass visual review, alpha/crop checks, registration checks, and immutable hash binding before production use.

## Required production asset families

For each recurring character, create and approve:

1. identity sheet and color/material reference;
2. scale chart with the full ensemble;
3. front, three-quarter, profile-right, profile-left, and rear turnarounds;
4. rig-ready separated-part sheets for each materially different view;
5. face parts/exposures: eyes, pupils, lids/blinks, brows where applicable, and named mouth/viseme exposures;
6. locomotion coverage appropriate to the character: walk/run for Ollo, hop/fly for Tix, hover/squash for Dot, float/glow for Storylight;
7. expression and action coverage driven by script beats;
8. deterministic rig manifests with pivots, hierarchy, z-order, sockets, view/facing metadata, and secondary-motion channels.

Profile locomotion assets are mandatory for horizontal travel. A front-facing rig must not be translated sideways and presented as running.

## Director and script rules

- Ollo is the default lead when the script does not name a different recurring lead.
- The Director chooses cast from explicit script evidence first, then approved Show Pack defaults.
- The Director may request new episode-specific supporting characters and props, but those enter the same candidate → validate → review → approve pipeline.
- Character-facing/view selection follows movement direction and shot composition; it is not a cosmetic flip after animation.
- Background, character, foreground, prop, light, and effects layers stay independently addressable for parallax, occlusion, and depth.
- Recurring-character identity is never regenerated opportunistically per shot.

## Current implementation boundary

The in-progress `local-parts-v1` KVP work is a renderer/authority proof. Until Ollo's approved rig-ready sheets are ready, its bundled Mara puppet is technical evidence only. KVP acceptance must not be described as approval of the main channel's final character art.

### Ollo profile candidate v2

- `candidates/ollo-profile-rig-v2-chroma.png` is the generated flat-green source.
- `candidates/ollo-profile-rig-v2.png` is the locally keyed transparent candidate.
- It successfully preserves Ollo's profile identity, palette, leaf-ear silhouette, clothing, tail, scarf secondary piece, three mouth exposures, eye white, pupil, and eyelid.
- It is **not approved as a production rig**: the generated arms and legs are whole-limb pieces rather than clean upper/lower segments, and the sheet does not contain a complete matched near/far arm set. It can guide the next identity-locked generation pass but must not be promoted or used to claim elbow/knee articulation.
