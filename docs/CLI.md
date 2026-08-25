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

Use `bun run type-check:ci` (`tsconfig.ci.json`) for the fast development loop. Merge CI runs the root `type-check:full` solution once.

---

## Root Workspace

All commands run via `bun run <name>` from the project root:

### Core
| Command | Description |
|---------|-------------|
| `bun run bun:api-drift:check` | Ratchet: active source uses only APIs present in the installed Bun runtime |
| `bun run check:harness-complexity` | Fail if any lib/harness function exceeds complexity-baseline.json (--update-baseline to raise) |
| `bun run check:harness-complexity:staged` | Complexity floor on staged lib/harness files (git diff | Bun.stdin) |
| `bun run check:harness-orphans` | Fail if any lib/harness/*.ts module has no importers |
| `bun run check:pr-claim` | PR Claim → evidence body check (warn-first → error after 2026-07-28 UTC; --dry-run logs WOULD_*) |
| `bun run cli:docs` | scripts/generate-cli-docs.ts |
| `bun run format` | Prettier on lib/ |
| `bun run harness:status` | Discover (display only): day-loop + proof catalog — not a gate |
| `bun run lib:area-maps:check` | Ratchet: ## Area map entry paths/globs resolve under domain |
| `bun run lib:area-maps:check:orphans` | Report top-level .ts not listed in Area map (warn) |
| `bun run lib:domains:check` | Ratchet: every first-level lib/*/ has README.md |
| `bun run lint` | ESLint on changed harness files (cached) |
| `bun run projects:roots:check` | Ratchet: product structure + tier-aware Bun contract under projects/ |
| `bun run projects:syntax:check` | Gate: every active JavaScript/TypeScript source file parses |
| `bun run proof:install` | Journey proof: install layout healthy |
| `bun run spine:schedule` | Spine multi-tenant daemon (in-process Bun.cron complement) |
| `bun run spine:schedule:once` | Run spine tenants once (all, or --tenant=install-verify) |
| `bun run type-check` | Day-loop typecheck (tsconfig.check.json) |

### Help
| Command | Description |
|---------|-------------|
| `bun run help` | Interactive categorized command list (use --verbose for all) |

### Package Management
| Command | Description |
|---------|-------------|
| `bun run packages:docs-index` | scripts/packages-docs-index.ts --write |
| `bun run packages:docs-index:check` | scripts/packages-docs-index.ts --check |
| `bun run packages:list` | scripts/packages-list.ts |

### Format
| Command | Description |
|---------|-------------|
| `bun run format:check` | x prettier --check 'lib/**/*.ts' 'packages/**/*.ts' 'server/**/*.ts' 'config/**/*.ts' 'tools/**/*.ts' 'scripts/*.ts' 'scripts/fix-*.ts' 'tests/**/*.ts' |
| `bun run format:staged` | x prettier --check |

### Package Governance
| Command | Description |
|---------|-------------|
| `bun run dependencies:dedupe:check` | Fail when compatible bun.lock versions can collapse |
| `bun run dependencies:dedupe:dry-run` | Preview compatible bun.lock version convergence |
| `bun run dependencies:diff` | Review package-version changes with bun pm diff |
| `bun run dependencies:governance:check` | Bun 1.4 production-license shape + lockfile dedupe gate |
| `bun run dependencies:licenses` | Path-free production dependency license summary |
| `bun run dependencies:licenses:json` | Path-free production dependency license summary as JSON |
| `bun run dependencies:prune:dry-run` | Preview installed files not represented by bun.lock |

