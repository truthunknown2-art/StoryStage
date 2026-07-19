# Candidate H — deterministic five-view turnaround composition

Status: deterministic source composition and staging evidence only. Candidate H
is not imported, prepared, approved, provider-authoritative, or production
bindable.

## Result

The five exact Candidate H chroma sources are keyed and composed in canonical
order:

1. `front`
2. `three-quarter`
3. `profile-left`
4. `profile-right`
5. `rear`

The compositor does not mirror any source. It normalizes every extracted
foreground to a `768px` character height, places every foot baseline at sheet
row `799` (the declared baseline is `800`), horizontally centers the content
bounds in a `576x832` transparent cell, and seals five non-overlapping source
rectangles in a `2880x832` transparent sheet.

Output:

- file: `candidates/ollo-turnaround-candidate-h-five-view-alpha.png`
- SHA-256: `732b3a7c41b33a9f8941714066ce60c86a7ff72aea6dd288db80176be263cfec`
- bytes: `2,574,902`
- dimensions: `2880x832`
- alpha: mixed alpha

## Source and registration evidence

The chroma gate remains exactly `32px` from `#ff00ff`; it was not relaxed.

| View          | Raw SHA-256                                                        | Measured key | Distance | Raw content bounds | Normalized width | Sheet rect       | Derived cell SHA-256                                               |
| ------------- | ------------------------------------------------------------------ | ------------ | -------: | ------------------ | ---------------: | ---------------- | ------------------------------------------------------------------ |
| front         | `43aa02a2951e46020269390c5ec8494d12719dff5eedd9d46ce10ffdaf26fc12` | `#f307f3`    |   18.358 | `665,45 444x749`   |              455 | `0,0 576x832`    | `9179be1665aa88e86ddede71cce064c37714f00962317681f221291349f5fccd` |
| three-quarter | `cc5c35b8251e0b9308a5868849a33bcbb9196e0fa606f7189b4d6e6778acb480` | `#f905f8`    |   10.488 | `657,34 435x789`   |              423 | `576,0 576x832`  | `ccfaea3bc3d64f8d600ee0b0758a6149a604c9a520b34949d81ce07b8bea97b6` |
| profile-left  | `9b1064bccf5c223b1e7d0b10085c565d24c085fc12ed5722eedd4966c854f214` | `#f606ea`    |   23.622 | `692,55 367x776`   |              363 | `1152,0 576x832` | `02a728955134f6664487343974a90bb225b21903665d44fcc68d61ea7b57b139` |
| profile-right | `a4103e0118c2099913e549f953414e674f798d099ed9c9f99b1555c9c2150905` | `#f108eb`    |   25.690 | `710,34 359x794`   |              347 | `1728,0 576x832` | `1e09db7a87799bc419935ee3d76bc5c58600acfb513065c182dc9dcfba4f61ce` |
| rear          | `97e9137ce09215f5a52b2df9ef755d70eda0ddfe024fcf2f7dcea42e60ed3455` | `#f706f6`    |   13.454 | `627,47 500x775`   |              495 | `2304,0 576x832` | `21f766af57ca2648f760a6e0a11efa9d10566e53addffb489994329211f2c5a8` |

Every derived cell is `576x832`, uses `transform: none`, has unique bytes, and
is rederived from the composed sheet by the real staging worker.

## Self-hashed coverage lineage

- Ollo request: `82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310`
- coverage evidence: `c9e70319de980a0045d04ef8a2897b88d55a974c89d9aa098bb7dc982449946c`
- exact coverage JSON bytes: `598cd00e26aecce5002554134ca66903ebe11e17670a809360f858cb6650b4d6`
- Candidate H bundle: `40e91d0f5dce0cdefc964cd55e3b56110b0d13082e5ffd7f5605ce2e9ed4c55a`
- staging report: `099f0e606a8bb2b173865449f2617e3bece819d6d05cb8cdf2de7088c76c32aa`
- composition evidence: `22cc098ec0f61e8e4f5c2569b871f79feb15473bfbca2113b90c5fdca6cf2e8b`

The staging report classifies `turnaround-sheet` as returned and its coverage as
complete. The overall request remains incomplete because these six independent
rig kits are absent:

- `parts-front`
- `parts-profile-left`
- `parts-profile-right`
- `face-front`
- `face-profile-left`
- `face-profile-right`

The proof attempts the real receipt route and confirms it rejects the
incomplete request. No receipt file or preparation artifact is created.

## Fail-closed verification

Focused tests reject changed bytes, changed dimensions, reordered or incomplete
view inventories, a border key outside the fixed `32px` ceiling, foreground
touching a source boundary, and reused view pixels. The proof runs composition
twice and requires byte-identical output before the real staging worker reopens
the sheet, self-hashed coverage JSON, and five independently derived cells.
The normal Asset Pipeline test path also pins the exact committed sheet, every
derived PNG, and every coverage/bundle/staging/composition JSON file and
internal content hash, so ordinary `pnpm verify` fails if the evidence drifts.

Commands:

```text
pnpm --filter @storystage/asset-pipeline exec vitest run src/turnaround-sheet-compositor.test.ts
pnpm --filter @storystage/asset-pipeline typecheck
pnpm --filter @storystage/asset-pipeline proof:kcast001f-turnaround-sheet
```

Candidate B and Candidate G evidence remain historical and unchanged. Candidate
H closes only the turnaround-view source gap; it does not claim that the six
parts/face kits or a moving rig exist.
