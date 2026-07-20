# Bun docs stack — operate & observe

**Status**: Live  
**Code**: [`tools/bun-doc-refs.ts`](../tools/bun-doc-refs.ts) · taxonomy [`tools/bun-docs-taxonomy.json`](../tools/bun-docs-taxonomy.json) · index [`tools/bun-docs-index.json`](../tools/bun-docs-index.json)  
**Related**: [`BUN_DOCS_SYSTEM.md`](BUN_DOCS_SYSTEM.md)

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
| `bun tools/bun-docs-catalog.ts build [--version=X]` | Structured catalog; pin `bunVersion` + `releaseUrl` + `blogUrl` (+ runtime `commitHash`) |
| `bun tools/bun-docs-catalog.ts list --section=runtime --type=api` | List slice (header shows version / release / blog) |
| `bun tools/bun-docs-catalog.ts get Bun.WebView` | One entry with docsUrl + releaseUrl + blogUrl |
| `bun tools/bun-docs-catalog.ts verify` | Fail if catalog `bunVersion` ≠ runtime (or `--version=`) |
| `bun tools/generate-tokens-from-docs.ts [--version=X]` | Token supplement with the same version pin |
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
| `tools/bun-docs-catalog.json` | `bunVersion`, `releaseUrl`, `blogUrl`, optional `commitHash`, entries with `docsUrl` |
| `tools/bun-docs-token-supplement.json` | Same pin fields + `entries[]` (generator output) |

Version pin links (docs pages stay unversioned on bun.com):

| Field | Example |
|-------|---------|
| `bunVersion` | `1.3.12` (from `Bun.version` or `--version=`) |
| `releaseUrl` | `https://github.com/oven-sh/bun/releases/tag/bun-v1.3.12` |
| `blogUrl` | `https://bun.com/blog/bun-v1.3.12` |
| `commitHash` | short `Bun.revision` when pin matches the running binary |
| `docsUrl` | `https://bun.com/docs/runtime/...` (latest, not `/docs/v1.3.12/`) |

`status` marks integrity **STALE** if last JSONL run is older than **7 days** (process/cron death signal).

---

## Roadmap (phases)

| Phase | Focus | Status |
|-------|--------|--------|
| **2** Operate & observe | `--fix`, version pin, `status` health | **Shipped** (this doc + integrity flags) |
| **3** Expand | RRF hybrid search, multi-stack sources, IDE | Planned |
| **4** Governance | richer migrations for cache DBs, dashboards | Ongoing (JSONL + status for now) |

---

## Strict rule

> Integrity alerts are not the end state. Prefer **`--fix` for alias renames**, then regenerate the index. Only escalate human review when fuzzy match score is low or map/repo anchors break.
