# Branch audit — 2026-08-07

Feature-freeze pass: classify remotes → prune squash leftovers → collapse duplicate WIP → park survivors → de-bloat gates.

## Gate results (pre-prune)

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

## Prune executed

| Action | Count |
| ------ | ----: |
| Cherry-equivalent SAFE_DELETE | 133 |
| Stale unique (>300 behind / mega-relic) | 31 |
| Cluster collapse (duplicate WIP) | 27 |
| Ancestry-merged leftovers | 32 |
| **Total remotes deleted** | **222** (190 + 32) |
| Failures | 0 |

Logs: `prune-log.txt` · lists: `safe-delete.txt` · `stale-delete.txt` · `cluster-collapse-delete.txt` · `ancestry-merged-delete.txt` · `all-delete.txt`

## Remotes remaining (7)

| Branch | Bucket |
| ------ | ------ |
| `main` | trunk |
| `cursor/branch-audit-prune-ad8f` | this lane |
| `cursor/contract-screenshot-cli-45b7` | park-open-pr (#592 draft) |
| `feat/bun-pr-diff` | later-pr |
| `feat/odds-edge-depth` | park |
| `feat/partner-surface-inventory-docs` | park |
| `cursor/bm-routing-tenant-owner-294c` | absorbed into this lane (delete after merge) |

## De-bloat landed in this lane

1. Allowlist `ALERT_WEBHOOK_PORT`↔`ALERT_WEBHOOK_URL` and `BUN_TYPES_CI`↔`BUN_TYPES_TIP` in `isAllowedSimilarEnvPair` (clears compose warn floor).
2. Document INFO orphans `partner-profile-coverage.json` · `stale-anchors.json` in `public-plane.md`.
3. Absorb BM routing Domain vs Tenant/Owner docs from `cursor/bm-routing-tenant-owner-294c`.

## Open issues (deferred)

- #284 / #285 Phase 1 features — out of scope
- #23 dashboard flake — out of scope
- #592 screenshot CLI — parked draft

## Method

```bash
git cherry -v origin/main origin/<branch>   # 0 unique → SAFE_DELETE
git rev-list --count origin/main..<branch>  # ahead
git rev-list --count <branch>..origin/main  # behind
```
