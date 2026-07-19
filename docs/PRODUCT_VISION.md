# Product vision

## Creator-first reset

StoryStage is an AI animation director with a creator-first editor. The visible promise is: paste a script, choose a project grammar and art style, watch a directed animated first cut, improve individual beats in plain language, approve media, and export. The local-first production, approval, rights, lineage, render, and delivery systems quietly protect this flow; they are not the default interface.

The creator edits semantic beats before internal shots. A beat may be an idea, action, reaction, joke, or revelation and may compile to one continuous shot or several editorial shots. The preview dominates the Studio; scenes and beats sit to its left, contextual direction sits to its right, and the exact Character, Camera, Voice, and SFX tracks expand below only when needed.

Full-body pose swaps, root-position tweens, and camera moves are useful ingredients, but none is character animation on its own. Recurring character performance must use continuous articulated motion with readable gaze, face, head, torso, limb, hand, and secondary-motion intent. Root translation must be paired with appropriate locomotion and grounded contacts. Preview and export must resolve the same deterministic scene graph and tracks.

The first honest proof is one 10-15 second Kids Adventure scene that turns three to five script beats into a rigged performance with a prop, layered background, phoneme timing, camera reframe, parallax, captions, and sound. See `docs/research/mister-kipley-limited-animation-study.md`.

StoryStage is a local-first directing and production studio for repeat characters, repeat styles, and inspectable episode plans. Its end product is not merely a script parser, storyboard generator, or Remotion player. The target workflow is: paste a script, choose a production grammar, review the proposed direction, acquire or create the required assets, prepare and rig them, build sound and picture, revise decisions, and render a reproducible episode.

AI may propose structured production decisions, but approved data—not an opaque one-shot prompt—drives deterministic rendering. The product should feel like a calm studio desk: the operator can see why every scene, cut, asset, action, sound cue, and camera move exists; lock or replace it; and reproduce the result later.

## End-to-end product contract

1. **Script intake:** accept a pasted script, retain its real text, identify scenes, narration, dialogue, characters, locations, props, factual claims, emotional beats, and unknowns.
2. **Directing grammar:** apply a deliberately selected project type and Show Pack. Kids Adventure and Frankly Weird History are different directing systems, not color themes: cadence, performance density, editorial inserts, camera, typography, transitions, sound, sourcing, and factual treatment all change downstream.
3. **Direction board:** propose natural scene and shot boundaries, coverage, camera/edit decisions, performance actions, on-screen text, asset needs, audio cues, and provenance requirements. The operator can inspect and override meaningful semantic decisions before render.
4. **Asset routing:** resolve approved recurring assets first when policy permits, then route missing requirements to original image generation, user-owned media, licensed stock, public-domain archives, diagrams, typography, or a specialist 3D step. Google Images may help discover a source; it is not itself a rights or provenance source and must never become an automatic scraping pipeline.
5. **Original image creation:** initially use the operator's authenticated ChatGPT subscription through a human-approved local job exchange. StoryStage does not store ChatGPT credentials or pretend a subscription is an API key. A separately billed API adapter may be added later only as an explicit opt-in provider.
6. **Preparation and rigging:** normalize selected images, remove or validate mattes, separate layers and body parts, define registration points, pivots and occlusion, build reusable 2D rigs, run motion tests, and version every approved asset. Route to Blender only when a shot genuinely needs a 3D object, camera move, lighting pass, or reusable environment.
7. **Voice and sound:** create or import narration and dialogue, derive real timing, add captions, plan and acquire music and sound effects with rights records, and mix them against picture. No audio cue may remain a decorative label in the final workflow.
8. **Deterministic timeline:** compile approved direction and content-addressed assets into exact frames, then preview and render through Remotion without remote model calls or live web dependencies.
9. **Review and revision:** support shot, performance, asset, source, timing, caption, music, and mix changes through structured overrides that recompile preview and final output. Approval and rejection are explicit gates with lineage.
10. **Delivery:** produce offline-reproducible 1080p masters plus captions, provenance/rights reports, project manifests, and reusable Show Pack additions.

## Product profiles

A project type selects a directing profile with measurable consequences. Profiles own ranges and policies for shot duration, coverage, character performance, editorial routing, camera frequency, transitions, text events, sound density, factual labeling, and asset sourcing. A profile field that does not alter the compiled production is a bug, not a feature.

The first two profiles establish the architecture:

- **Kids Adventure:** longer readable staging, recurring character performance, expression and pose changes, warm illustrative environments, clear visual continuity, playful sound punctuation, and restrained text.
- **Frankly Weird History:** faster editorial cadence, evidence and reconstruction routing, kinetic type and diagrams, harder cuts, denser sound punctuation, source/provenance emphasis, and explicit reconstruction labeling.

Additional types such as general explainer, documentary, shorts, or social cut-downs should be new validated directing profiles and Show Packs—not forks of the application.

## Provider and privacy boundary

StoryStage is provider-neutral but private by default. Publishable code contains schemas, prompts, validators, sanitized fixtures, and intentionally public original assets. Private scripts, generated candidates, user media, credentials, cookies, auth caches, local job state, and unpublished identity sheets remain beneath the local application-data root and are blocked from Git.

The application must never automate a personal ChatGPT web login in the background. The current subscription-backed path is a visible, human-approved round trip through the authenticated Codex/ChatGPT task. Unattended generation requires a supported provider API and separate user authorization.

## Current milestone honesty

SS-001 is workstation infrastructure. SS-002 is building the real script-to-directed-plan and generated-asset seam. Until original assets are approved and rigged, audio is timed and mixed, the production render plan drives Remotion, and both profiles produce polished MP4s, StoryStage is a major foundation of the requested product—not yet the finished product.
