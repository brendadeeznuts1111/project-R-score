# Bookmaker registry tenant

Canonical bookmaker registry for the sportsbook deep-link pipeline, exposed as a
first-class portal surface on the live domain.

| Role | Path |
|------|------|
| Board | [`/portal/bookmakers/`](../../../public/portal/bookmakers/index.html) |
| Markdown companion | [`/portal/bookmakers.md`](../../../public/portal/bookmakers.md) · routing audit [`routing.md`](../../../public/portal/routing.md) |
| Registry artifact (baked mirror) | [`/registry/bookmakers.json`](../../../public/registry/bookmakers.json) |
| Source artifact | `@factorywager/bookmakers` on the artifact registry (`registry.factory-wager.com`) |
| Bake | `bun run bookmakers:bake` · check `bookmakers:bake:check` · script [`scripts/bake-bookmakers-board.ts`](../../../scripts/bake-bookmakers-board.ts) |
| Weave | surface `bookmakers` · artifact `bookmakers-registry` ([`lib/http/portal-weave.ts`](../../../lib/http/portal-weave.ts)) |
| Route manifest | `/portal/bookmakers/` ([`lib/http/portal-route-manifest.ts`](../../../lib/http/portal-route-manifest.ts)) |
| Chrome nav | `bookmakers` (overflow, ops) ([`lib/portal/chrome-catalog.ts`](../../../lib/portal/chrome-catalog.ts)) |
| Suite | [`tests/bookmakers-registry-bake.test.ts`](../../../tests/bookmakers-registry-bake.test.ts) |
| Consumer runbook | This tenant doc · `bun run bookmakers:bake` · Factory weave publish via `bun lib/factory/cli.ts publish` |

## Purpose

The bookmaker registry (id, label, domain, fetcher strategy, supported
sports/leagues, regions, brand color) is the SSOT for the deep-link pipeline.
It is published as the `@factorywager/bookmakers` artifact to the R2-backed
artifact registry and **mirrored** onto the portal read plane so the live
domain serves a stable, versioned JSON without a server function.

## How the mirror is baked

`scripts/bake-bookmakers-board.ts`:

1. Fetch the registry index (`/api/registry/registry.json`), resolve the
   `latest` dist-tag for `@factorywager/bookmakers`.
2. Download the tarball from `/api/registry/<r2Key>`, verifying **size +
   SHA-256** against the index record (corrupt/mismatched → bake fails).
3. Extract (npm-style `package/` prefix stripped), import the package entry
   (`package.json main` → `dist/index.js`), read `BOOKMAKERS`.
4. Write `public/registry/bookmakers.json`:
   `{ schemaVersion, generatedAt, artifact{name,version,checksum,source},
      bookmakers, audit{ok,issues}, summary{count,webview,rest,sports} }`.

`bun run bookmakers:bake:check` fails when the committed mirror is stale
(used in CI / pre-merge).

## Updating the registry

1. Edit the canonical registry in **deeplink-automation**
   (`lib/bookmakers.ts`) → `cp lib/bookmakers.ts packages/bookmakers/bookmakers.ts`
   → `bun run build:bookmakers` → bump version → commit + push.
2. Publish to the artifact registry + refresh the snapshot:
   `bun lib/factory/cli.ts publish …` →
   `bun lib/factory/cli.ts snapshot public/registry/registry.json` → bake
   commit + PR (direct pushes to main are declined).
3. Re-run `bun run bookmakers:bake` and commit the refreshed mirror
   (`chore(bake)`), plus rebake `portal-weave.json` (ops-snapshot weave step).

## Verification

- `bun run bookmakers:bake:check` — mirror matches the live artifact.
- `bun test tests/bookmakers-registry-bake.test.ts` — schema, board presence,
  route/chrome/weave wiring (offline).
- Live: `/registry/bookmakers.json` + `/portal/bookmakers/` on the Pages host.
