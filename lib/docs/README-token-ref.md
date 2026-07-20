# TokenRef — Bun documentation knowledge unit

Every Bun token is a **self-contained knowledge unit** (`TokenRef`):

| Facet | Type |
|-------|------|
| Identity | `DocTokenId` (branded) + `TokenKind` |
| Doc locus | `Locus` — page + canonical heading fragment |
| Examples | `TokenExample[]` — lang-tagged fenced blocks |
| History | `VersionEvidence` — introduced / changed / fixed / stabilized |
| Graph | `Relation[]` — alias / related / seeAlso |

**Schema:** [`token-ref.ts`](./token-ref.ts) · JSON Schema [`token-ref.schema.json`](./token-ref.schema.json)  
**Adapter:** [`token-ref-adapter.ts`](./token-ref-adapter.ts) ← catalog JSON  
**Locus resolution:** [`locus-resolve.ts`](./locus-resolve.ts)  
**Operate loop:** [`docs/BUN_DOCS_OPERATE.md`](../../docs/BUN_DOCS_OPERATE.md)

Operate adapters (RSS, scrape, supplement, catalog build) produce catalog JSON; agents import `TokenRef` after `catalogEntryToTokenRef`.
