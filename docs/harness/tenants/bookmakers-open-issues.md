# Bookmakers open issues

Remaining gaps after `@factorywager/bookmakers@0.4.1` publish + public bake.
Parent runbook: [`bookmakers-registry.md`](./bookmakers-registry.md) · board
[`/portal/bookmakers.md`](../../../public/portal/bookmakers.md) · lib
[`lib/bookmakers/README.md`](../../../lib/bookmakers/README.md).

Each row is closed only when **acceptance** is met; do not invent registry ids
or domains without SSOT.

| ID | Gap | Status | Owner command | Acceptance |
|----|-----|--------|---------------|------------|
| BM-1 | **Orange777 unmatched** — desk free-text has no domain SSOT | open | `bun run bookmakers:desk-coverage` | When a real book domain is confirmed, add a public catalog row (`id === slug`, `urls.web`) + enrichment if needed, re-migrate/bake, and re-run desk-coverage until `Orange777` is `matched`. **Until then keep unmatched — do not invent an id or domain.** |
| BM-2 | **Pages registry API lag vs R2** — package `0.4.1` is on R2; public HTTP index can lag until snapshot deploys | open | `bun lib/factory/cli.ts snapshot public/registry/registry.json` · commit · Pages deploy | Live `registry.factory-wager.com` (or Pages `/registry/registry.json`) shows `@factorywager/bookmakers` dist-tag `latest` = `0.4.1` and lists the `0.4.1` release. Bake continues to prefer the **local** snapshot until then: `bun run bookmakers:bake -- --version 0.4.1`. |
| BM-3 | **US webview `maxBetUsd` null** — `caesars` · `fanduel` · `draftkings` · `betmgm` have no desk-observed max | open | `bun run bookmakers:desk-coverage -- --apply-max` (after sources exist) · or set `BOOK_ENRICHMENT[…].maxBetUsd` then migrate/bake | Each US `fetcher: webview` row has a non-null `limits.maxBetUsd` from a documented source (desk, limits page, or enrichment map). Seat books already filled via desk apply where matched. |
| BM-4 | **`minBetUsd` null** — no book in the public catalog carries a floor stake | open | Enrich via `BOOK_ENRICHMENT` / package source · `bun run bookmakers:migrate` or prepare-publish + bake | Public rows that claim a known minimum stake set `limits.minBetUsd` to a positive number; remaining intentional unknowns stay `null` with a note. |
| BM-5 | **Factory publish README wrong file** — auto-detect can embed a stale / wrong README on the release | open | `bun run factory:publish <tgz> --name @factorywager/bookmakers --version <ver> --type library --readme <path-to-package-README>` | Next publish (and any re-tag) stores the intended package README body; `bun lib/factory/cli.ts readme @factorywager/bookmakers` shows v0.4 public-catalog language (`PUBLIC_BOOKMAKERS`, `schemaVersion: 2`), not an unrelated monorepo or legacy v0.3-only doc. Prefer explicit `--readme path`; use `--readme false` only when intentionally omitting. |

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
# After Pages deploy: curl the live registry index and confirm 0.4.1 (BM-2)
```

## Anti-patterns

- Inventing `orange777` / `orange-777` registry ids without a verified domain
- Aliasing desk `Orange777` into another book in `DESK_BOOK_ALIASES`
- Baking ops (`apiKeyEnv`, `restBaseUrl`) into `public/registry/bookmakers.json`
- Publishing without `--readme` when the cwd/package auto-detect would attach the wrong file
