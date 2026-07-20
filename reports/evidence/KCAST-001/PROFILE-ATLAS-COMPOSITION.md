# KCAST-001D profile atlas composition gate

Status: **candidate G remains rejected; candidate I passes deterministic
composition and mechanical import, with human review still required**.

## What the code now proves

`composeKidsBipedV1ProfileAtlases()` extends the fixed-grid front-atlas path to
`profile-left` and `profile-right` without creating a second extraction system.
For an admissible source set it requires:

- exact source content hashes and PNG dimensions;
- explicit, non-overlapping, source-bound crop rectangles;
- the canonical 20 `kids-biped-v1` part roles and 22 face roles per view;
- the existing 32px maximum distance from canonical `#ff00ff`;
- exclusive lower-face replacement with a view-specific registration group;
- an identical lower-face alpha plane and zero pixel delta outside the declared
  mouth-change bounds;
- deterministic, byte-identical atlas and lower-face diagnostic output.

Every returned profile result is still labelled
`source-candidate-diagnostic-only`. Its gate explicitly keeps visual-role audit,
registration, preparation, approval, and production binding false.

## Candidate G rejection

The exact candidate-G rasters were hash/dimension inspected. Four fail the
existing 32px canonical-magenta ceiling:

| Source                                                      | Measured key | Distance | Result |
| ----------------------------------------------------------- | ------------ | -------: | ------ |
| `ollo-parts-profile-left-core-candidate-g-chroma.png`       | `#ec09e2`    |   35.819 | reject |
| `ollo-parts-profile-left-limbs-candidate-g-chroma.png`      | `#e806dc`    |   42.308 | reject |
| `ollo-parts-profile-right-limbs-candidate-g-chroma.png`     | `#ec06df`    |   37.696 | reject |
| `ollo-face-profile-right-lower-base-candidate-g-chroma.png` | `#ed0ce1`    |   36.986 | reject |

The visual-role audit also rejects:

- `secondary-front` in both core sheets: the apron is frontal, not a
  foreshortened view-specific profile layer;
- all profile-right eye, lid, and brow overlays: near/far anatomy and asymmetric
  feature handedness still match the profile-left construction;
- all profile-right mouth overlays: their handedness matches profile-left and
  does not fit a right-facing muzzle.

The proof requires both profile composition attempts to fail closed. It creates
no derived profile atlas, no lower-face diagnostic, no import receipt, no
prepared manifest, no provider or preparation authority, no approval, and no
production binding.

Evidence:

- `ollo-profile-source-candidate-g-rejection-evidence.json`
- evidence content hash:
  `6c296121f7eaa00567ca3f6b743006e0300597f0f2abfb819d7d061c611a4d4e`

## Candidate G regeneration contract

Regenerate the four chroma-failing rasters against a clean canonical magenta
background, reauthor both foreshortened profile apron layers, and reauthor the
right-facing eye/lid/brow and mouth sets. New bytes must receive new source
hashes and rectangles; the rejected G coordinates are diagnostic observations,
not reusable approval.

## Candidate I result

Candidate I supplies ten new independently generated profile sources. The
deterministic proof reopens those exact bytes, extracts fresh 8-connected
content bounds, composes both profile atlases through the existing compositor,
and reconciles them with the Candidate H turnaround and Candidate F front kits.
Candidate G is not overwritten or promoted.

The unmodified profile-right lower-face base cannot satisfy the unchanged
exclusive mouth-patch alpha-plane contract. The proof preserves that failure,
then applies one explicit deterministic normalization to the raw source:
uniform `1.5x` Sharp/Lanczos3 resize with sealed input, processor, dimensions,
and output hashes. No chroma threshold or patch invariant is weakened.

Candidate I now proves:

- all ten raw sources pass the unchanged 32px chroma gate;
- both profiles contain the canonical 20 part roles and 22 face roles;
- all 42 corresponding foreground roles are non-identical and are not exact
  horizontal pixel flips after chroma key, connected-bound cropping,
  transparent-RGB zeroing, and pairwise centered registration; this remains
  byte evidence rather than semantic-view approval;
- atlas, lower-face diagnostic, seven-item staging, and import-receipt reruns
  are byte-identical;
- the exact seven requested files create a verified mechanical import receipt
  with `providerAuthority:false` and `approvalRequired:true`.

That receipt is byte/coverage evidence only. Identity consistency, semantic
handedness, visual-role correctness, assembled registration, preparation,
approval, and production binding remain false until human-reviewed profile
pose composites and motion diagnostics exist.

Evidence:

- `ollo-profile-atlas-evidence-i.json`
- `ollo-complete-candidate-bundle-i.json`
- `ollo-complete-staging-report-i.json`
- `ollo-complete-import-receipt-i.json`
- handoff: `../../agent-handoffs/2026-07-19-kcast001g-candidate-i-complete-intake.md`
