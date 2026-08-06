# {{name}}

{{description}}

Factory library scaffold for the FactoryWager monorepo. Use this template to
mint a small Bun-native package, prove it with tests, and optionally publish to
the internal R2 artifact registry.

## Scaffold

From the monorepo root (template lives in `.bun-create/factory-library`):

```bash
# Preferred — factory CLI wraps bun create + optional publish
bun run factory create factory-library {{name}}
bun run factory create factory-library {{name}} --publish

# Or bun create directly (same template search path)
bun create factory-library ./packages/{{name}}
```

Flags worth knowing:

| Flag | Effect |
|------|--------|
| `--publish` | After scaffold, publish to the Factory registry |
| `--force` | Overwrite existing destination files |
| `--no-install` | Skip `bun install` in the new tree |
| `--no-git` | Skip `git init` |

Env: `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` for live registry access;
optional `FACTORY_REGISTRY_URL`, `BUN_CREATE_DIR`.

## Usage

```ts
import { hello } from "{{name}}";

console.log(hello());
```

## Development

```bash
bun install
bun test
bun run build
```

## Publish

Package the library and push to the internal registry (from monorepo tooling):

```bash
# After build / pack
bun run factory:publish ./path/to/{{name}}-0.1.0.tgz \
  --name @factorywager/{{name}} --version 0.1.0 --type library

# Refresh Pages-facing registry snapshot when consumers need the new version
bun run factory:snapshot   # → public/registry/registry.json
# or: bun lib/factory/cli.ts snapshot public/registry/registry.json
```

List / install:

```bash
bun run factory:list
bun run factory:install {{name}}
```

See [lib/factory/README.md](../../lib/factory/README.md) and proof claim
`factory-registry-cli-v1` in [docs/harness/PROOF.md](../../docs/harness/PROOF.md).

## PR claim table

Every non-draft PR must fill **Claim → evidence** or CI fails
(`bun scripts/check-pr-claim.ts`). Start from
[`.github/pull_request_template.md`](../../.github/pull_request_template.md).

Example for a new factory library:

| Claim (one sentence) | Kind | Evidence |
|----------------------|------|----------|
| Scaffold builds and unit tests pass for `{{name}}` | unit | `bun test` in package dir (exit 0) |
| Package published and listable on Factory registry | deployed | `bun run factory:list` shows `@factorywager/{{name}}@…` |

Also complete **Artifact publish** in the PR template when you publish or rebase
the registry snapshot. Kinds must be `unit` / `boundary` / `journey` / `deployed`
(optionally joined with `+`).

## Consumers

If other projects import this library via `@factorywager/{{name}}`, use the
Bun plugin in `plugin.example.ts` to resolve the import path at build time:

```ts
import { factoryPlugin } from "../plugin.example";
await Bun.build({ entrypoints: ["./app.ts"], plugins: [factoryPlugin] });
```

See [Bun Plugins](https://bun.sh/docs/runtime/plugins#onresolve) for the full API.

## Configuration

`bunfig.toml` is pre-configured with:

- **Console depth** — `[console] depth = 4` for `console.log` / `Bun.inspect` output
- **Inline env vars** — `[serve.static] env = "PUBLIC_*"` exposes `process.env.PUBLIC_*`
  variables to frontend bundles at build time. Set `PUBLIC_REGISTRY_URL` in `.env` and
  Bun inlines it — no custom plugin needed.

See [Inline Environment Variables](https://bun.sh/docs/bundler/fullstack#inline-environment-variables).