### Repository Hygiene
| Command | Description |
|---------|-------------|
| `bun run channels:bun-1.4:check` | Verify Bun 1.4 manifest-derived XML feeds and ownership snapshot |
| `bun run channels:bun-1.4:rebuild` | Rebuild feeds and write a content-addressed Bun.Archive |
| `bun run channels:bun-1.4:watch` | Watch the reviewed manifest and rebuild derived channel outputs |
| `bun run channels:projects` | Regenerate the reviewed project/repository/channel ownership registry |
| `bun run channels:projects:check` | Verify project ownership, aliases, copied-feed absence, and branded type contracts |
| `bun run channels:projects:types` | Compile the project/channel branded-ID type contract |
| `bun run deps:outdated` | scripts/deps-outdated-workspaces.ts |
| `bun run deps:rate-removal` | Grade direct dependency removal evidence; advisory only |
| `bun run files:rate-removal` | SHA-256 duplicate, large-file, reference, and addressability grading; advisory only |

### Antipattern Fixing
| Command | Description |
|---------|-------------|
| `bun run fix:as-any` | scripts/fix-as-any.ts |
| `bun run fix:console-log` | scripts/fix-console-log.ts |
| `bun run fix:default-exports-bulk` | scripts/fix-default-exports-bulk.ts |
| `bun run fix:empty-catches` | scripts/fix-empty-catches.ts |
| `bun run fix:pin-versions` | scripts/fix-pin-versions.ts |

### Lint
| Command | Description |
|---------|-------------|
| `bun run lint:all` | ESLint on the complete harness scope (cached) |
| `bun run lint:fix` | scripts/lint-harness.ts --changed --cache-location=.cache/eslint --fix --max-warnings=0 |
| `bun run lint:money-sql:staged` | scripts/lint-money-sql.ts --staged |

### Build
| Command | Description |
|---------|-------------|
| `bun run build:affected` | Build git-changed workspaces (scripts/affected-workspaces.ts) |
| `bun run build:defines` | AST build constants (BUILD_VERSION/TIME/COMMIT) + DEBUG DCE via Bun.build/--define |
| `bun run build:defines:compile` | build:defines --compile → dist/fw-build-info |
| `bun run build:defines:dev` | build:defines with DEBUG=true / --feature=DEBUG |
| `bun run build:doc-index` | tools/build-doc-index.ts --save |
| `bun run build:portal-cli` | build tools/portal-cli.ts --compile --outfile dist/portal |

