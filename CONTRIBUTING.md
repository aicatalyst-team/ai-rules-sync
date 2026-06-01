# Contributing to agentsync

Thanks for taking the time to help out. agentsync stays small and dependency-free
on purpose, so most contributions are easy to review.

## Getting started

```bash
git clone https://github.com/<you>/agentsync
cd agentsync
npm test        # runs the test suite (no install step needed)
npm run web     # opens the playground at http://localhost:5173
```

You need Node 18 or newer. There are no runtime dependencies and there is no build
step — the engine in `src/core/agentsync.js` runs as-is in both Node and the browser.

## Adding support for a new tool

Most format requests touch three places in `src/core/agentsync.js`:

1. Add an entry to `FORMATS` (id, label, filename).
2. Handle its quirks in `parse()` (frontmatter, imports, etc.).
3. Add a renderer to `RENDERERS`.

If something about the source format can't be represented in the target, push a
message onto `warnings` rather than dropping it silently. Add a matching test in
`test/run.mjs`.

## Pull requests

- Keep changes focused; one logical change per PR.
- Run `npm test` before pushing.
- Don't add runtime dependencies.
- Update the README if you change user-facing behavior.

## Releasing

Releases are automated. Pushing a `v*` tag runs the test suite and publishes to npm
via `.github/workflows/release.yml`.

One-time setup: create an npm **automation** token (Account → Access Tokens →
Generate → Automation; this type bypasses 2FA) and add it as a repo secret named
`NPM_TOKEN` (Settings → Secrets and variables → Actions).

To cut a release:

```bash
npm version patch     # or minor / major — bumps package.json and tags
git push --follow-tags
```

The workflow checks that the tag matches `package.json` before publishing.

## Reporting bugs

Open an issue with the input you gave, the format you converted from/to, and what
you expected. A minimal sample file is the most helpful thing you can include.
