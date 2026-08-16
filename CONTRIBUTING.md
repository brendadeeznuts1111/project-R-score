# Contributing

The canonical contributor guide is
[`docs/contributing/CONTRIBUTING.md`](docs/contributing/CONTRIBUTING.md).

Read [`AGENTS.md`](AGENTS.md) before changing project policy, skills, tooling,
or release behavior. Use `bun run bun:ci` as merge authority.

## Markdown

All governed Markdown must pass `bun run check`; use `bun run check:docs` for
the source-only validation path. Follow the
[Markdown Contributor Guide](docs/markdown/CONTRIBUTING_MARKDOWN.md) and use the
numbered
[Bun Markdown API Reference and repository contract](docs/markdown/API_REFERENCE.md)
for renderer, parser-option, callback, ANSI, React, and TypeScript behavior.
