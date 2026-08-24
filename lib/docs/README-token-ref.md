# TokenRef / BunToken — Bun documentation token plane

**Token** is the agent export / `@see` research plane. **Catalog** is a
different plane (materialized bake that adapters read). Operate map:
[`docs/BUN_DOCS_OPERATE.md`](../../docs/BUN_DOCS_OPERATE.md).

## Two layers (within token)

| Layer                                           | Role                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| **TokenRef** ([`token-ref.ts`](./token-ref.ts)) | Interior harness — branded `DocTokenId`, provenance, `allPages`, fine `TokenKind` |
| **BunToken** ([`bun-token.ts`](./bun-token.ts)) | Agent export contract — timeline-aware, no scrape nicknames                       |

```text
DocCatalogEntry (catalog plane)
  → TokenRef (internal)
  → BunToken (suggest / export / JSON Schema)
```

## BunToken (public)

| Field             | Meaning                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `name`            | e.g. `Bun.cron`                                                                 |
| `kind`            | `API` · `CLI` · `Config` · `Env` · `PackageJson` · `Concept` · `Other`          |
| `description`     | Human note (was NOTE)                                                           |
| `stability`       | stable · experimental · deprecated                                              |
| `docsLocus`       | `{ page, anchor }` — verified heading or `anchor: null`                         |
| `since`           | Earliest attested version                                                       |
| `announcementUrl` | RSS-validated release blog URL                                                  |
| `versionEvents[]` | Full timeline; each event carries `version`, nullable `date`, and `evidenceUrl` |
| `examples[]`      | `{ lang, code }`                                                                |
| `related`         | Graph neighbors                                                                 |
| `meta`            | `buildPin` · `sourceCommit` · `lastVerified`                                    |

| Concern   | Path                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| Schemas   | [`bun-token.schema.json`](./bun-token.schema.json) · [`token-ref.schema.json`](./token-ref.schema.json) |
| Adapters  | [`token-ref-adapter.ts`](./token-ref-adapter.ts)                                      |
| Locus     | [`locus-resolve.ts`](./locus-resolve.ts)                                              |
| Operate   | [`docs/BUN_DOCS_OPERATE.md`](../../docs/BUN_DOCS_OPERATE.md)                          |

```bash
# Token plane
bun tools/bun-doc-refs.ts suggest Bun.cron         # BunToken-shaped output
bun tools/bun-doc-refs.ts history Bun.cron --json  # dated release/update provenance
bun run docs:provenance:check                      # reject incomplete recorded events

# Catalog plane (bake → BunToken export)
bun tools/bun-docs-catalog.ts export               # BunToken JSON
bun tools/bun-docs-catalog.ts export --jsonl       # BunToken JSONL
bun run docs:catalog:export                        # thin TSV (--compact)
```
