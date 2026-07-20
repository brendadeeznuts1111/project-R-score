# CLI Quick Reference

_Auto-generated from package.json. Run `bun run scripts/generate-cli-docs.ts` to regenerate._

---

## Root Workspace

All commands run via `bun run <name>` from the project root:

### Install
| Command | Description |
|---------|-------------|
| `bun run install:all` | scripts/with-bun-cache-env.ts install |
| `bun run install:cache:lifecycle` | scripts/bun-cache-lifecycle.ts --dry-run |
| `bun run install:cache:metrics` | scripts/bun-cache-lifecycle.ts --json |
| `bun run install:cache:prune` | scripts/bun-cache-lifecycle.ts --prune |
| `bun run install:factorywager` | scripts/with-bun-cache-env.ts install --filter './projects/active/factorywager/registry/packages/*' |
| `bun run install:kimiremote` | scripts/with-bun-cache-env.ts install --filter './projects/active/kimiremote/packages/*' |
| `bun run install:machine:health` | scripts/machine-bun-health.ts |
| `bun run install:packages` | scripts/with-bun-cache-env.ts install --filter './packages/*' |
| `bun run install:pm:health` | scripts/bun-cache-lifecycle.ts --dry-run --json |
| `bun run install:projects` | scripts/with-bun-cache-env.ts install --filter './projects/*' |
| `bun run install:projects:except:experimental` | scripts/with-bun-cache-env.ts install --filter './projects/*' --filter '!./projects/experimental/*' |
| `bun run install:verify` | scripts/verify-install-cache.ts |
| `bun run install:verify:strict` | scripts/verify-install-cache.ts --strict |

### Build
| Command | Description |
|---------|-------------|
| `bun run build:affected` | --filter '...' build |
| `bun run build:all` | --filter '*' build |
| `bun run build:protocol-handlers` | build protocols/resilience-chain.ts --target bun --outfile /tmp/protocol-resilience-chain.build.js |

