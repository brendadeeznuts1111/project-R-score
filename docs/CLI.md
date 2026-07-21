# CLI Quick Reference

_Auto-generated from package.json. Run `bun run cli:docs` (or `bun run scripts/generate-cli-docs.ts`) to regenerate._

Category labels come from [`scripts/lib/cli-categories.ts`](../scripts/lib/cli-categories.ts) (shared with `bun run help`).

---

## Day loop (prefer these)

| Command | Why |
|---------|-----|
| `bun run help` | Interactive categorized commands |
| `bun run type-check` | Scoped check via `tsconfig.check.json` (not full) |
| `bun run build:affected` | `bun run --filter '...' build` — changed packages only |
| `bun run test:affected` | `bun run --filter '...' test` |
| `bun run cli:docs` | Refresh this file |

CI uses `bun run type-check:ci` (`tsconfig.ci.json`). Full solution: `type-check:full` (rare).

---

## Root Workspace

All commands run via `bun run <name>` from the project root:

### Core
| Command | Description |
|---------|-------------|
| `bun run cli:docs` | scripts/generate-cli-docs.ts |
| `bun run format` | Prettier on lib/ |
| `bun run lint` | ESLint on lib/ |
| `bun run type-check` | Day-loop typecheck (tsconfig.check.json) |

### Help
| Command | Description |
|---------|-------------|
| `bun run help` | Interactive categorized command list (use --verbose for all) |

### Package Management
| Command | Description |
|---------|-------------|
| `bun run packages:list` | scripts/packages-list.ts |

### Format
| Command | Description |
|---------|-------------|
| `bun run format:check` | prettier --check lib/**/*.ts |
| `bun run format:check:harness` | x prettier --check 'lib/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' 'scripts/*.ts' 'scripts/fix-*.ts' |
| `bun run format:core` | format:harness |
| `bun run format:harness` | x prettier --write 'lib/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' 'scripts/*.ts' 'scripts/fix-*.ts' |

### Antipattern Fixing
| Command | Description |
|---------|-------------|
| `bun run fix:as-any` | scripts/fix-as-any.ts |
| `bun run fix:console-log` | scripts/fix-console-log.ts |
| `bun run fix:default-exports-bulk` | scripts/fix-default-exports-bulk.ts |
| `bun run fix:empty-catches` | scripts/fix-empty-catches.ts |
| `bun run fix:pin-versions` | scripts/fix-pin-versions.ts |
| `bun run fix:scan-any-types` | scripts/fix-any-types.ts |
| `bun run fix:scan-default-exports` | scripts/fix-default-exports.ts |
| `bun run fix:scan-non-null-assertions` | scripts/fix-non-null-assertions.ts |

### Lint
| Command | Description |
|---------|-------------|
| `bun run lint:bun-native` | scripts/harness-strict-lint.ts |
| `bun run lint:bun-native:rollout` | eslint --config eslint.bun-native.config.ts 'lib/**/*.ts' 'scripts/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' --ignore-pattern '**/*.test.ts' --ignore-pattern '**/*.spec.ts' --ignore-pattern '**/*.bench.ts' --quiet |
| `bun run lint:fix` | NODE_OPTIONS='--max-old-space-size=16384' bun run eslint lib/ --ext .ts --fix |
| `bun run lint:harness` | eslint --config eslint.harness.config.ts 'lib/**/*.ts' 'scripts/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' --ignore-pattern '**/*.test.ts' --ignore-pattern '**/*.spec.ts' --ignore-pattern '**/*.bench.ts' |

### Build
| Command | Description |
|---------|-------------|
| `bun run build:affected` | Build packages affected by current changes (bun --filter ...) |

### Test
| Command | Description |
|---------|-------------|
| `bun run test:affected` | Test packages affected by current changes (bun --filter ...) |
| `bun run test:scoped` | test tests/console-depth.test.ts |

### Install
| Command | Description |
|---------|-------------|
| `bun run install:all` | scripts/with-bun-cache-env.ts install |
| `bun run install:cache:lifecycle` | scripts/bun-cache-lifecycle.ts --dry-run |
| `bun run install:cache:prune` | scripts/bun-cache-lifecycle.ts --prune |
| `bun run install:machine:health` | scripts/machine-bun-health.ts |
| `bun run install:verify` | scripts/verify-install-cache.ts |
| `bun run install:verify:strict` | scripts/verify-install-cache.ts --strict |

### Development
| Command | Description |
|---------|-------------|
| `bun run dev` | Start platform watch server (server-enhanced.ts) |

### Demo
| Command | Description |
|---------|-------------|
| `bun run demo:contract:validate` | scripts/validate-demo-modules.ts |
| `bun run demo:module:bench` | scripts/demo-module-bench.ts |

### Deploy
| Command | Description |
|---------|-------------|
| `bun run deploy:production` | scripts/deployment/deploy-production.ts |
| `bun run deploy:staging` | bash scripts/shell/deploy-staging.sh |
| `bun run deployment:readiness` | scripts/deployment/readiness-matrix.ts |

