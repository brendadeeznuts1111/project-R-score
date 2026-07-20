# Bun docs stack — operate & observe

**Status**: Live  
**Code**: [`tools/bun-doc-refs.ts`](../tools/bun-doc-refs.ts) · catalog [`tools/bun-docs-catalog.ts`](../tools/bun-docs-catalog.ts) · taxonomy [`tools/bun-docs-taxonomy.json`](../tools/bun-docs-taxonomy.json) · index [`tools/bun-docs-index.json`](../tools/bun-docs-index.json)  
**Related**: [`BUN_DOCS_SYSTEM.md`](BUN_DOCS_SYSTEM.md) · agent entry [`AGENTS.md`](../AGENTS.md) § Bun API references

Continuity layer for the docs intelligence pipeline: **integrity → self-heal → regen → log → status**.

---

## Commands

| Command | Purpose |
|---------|---------|
| `bun tools/bun-doc-refs.ts integrity` | Full gate: taxonomy coverage · index · canonical map · repo links |
| `bun tools/bun-doc-refs.ts integrity --fix` | **Self-heal**: fuzzy-match missing sidebar titles → write aliases → re-check |
| `bun tools/bun-doc-refs.ts integrity --fix-dry` | Report alias fixes without writing taxonomy |
| `bun tools/bun-doc-refs.ts integrity --fix --no-live` | Heal using local index only (no `llms.txt` fetch) |
| `bun tools/bun-doc-refs.ts status` | ASCII dashboard; exit 1 if last integrity run &gt; 7 days |
| `bun tools/bun-doc-refs.ts schedule --once` | One integrity pass + append `reports/doc-integrity.jsonl` |
| `bun tools/bun-doc-refs.ts schedule` | In-process `Bun.cron` weekly (`0 6 * * *` UTC default) |
| `bun tools/bun-docs-index-gen.ts` | Rebuild index from live `llms.txt` (+ `bunVersion` pin) |
| `bun tools/bun-docs-release-index.ts` | **Phase 0** — fetch `https://bun.com/rss.xml` → `tools/release-index.json` (version → blog URL) |
| `bun tools/bun-docs-release-scrape.ts` | **Phase 2b** — scrape release posts → `tools/bun-docs-release-overlay.json` (SHIP/FIX/CHG) |
| `bun tools/bun-docs-catalog.ts build [--version=X]` | Structured catalog; pin `bunVersion` + `releaseUrl`; **BLOG** from RSS; **NOTE** from HTML + MD fallback |
| `bun tools/bun-docs-catalog.ts build --skip-notes` | Catalog build without live NOTE fetches |
| `bun tools/bun-docs-catalog.ts export --compact` | TSV for agents: name · type · ship · fix · chg · pin · blog · doc · note |
| `bun tools/bun-docs-catalog.ts export --jsonl` | JSONL compact rows for agent context packing |
| `bun tools/bun-docs-catalog.ts list --section=runtime --type=api` | List slice (header shows version / release / blog) |
| `bun tools/bun-docs-catalog.ts get Bun.WebView` | One entry with docsUrl + releaseUrl + blogUrl |
| `bun tools/bun-docs-catalog.ts verify` | Fail if catalog `bunVersion` ≠ runtime (or `--version=`) |
| `bun tools/generate-tokens-from-docs.ts [--version=X]` | Token supplement with the same version pin |
| `bun run docs:release-index` | npm alias for Phase 0 RSS refresh |
| `bun run docs:release-scrape` | npm alias for Phase 2b scrape (incremental via guid state) |
| `bun run docs:refresh` | Full loop: release-index → scrape → catalog build → integrity log |
| `bun run docs:catalog:build` / `docs:catalog` | Build / list catalog |
| `bun run docs:catalog:export` | npm alias for compact TSV export |
| `bun tools/bun-doc-refs.ts suggest Bun.Image` | **Catalog-first** lookup (NOTE/SHIP/FIX/BLOG/DOC) |
| `bun tools/bun-doc-refs.ts status` | Integrity + **tier-A** coverage dashboard |
| `bun tools/bun-doc-refs.ts catalog --build` | Same via bun-doc-refs |
| `bun tools/bun-doc-refs.ts catalog --section=runtime --type=api` | List catalog slice |
| `bun tools/bun-doc-refs.ts catalog get Bun.WebView` | One catalog entry |

Env: **`DOC_INTEGRITY_AUTOFIX=1`** — schedule path auto-runs `--fix` when integrity fails.

---

## When integrity fails

```text
1. bun tools/bun-doc-refs.ts status          # how stale? which Bun?
2. bun tools/bun-doc-refs.ts integrity --fix-dry   # preview alias heals
3. bun tools/bun-doc-refs.ts integrity --fix       # write aliases
4. If still FAIL:
   a. map/repo layers → fix dead anchors in code (deepcheck)
   b. taxonomy still unresolved → hand-edit aliases or sidebar titles
5. bun tools/bun-docs-index-gen.ts           # regen after live docs change
6. bun tools/bun-doc-refs.ts schedule --once # log PASS
```

