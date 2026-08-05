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
| Desk coverage | `bun run bookmakers:desk-coverage` · [`scripts/bookmakers-desk-coverage.ts`](../../../scripts/bookmakers-desk-coverage.ts) |
| Publish | `bun run bookmakers:publish` (factory CLI → snapshot → bake `--version`) |
| Prepare publish | `bun run bookmakers:prepare-publish` · local package under `artifacts/deeplink-automation/packages/bookmakers/` |
| Bake local | `bun run bookmakers:bake -- --local` (uses local 0.4 package, no registry fetch) |
| Weave | surface `bookmakers` · artifact `bookmakers-registry` ([`lib/http/portal-weave.ts`](../../../lib/http/portal-weave.ts)) |
| Route manifest | `/portal/bookmakers/` ([`lib/http/portal-route-manifest.ts`](../../../lib/http/portal-route-manifest.ts)) |
| Chrome nav | `bookmakers` (overflow, ops) ([`lib/portal/chrome-catalog.ts`](../../../lib/portal/chrome-catalog.ts)) |
| Suite | [`tests/bookmakers-registry-bake.test.ts`](../../../tests/bookmakers-registry-bake.test.ts) · [`tests/bookmakers-migrate-v04.test.ts`](../../../tests/bookmakers-migrate-v04.test.ts) · [`tests/bookmakers-board.test.ts`](../../../tests/bookmakers-board.test.ts) |
| Open issues | [`bookmakers-open-issues.md`](./bookmakers-open-issues.md) — Orange777 · Pages/R2 lag · null limits · publish `--readme` |

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

## Desk coverage

Seat capital desk free-text `book` fields are classified against the registry:

| Class | Examples |
|-------|----------|
| matched | `Hard Rock Florida` → `hard-rock-florida` · `parlay21.com` → `parlay21-com` |
| placeholder | `Partner book TBD` · `SouthFL PPH Desk` |
| unmatched | `Orange777` (no domain SSOT yet — do not invent a registry id) |

```bash
bun run bookmakers:desk-coverage
bun run bookmakers:desk-coverage -- --apply-max   # fill missing limits.maxBetUsd from desk
```

## Publish 0.4.0 package (when R2 available)

```bash
bun run bookmakers:prepare-publish
bun run factory:publish artifacts/deeplink-automation/packages/bookmakers/factorywager-bookmakers-0.4.1.tgz \
  --name @factorywager/bookmakers --version 0.4.1 --type library \
  --readme artifacts/deeplink-automation/packages/bookmakers/README.md
bun lib/factory/cli.ts snapshot public/registry/registry.json
bun run bookmakers:bake   # or bookmakers:bake -- --local offline
```

Always pass **`--readme <path>`** to the package README (BM-5). Auto-detect can
attach a wrong/stale file when publishing a `.tgz`.

**Published:** `@factorywager/bookmakers@0.4.1` is on R2 (`factory list` shows
latest 0.4.1). Public HTTP index at `registry.factory-wager.com` may lag until
`public/registry/registry.json` is deployed to Pages — bake prefers the **local**
snapshot (BM-2):

```bash
bun lib/factory/cli.ts snapshot public/registry/registry.json   # after publish
bun run bookmakers:bake -- --version 0.4.1
bun run bookmakers:desk-coverage
```

Remaining gaps (limits nulls, Orange777, live index lag): 
[`bookmakers-open-issues.md`](./bookmakers-open-issues.md).

## Verification

```bash
bun run bookmakers:migrate -- --dry-run   # optional
bun run bookmakers:desk-coverage
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/bookmakers-migrate-v04.test.ts
bun test tests/bookmakers-board.test.ts
bun test tests/bookmakers-desk-coverage.test.ts
```

Live: `/registry/bookmakers.json` + `/portal/bookmakers/` on the Pages host
(after deploy). Confirm **no** `apiKeyEnv` / `restBaseUrl` in the public JSON.
