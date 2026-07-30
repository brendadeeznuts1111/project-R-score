# Bun 1.3.14+ adoption — Tennis HQ stack

Grounded action map for FactoryWager monorepo + Kalshi-bot tennis desk.  
Runtime pin locally may be **1.4.x canary**; Pages CI pin remains **1.3.14** (`BUN_VERSION`).

## Already in place (P0/P1)

| Item | Status | Where |
|------|--------|--------|
| **Bun.Image pipeline** | Shipped | `scripts/images-generate.ts` · `docs/IMAGES.md` |
| **On-demand avatar** | Shipped | `GET /avatar/:id` · `GET /api/avatar/:id` via serve-public |
| **globalStore** | Machine SSOT | `~/.bunfig.toml` `globalStore = true` (do not set `BUN_INSTALL_GLOBAL_STORE` in shell) |
| **noOrphans** | Project | `bunfig.toml` `[run] noOrphans = true` |
| **Bun.TOML.parse** | Used | `lib/http/serve-public-bind.ts` · images config via toml import |
| **Bun.nanoseconds** | Used | avatar route timing · bake scripts |
| **Bun.escapeHTML** | Available | prefer for any HTML board strings |

## Adopt next (when touching that code)

| Priority | Item | Action |
|----------|------|--------|
| P0 | Event-loop / GC / SSL_CTX fixes | Stay on ≥1.3.14 runtime; Pages already pins 1.3.14 |
| P0 | Bun.SQL warehouse leaks | Upgrade only — no code change if already on 1.3.14+ |
| P1 | HTTP/2 client for Kalshi poll | `fetch(url, { protocol: "http2" })` on multi-GET same origin |
| P1 | `fs.watch` graph cache | Use `import { watch } from "fs"` for `warehouse/` atomic renames (1.3.14 rewrite) |
| P1 | native `using` | Prefer for DB/handles that implement `Symbol.dispose` — **not** for `Bun.Image` on current canary |
| P2 | HTTP/3 serve | Only if serve-public needs max throughput + TLS certs |
| P2 | `--no-orphans` CLI | Already in bunfig; pollers inherit |

## Intentionally skipped

- Windows SIGHUP / ConPTY / `process.execve`
- HTTP/3 production on Pages (CF edge, not Bun.serve)

## Quick verify

```bash
bun run images:avatars
bun test tests/images-generate.test.ts tests/avatar-response.test.ts
bun scripts/serve-public.ts &
curl -sS -D- http://127.0.0.1:3000/avatar/demo-player -o /tmp/a.webp | head
file /tmp/a.webp
```

## Image one-liners (canonical)

```ts
// Hero
await Bun.file("warehouse/match-highlight.jpg")
  .image()
  .resize(1200, 630, { fit: "inside" })
  .webp({ quality: 85 })
  .write("artifacts/hero.webp");

// Metadata (header only)
const meta = await Bun.file("photo.jpg").image().metadata();

// LQIP
const placeholder = await Bun.file("hero.jpg").image().placeholder();
```

**fit note:** Bun.Image accepts only `fill` | `inside` (no `cover`).
