# pages

Edge-safe Cloudflare Pages / Bun-only Function helpers. **No `bun:sqlite`** —
portable across Pages and Workers.

| File                                     | Role                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| [`pages-function.ts`](pages-function.ts) | `PagesContext`, `jsonResponse`, shared handler helpers |
| [`r2-types.ts`](r2-types.ts)             | Registry / Pages env binding types                     |

Consumers: `functions/` · `functions-bun-only/` · Telegram webhook Pages routes.

Related: [`../http/`](../http/) · [`../auth/`](../auth/) ·
[`docs/harness/tenants/cloudflare-pages.md`](../../docs/harness/tenants/cloudflare-pages.md).