### Test
| Command | Description |
|---------|-------------|
| `bun run test:affected` | Test git-changed workspaces (scripts/affected-workspaces.ts) |
| `bun run test:bun:1.3.14` | test tests/regression/bun-1.3.14.test.ts tests/bun-1.3.14-web-api-fixes.test.ts tests/bun-toml-version-contract.test.ts |
| `bun run test:bun:1.4.0` | test tests/bun-1.4.0-web-api-contract.test.ts tests/bun-1.4.0-cron-contract.test.ts tests/bun-1.4.0-breaking-changes-contract.test.ts tests/bun-1.4.0-behavior-contract.test.ts tests/bun-1.4.0-install-behavior-contract.test.ts tests/bun-1.4.0-other-behavior-batch2.test.ts tests/bun-1.4.0-other-behavior-serve-fetch.test.ts tests/bun-1.4.0-other-behavior-residual.test.ts tests/bun-1.4.0-other-behavior-snapshot.test.ts tests/bun-toml-version-contract.test.ts |
| `bun run test:bun:assets` | test tests/bun-1.4-asset-validation.test.ts tests/bun-1.4-assets-portal.test.ts |
| `bun run test:bun:release-contracts` | test tests/bun-channel-surfaces.test.ts tests/bun-1.3.14-web-api-fixes.test.ts tests/bun-1.4.0-web-api-contract.test.ts tests/bun-1.4.0-cron-contract.test.ts tests/bun-1.4.0-breaking-changes-contract.test.ts tests/bun-1.4.0-behavior-contract.test.ts tests/bun-1.4.0-fetch-deep-contract.test.ts tests/bun-1.4.0-install-behavior-contract.test.ts tests/bun-1.4.0-observability-contract.test.ts tests/bun-1.4.0-other-behavior-batch2.test.ts tests/bun-1.4.0-other-behavior-serve-fetch.test.ts tests/bun-1.4.0-other-behavior-residual.test.ts tests/bun-1.4.0-other-behavior-snapshot.test.ts tests/bun-1.4-capabilities.test.ts tests/bun-1.4-cli-example.test.ts tests/bun-package-governance.test.ts tests/markdown-safe-html.test.ts tests/bun-toml-version-contract.test.ts tests/bun-xml-native-contract.test.ts |
| `bun run test:changed` | Bun test --changed (or -- <ref> → --changed=REF) |
| `bun run test:changed:main` | Bun test --changed via --main-head (origin/main|main|HEAD~1) |
| `bun run test:changed:serial` | scripts/bun-test-changed.ts --serial |
| `bun run test:changed:watch` | Bun test --changed --watch (stay alive; re-query git each restart) |
| `bun run test:ci` | bash -c 'mkdir -p "$(dirname "${JUNIT_OUT:-tmp/junit.xml}")" && export NODE_ENV=test && bun scripts/run-with-junit-env.ts test --timeout=30000 --pass-with-no-tests $(find tests -name "*.test.ts" -not -path "*/node_modules/*") --reporter=junit --reporter-outfile="${JUNIT_OUT:-tmp/junit.xml}"' |
| `bun run test:ci-deploy` | CI/deploy runbooks + discover-ci coverage ratchet |
| `bun run test:ci:report` | bash -c 'bun run test:ci; bun run failures:bake' |
| `bun run test:ci:shard` | bash -c 'mkdir -p "$(dirname "${JUNIT_OUT:-tmp/junit.xml}")" && export NODE_ENV=test && bun scripts/run-with-junit-env.ts test --timeout=30000 --pass-with-no-tests $(find tests -name "*.test.ts" -not -path "*/node_modules/*") --shard="${SHARD:-1/4}" --reporter=junit --reporter-outfile="${JUNIT_OUT:-tmp/junit.xml}"' |
| `bun run test:ci:shard:parallel` | bash -c 'mkdir -p "$(dirname "${JUNIT_OUT:-tmp/junit.xml}")" && export NODE_ENV=test && bun scripts/run-with-junit-env.ts test --parallel=4 --timeout=30000 --pass-with-no-tests $(find tests -name "*.test.ts" -not -path "*/node_modules/*") --shard="${SHARD:-1/4}" --reporter=junit --reporter-outfile="${JUNIT_OUT:-tmp/junit.xml}"' |
| `bun run test:code-quality` | Code-quality tenants: types · harness coverage · orphan modules |
| `bun run test:code-quality:smol` | test:code-quality under bun --smol (eager GC for tight CI) |
| `bun run test:colors` | Unit + validate:colors:strict (claim color-kernel-theme-aliases) |
| `bun run test:concept` | NODE_ENV=test bun test tests/concept-graph.test.ts tests/concept-audit.test.ts tests/concept-domains.test.ts tests/partner-history-portal.test.ts tests/portal-board-routes.test.ts tests/limit-row-wire.test.ts |
| `bun run test:coverage` | scripts/run-test-coverage.ts |
| `bun run test:cron` | Cron contract ratchet (OS-persistent primary / in-process complement · docs/harness/cron.md) |
| `bun run test:cron-os` | OS-persistent Bun.cron(path, schedule, title) journey (register → fire → marker → remove) |
| `bun run test:dev` | NODE_ENV=test bun test --watch --parallel --pass-with-no-tests tests |
| `bun run test:dots` | NODE_ENV=test bun test --dots --pass-with-no-tests tests |
| `bun run test:harness-coverage` | lib/harness coverage floor vs coverage-baseline.json |
| `bun run test:inspect` | scripts/inspect-tests.ts |
| `bun run test:inspect:smoke` | scripts/inspect-tests.ts --quiet --json -- tests/inspect-test-reporter.test.ts -t "helpers" |
| `bun run test:install-verify` | Install-verify → smoke HTML → Bun.WebView journey (tests/journey/install-verify.test.ts) |
| `bun run test:inventory` | scripts/suite-inventory.ts |
| `bun run test:isolate` | Bun test --isolate (fresh global per file) |
| `bun run test:parallel` | Bun test --parallel (workers; implies --isolate) |
| `bun run test:partner-cli:snapshots` | test tests/partner-cli-snapshots.test.ts |
| `bun run test:partner-cli:snapshots:update` | test tests/partner-cli-snapshots.test.ts -u |
| `bun run test:portal-snapshot:cron-os` | test tests/journey/portal-snapshot-cron-os.test.ts |
| `bun run test:rss:images` | test tests/rss-image-enrichment.test.ts tests/rss-image-fetch-policy.test.ts |
| `bun run test:rss:native` | test tests/bun-rss.test.ts tests/rss-xml-native.test.ts tests/rss-xml-shape-contract.test.ts tests/rss-image-fetch-policy.test.ts tests/rss-image-enrichment.test.ts tests/rss-package-feed.test.ts tests/rss-fanout.test.ts tests/rss-response.test.ts tests/bun-1.4-capabilities.test.ts tests/bun-1.4-feeds.test.ts tests/bun-1.4-channel-release.test.ts |
| `bun run test:scoped` | test tests/console-depth.test.ts |
| `bun run test:search-governance` | Search governance → search-smart + WebView type/submit journey (tests/journey/search-governance.test.ts) |
| `bun run test:seat-desk` | test tests/seat-capital-desk.test.ts tests/seat-desk-callback.test.ts tests/seat-desk-snapshot.test.ts tests/handshake-snapshot.test.ts tests/telegram-catalog-research.test.ts tests/partner-forum-accounting.test.ts |
| `bun run test:secrets` | test tests/secret-ratchet.test.ts tests/mintable-secret.test.ts tests/env-secret-policy.test.ts |
| `bun run test:secrets:watch` | test --watch tests/secret-ratchet.test.ts |
| `bun run test:shard` | Bun test --shard=$SHARD (CI split; default 1/1) |
| `bun run test:shard:parallel` | bash -c 'bun test --parallel --timeout=30000 --pass-with-no-tests tests --shard="${SHARD:-1/3}"' |
| `bun run test:showcase` | test tests/bun-api-showcase.test.ts |
| `bun run test:snapshots` | tools/bun-test-snapshots.ts --test |
| `bun run test:snapshots:list` | tools/bun-test-snapshots.ts --list |
| `bun run test:snapshots:update` | tools/bun-test-snapshots.ts --update |
| `bun run test:state-compliance` | test --parallel --timeout=30000 tests/state-compliance.test.ts tests/state-compliance-http.test.ts tests/geo-dimensions.test.ts |
| `bun run test:state-compliance:watch` | test --watch --parallel --timeout=30000 tests/state-compliance.test.ts tests/state-compliance-http.test.ts tests/geo-dimensions.test.ts |
| `bun run test:telegram-handshake` | test tests/verify-package-group-handshake.test.ts tests/handshake-desk.test.ts tests/handshake-lanes.test.ts tests/handshake-readiness.test.ts tests/handshake-catalog.test.ts tests/dm-seat-designation.test.ts tests/package-group-registry.test.ts tests/package-group-event-log.test.ts tests/package-group-membership.test.ts tests/forum-invite-gap.test.ts tests/ops-channel-outbox.test.ts tests/telegram-broadcast.test.ts tests/ops-schema-available-at.test.ts |
| `bun run test:tenant-heal` | E2E heal: break → signal → intervene → recover (sandboxed fixture) |
| `bun run test:tenant-runbooks` | Ratchet: TenantRunbook + heal + code-quality + CI/deploy runbooks |
| `bun run test:toc-ops` | test tests/toc-ops/ |
| `bun run test:watch` | NODE_ENV=test bun run test:changed:watch |
| `bun run test:watch:full` | NODE_ENV=test bun test --watch --parallel --timeout=30000 --pass-with-no-tests tests |
| `bun run test:watch:shard1` | test --watch --parallel --timeout=30000 --pass-with-no-tests tests --shard=1/3 |
| `bun run test:watch:shard2` | test --watch --parallel --timeout=30000 --pass-with-no-tests tests --shard=2/3 |
| `bun run test:watch:shard3` | test --watch --parallel --timeout=30000 --pass-with-no-tests tests --shard=3/3 |
| `bun run test:web-api-fixes` | test tests/bun-fetch-init.test.ts tests/bun-file-response-contract.test.ts tests/bun-1.3.14-web-api-fixes.test.ts tests/bun-1.4.0-web-api-contract.test.ts |

