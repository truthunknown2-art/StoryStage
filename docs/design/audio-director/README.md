# StoryStage Audio Director

Status: researched product architecture; implementation follows the visual showcase pass.

## Product decision

Audio is a first-class part of the compiled production. StoryStage must direct music, dialogue, ambience, Foley, and effects against the same scene, beat, shot, and frame graph that drives picture. It is not a folder of MP3s attached after rendering.

The first supported route is **local recording and approved file import**. Optional provider adapters can automate generation later, but the app must remain useful without an API key and must never automate a signed-in consumer account through hidden browser control.

The durable production boundary is:

```text
AudioBrief
  -> immutable ApprovedAudioAssetVersion
  -> frame/sample-accurate AudioMixPlan
  -> deterministic AudioMasterReceipt
```

Generated or recorded audio is never played directly from a provider response. Approval first converts it to a content-addressed canonical source (48 kHz WAV), records provenance/rights/consent evidence, and freezes the bytes used by the timeline. Editing creates a new version; it does not mutate the approved source beneath an existing render.

## Current provider findings

### Music

- Suno's official help currently documents browser-based creation, Studio timeline mixing, WAV/stem export, and selected-range export. It also documents **Suno Sounds**, a beta UI for one-shots, loops, ambience, and Foley. No official public developer API was found in Suno's documentation during this review. Do not build against reverse-engineered or reseller endpoints. [Studio export](https://help.suno.com/en/articles/8128193), [Suno Sounds](https://help.suno.com/en/articles/10625537)
- Until Suno publishes a supported developer contract, StoryStage should create a directed music brief, open a manual generation task, and ingest the downloaded mix/stems through the normal approval pipeline.
- Rights evidence belongs on the imported asset. Suno states that songs made while subscribed to Pro or Premier receive commercial-use rights; free-plan generations do not. Record the plan and creation date at import time. [Suno commercial-use guidance](https://help.suno.com/en/articles/9601665)

### Sound effects

- Manual generation/import can use Suno Sounds without an API.
- ElevenLabs exposes an official text-to-sound-effects API with duration and looping controls. It is a viable optional adapter when the owner explicitly configures a key. [ElevenLabs sound-effects documentation](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
- Stability AI's developer platform also exposes Stable Audio for music and sound effects. Treat it as another optional provider rather than coupling the timeline to one vendor. [Stability AI developer platform](https://platform.stability.ai/docs/api-reference)
- Project-owned recordings and licensed stock remain valid sources. Generation is a routing choice, not a requirement.

### Dialogue

- OpenAI's documented programmable speech route is the Audio API. `gpt-4o-mini-tts` supports promptable accent, emotion, intonation, speed, tone, and whispering, with downloadable WAV/MP3/other formats. Custom voices require an eligible API organization and explicit consent recordings. [OpenAI text-to-speech guide](https://developers.openai.com/api/docs/guides/text-to-speech)
- ChatGPT voice mode is not a documented application integration or batch-export contract. A ChatGPT subscription should not be treated as a backend for StoryStage dialogue.
- For this private solo app, the default recommendation is the owner's own performance recorded to picture. Character presets can preserve microphone chain, direction notes, and non-destructive processing between episodes. A synthetic voice provider is optional, clearly labeled, and replaceable.
- “Kids voice” is an acting direction, not a license to clone a real child. Prefer a stylized youthful performance by the owner or an explicitly licensed synthetic voice. Avoid identifying or imitating a real child.

## Production graph

```text
script lines and action beats
        ↓
Audio Director cue sheet
        ↓
dialogue | Foley | hard SFX | ambience | music
        ↓
record / generate / import / approve
        ↓
frame-locked editorial tracks and take lanes
        ↓
deterministic mix plan
        ↓
dialogue stem + effects stem + music stem + stereo master
```

Every cue is anchored to story evidence and a frame event. Moving or recompiling a beat moves its dependent cues; it does not leave sound hand-positioned against obsolete timing.

## Draft cue contract

The domain model is deliberately split instead of hiding acquisition, editorial timing, and the final mix in one large cue object:

- `AudioBrief`: story evidence, creative direction, intended duration, acquisition route, and provider-neutral constraints.
- `ApprovedAudioAssetVersion`: immutable content hash, canonical WAV metadata, source route/provider, rights evidence, voice consent when applicable, and approval receipt.
- `DialoguePerformance`: stable speaker/line IDs, take/comp selection, acting direction, and the approved source version.
- `SpeechAlignmentArtifact`: transcript words, phoneme/viseme spans, confidence, and the exact source hash the alignment was calculated from.
- `AudioCue`: the frame event and editorial use of one approved asset version.
- `AudioMixPlan`: cue placements, trims, gains, pans, fades, buses, ducking envelopes, and export profile.
- `AudioMasterReceipt`: input hashes, compiled sample ranges, renderer/version, stem hashes, master hash, loudness/peak results, and acceptance status.

```ts
type AudioCue = {
  id: string;
  productionId: string;
  sceneId: string;
  beatId: string;
  shotId?: string;
  lineId?: string;
  role: "dialogue" | "narration" | "foley" | "sfx" | "ambience" | "music";
  event: "prelap" | "on-action" | "impact" | "reaction" | "tail" | "continuous";
  startFrame: number;
  durationInFrames: number;
  promptOrDirection: string;
  sourceRoute:
    | "recorded"
    | "imported"
    | "manual-generation"
    | "api-generation"
    | "stock";
  sourceProvider?:
    | "local"
    | "suno"
    | "openai"
    | "elevenlabs"
    | "stability"
    | string;
  assetId?: string;
  takeId?: string;
  approval: "missing" | "draft" | "approved" | "rejected";
  rightsEvidenceId?: string;
  mix: {
    gainDb: number;
    pan: number;
    fadeInFrames: number;
    fadeOutFrames: number;
    duckingGroup?: "dialogue" | "music" | "effects";
    screenSourceId?: string;
  };
};
```

Provider credentials and session data never enter this contract or Git. Secrets live in the operating-system credential store and are referenced only by a local provider profile ID.

All frame positions compile to integer sample boundaries using the production frame rate and the 48 kHz project sample rate. The compiled plan, not floating-point UI seconds, is the authority for rendering and reproducibility.

## AI Audio Director responsibilities

Given the directed picture plan, the Audio Director proposes:

1. **Dialogue segmentation** — one stable line ID per speaker turn, with performance direction, emotion, intended duration, eyeline partner, and mouth-open/closed timing markers.
2. **Foley spotting** — footsteps, cloth, prop handling, landings, and surface-specific details derived from animation events rather than guessed timestamps.
3. **Hard-effect spotting** — impacts, magic, whooshes, sneezes, and transitions, including anticipation and decay tails.
4. **Ambience continuity** — room tone and environmental beds that bridge edits without restarting perceptibly at every shot.
5. **Music direction** — style-safe briefs described by mood, instrumentation, tempo, key, energy curve, loop points, and scene function; never “sound exactly like [living artist].”
6. **Mix automation** — dialogue priority, sensible music ducking, screen-aware Foley placement, fades, overlap cleanup, limiter/headroom, and configurable loudness targets.
7. **Confidence and review** — flag crowded dialogue, masked words, missing tails, continuity jumps, clipping, unlicensed sources, and cues whose generated duration does not fit the visual action.

AI proposes and mixes; the creator approves. Provider output is never silently promoted into a publishable production.

## Built-in voice recording workspace

The recording route must feel like ADR to picture, not a generic voice memo screen:

- select a scene, beat, character, or line;
- see the line and acting direction beside a large looping picture window;
- choose microphone and input level, with noise-floor and clipping checks;
- configurable count-in, pre-roll, and post-roll;
- record multiple take lanes without overwriting earlier takes;
- automatic silence trim as a reversible edit;
- waveform, transcript, duration, and line-boundary alignment;
- audition to picture with music/SFX ducked;
- choose, comp, or retake;
- save a character recording preset for later episodes;
- optional non-destructive EQ, compression, de-esser, noise reduction, and subtle pitch/formant processing;
- explicit approval before the selected take enters the render.

The recorder should also support narration passes by scene and a continuous full-episode pass, then split that recording back onto stable line IDs.

## Mix rules for the first implementation

- Picture frames are the timing authority.
- Dialogue is center-priority and ducks music; screen-position panning is reserved mainly for Foley and effects.
- Music and ambience use loop/crossfade regions rather than restarting on every cut.
- Impact cues may start before the visible contact when the sound has an authored attack.
- Reaction sounds follow the causal action by their directed frame delay.
- Every render emits isolated dialogue, effects, and music stems plus the stereo master.
- The validator fails clipping, missing approved assets, missing rights evidence for publishable external audio, out-of-bounds cue tails, and non-deterministic cue timing.
- Loudness targets are export-profile settings, not magic constants embedded in scene code.

The first web-video export profile targets 48 kHz stereo, -16 LUFS integrated, no peak above -1 dBTP, and zero clipped samples. Those are profile defaults, not limits baked into authored cues.

## UI shape

Keep the default editor simple:

- The beat inspector gets one **Sound** summary: dialogue, key effect, ambience, and music intention.
- **Record dialogue** opens the focused ADR workspace.
- **Create/import sound** opens a provider-neutral task with prompt, duration, source route, rights evidence, and audition variants.
- The expanded bottom drawer reveals waveform tracks, take lanes, mix automation, and stems.
- “Mix this scene” creates a reviewable proposal and lists every automatic gain, duck, fade, or pan decision in plain language.

## Implementation slices

1. Audio cue schema, source/rights ledger, and deterministic cue compilation.
2. Local ADR recorder with take lanes and frame-locked playback.
3. Waveform tracks, per-role buses, music ducking, stems, and loudness/clipping validation.
4. Manual Suno/Suno Sounds task plus drag/drop and watch-folder import.
5. Optional provider adapter interface and one official SFX integration.
6. Optional TTS dialogue adapter only after voice quality, disclosure, cost, and character-consistency review.

## Showcase acceptance proof

For the Moonlit Ruins episode, the audio proof must show:

- footfalls follow planted contacts rather than arbitrary intervals;
- the threshold rustle and foreground wipe share the same event;
- ambience bridges the moon-hall cuts;
- guardian wake, inhale, sneeze, spark burst, child reactions, and room tail are separate controllable cues;
- the kids react several frames after the sneeze impact;
- music ducks under any dialogue take and resolves with the clearing reveal;
- replacing a recorded line or SFX recompiles only its dependent cue and mix region;
- two renders have identical cue timing and decoded audit hashes;
- stems and master are exported with the final H.264/AAC production.

Acceptance is gated in layers: source approval, dialogue/alignment integrity, cue completeness, picture synchronization, technical mix validation, editorial listen-through, and final render receipt. A technically valid mix is still not publishable until the creator has listened through it to picture and approved the master.