### Search
| Command | Description |
|---------|-------------|
| `bun run search:bench` | scripts/search-benchmark.ts |
| `bun run search:bench:baseline:verify` | scripts/search-benchmark-baseline-governance.ts --json |
| `bun run search:bench:dashboard` | scripts/search-benchmark-dashboard.ts |
| `bun run search:bench:gate` | scripts/search-benchmark-pin.ts compare --strict --bootstrap-missing-baseline |
| `bun run search:bench:snapshot:core:wide:local` | scripts/search-benchmark-snapshot.ts --path ./lib,./packages/docs-tools/src --limit 40 --query-pack core_delivery_wide --overlap remove --concurrency 2 --no-upload |
| `bun run search:coverage:loc` | scripts/search-coverage-loc.ts |
| `bun run search:domain:doctor` | scripts/domain-registry-status.ts --doctor |
| `bun run search:loop:runbook` | scripts/search-loop-runbook.ts |
| `bun run search:policy:check` | scripts/check-search-policy-governance.ts |
| `bun run search:smart` | scripts/search-smart.ts |
| `bun run search:status:unified:strict` | scripts/search-unified-status.ts --json --strict |

### Wiki
| Command | Description |
|---------|-------------|
| `bun run wiki:mcp` | Wiki generator MCP CLI (pass subcommand: generate, templates, …) |

### Markdown
| Command | Description |
|---------|-------------|
| `bun run markdown` | Render markdown (pass file + format: ansi, html, links, headings, plain) |

### Documentation
| Command | Description |
|---------|-------------|
| `bun run docs:catalog` | tools/bun-docs-catalog.ts list |
| `bun run docs:catalog:build` | tools/bun-docs-catalog.ts build |
| `bun run docs:catalog:export` | tools/bun-docs-catalog.ts export --compact |
| `bun run docs:map:check` | tools/doc-map-check.ts |
| `bun run docs:refresh` | tools/bun-docs-refresh.ts |
| `bun run docs:release-index` | tools/bun-docs-releases.ts index |
| `bun run docs:release-scrape` | tools/bun-docs-releases.ts scrape |
| `bun run docs:sync:integrated` | tools/cli/integrated-cli.ts sync |

### Registry
| Command | Description |
|---------|-------------|
| `bun run registry:config` | lib/registry/cli.ts config |
| `bun run registry:doctor` | scripts/registry-stack-doctor.ts |
| `bun run registry:doctor:fix` | scripts/registry-stack-doctor.ts --fix |
| `bun run registry:doctor:json` | scripts/registry-stack-doctor.ts --json |
| `bun run registry:projects` | scripts/generate-project-registry.ts |
| `bun run registry:publish` | lib/registry/cli.ts publish |
| `bun run registry:stats` | lib/registry/cli.ts stats |

### Brands
| Command | Description |
|---------|-------------|
| `bun run brand:baseline` | tools/branded-id-check.ts --write-baseline |
| `bun run brand:bench:evaluate` | scripts/brand-bench-evaluate.ts --json |
| `bun run brand:bench:pin` | scripts/brand-bench-pin.ts |
| `bun run brand:bench:profile` | scripts/brand-cpu-profile.ts --target=bench --cpu-prof-interval=250 |
| `bun run brand:bench:run` | scripts/brand-bench-runner.ts |
| `bun run brand:catalog` | tools/brand-catalog.ts |
| `bun run brand:manifest` | tools/brand-manifest.ts |
| `bun run brand:manifest:check` | tools/brand-manifest.ts --check |

### Validate
| Command | Description |
|---------|-------------|
| `bun run validate:bun-urls` | scripts/validate-bun-urls.ts |
| `bun run validate:github` | scripts/bun-github-validation.ts |
| `bun run validate:integrity` | scripts/validate-integrity.ts |
| `bun run validate:integrity:all` | scripts/validate-integrity.ts --section=all |
| `bun run validate:workspaces` | scripts/validate-workspaces.ts |

### CI
| Command | Description |
|---------|-------------|
| `bun run ci:bun:check` | scripts/ci-bun-check.ts |
| `bun run ci:demo:contract` | demo:contract:validate |
| `bun run ci:r2:version:check` | scripts/ci-r2-version-check.ts |
| `bun run ci:validate` | --sequential standards:check |

### Security
| Command | Description |
|---------|-------------|
| `bun run security:audit` | audit |
| `bun run security:guard:deps` | scripts/security-dependency-guard.ts |
| `bun run security:posture:report` | scripts/security/posture-report.ts |
| `bun run security:secrets:local` | scripts/secrets-scan-local.ts |

---

## Project-Level (cd to project)

Each project in `projects/` is independent:

| Action | Command |
|--------|---------|
| Install deps | `cd projects/active/<name> && bun install` |
| Run tests | `cd projects/active/<name> && bun test` |
| Check outdated | `cd projects/active/<name> && bun outdated` |
| Add dep pinned | `cd projects/active/<name> && bun add <pkg> -E` |

---

## Git Workflow

| Action | Command |
|--------|---------|
| Quick status | `git status --short` |
| Check changes | `git diff --stat` |
| Stage all | `git add -A` |
| Commit | `git commit -m "type: message"` |

---

## Project Triage

```bash
# Promote experimental → active
git mv projects/experimental/<name> projects/active/<name>

# Archive active → archive
git mv projects/active/<name> projects/archive/<name>

# Check triage status
bun run packages:list --filter=active
bun run registry:projects
```

## Registry Info

- **Primary registry**: `registry.factory-wager.com`
- **Default (npm)**: public packages
- **Full manifest**: `docs/packages/REGISTRY.md` (`bun run packages:list --write`)
- **Projects browser**: `public/registry/projects-registry.json` (`bun run registry:projects`)
- **Package scope**: `@factorywager/*` (core), `@fire22/*` (fantasy42)

