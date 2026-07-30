# Bun.Image pipeline (Tennis HQ / portal)

Zero-npm image resize/encode using [`Bun.Image`](https://bun.com/docs/runtime/image) (≥1.3.14).

## CLI

```bash
bun run images:generate --template=<avatar|hero|match|convert|placeholder> [options]
```

| Template | Default size | Purpose |
|----------|--------------|---------|
| `avatar` | 128×128 | Player thumbnails → `public/avatars/` |
| `hero` | 1200×630 | Social / daily report card (WebP) |
| `match` | 400×400 | Match preview |
| `convert` | (source) | Bulk re-encode |
| `placeholder` | — | LQIP/ThumbHash `data:` URL → `.txt` |

### Options

| Flag | Description |
|------|-------------|
| `--source` | File or directory |
| `--out` | File or directory |
| `--size WxH` | e.g. `64x64` |
| `--format` | `webp` · `jpeg` · `png` · `avif` |
| `--quality` | 1–100 (hero defaults 85) |
| `--fit` | `fill` (default) or `inside` — Bun has no `cover`; `cover` is mapped to `fill` |
| `--max-pixels` | Decompression guard (default ~16M) |
| `--json` | Machine summary |
| `--dry-run` | Plan only |

### Examples

```bash
# Avatars from warehouse
bun run images:generate --template=avatar \
  --source=./warehouse/avatars --size=128x128 --out=./public/avatars --format=webp

# Daily report hero
bun run images:generate --template=hero \
  --source=./warehouse/avatars/demo-player.png \
  --out=./artifacts/phase2-hero.webp --quality=85

# Bulk convert
bun run images:generate --template=convert \
  --source=./warehouse/avatars --out=./public/avatars --format=webp --quality=80

# LQIP
bun run images:generate --template=placeholder \
  --source=./public/icons/tennis/mark.png --out=./artifacts/mark.lqip.txt
```

## Tennis HQ

Source photos: `warehouse/avatars/{id}.png`  
Generated: `public/avatars/{id}.webp`  

Regenerate after photo drops:

```bash
bun run images:generate --template=avatar --source=./warehouse/avatars --out=./public/avatars
```

### On-demand avatar (local serve-public)

```bash
bun scripts/serve-public.ts
curl -sS http://127.0.0.1:3000/avatar/demo-player -o /tmp/a.webp
# also: GET /api/avatar/:id
```

Safe id: `[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}`. Source order: warehouse → tennis mark fallback.  
Caches under `public/avatars/{id}.webp` (`X-Avatar-Cache: hit|miss`).

## Phase2 daily report (optional)

If/when `phase2:daily` exists in Kalshi-bot:

```bash
GENERATE_IMAGE=1 bun run phase2:daily
# or manual:
bun run images:generate --template=hero --source=... --out=./artifacts/phase2-$(date -u +%F).webp
```

## Config (optional)

`config/images.toml` (read by future bakers; CLI flags override):

```toml
[images]
avatar_size = "128x128"
hero_width = 1200
hero_height = 630
hero_quality = 85
avatar_format = "webp"
cache_dir = "./public/avatars"
source_dir = "./warehouse/avatars"
```

## Notes

- No `sharp` / `jimp`.
- `using` dispose is **not** required (and currently fails on some canaries); chain and await terminals only.
- HEIC/AVIF may throw `ERR_IMAGE_FORMAT_UNSUPPORTED` — CLI falls back to PNG.
- Path strings must not be user-controlled (arbitrary file read).


## Avatar index (clean mapping)

Bake writes `/registry/tennis/avatar-index.json` with:

- `players[]` — slug, displayName, hasSource, hasWebp
- `bySlug` — O(1) slug lookup
- `nameToSlug` — normalized display name → slug

Live matches join sides via `side.slug === nameToSlug[normalize(label)]`.