### Install
| Command | Description |
|---------|-------------|
| `bun run install:all` | scripts/with-bun-cache-env.ts install |
| `bun run install:cache:lifecycle` | scripts/bun-cache-lifecycle.ts --dry-run |
| `bun run install:cache:prune` | scripts/bun-cache-lifecycle.ts --prune |
| `bun run install:verify` | scripts/verify-install-cache.ts |
| `bun run install:verify:strict` | scripts/verify-install-cache.ts --strict |

### Development
| Command | Description |
|---------|-------------|
| `bun run dev` | Start platform watch server (server-enhanced.ts) |
| `bun run dev:portal` | SERVE_PUBLIC_DEV=1 bun run serve:public:hot |
| `bun run dev:portal:theme` | scripts/dev-portal.ts |

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
| `bun run search:loop:status` | scripts/search-loop-status.ts |
| `bun run search:policy:check` | scripts/check-search-policy-governance.ts |
| `bun run search:smart` | scripts/search-smart.ts |
| `bun run search:status:unified:strict` | scripts/search-unified-status.ts --json --strict |

### Wiki
| Command | Description |
|---------|-------------|
| `bun run wiki:coverage:check` | tools/wiki-index-coverage.ts |
| `bun run wiki:links:check` | tools/wiki-link-check.ts |
| `bun run wiki:links:fix` | tools/wiki-link-check.ts --fix |

