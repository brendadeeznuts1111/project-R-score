# Bookmakers open issues

<!-- REF:ID 0.1.bookmakers-open-issues -->
<a id="0.1.bookmakers-open-issues"></a>

Remaining gaps after `@factorywager/bookmakers@0.4.1` publish + public bake.

**Human tickets:** open a GitHub issue with the **Bookmakers catalog** or **Portal gap**
template and set **Domain** = `partner`, **Tracker** = `BM-*` (this table). Do not use
GitHub labels as concept SSOT — see [CONCEPT_LIFECYCLE.md](../../CONCEPT_LIFECYCLE.md).
Parent runbook: [`bookmakers-registry.md`](./bookmakers-registry.md) · board
[`/portal/bookmakers.md`](../../../public/portal/bookmakers.md) · lib
[`lib/bookmakers/README.md`](../../../lib/bookmakers/README.md).

Each row is closed only when **acceptance** is met; do not invent registry ids
or domains without SSOT.

| ID | Gap | Status | Owner command | Acceptance |
|----|-----|--------|---------------|------------|
| BM-1 | **Orange777 unmatched** — desk free-text has no domain SSOT | blocked | `bun run bookmakers:desk-coverage` | When a real book domain is confirmed, add a public catalog row (`id === slug`, `urls.web`) + enrichment if needed, re-migrate/bake, and re-run desk-coverage until `Orange777` is `matched`. **Until then keep unmatched — do not invent an id or domain.** Domain=`partner`. |
| BM-2 | **Pages registry API lag vs R2** — package `0.4.1` is on R2; public HTTP index can lag until snapshot deploys | done | `bun lib/factory/cli.ts snapshot public/registry/registry.json` · commit · Pages deploy | **Closed 2026-08-07:** live `score.factory-wager.com/registry/registry.json` shows `@factorywager/bookmakers` dist-tag `latest` = `0.4.1` and lists the `0.4.1` release. |
| BM-3 | **US webview `maxBetUsd` null** — `caesars` · `fanduel` · `draftkings` · `betmgm` have no desk-observed max | open | `bun run bookmakers:desk-coverage -- --apply-max` (after sources exist) · or set `BOOK_ENRICHMENT[…].maxBetUsd` then migrate/bake | Each US `fetcher: webview` row has a non-null `limits.maxBetUsd` from a documented source (desk, limits page, or enrichment map). Seat books already filled via desk apply where matched. Domain=`partner`. |
| BM-4 | **`minBetUsd` null** — no book in the public catalog carries a floor stake | open | Enrich via `BOOK_ENRICHMENT` / package source · `bun run bookmakers:migrate` or prepare-publish + bake | Public rows that claim a known minimum stake set `limits.minBetUsd` to a positive number; remaining intentional unknowns stay `null` with a note. Domain=`partner`. |
| BM-5 | **Factory publish README wrong file** — auto-detect can embed a stale / wrong README on the release | done | `bun run factory:publish <tgz> …` (default = package/tarball README) · optional `--readme <path>` | **Closed 2026-08-07:** (1) live `0.4.1` README already carries v0.4 public-catalog language (`PUBLIC_BOOKMAKERS`, `schemaVersion: 2`); (2) factory default now prefers README inside the published `.tgz` / package dir over CWD (`lib/factory/publish-metadata.ts` · `RegistryClient.publish`) — proven by `bun test tests/factory-publish-metadata.test.ts tests/registry.test.ts -t "BM-5"`. Explicit `--readme path` still wins; `--readme true` opts into legacy CWD; `--readme false` skips. |

## Status values

| Status | Meaning |
|--------|---------|
| `open` | Gap still true on committed artifacts / live plane |
| `blocked` | Waiting on external fact (domain, vault, human decision) |
| `done` | Acceptance met; leave a one-line close note under the ID |

## Quick verify

```bash
bun run bookmakers:desk-coverage          # BM-1 · BM-3 desk side
bun run bookmakers:bake:check             # public catalog shape
bun lib/factory/cli.ts list               # R2 latest (needs credentials)
# Live Pages index (BM-2):
curl -sS https://score.factory-wager.com/registry/registry.json | bun -e 'const d=await Bun.stdin.json(); const b=d["@factorywager/bookmakers"]; console.log(b?.["dist-tags"]?.latest)'
# README default (BM-5):
bun test tests/factory-publish-metadata.test.ts tests/registry.test.ts -t "BM-5"
```

## Anti-patterns

- Inventing `orange777` / `orange-777` registry ids without a verified domain
- Aliasing desk `Orange777` into another book in `DESK_BOOK_ALIASES`
- Baking ops (`apiKeyEnv`, `restBaseUrl`) into `public/registry/bookmakers.json`
- Relying on CWD `README*` when publishing a `.tgz` from the monorepo root (fixed default; still prefer `--readme <package README>` when the tarball omits one)
