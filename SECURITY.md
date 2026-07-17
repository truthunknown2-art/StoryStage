# Security policy

StoryStage is a local-first production tool. Authentication material is outside the project data model and outside the renderer.

## Never commit

- passwords, API keys, access/refresh tokens, cookies, or authentication caches;
- `.env` files, private keys, or credential exports;
- private generation candidates or unpublished source media;
- local production session state.

If a credential is ever committed, revoke or rotate it immediately and remove it from Git history before another release. Merely deleting it in a later commit is not sufficient.

## Image-provider boundary

The default `manual-chatgpt-images` provider exchanges local JSON manifests and image files. It has no credential fields and performs no network request. Any future API adapter must use an operating-system credential store or process environment, redact secrets from logs, and remain disabled until the user explicitly opts in.

Run `pnpm verify:privacy` before every public push. It fails on local exchange artifacts, candidate manifests, credential-shaped files, common secret formats, and any change that stops anchoring the exchange root outside the repository under Electron `userData`.

## Renderer boundary

The final renderer accepts only approved local assets addressed by content hash. It must not call generative models, fetch remote URLs, or read authentication material while rendering.