### Documentation
| Command | Description |
|---------|-------------|
| `bun run docs:api-index` | tools/export-bun-api-index.ts |
| `bun run docs:api-verify` | tools/bun-api-verify.ts --write |
| `bun run docs:api-verify:check` | tools/bun-api-verify.ts |
| `bun run docs:blog-assets` | tools/bun-blog-assets.ts |
| `bun run docs:blog-assets:check` | tools/bun-blog-assets.ts --check |
| `bun run docs:blog-assets:vendor` | tools/bun-blog-assets.ts --vendor |
| `bun run docs:blog-codeblocks` | tools/bun-blog-codeblocks.ts |
| `bun run docs:catalog` | tools/bun-docs-catalog.ts list |
| `bun run docs:catalog:build` | tools/bun-docs-catalog.ts build |
| `bun run docs:catalog:export` | tools/bun-docs-catalog.ts export --compact |
| `bun run docs:ci-deploy` | CI/deploy runbooks index (Bun.markdown.ansi + live catalog) |
| `bun run docs:claim-discovery` | Claim discovery questionnaire (new ProofPath · docs/harness/CLAIM-DISCOVERY.md) |
| `bun run docs:code-quality` | Code-quality tenants index (Bun.markdown.ansi + live catalog) |
| `bun run docs:cron` | Cron contract in-terminal (bun ./docs/harness/cron.md) |
| `bun run docs:feeds:migrate` | tools/bun-docs-feeds.ts --migrate-legacy |
| `bun run docs:feeds:refresh` | tools/bun-docs-feeds.ts refresh |
| `bun run docs:fresh-rerun` | Discover (display only): fresh-rerun contract + catalog — not a gate (Bun.markdown.ansi · FRESH-RERUN.md) |
| `bun run docs:harness` | Render docs/harness/README.md via bun ./file.md (native ANSI, no VM) |
| `bun run docs:install-verify` | Install-verify WebView journey brief (bun ./docs/harness/install-verify.md) |
| `bun run docs:links:check` | tools/md-link-check.ts |
| `bun run docs:map:check` | tools/doc-map-check.ts |
| `bun run docs:markdown:check` | test tests/markdown-options.test.ts tests/markdown-contract.test.ts |
| `bun run docs:native:check` | tools/bun-native-capabilities-sync.ts --check |
| `bun run docs:native:preview` | tools/bun-native-capabilities-sync.ts --preview |
| `bun run docs:native:sync` | tools/bun-native-capabilities-sync.ts --write |
| `bun run docs:ops-summary-endpoint` | ./docs/harness/ops-summary-endpoint.md |
| `bun run docs:portal` | Render docs/portal-foundation.md via bun ./file.md (native ANSI) |
| `bun run docs:provenance:check` | tools/bun-doc-refs.ts provenance-check |
| `bun run docs:reference-discovery` | ./docs/harness/tenants/reference-discovery.md |
| `bun run docs:reference-index` | tools/bun-docs-reference-index.ts index |
| `bun run docs:refid` | tools/docs-refid.ts |
| `bun run docs:refid:audit` | tools/docs-refid.ts audit |
| `bun run docs:refid:check` | tools/docs-refid.ts check |
| `bun run docs:refid:check:dry-run` | tools/docs-refid.ts check --dry-run |
| `bun run docs:refid:check:strict` | tools/docs-refid.ts check --strict-format |
| `bun run docs:refid:list` | tools/docs-refid.ts list |
| `bun run docs:refid:scaffold` | tools/docs-refid.ts scaffold |
| `bun run docs:refid:suggest` | tools/docs-refid.ts suggest |
| `bun run docs:refresh` | tools/bun-docs-refresh.ts |
| `bun run docs:refresh:fast` | tools/bun-docs-refresh.ts --fast |
| `bun run docs:refresh:feeds` | tools/bun-docs-refresh.ts --feeds |
| `bun run docs:release-index` | tools/bun-docs-releases.ts index |
| `bun run docs:release-scrape` | tools/bun-docs-releases.ts scrape |
| `bun run docs:search-governance` | Search-governance WebView journey brief (bun ./docs/harness/search-governance.md) |
| `bun run docs:showcase` | tools/bun-api-showcase.ts |
| `bun run docs:showcase:offline` | tools/bun-api-showcase.ts run offline |
| `bun run docs:spine-tenants` | Spine tenants index + typed MAINTENANCE_RUNBOOKS catalog |
| `bun run docs:sync:integrated` | tools/cli/integrated-cli.ts sync |
| `bun run docs:tenant-docs-integrity` | docs-integrity tenant runbook (signal · intervention · retirement) |
| `bun run docs:tenant-install-verify` | install-verify tenant runbook (signal · intervention · retirement) |
| `bun run docs:tenant-ops-snapshot` | ./docs/harness/tenants/ops-snapshot.md |
| `bun run docs:tenant-portal-snapshot` | ./docs/harness/tenants/portal-snapshot-cron.md |
| `bun run docs:tenant-registry-integrity` | ./docs/harness/tenants/registry-integrity.md |