### Test
| Command | Description |
|---------|-------------|
| `bun run test:affected` | --filter '...' test |
| `bun run test:barbershop` | test projects/active/barbershop/tests/*.ts |
| `bun run test:continuity` | tests/business-continuity-test.ts |
| `bun run test:dashboard:endpoints` | scripts/test-dashboard-endpoints.ts |
| `bun run test:dashboard:mini` | scripts/test-dashboard-mini.ts |
| `bun run test:dashboard:suite` | scripts/test-dashboard-suite.ts |
| `bun run test:dashboard:websocket` | scripts/test-dashboard-websocket.ts |
| `bun run test:endpoints` | scripts/test-endpoints-local.ts |
| `bun run test:integration` | tests/payment-dashboard-integration.ts |
| `bun run test:p2p` | tests/p2p-proxy-quick-test.ts |
| `bun run test:payments` | tests/payment-flow-demo.ts |
| `bun run test:protocol-integration` | test:protocol:matrix |
| `bun run test:protocol:blob` | scripts/dashboard-protocol-check.ts --protocol=blob |
| `bun run test:protocol:data` | scripts/dashboard-protocol-check.ts --protocol=data |
| `bun run test:protocol:file` | scripts/dashboard-protocol-check.ts --protocol=file |
| `bun run test:protocol:http` | scripts/dashboard-protocol-check.ts --protocol=http |
| `bun run test:protocol:https` | scripts/dashboard-protocol-check.ts --protocol=https |
| `bun run test:protocol:matrix` | scratch --parallel test:protocol:http test:protocol:https test:protocol:s3 test:protocol:file test:protocol:data test:protocol:blob test:protocol:unix |
| `bun run test:protocol:parallel` | scripts/test-protocol-parallel.ts |
| `bun run test:protocol:parallel:baseline` | scripts/test-protocol-parallel.ts --rerun-each=3 --max-concurrency=4 --json-out=reports/protocol-parallel.baseline.json |
| `bun run test:protocol:parallel:compare` | scripts/test-protocol-parallel.ts --rerun-each=3 --max-concurrency=4 --max-failures=0 --max-p95-ms=120 --baseline-json=reports/protocol-parallel.baseline.json --max-p95-regression-ms=20 --max-failure-regression=0 --json-out=reports/protocol-parallel.compare.json |
| `bun run test:protocol:parallel:deep` | scripts/test-protocol-parallel.ts --rerun-each=3 --max-concurrency=4 --json-out=reports/protocol-parallel.latest.json |
| `bun run test:protocol:parallel:gate` | scripts/test-protocol-parallel.ts --rerun-each=3 --max-concurrency=4 --max-failures=0 --max-p95-ms=120 --json-out=reports/protocol-parallel.gate.json |
| `bun run test:protocol:parallel:promote-baseline` | scripts/protocol-baseline-promote.ts |
| `bun run test:protocol:parallel:promote-baseline:dryrun` | test:protocol:parallel:compare |
| `bun run test:protocol:s3` | scripts/dashboard-protocol-check.ts --protocol=s3 |
| `bun run test:protocol:unix` | scripts/dashboard-protocol-check.ts --protocol=unix |
| `bun run test:scoped` | test tests/console-depth.test.ts |
| `bun run test:scoped:bail` | test tests/console-depth.test.ts --bail=10 |
| `bun run test:snapshots:update` | test tests/console-depth.test.ts --update-snapshots |
| `bun run test:workspaces` | --filter '*' test |

### Lint
| Command | Description |
|---------|-------------|
| `bun run lint:affected` | --filter '...' lint |
| `bun run lint:all` | --filter '*' lint |
| `bun run lint:bun-native` | scripts/harness-strict-lint.ts |
| `bun run lint:bun-native:rollout` | eslint --config eslint.bun-native.config.ts 'lib/**/*.ts' 'scripts/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' --ignore-pattern '**/*.test.ts' --ignore-pattern '**/*.spec.ts' --ignore-pattern '**/*.bench.ts' --quiet |
| `bun run lint:ci:root` | eslint lib/ai --ext .ts,.tsx |
| `bun run lint:fix` | NODE_OPTIONS='--max-old-space-size=16384' bun run eslint lib/ --ext .ts --fix |
| `bun run lint:harness` | eslint --config eslint.harness.config.ts 'lib/**/*.ts' 'scripts/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' --ignore-pattern '**/*.test.ts' --ignore-pattern '**/*.spec.ts' --ignore-pattern '**/*.bench.ts' |

### Core
| Command | Description |
|---------|-------------|
| `bun run format` | Prettier on lib/ |
| `bun run lint` | ESLint on lib/ |
| `bun run validate:workspaces` | scripts/validate-workspaces.ts |

### Development
| Command | Description |
|---------|-------------|
| `bun run dev` | Start platform watch server (server-enhanced.ts) |

### Demo
| Command | Description |
|---------|-------------|
| `bun run demo:baseline:hydrate` | scripts/demo-baseline-hydrate.ts |
| `bun run demo:bench:all` | scripts/demo-benchmark-sweep.ts |
| `bun run demo:bench:all:gate` | scripts/demo-benchmark-sweep.ts --compare-last --max-regression-pct=25 |
| `bun run demo:bench:core` | scripts/demo-benchmark-sweep.ts --filter=protocol --limit=12 |
| `bun run demo:bench:core:gate` | scripts/demo-benchmark-sweep.ts --filter=protocol --limit=12 --compare-last --max-regression-pct=25 |
| `bun run demo:contract:validate` | scripts/validate-demo-modules.ts |
| `bun run demo:markdown` | tools/markdown-demo.ts |
| `bun run demo:module:bench` | scripts/demo-module-bench.ts |
| `bun run demo:module:test` | scripts/demo-module-test.ts |
| `bun run demo:r2` | scripts/demo-r2-mcp.ts |
| `bun run demo:tier1:check` | scripts/demo-tier1-baselines.ts |

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

### Workspace
| Command | Description |
|---------|-------------|
| `bun run workspaces:all:parallel` | --parallel --if-present workspaces:build workspaces:lint workspaces:test |
| `bun run workspaces:all:sequential` | --sequential --if-present workspaces:build workspaces:lint workspaces:test |
| `bun run workspaces:build` | --sequential --workspaces --if-present build |
| `bun run workspaces:dev` | --parallel --workspaces --if-present dev |
| `bun run workspaces:lint` | --parallel --workspaces --if-present lint |
| `bun run workspaces:test` | --parallel --workspaces --if-present test |

### Help
| Command | Description |
|---------|-------------|
| `bun run help` | scripts/help.ts |
| `bun run help:verbose` | scripts/help.ts --verbose |

### Package Management
| Command | Description |
|---------|-------------|
| `bun run packages:list` | scripts/packages-list.ts |
| `bun run packages:outdated` | outdated --filter=factorywager-enterprise |

### Cheatsheet
| Command | Description |
|---------|-------------|
| `bun run cheatsheet:dashboard` | cheatsheet:integrated dashboard |

### Search
| Command | Description |
|---------|-------------|
| `bun run search:bench` | scripts/search-benchmark.ts |
| `bun run search:bench:baseline:verify` | scripts/search-benchmark-baseline-governance.ts --json |
| `bun run search:bench:compare` | scripts/search-benchmark-pin.ts compare |
| `bun run search:bench:dashboard` | scripts/search-benchmark-dashboard.ts |
| `bun run search:bench:gate` | scripts/search-benchmark-pin.ts compare --strict --bootstrap-missing-baseline |
| `bun run search:bench:pin` | scripts/search-benchmark-pin.ts pin |
| `bun run search:bench:snapshot:core:wide:local` | scripts/search-benchmark-snapshot.ts --path ./lib,./packages/docs-tools/src --limit 40 --query-pack core_delivery_wide --overlap remove --concurrency 2 --no-upload |
| `bun run search:code` | scripts/codesearch-cli.ts |
| `bun run search:contract:check` | scripts/search-status-contract-check.ts |
| `bun run search:coverage:loc` | scripts/search-coverage-loc.ts |
| `bun run search:domain:doctor` | scripts/domain-registry-status.ts --doctor |
| `bun run search:domain:tokens:sync` | scripts/domain-token-sync.ts |
| `bun run search:lib:cleanup` | scripts/search-smart.ts --path ./lib --view slop-only --task cleanup --group-limit 5 --show-mirrors |
| `bun run search:lib:cleanup:report` | scripts/search-cleanup-report.ts |
| `bun run search:lib:strict` | scripts/search-smart.ts --path ./lib --strict --family-cap 2 |
| `bun run search:loop:check:local:fast` | scripts/search-loop-check-local.ts --mode fast |
| `bun run search:loop:check:local:full` | scripts/search-loop-check-local.ts --mode full |
| `bun run search:loop:runbook` | scripts/search-loop-runbook.ts |
| `bun run search:policy:check` | scripts/check-search-policy-governance.ts |
| `bun run search:preflight:emergency` | scripts/search-emergency-preflight.ts |
| `bun run search:smart` | scripts/search-smart.ts |
| `bun run search:smart:index` | scripts/search-smart-index.ts |
| `bun run search:status:unified:strict` | scripts/search-unified-status.ts --json --strict |
| `bun run search:strict` | scripts/search-smart.ts --strict |

### Format
| Command | Description |
|---------|-------------|
| `bun run format:check` | prettier --check lib/**/*.ts |
| `bun run format:check:core` | format:check:harness |
| `bun run format:check:harness` | x prettier --check 'lib/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' 'scripts/*.ts' 'scripts/fix-*.ts' |
| `bun run format:core` | format:harness |
| `bun run format:harness` | x prettier --write 'lib/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' 'scripts/*.ts' 'scripts/fix-*.ts' |

