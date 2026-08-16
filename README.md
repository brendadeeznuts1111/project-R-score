# FactoryWager Enterprise Platform

Bun-first operations and sports-intelligence monorepo. Shared domains and
verification live in `lib/`; packages live in `packages/`; product applications
live under `projects/active/`. Cloudflare Pages serves the static operator plane
from `public/` and `functions/`, backed by committed registry proofs in
`public/registry/`.

## Start here

| Need | Owner |
| --- | --- |
| Browse the platform | [`wiki-index.md`](wiki-index.md) |
| Find a registry artifact | [`registry-index.md`](registry-index.md) |
| Work as an agent | [`AGENTS.md`](AGENTS.md) → [`docs/AGENTS.md`](docs/AGENTS.md) |
| Find a path or repository boundary | [`STRUCTURE.md`](STRUCTURE.md) |
| Find a command | `bun run help` · generated [`docs/CLI.md`](docs/CLI.md) |
| Operate the harness | [`docs/harness/README.md`](docs/harness/) |
| Browse documentation by subject | [`docs/README.md`](docs/) |

These are routing surfaces, not competing sources of truth. Domain guides,
runbooks, and generated catalogs remain with the owner linked from them.

## Quick start

Use the repository-pinned Bun runtime and scripts:

```bash
bun run install:all
bun run install:verify
bun run help
bun run type-check
bun run test:affected
bun run bun:ci
```

`bun run bun:ci` is the local merge authority. Hosted GitHub Actions is not a
merge dependency. Install and bunfig behavior is owned by
[`docs/UNIFIED.md`](docs/UNIFIED.md).

## Repository shape

```text
lib/                  shared domains, brands, portal logic, and verification
packages/             root Bun workspaces
projects/active/      product applications and nested repositories
public/portal/        static operator boards
public/registry/      committed machine-readable proofs
functions/            Cloudflare Pages edge code
functions-bun-only/   Bun-runtime modules excluded from Pages bundles
scripts/              named automation workflows
tools/                focused Bun-native CLIs and audits
docs/                 contracts, guides, designs, and harness runbooks
```

The complete current map and nested-repository rules are in
[`STRUCTURE.md`](STRUCTURE.md). Product triage is owned by
[`projects/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/projects/README.md).

## Documentation contract

Governed Markdown follows the
[`Bun.markdown` API and repository contract](docs/markdown/API_REFERENCE.md).
Contributor examples and validation rules live in the
[`Markdown Contributor Guide`](docs/markdown/CONTRIBUTING_MARKDOWN.md).

```bash
bun run check:docs
```

Project policy and skills are repository-owned. Start with
[`AGENTS.md`](AGENTS.md); validate skills with `bun run skills:validate`.