### Registry
| Command | Description |
|---------|-------------|
| `bun run registry:doctor` | scripts/registry-stack-doctor.ts |
| `bun run registry:doctor:fix` | scripts/registry-stack-doctor.ts --fix |
| `bun run registry:doctor:json` | scripts/registry-stack-doctor.ts --json |
| `bun run registry:projects` | scripts/generate-project-registry.ts |
| `bun run registry:snapshot` | tools/build-registry-snapshot.ts |
| `bun run registry:sync-index-r2` | tools/sync-registry-index-r2.ts |
| `bun run registry:tags` | tools/registry-tags-cli.ts |
| `bun run registry:tags:promote` | tools/registry-tags-cli.ts promote --all |
| `bun run registry:tags:status` | tools/registry-tags-cli.ts status |
| `bun run registry:tags:upgrade` | tools/registry-tags-cli.ts upgrade |

### Brands
| Command | Description |
|---------|-------------|
| `bun run brand:baseline` | tools/branded-id-check.ts --write-baseline |
| `bun run brand:bench:evaluate` | scripts/brand-bench-evaluate.ts --json |
| `bun run brand:bench:pin` | scripts/brand-bench-pin.ts |
| `bun run brand:bench:profile` | scripts/brand-cpu-profile.ts --target=bench --cpu-prof-interval=250 |
| `bun run brand:bench:run` | scripts/brand-bench-runner.ts |
| `bun run brand:catalog` | tools/brand-catalog.ts |
| `bun run brand:coverage` | tools/brand-coverage.ts |
| `bun run brand:keymap` | tools/brand-keymap.ts |
| `bun run brand:keymap:check` | tools/brand-keymap.ts --check |
| `bun run brand:manifest` | tools/brand-manifest.ts |
| `bun run brand:manifest:check` | tools/brand-manifest.ts --check |
| `bun run brand:status` | tools/brand-status.ts |
| `bun run brand:status:bind` | tools/brand-status.ts --plane bind --once |
| `bun run brand:status:docs` | tools/brand-status.ts --docs --once |
| `bun run brand:status:flags` | tools/brand-status.ts --flags |
| `bun run brand:status:json` | tools/brand-status.ts --json --once |
| `bun run brand:status:lifecycle` | tools/brand-status.ts --lifecycle --once |
| `bun run brand:status:lineage` | tools/brand-status.ts --lineage --once |
| `bun run brand:status:once` | tools/brand-status.ts --once |

