# docs

Path SSOT, tokens, doc builders.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API surface.

| Entry |
|-------|
| [`index.ts`](./index.ts) |
| [`repo-docs.ts`](./repo-docs.ts) |
| [`bun-site-url.ts`](./bun-site-url.ts) | URLPatternInit parts · `CANONICAL_SOURCES` · `bunDocs` / `bunBlog` |
| [`fetch-page.ts`](./fetch-page.ts) | Shared page fetch SSOT (`fetchPage`) |
| [`extract-metadata.ts`](./extract-metadata.ts) | Social metadata via HTMLRewriter |
| [`blog-extract.ts`](./blog-extract.ts) | Article body + re-exports for blog ingestion |
| [`bundler-nav.ts`](./bundler-nav.ts) | Bun docs Bundler sidebar (leaves · groups · CANONICAL_REFS merge) |
| [`bundler-gaps.ts`](./bundler-gaps.ts) | High-signal anchor/catalog gap reports (`bundler --gaps`) |
| [`token-ref.ts`](./token-ref.ts) |
| [`bun-token.ts`](./bun-token.ts) |

