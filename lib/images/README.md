# images

Bun.Image helpers for Tennis HQ / portal (no sharp/jimp).

| Module | Role |
|--------|------|
| `avatar-response.ts` | On-demand WebP avatar `Response` for serve-public |
| CLI | `bun run images:generate` → `scripts/images-generate.ts` |

```bash
# Local on-demand (serve-public)
curl -sS -D- http://127.0.0.1:3000/avatar/demo-player -o /tmp/a.webp

# Batch
bun run images:avatars
```

@see https://bun.com/docs/runtime/image · docs/IMAGES.md
