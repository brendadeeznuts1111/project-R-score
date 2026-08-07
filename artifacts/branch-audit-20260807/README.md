# Branch audit — 2026-08-07

Feature-freeze pass: classify remotes → prune squash leftovers → collapse duplicate WIP → park survivors → de-bloat gates.

## Gate results

| Gate | Exit | Notes |
| ---- | ---- | ----- |
| lane:status --json | 0 | This lane dirty (artifact dir) |
| discover:compose:check | 0 | 85 findings; harness errors=0 warnings=2 |
| reference:discover:check | 0 | error-floor clean |
| public:discover:check | 0 | 2 orphan-registry INFO |
| public:audit:verify | 0 | portal static + audit ok |
| audit:verify | 0 | 4 findings · 5 concepts |
| check:monorepo-health | 0 | ratchet OK · score 34.7 critical (large files) |
| monorepo:health (TTY) | 1 | exits nonzero on critical grade (expected) |

## Classification

| Bucket | Count | File |
| ------ | ----: | ---- |
| Cherry-equivalent SAFE_DELETE | 133 | `safe-delete.txt` |
| Stale unique (>300 behind / mega-relic) | 31 | `stale-delete.txt` |
| Cluster collapse (duplicate WIP) | ~27 | `cluster-collapse-delete.txt` |
| Combined unique delete list | see `all-delete.txt` | deduped |
| Survivors | 5 + this lane | `survivors.tsv` |

Unique tips with commits not patch-equivalent to main: **62** (includes open PR #592).

## Survivors (park / later)

| Branch | Bucket | Notes |
| ------ | ------ | ----- |
| `cursor/contract-screenshot-cli-45b7` | park-open-pr | PR #592 draft — do not expand |
| `feat/bun-pr-diff` | later-pr | Best post-cleanup small PR |
| `cursor/bm-routing-tenant-owner-294c` | docs-hygiene | Domain vs Tenant/Owner routing docs |
| `feat/odds-edge-depth` | park | Sole agent-odds tip retained |
| `feat/partner-surface-inventory-docs` | park | Sole partner-surface tip retained |

## Compose warnings (debloat candidates)

1. `similar-env` ALERT_WEBHOOK_PORT ↔ ALERT_WEBHOOK_URL — orthogonal port/URL; allowlist if intentional
2. `similar-env` BUN_TYPES_CI ↔ BUN_TYPES_TIP — deliberate siblings; allowlist if intentional

Public orphans (info): `partner-profile-coverage.json`, `stale-anchors.json`.

## Open issues (deferred)

- #284 / #285 Phase 1 features — out of scope
- #23 dashboard flake — out of scope

## Method

```bash
git cherry -v origin/main origin/<branch>   # 0 unique → SAFE_DELETE
git rev-list --count origin/main..<branch>  # ahead
git rev-list --count <branch>..origin/main  # behind
```
