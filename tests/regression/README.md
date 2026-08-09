# Bun release regression probes

One file per Bun release, covering blog sections:

| `describe` | Source |
| ---------- | ------ |
| Features | New APIs / behavior from the release notes |
| Performance | Correctness smokes for speed-up claims (not CI timing gates) |
| Bugfixes | One probe per Bugfixes bullet |

```bash
bun test tests/regression/bun-1.3.12.test.ts
```

Helpers: [`shared.ts`](./shared.ts) (`releaseTest`, `tempRoot`).

## New version checklist

1. Read https://bun.com/blog/bun-vX.Y.Z — split Features / Performance / Bugfixes / Node compat.
2. Copy the prior file → `bun-X.Y.Z.test.ts`; set `MIN_VERSION` + blog URLs.
3. For each bullet: one `it`/`test` with the blog’s minimal repro; `skipIf` when env-bound.
4. Run locally; keep skips documented in the file header.
5. Commit + draft PR (FactoryWager PR template).
