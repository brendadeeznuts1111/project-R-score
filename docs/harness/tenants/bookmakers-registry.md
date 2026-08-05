# Bookmaker registry tenant

Canonical bookmaker registry for the sportsbook deep-link pipeline, exposed as a
first-class portal surface on the live domain.

| Role | Path |
|------|------|
| Board | [`/portal/bookmakers/`](../../../public/portal/bookmakers/index.html) |
| Markdown companion | [`/portal/bookmakers.md`](../../../public/portal/bookmakers.md) · routing audit [`routing.md`](../../../public/portal/routing.md) |
| Registry artifact (Pages public mirror) | [`/registry/bookmakers.json`](../../../public/registry/bookmakers.json) — **v0.4 public catalog only** (`schemaVersion: 2`) |
| Artifact split (v0.4.0) | [`artifact-registry/bookmakers/v0.4.0/`](../../../artifact-registry/bookmakers/v0.4.0/) — `public/books.json` + `ops/books.json` (**ops never on Pages**) |
| Bake | `bun run bookmakers:bake` · check `bookmakers:bake:check` · script [`scripts/bake-bookmakers-board.ts`](../../../scripts/bake-bookmakers-board.ts) |
| Migrate | `bun run bookmakers:migrate` · [`scripts/migrate-bookmakers-v0.3-to-v0.4.ts`](../../../scripts/migrate-bookmakers-v0.3-to-v0.4.ts) |
| Weave | surface `bookmakers` · artifact `bookmakers-registry` ([`lib/http/portal-weave.ts`](../../../lib/http/portal-weave.ts)) |
| Route manifest | `/portal/bookmakers/` ([`lib/http/portal-route-manifest.ts`](../../../lib/http/portal-route-manifest.ts)) |
| Chrome nav | `bookmakers` (overflow, ops) ([`lib/portal/chrome-catalog.ts`](../../../lib/portal/chrome-catalog.ts)) |
| Suite | [`tests/bookmakers-registry-bake.test.ts`](../../../tests/bookmakers-registry-bake.test.ts) · [`tests/bookmakers-migrate-v04.test.ts`](../../../tests/bookmakers-migrate-v04.test.ts) · [`tests/bookmakers-board.test.ts`](../../../tests/bookmakers-board.test.ts) |

## v0.4 public vs ops

| Plane | Contents | Deploy |
|-------|----------|--------|
| **Public** | `id`/`slug` (equal), `label`, `skin`, `brandGroup`, `urls`, `fetcher`, `lifecycle`, `sports`, `regions`, `limits`, `color`, `webViewConfig`, `note` | Pages `/registry/bookmakers.json` |
| **Ops** | `restBaseUrl`, `restProtocol`, `apiKeyEnv`, `envVars`, `balance`/`health` placeholders, `contact` | `artifact-registry/.../ops/` only |

### Decisions

| Question | Choice |
|----------|--------|
| ID format | **A** — `id === slug` (route primary key; no UUID migration) |
| Region format | **A** — `{ country, stateCode? }` objects (board-compatible) |
| Keep public | `color`, `webViewConfig`, `note` |
| Move to ops | `restBaseUrl`, `restProtocol`, `apiKeyEnv`, `envVars` |
| Never public | `balance`, `health` |

## Purpose

The bookmaker registry is the SSOT for the deep-link pipeline. It is published
as `@factorywager/bookmakers` and **mirrored** onto the portal read plane so the
live domain serves a stable, versioned **public** JSON without a server
function. Secrets and live desk state stay off Pages.

## How the mirror is baked

`scripts/bake-bookmakers-board.ts`:

1. Fetch the registry index, resolve `latest` for `@factorywager/bookmakers`.
2. Download the tarball (size + SHA-256 verify).
3. Import package entry; prefer `PUBLIC_BOOKMAKERS` (v0.4) over `BOOKMAKERS`.
4. Write `public/registry/bookmakers.json` with audit + summary.

Local v0.3 → v0.4 without a published package: `bun run bookmakers:migrate`.

## Updating the registry

1. Edit canonical registry / package → bump **0.4.x** → publish with
   `PUBLIC_BOOKMAKERS` export (Pages-safe).
2. Or migrate: `bun run bookmakers:migrate` from a v0.3 bake.
3. Commit `public/registry/bookmakers.json` + `artifact-registry/bookmakers/v0.4.0/`.

## Verification

```bash
bun run bookmakers:migrate -- --dry-run   # optional
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/bookmakers-migrate-v04.test.ts
bun test tests/bookmakers-board.test.ts
```

Live: `/registry/bookmakers.json` + `/portal/bookmakers/` on the Pages host
(after deploy). Confirm **no** `apiKeyEnv` / `restBaseUrl` in the public JSON.
