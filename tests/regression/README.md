# Bun release regression probes

One file per Bun release, covering blog sections:

| `describe` | Source |
| ---------- | ------ |
| Features | New APIs / behavior from the release notes |
| Performance | Correctness smokes for speed-up claims (not CI timing gates) |
| Bugfixes | One probe per Bugfixes bullet |

```bash
# Scaffold a new version (template matches releaseTest / fixSkip conventions)
bun run regression:new -- 1.3.15
# or
./scripts/new-regression.sh 1.3.15

# Run a release suite
bun test tests/regression/bun-1.3.14.test.ts
bun test tests/regression/bun-1.3.12.test.ts
```

Helpers: [`shared.ts`](./shared.ts) (`releaseTest`, `tempRoot`, `shortTempRoot`).

## Releases

| Version | File | Blog |
| ------- | ---- | ---- |
<!-- regression-release-table -->
| `1.3.14` | [`bun-1.3.14.test.ts`](./bun-1.3.14.test.ts) | [blog](https://bun.com/blog/bun-v1.3.14) |
| `1.3.12` | [`bun-1.3.12.test.ts`](./bun-1.3.12.test.ts) | [blog](https://bun.com/blog/bun-v1.3.12) |

## New version checklist

1. `bun run regression:new -- X.Y.Z` (or `./scripts/new-regression.sh X.Y.Z`).
2. Read https://bun.com/blog/bun-vX.Y.Z — split Features / Performance / Bugfixes.
3. Replace scaffold / `TODO` skips with one `fixTest` (or `fixSkip`) per bullet.
4. Run `bun test tests/regression/bun-X.Y.Z.test.ts`; document skips in the file header.
5. Commit on a lane branch + draft PR (FactoryWager PR template).
