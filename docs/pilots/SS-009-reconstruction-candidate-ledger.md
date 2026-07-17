# SS-009 reconstruction candidate ledger

Date: 2026-07-17
Provider: built-in ChatGPT image tool (no API key)
Status: **Pro accepted the six-candidate contract at `72078a2`; all six are technically prepared and the exchange is stopped at `needs-review`**

Candidate pixels remain under ignored `artifacts/SS-009/generated-candidates/`. The reproducible non-approving packet is under ignored `artifacts/SS-009/reconstruction-review-packet/`. This ledger is provenance and mapping evidence; it is not approval. No candidate has been selected, rejected, approved, promoted, or bound to production.

| Shot | Set | Authoritative brief | Local candidate | Source pixels | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 1.03 | 1 | `brief-requirement-reconstruction-shot-shot-3-shot-3-reconstruction` | `shot-1-03-dancing-alone/set-1/candidate.png` | 1672×941 PNG | `9fb05276b39049db8e13615b4127a6a84b4f4cda24008edac64c39c3b0da2000` |
| 1.03 | 2 | `brief-requirement-reconstruction-shot-shot-3-shot-3-reconstruction` | `shot-1-03-dancing-alone/set-2/candidate.png` | 1672×941 PNG | `1b926e74921ba48a8b6cf6cc20ca6cc389b03301a15e305fd5853da239c455e5` |
| 1.05 | 1 | `brief-requirement-reconstruction-shot-shot-5-shot-5-reconstruction` | `shot-1-05-public-emergency/set-1/candidate.png` | 1672×941 PNG | `5bf09b87fd824b290457556511a61e2ebc37477db7d1922df20cd23127f75efa` |
| 1.05 | 2 | `brief-requirement-reconstruction-shot-shot-5-shot-5-reconstruction` | `shot-1-05-public-emergency/set-2/candidate.png` | 1672×941 PNG | `1e9713f1df40f625a46d6109e0f4067520abe01ef3692bd857f76f2aee5df520` |
| 1.08 | 1 | `brief-requirement-reconstruction-shot-shot-8-shot-8-reconstruction` | `shot-1-08-exhaustion-theory/set-1/candidate.png` | 1672×941 PNG | `03e5dc12c4d8f92563b7b032a82391f1a6a09a97bcb16cf5b55211b0b14a68c9` |
| 1.08 | 2 | `brief-requirement-reconstruction-shot-shot-8-shot-8-reconstruction` | `shot-1-08-exhaustion-theory/set-2/candidate.png` | 1672×941 PNG | `9b2cdcf3eafb9e59585e838c1f52c57cc8c0f5a0ba7560a1d017b2280ebf7746` |

Proposed rights record for review: `sourceType: generated`; `provider: ChatGPT Images`; `usageNotes: Original StoryStage Rook Pilot 001 generated reconstruction candidate; human approval required before production use.`

## Non-approving preparation evidence

Run `pnpm prepare:rook-pilot-review` to rebuild the packet from the six logged source PNGs. The script uses the same manifest validation, byte staging, immutable three-file import evidence, Sharp normalization, prepared-candidate registration, and preparation-report verification as the desktop path. It additionally creates one hash-bound two-set comparison sheet per reconstruction from the prepared bytes.

- Six source PNGs were byte-verified against this ledger.
- Six prepared assets are canonical 1920×1080 `editorial-visual` PNGs.
- All six candidate sets are `ready-for-review`; the enclosing generation exchange is `needs-review`.
- Shot 1.03 A/B sheet: `09b3393fa06804b3ef3915bb07882424c66931b1353c4cc76d73d2973afc0f8d`.
- Shot 1.05 A/B sheet: `3b79879948410b0215a221a3ace9bbe44b3181636f54de46f260ce481487c609`.
- Shot 1.08 A/B sheet: `8534936f8c4a4eb4c7662e77c83a4f57295922d1a6160242ad20166629b8b8b2`.
- Human decisions recorded: zero. Rig diagnostics, selection, approval, promotion, production binding, and final render remain downstream gates.

## Exact prompts

### Shot 1.03 — candidate set 1

```text
Use case: historical-scene
Asset type: full-frame 16:9 generated reconstruction plate for the StoryStage Remotion pilot "The Dancing Plague Had a Payroll"
Primary request: Strasbourg in 1518, one adult woman dancing alone in a cobblestone street while only a few distant townspeople notice.
Scene/backdrop: historically plausible early-16th-century Alsatian timber-framed street, open sky, no modern objects.
Style/medium: original tactile editorial illustration, hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes, not photorealistic and not imitating any named artist or channel.
Composition/framing: wide 16:9 frame, the lone dancer clearly isolated near the left third, street depth and sparse witnesses on the right, clean enough for a slow camera push.
Lighting/mood: overcast daylight, strange and uneasy but not horror.
Color palette: parchment cream, charcoal black, muted umber, desaturated teal, restrained vermilion accents.
Constraints: no text, no labels, no border, no watermark, no presenter character, no modern clothing, no modern street furniture, no anatomy distortion.
```

### Shot 1.03 — candidate set 2

