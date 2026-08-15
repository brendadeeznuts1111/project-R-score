# Contributing

The canonical contributor guide is
[`docs/contributing/CONTRIBUTING.md`](docs/contributing/CONTRIBUTING.md).

## Repository authority

Read [`AGENTS.md`](AGENTS.md) before changing project policy, skills, tooling,
or release behavior. Project R owns its agent contract at
[`config/project-r-agent-contract.json`](config/project-r-agent-contract.json).

```bash
bun run agents:contract:check
bun run agents:contract:check -- --installed # operator-machine parity only
```

Use `bun run bun:ci` as merge authority. A global machine doctor or DX command
does not substitute for repository proof.

## Markdown

All governed Markdown must pass `bun run check`; use `bun run check:docs` for
the source-only validation path. Follow the
[Markdown Contributor Guide](docs/markdown/CONTRIBUTING_MARKDOWN.md) and use the
numbered
[Bun Markdown API Reference and repository contract](docs/markdown/API_REFERENCE.md)
for renderer, parser-option, callback, ANSI, React, and TypeScript behavior.
