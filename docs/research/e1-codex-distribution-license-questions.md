# E1 Codex distribution and license questions

**Status:** open questions for R1; no bundling or distribution decision  
**Observed feasibility runtime:** `@openai/codex` / Codex CLI `0.144.1`, Windows x64  
**Scope:** E1-WP4 evidence only

E1 proves that StoryStage can launch a pinned local Codex App Server and use the
official Sign in with ChatGPT flow. It does not establish that StoryStage may
redistribute that runtime, that an installed client can be discovered reliably,
or that the experimental App Server surface is ready for a private-launch
installer. R1 must answer the following against then-current official terms and
artifacts.

1. May the exact native Codex binary and its npm package be redistributed inside
   a StoryStage Windows installer? Which license text, notices, source offers, or
   attribution must ship with it?
2. If bundling is unsupported, what official installed-client discovery and
   version-selection mechanism may StoryStage rely on without reading account or
   credential storage?
3. Do the ChatGPT subscription and service terms permit a desktop product to
   launch the user's local App Server and initiate its official sign-in flow in
   the bounded manner proven by E1?
4. What compatibility, support, update, and security-patch commitment applies
   while `codex app-server` is labeled experimental?
5. Which third-party notices and transitive native binaries from the pinned npm
   package must appear in StoryStage's notice inventory?
6. How will installer signing, runtime updates, rollback, uninstall, and data
   retention preserve Codex-owned authentication as opaque state?
7. What clean-machine prerequisites remain: architecture, Windows version,
   WebView/browser handoff, Visual C++ runtime, Node.js, or other components?
8. How will StoryStage fail closed when the installed or bundled runtime hash,
   protocol schema, or MCP behavior differs from the release manifest?

R1 must record authoritative answers and a clean-machine decision before any
runtime is bundled or advertised as supported. R2 must then audit the installed
build. E1-WP4 deliberately leaves every question above unresolved.
