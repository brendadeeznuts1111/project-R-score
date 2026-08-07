# Performance docs

| Doc | Role |
|-----|------|
| [SEARCH_BASELINE_GOVERNANCE.md](./SEARCH_BASELINE_GOVERNANCE.md) | Search bench pin policy (`.search/` baselines) |
| [`docs/harness/tenants/bun-bench-profiling.md`](../harness/tenants/bun-bench-profiling.md) | **Harness SSOT** — Bun microbench + CPU profile metric catalog (`bun run bench:status`) |
| [`docs/harness/tenants/full-ui-performance-audit.md`](../harness/tenants/full-ui-performance-audit.md) | Portal bundle / route-sweep acceptance (not Bun microbench) |
| [`docs/harness/tenants/limit-forecast-lab.md`](../harness/tenants/limit-forecast-lab.md) | Limits-lab CPU profiling |
| `PERFORMANCE_OPTIMIZATIONS*.md` | Retired stubs |

## Quick commands

```bash
bun run bench:status                  # metric catalog (human)
bun run bench:status -- --json        # machine
bun run search:bench:gate             # search pin gate
bun run brand:bench:evaluate          # brand pin evaluate
bun run bench:console-depth           # stringWidth / sliceAnsi
bun run bench:deep                    # nested inspect timing
```