```text
Create candidate set 2 for a StoryStage historical reconstruction plate. Use case: historical-scene. Asset type: full-frame 16:9 generated reconstruction for "The Dancing Plague Had a Payroll". Strasbourg in 1518: one adult woman dances alone near the left third of a wide cobblestone street while only a few distant townspeople notice on the right. Historically plausible early-16th-century Alsatian timber-framed street, open sky, no modern objects. Original tactile editorial illustration with hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes; not photorealistic and do not imitate any named artist or channel. Keep the established palette of parchment cream, charcoal black, muted umber, desaturated teal, and restrained vermilion. Make this a genuinely distinct alternate from candidate set 1 by using a lower street-level viewpoint, a different readable dance posture, and a different arrangement of sparse witnesses, while preserving the left-third isolation and depth for a slow camera push. Overcast, strange, uneasy, humane, not horror. No text, labels, border, watermark, presenter, modern clothing, modern street furniture, anatomy distortion, or grotesque faces.
```

### Shot 1.05 — candidate set 1

```text
Use case: historical-scene
Asset type: full-frame 16:9 generated reconstruction plate for the StoryStage Remotion pilot "The Dancing Plague Had a Payroll"
Primary request: the 1518 Strasbourg dancing episode has escalated into a genuine public emergency, with a growing crowd of exhausted dancers and anxious townspeople filling a street.
Scene/backdrop: historically plausible early-16th-century Alsatian square with timber-framed buildings; concerned civic observers at the edges.
Style/medium: original tactile editorial illustration, hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes, not photorealistic and not imitating any named artist or channel.
Composition/framing: wide 16:9 civic-panic tableau; layered crowd across foreground and midground; a clear diagonal flow that supports a gentle pan.
Lighting/mood: tense public confusion, energetic but humane, no gore and no horror.
Color palette: parchment cream, charcoal black, muted umber, desaturated teal, restrained vermilion accents.
Constraints: no text, no labels, no border, no watermark, no presenter character, no modern objects, no grotesque faces, no anatomy distortion.
```

### Shot 1.05 — candidate set 2

```text
Create candidate set 2 for a StoryStage historical reconstruction plate. Use case: historical-scene. Asset type: full-frame 16:9 generated reconstruction for "The Dancing Plague Had a Payroll". Strasbourg in 1518: the dancing episode has escalated into a genuine public emergency, with a layered crowd of exhausted dancers across foreground and midground, anxious townspeople, and concerned civic observers at the edges of a historically plausible Alsatian square with timber-framed buildings. Original tactile editorial illustration with hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes; not photorealistic and do not imitate any named artist or channel. Keep the established palette of parchment cream, charcoal black, muted umber, desaturated teal, and restrained vermilion. Make this a genuinely distinct alternate from candidate set 1 by using a slightly elevated civic-square viewpoint, a new foreground grouping, and an opposite diagonal crowd rhythm that still supports a gentle pan. Tense public confusion, energetic but humane, no gore or horror. No text, labels, border, watermark, presenter, modern objects, grotesque faces, or anatomy distortion.
```

### Shot 1.08 — candidate set 1

```text
Use case: historical-scene
Asset type: full-frame 16:9 generated reconstruction plate for the StoryStage Remotion pilot "The Dancing Plague Had a Payroll"
Primary request: visualize the bizarre 1518 policy theory that exhausted dancers could dance the fever out: weary dancers continue on a raised wooden stage while musicians play and worried civic officials observe.
Scene/backdrop: historically plausible early-16th-century Strasbourg square, simple temporary wooden platform, period musicians and officials.
Style/medium: original tactile editorial illustration, hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes, not photorealistic and not imitating any named artist or channel.
Composition/framing: wide 16:9; stage and dancers centered-left, musicians and officials grouped right, strong depth for a slow camera push.
Lighting/mood: absurd bureaucratic confidence colliding with visible exhaustion; humane, not comic slapstick, no gore.
Color palette: parchment cream, charcoal black, muted umber, desaturated teal, restrained vermilion accents.
Constraints: no text, no labels, no border, no watermark, no presenter character, no modern objects, no anatomy distortion.
```

### Shot 1.08 — candidate set 2

```text
Create candidate set 2 for a StoryStage historical reconstruction plate. Use case: historical-scene. Asset type: full-frame 16:9 generated reconstruction for "The Dancing Plague Had a Payroll". Strasbourg in 1518: visualize the bizarre policy theory that exhausted dancers could dance the fever out. Weary dancers continue on a simple raised wooden stage centered left while period musicians play and worried civic officials observe at right in a historically plausible square. Original tactile editorial illustration with hand-painted cut-paper shapes, subtle screenprint grain, bold readable silhouettes; not photorealistic and do not imitate any named artist or channel. Keep the established palette of parchment cream, charcoal black, muted umber, desaturated teal, and restrained vermilion. Make this a genuinely distinct alternate from candidate set 1 by using a closer low-angle view of the stage, new dancer poses, and a different musician/official grouping, while keeping strong depth for a slow camera push. Absurd bureaucratic confidence colliding with visible exhaustion; humane, never slapstick or gore. No text, labels, border, watermark, presenter, modern objects, or anatomy distortion.
```