**Self-heal scope:** taxonomy **alias** drift only (e.g. `Utilities` ↔ `Utils`).  
Does **not** invent new sidebar sections or rewrite CANONICAL_REFS.

---

## Logs & version pins

| Artifact | Contents |
|----------|----------|
| `reports/doc-integrity.jsonl` | `{ ts, failures, ok, bunVersion, stats, regen, autoFix }` |
| `tools/bun-docs-index.json` | `generated`, `source`, `bunVersion`, `upstreamBunVersion`, entries |
| `tools/release-index.json` | RSS-derived release posts: `{ version, title, url, guid, pubDate }[]` |
| `tools/bun-docs-release-overlay.json` | Scraped SHIP/FIX/CHG from release blog posts (Phase 2b) |
| `tools/bun-docs-catalog.json` | `bunVersion`, `releaseUrl`, `blogUrl`, optional `commitHash`, entries with `docsUrl` |
| `tools/bun-docs-token-supplement.json` | Same pin fields + `entries[]` (generator output) |
| `tools/bun-docs-changelog.ts` | Curated token overlay: feature/fix/change → `releasedIn` / `fixedIn` / `changeNote` / optional SHA |
| `tools/.cache/bun-rss/` | Conditional-GET cache for RSS (ETag / Last-Modified) |
| `tools/.cache/bun-docs-notes/` | Cached NOTE extractions keyed by doc URL |
| `tools/.cache/bun-blog-posts/` | Cached release post HTML + incremental scrape state |
| `reports/release-scrape-review.jsonl` | Unmatched token-like strings from blog scrape (human review queue) |

## Canonical operate loop

```text
bun run docs:refresh              # all-in-one (recommended)
# or step-by-step:
bun run docs:release-index          # Phase 0: RSS → release-index.json
bun run docs:release-scrape         # Phase 2b: posts → release-overlay.json (incremental)
bun tools/generate-tokens-from-docs.ts   # when docs change
bun tools/bun-docs-index-gen.ts          # when llms.txt changes
bun run docs:catalog:build               # merge all sources + coverage report
bun tools/bun-doc-refs.ts integrity [--fix]
bun tools/bun-doc-refs.ts schedule --once
```

`bun tools/bun-doc-refs.ts status` shows **tier-A** catalog coverage (NOTE/SHIP/BLOG/FIX %) from the on-disk catalog.

## Coverage targets

| Field | Target |
|-------|--------|
| DOC (`docsUrl`) | 100% of catalog entries |
| PIN (`verifiedOn`) | 100% (catalog pin) |
| NOTE (`description`) | ≥95% for `api`, `cli-flag`, `config-key`, `env-var`, `package-json-key` |
| BLOG | Set only when RSS `release-index` has a matching version (never synthetic) |
| SHIP (`releasedIn`) | From release-post scrape + curated overlay |

Catalog build prints NOTE/BLOG/SHIP percentages and warns when typed NOTE coverage drops below 95%.

Version pin links (docs pages stay unversioned on bun.com):

| Field | Example |
|-------|---------|
| `bunVersion` | `1.3.12` (from `Bun.version` or `--version=`) |
| `releaseUrl` | `https://github.com/oven-sh/bun/releases/tag/bun-v1.3.12` |
| `blogUrl` | RSS-validated `https://bun.com/blog/bun-v1.3.12` (empty if not in feed; entries may add `#bugfixes`) |
| `commitHash` | short `Bun.revision` when pin matches the running binary |
| `docsUrl` | `https://bun.com/docs/runtime/...` (latest, not `/docs/v1.3.12/`) |
| `description` / NOTE | Curated/index text, else first `<p>` / meta description from the doc page |
| `fixedIn` / `changeNote` | From changelog overlay, e.g. `process.env` → `1.3.12` + note |

**Changelog overlay (not a scraper):** add a row to `CHANGELOG_EVENTS` in `tools/bun-docs-changelog.ts` when a token has upgrade impact. Prefer a real git SHA when known; leave `commit` blank rather than inventing one. Curated `minVersion` values auto-seed feature events.

`status` marks integrity **STALE** if last JSONL run is older than **7 days** (process/cron death signal).

---

## Roadmap (phases)

| Phase | Focus | Status |
|-------|--------|--------|
| **0** RSS release index | `bun-docs-release-index.ts` → `release-index.json` | **Shipped** |
| **1** NOTE + BLOG enrichment | Doc HTML notes + RSS-validated blog URLs in catalog build | **Shipped** |
| **2** Operate & observe | `--fix`, version pin, `status` health | **Shipped** (this doc + integrity flags) |
| **2b** SHIP/FIX/CHG from blog sections | `bun-docs-release-scrape.ts` → overlay merge in catalog build | **Shipped** |
| **3** Expand | RRF hybrid search, multi-stack sources, IDE | Planned |
| **4** Governance | richer migrations for cache DBs, dashboards | Ongoing (JSONL + status for now) |

---

## Strict rule

> Integrity alerts are not the end state. Prefer **`--fix` for alias renames**, then regenerate the index. Only escalate human review when fuzzy match score is low or map/repo anchors break.