### Wiki
| Command | Description |
|---------|-------------|
| `bun run wiki:filter` | scripts/wiki-matrix-filter.ts |
| `bun run wiki:gen` | scripts/ai-wiki-gen.ts |
| `bun run wiki:live` | scripts/wiki-live-dashboard.ts |
| `bun run wiki:matrix` | scripts/wiki-matrix-cli.ts |
| `bun run wiki:mcp` | Wiki generator MCP CLI (pass subcommand: generate, templates, …) |
| `bun run wiki:pipe` | scripts/wiki-matrix-pipe.ts |

### DataView
| Command | Description |
|---------|-------------|
| `bun run dataview` | scripts/dataview-cli.ts |
| `bun run dataview:test` | scripts/dataview-tests.ts |

### Documentation
| Command | Description |
|---------|-------------|
| `bun run docs:analyze` | tools/cli/integrated-cli.ts analyze |
| `bun run docs:build` | docs:sync:integrated |
| `bun run docs:cache` | tools/cli/docs-cli.ts cache |
| `bun run docs:demo` | examples/bun-docs-demo.ts |
| `bun run docs:domain:graph` | docs/domain-renderer.ts full |
| `bun run docs:fetch` | lib/registry/package-docs.ts |
| `bun run docs:index` | tools/cli/docs-cli.ts index |
| `bun run docs:init` | tools/cli/integrated-cli.ts init |
| `bun run docs:install` | bash scripts/install-bun-docs.sh |
| `bun run docs:open` | tools/cli/docs-cli.ts open |
| `bun run docs:orchestration:graph` | docs/orchestration-graph.ts flow |
| `bun run docs:publish` | tools/cli/integrated-cli.ts publish |
| `bun run docs:rss` | lib/registry/rss-aggregator.ts |
| `bun run docs:search` | tools/cli/docs-cli.ts search |
| `bun run docs:serve` | docs:open |
| `bun run docs:sync` | lib/registry/docs-sync.ts |
| `bun run docs:sync:integrated` | tools/cli/integrated-cli.ts sync |

### Markdown
| Command | Description |
|---------|-------------|
| `bun run markdown` | Render markdown (pass file + format: ansi, html, links, headings, plain) |
| `bun run markdown:options` | Bun markdown parser option demos (pass demo|compare|gfm|extended) |

### RSS
| Command | Description |
|---------|-------------|
| `bun run rss:add` | lib/registry/rss-aggregator.ts add |
| `bun run rss:feeds` | lib/registry/rss-aggregator.ts feeds |
| `bun run rss:fetch` | lib/registry/rss-aggregator.ts fetch |
| `bun run rss:html` | lib/registry/rss-aggregator.ts html |
| `bun run rss:list` | lib/registry/rss-aggregator.ts list |

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
```

## Registry Info

- **Primary registry**: `registry.factory-wager.com`
- **Default (npm)**: public packages
- **Full manifest**: `docs/packages/REGISTRY.md`
- **Package scope**: `@factorywager/*` (core), `@fire22/*` (fantasy42)
