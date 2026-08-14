# Bun.Image pipeline (Tennis HQ / portal)

Zero-npm image decode, transform, and encode using
[`Bun.Image`](https://bun.com/docs/runtime/image#input) (Bun ≥1.3.14).

## Authority and lifecycle

| Contract                 | Reference                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Runtime documentation    | [Bun.Image](https://bun.com/docs/runtime/image)                                                           |
| Upstream Markdown source | [`docs/runtime/image.mdx`](https://raw.githubusercontent.com/oven-sh/bun/main/docs/runtime/image.mdx)     |
| Initial release          | [Bun 1.3.14 · 2026-05-13](https://bun.com/blog/bun-v1.3.14#bun-image-built-in-image-processing)           |
| Last source audit        | [2026-07-07 · `7be1d459`](https://github.com/oven-sh/bun/commit/7be1d459f28566735bd602ce009e24cba0548e1e) |

Pipelines are lazy. Chain transformations, choose an output format, and await
exactly one terminal operation (`bytes`, `buffer`/`toBuffer`, `blob`,
`toBase64`, `dataurl`, `write`, `placeholder`, or `metadata`). Work runs off the
JavaScript thread after the terminal is awaited. Do not mutate borrowed
typed-array input while a terminal is pending.

## Native API contract

| Surface     | Behavior                                                                                                        | Canonical section                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Input       | Path, fixed bytes, or `Blob`; byte content determines format                                                    | [Input](https://bun.com/docs/runtime/image#input)                                                                                        |
| Safety      | Validate path strings; set `maxPixels`; `autoOrient` defaults to `true`                                         | [Input](https://bun.com/docs/runtime/image#input)                                                                                        |
| Metadata    | Reads width, height, and format without decoding pixels; instance dimensions are `-1` until a terminal resolves | [Metadata](https://bun.com/docs/runtime/image#metadata) · [`width`](https://bun.com/reference/bun/Image/width)                           |
| Geometry    | `resize`, `rotate`, `flip`, and `flop`                                                                          | [Resize](https://bun.com/docs/runtime/image#resize) · [rotate/flip](https://bun.com/docs/runtime/image#rotate-flip)                      |
| Modulation  | Brightness and saturation                                                                                       | [Modulate](https://bun.com/docs/runtime/image#modulate)                                                                                  |
| Encoding    | JPEG, PNG, WebP everywhere; HEIC/AVIF are platform-dependent                                                    | [Output formats](https://bun.com/docs/runtime/image#output-formats)                                                                      |
| Output      | Awaited terminal executes the pipeline; `toBuffer()` is the typed Sharp-compatible alias for `buffer()`         | [Terminals](https://bun.com/docs/runtime/image#terminals) · [`toBuffer`](https://bun.com/reference/bun/Image/toBuffer)                   |
| HTTP body   | Direct request/response bodies receive the selected image content type when Bun serializes them on the wire     | [Body integration](https://bun.com/blog/bun-v1.3.14#body-integration)                                                                    |
| Placeholder | ThumbHash-rendered data URL, normally 400–700 bytes                                                             | [Placeholders](https://bun.com/docs/runtime/image#placeholders)                                                                          |
| Clipboard   | macOS/Windows only; Linux returns `null`                                                                        | [Clipboard](https://bun.com/docs/runtime/image#clipboard)                                                                                |
| Backend     | System geometry on macOS/Windows; set `Bun.Image.backend = "bun"` for portable golden tests                     | [Platform backends](https://bun.com/docs/runtime/image#platform-backends)                                                                |
| Errors      | Branch on stable `Bun.Image.ErrorCode` values rather than parsing messages                                      | [`ErrorCode`](https://bun.com/reference/bun/Image/ErrorCode) · [Platform backends](https://bun.com/docs/runtime/image#platform-backends) |

## CLI

```bash
bun run images:generate --template=<avatar|hero|match|convert|placeholder> [options]
```

| Template      | Default size | Purpose                               |
| ------------- | ------------ | ------------------------------------- |
| `avatar`      | 128×128      | Player thumbnails → `public/avatars/` |
| `hero`        | 1200×630     | Social / daily report card (WebP)     |
| `match`       | 400×400      | Match preview                         |
| `convert`     | (source)     | Bulk re-encode                        |
| `placeholder` | —            | LQIP/ThumbHash `data:` URL → `.txt`   |

### Options

<!-- REF:ID 1.1.source -->

<a id="1.1.source"></a>
<!-- REF:ID 1.1.out -->

<a id="1.1.out"></a>
<!-- REF:ID 1.1.size -->

<a id="1.1.size"></a>
<!-- REF:ID 1.1.format -->

<a id="1.1.format"></a>
<!-- REF:ID 1.1.quality -->

<a id="1.1.quality"></a>
<!-- REF:ID 1.1.fit -->

<a id="1.1.fit"></a>
<!-- REF:ID 1.1.max-pixels -->

<a id="1.1.max-pixels"></a>
<!-- REF:ID 1.1.json -->

<a id="1.1.json"></a>
<!-- REF:ID 1.1.dry-run -->

<a id="1.1.dry-run"></a>

| Script            | REF:ID           | href                                 | --flag         | Description                                                                    |
| ----------------- | ---------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| `images:generate` | `1.1.source`     | [`#1.1.source`](#1.1.source)         | `--source`     | File or directory                                                              |
| `images:generate` | `1.1.out`        | [`#1.1.out`](#1.1.out)               | `--out`        | File or directory                                                              |
| `images:generate` | `1.1.size`       | [`#1.1.size`](#1.1.size)             | `--size WxH`   | e.g. `64x64`                                                                   |
| `images:generate` | `1.1.format`     | [`#1.1.format`](#1.1.format)         | `--format`     | `webp` · `jpeg` · `png` · `avif`                                               |
| `images:generate` | `1.1.quality`    | [`#1.1.quality`](#1.1.quality)       | `--quality`    | 1–100 (hero defaults 85)                                                       |
| `images:generate` | `1.1.fit`        | [`#1.1.fit`](#1.1.fit)               | `--fit`        | `fill` (default) or `inside` — Bun has no `cover`; `cover` is mapped to `fill` |
| `images:generate` | `1.1.max-pixels` | [`#1.1.max-pixels`](#1.1.max-pixels) | `--max-pixels` | Decompression guard (default ~16M)                                             |
| `images:generate` | `1.1.json`       | [`#1.1.json`](#1.1.json)             | `--json`       | Machine summary                                                                |
| `images:generate` | `1.1.dry-run`    | [`#1.1.dry-run`](#1.1.dry-run)       | `--dry-run`    | Plan only                                                                      |

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

Safe id: `[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}`. Source order: warehouse → tennis
mark fallback. Caches under `public/avatars/{id}.webp`
(`X-Avatar-Cache: hit|miss`).

## Phase2 daily report (optional)

If/when `phase2:daily` exists in Kalshi-bot:

```bash
GENERATE_IMAGE=1 bun run phase2:daily
# or manual:
bun run images:generate --template=hero --source=... --out=./artifacts/phase2-$(date -u +%F).webp
```

## Notes

- No `sharp` / `jimp`.
- SVG is not a `Bun.Image` input format. Keep generated charts as SVG or use a
  renderer such as `Bun.WebView` when a real raster artifact is required.
- No disposal contract exists; chain and await a terminal.
- Automatic image `Content-Type` is a Bun server serialization behavior. A
  locally constructed `Response` may not expose that header until it is served;
  validate the received response when testing this contract.
- HEIC/AVIF may throw `ERR_IMAGE_FORMAT_UNSUPPORTED`; `images:generate` retries
  as PNG and reports the changed destination.
- Other stable terminal codes are `ERR_IMAGE_TOO_MANY_PIXELS`,
  `ERR_IMAGE_DECODE_FAILED`, `ERR_IMAGE_ENCODE_FAILED`,
  `ERR_IMAGE_UNKNOWN_FORMAT`, and `ERR_INVALID_STATE`; file inputs preserve
  syscall codes such as `ENOENT` and `EACCES`.
- Linux does not support TIFF, HEIC, AVIF, or clipboard input. Windows HEIC/AVIF
  requires the relevant Microsoft Store extensions; AVIF encode on macOS needs
  an OS encoder and currently requires Apple Silicon M3 or newer.
- Path strings must not be user-controlled: constructing from one is an
  arbitrary-file-read primitive. Validate a repository-owned path or pass
  already-read bytes.
- JPEG, PNG, and WebP use Bun's portable codecs across platforms. System-backed
  formats inherit the OS patch level.

## Avatar index (clean mapping)

Bake writes `/registry/tennis/avatar-index.json` with:

- `players[]` — slug, displayName, hasSource, hasWebp
- `bySlug` — O(1) slug lookup
- `nameToSlug` — normalized display name → slug

Live matches join sides via `side.slug === nameToSlug[normalize(label)]`.
