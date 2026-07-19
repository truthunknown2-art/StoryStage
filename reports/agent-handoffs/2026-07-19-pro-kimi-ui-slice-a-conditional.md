# Pro review: Kimi UI Slice A

Date: 2026-07-19  
Reviewed integration commit: `e876f5f0f7b825a680718e7bff0270dd22459318`  
Draft PR: `#5`  
Verdict: **CONDITIONAL**

## Directionally accepted

Pro found the shell materially closer to the binding creator mockup: script-first two-column composition, derived beat preview, grammar and art-direction cards, an explicit review-first action, honest disabled voice/format choices, responsive single-column behavior, committed evidence, and green CI.

## Merge blockers

1. **No hidden fixture title.** A pasted arbitrary script must not silently retain `The Lantern Discovery`. The title must be visible or a visible proposed title must be derived deterministically.
2. **Honest dirty/save state.** Changing script, title, grammar, or art direction must show `Unsaved setup changes`; a previously saved project cannot certify the current setup.
3. **Persist art direction.** The selected card must become a sealed, grammar-compatible `Cv002ArtDirectionSelection` in `Cv002Project`, survive edit/history/reload, and compile into `DirectorProject` without generating or approving assets.
4. **Truthful front door.** First run must be empty/guided or Ollo & Friends. Mara remains available only through a clearly named `Open engineering animation demo` action.

## ADRREF-001 boundary

The exact selection shape is:

```ts
type Cv002ArtDirectionSelection = {
  schemaVersion: "1.0";
  grammar: "kids-adventure" | "weird-history";
  optionId:
    | "storybook-watercolor-paper-cutout"
    | "cut-paper-collage-mixed-media"
    | "soft-2d-digital-illustration"
    | "weird-history-editorial-collage";
  referenceSet: { id: string; version: string; contentHash: string };
  selectedBy: "creator";
  usage: "direction-reference-only";
  contentHash: string;
};
```

Kids and Weird History options must reject cross-grammar attachment. Ollo selections bind the full canonical environment board/reference set, never the compressed React display crop. The narrow slice must not create generation jobs, approved assets, provider authority, final-ready capabilities, or renderer changes.

## Required re-review proof

Select Kids art direction -> create project -> edit beat structure -> undo/redo -> reload -> compile `DirectorProject` -> prove the exact selection and reference hash remain intact -> prove zero assets were generated and capability counts are unchanged.

Kimi UI Slice B must branch from the accepted post-correction PR #5 head, not from `e876f5f`.