### Validate
| Command | Description |
|---------|-------------|
| `bun run validate:colors` | Alias of portal:colors:check — PR paste / --json machine report |
| `bun run validate:colors:json` | ClaimReport JSON via Bun.write(stdout) (status · checks · meta) |
| `bun run validate:colors:strict` | validate:colors with --strict --ci (fail-closed) |
| `bun run validate:concept-metadata` | scripts/validate-concept-metadata.ts |
| `bun run validate:integrity` | scripts/validate-integrity.ts |
| `bun run validate:integrity:all` | scripts/validate-integrity.ts --section=all |
| `bun run validate:ledger` | scripts/validate-partner-ledger-schema.ts |
| `bun run validate:surface-coverage` | scripts/validate-surface-coverage.ts |
| `bun run validate:workspaces` | scripts/validate-workspaces.ts |

### CI
| Command | Description |
|---------|-------------|
| `bun run ci:bun:check` | scripts/ci-bun-check.ts |
| `bun run ci:core` | Install verify · hygiene · ci:harness (GHA harness-gates / one install) |
| `bun run ci:harness` | Quiet CI envelope (∥ cheap · eslint-changed · test:changed:main; --full-lint on main) |
| `bun run ci:harness:fast` | Quiet local parity (∥ cheap · test:changed dirty; no eslint) |
| `bun run ci:portal-registry` | scripts/assert-public-clean.ts |
| `bun run ci:r2:version:check` | scripts/ci-r2-version-check.ts |
| `bun run ci:security` | security:guard:deps && bun run dependencies:governance:check && bun run security:audit |
| `bun run ci:types` | ts:verify && bun run imports:verify && bun run check:tsconfig-types -- --strict && bun run type-check:full && bun run check:concept-registry:types && bun run check:bun-native-comprehensive:types && bun run check:factory-color:types |
| `bun run ci:validate` | --sequential standards:check |

### Security
| Command | Description |
|---------|-------------|
| `bun run security:audit` | audit |
| `bun run security:audit:fix:dry-run` | audit fix --dry-run |
| `bun run security:guard:deps` | scripts/security-dependency-guard.ts |
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
| Stage claimed paths | `git add -- <owned-paths...>` |
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

