# Bloat & development-speed pass (Jul 2026)

Follow-on to projects inventory + first scripts trim (`e2ba10ae`). Implements the “Next stage: reduce bloat, raise development speed” plan.

## Canonical sources

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts). Maps: [`STRUCTURE.md`](../../STRUCTURE.md), [`projects/README.md`](../../projects/README.md). Bun filter: https://bun.com/docs/pm/filter. CLI categories: [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts). File I/O: [`scripts/lib/fs-bun.ts`](../../scripts/lib/fs-bun.ts). Args: [`scripts/lib/cli-args.ts`](../../scripts/lib/cli-args.ts).

## Metrics

Historical pass table (Jul 2026 trim). **r5 was the end of that pass** — not a live ratchet.

| Metric | Baseline | r1 | r2 | r3 | r4 | r5 (Bun-native) | **Live 2026-07-29** |
|--------|---------:|---:|---:|---:|---:|----------------:|--------------------:|
| `package.json` scripts | 329 (431 original) | 275 | 258 | 193 | 176 | 173 | **~660** (regrowth after r5 — day-loop + portal + proof scripts) |
| `projects/experimental/` product leaves | 0 | 6 | 7 | 9 | 11 | 11 | **11** |
| `node:path` / `path` in `scripts/` | many | — | — | — | — | **0** (dns/os/inspector remain where real) | keep via `check:path-bun` |
| `process.argv` in `scripts/*.ts` | 52 files | — | — | — | — | **0** → `Bun.argv` | keep via day-loop |

Re-count scripts: `bun -e 'console.log(Object.keys(require("./package.json").scripts).length)'`. Treat r5 as history; open a new trim pass only if intentional bloat reduction is scheduled.

## What changed

1. **CLI SSOT** — `help` + `cli:docs` share cli-categories; day-loop docs.
2. **Script trim** — aliases / fan-outs / scoped install / bunx / docs-cli noise; r5 dropped `pool-telemetry`, `security-tests`, discover apply dry-run; later dropped `discover:bun-native` entirely (use `migrate:status`).
3. **Tier moves** — demos + utility sandboxes → experimental (11).
4. **Bun-native (r5)**
   - [`fs-bun.ts`](../../scripts/lib/fs-bun.ts): `resolvePath` / `joinPath` / `normalizePath` without `path` / `node:path`.
   - New [`cli-args.ts`](../../scripts/lib/cli-args.ts): `flagValue` / `hasFlag` / `positionalArgs` on `Bun.argv`.
   - Batch: `process.argv` → `Bun.argv`; strip `path`/`node:path` from scripts + migrate libs; drop `node:perf_hooks` where global `performance` suffices.
   - Fixed promote-gate fiction after protocol script removal (r4).

## Day loop (prefer)

```bash
bun run help
bun run type-check          # tsconfig.check.json — spine agent surfaces
bun run build:affected      # git-true workspaces (scripts/affected-workspaces.ts)
bun run test:affected
bun run check:path-bun      # lib/ + tools/ path ratchet
bun run check:bun-env       # lib/ + scripts/ Bun.env ratchet
bun run cli:docs
```

Harness JIT: [`docs/harness/README.md`](../harness/README.md). Baseline: [`docs/organization/VELOCITY_BASELINE.md`](VELOCITY_BASELINE.md).

Node leftovers inventory: `bun run migrate:status`.

## Out of scope (still later)

- Root-parked nested remotes; `proton-pass` WIP; lifecycle hook aliases
- Broad `lib/docs/**` in day-loop type-check (debt isolated)
- Intentional Node surfaces: `node:dns` health checks, `node:os` in brand bench, `node:inspector` snapshot, `node:net` test server
- Large `search-benchmark-dashboard.ts` DNS logic (keep)
