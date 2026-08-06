# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching
headers).

| File                                                               | Role                                                                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`fetch-headers.ts`](fetch-headers.ts)                             | Shared Accept/UA header merging for outbound `fetch` ([custom-headers](https://bun.com/docs/runtime/networking/fetch#custom-headers)) |
| [`fetch-preconnect.ts`](fetch-preconnect.ts)                       | DNS prefetch + fetch.preconnect warming                                                                                               |
| [`static-response.ts`](static-response.ts)                         | Buffered / file responses with ETag-friendly headers                                                                                  |
| [`content-type.ts`](content-type.ts)                               | Request/response Content-Type (Bun FormData/Blob auto CT)                                                                             |
| [`form-upload.ts`](form-upload.ts)                                 | FormData file receive/send (`req.formData` + `Bun.write`)                                                                             |
| [`data-etag.ts`](data-etag.ts)                                     | Shared ETag for JSON health/summary bodies                                                                                            |
| [`live-reload.ts`](live-reload.ts)                                 | Local SSE browser live-reload + HTML inject (serve-public HMR)                                                                        |
| [`serve-public-config.ts`](serve-public-config.ts)                 | Optional local `config/serve-public.toml` (gitignored) + env merge for bind prefs                                                     |
| [`serve-public-bind.ts`](serve-public-bind.ts)                     | Port bind policy, ephemeral fallback, bind manifest, verify base                                                                      |
| [`serve-public-error.ts`](serve-public-error.ts)                   | Bun.serve `error` — JSON 500 when `!development` ([error-handling](https://bun.com/docs/runtime/http/error-handling))                 |
| [`bun-server.ts`](bun-server.ts)                                   | `Bun.serve` Server helpers — identity, probes, lifecycle                                                                              |
| [`bun-serve-shape.ts`](bun-serve-shape.ts)                         | Docs / bun-types / runtime cross-ref matrix for Server bind fields                                                                    |
| [`host-planes.ts`](host-planes.ts)                                 | Bind vs DNS vs Access vs Pages vocabulary map (`HOST_PLANE_MAP`)                                                                      |
| [`host-lineage.ts`](host-lineage.ts)                               | Live HostId → apex/sub → Access → https transition rows                                                                               |
| [`bun-serve-lifecycle.ts`](bun-serve-lifecycle.ts)                 | Server methods + serve/WS options matrix (`timeout` · `idleTimeout`)                                                                  |
| [`bind-identity-card.ts`](bind-identity-card.ts)                   | Indexed BIND IDENTITY card for serve-public startup                                                                                   |
| [`portal-board-slugs.ts`](portal-board-slugs.ts)                   | Portal board slug SSOT for `portalBoardRoutes` / exact `routes`                                                                       |
| [`../docs/bun-release-tracker.ts`](../docs/bun-release-tracker.ts) | Release-note changelog → verification probes (TLS system CA, GC smoke)                                                                |
| [`verification-scripts.ts`](verification-scripts.ts)               | Pipe-friendly verify scripts (`curl …/script \| bun run -`)                                                                           |

### serve-public error + bind prefs

**Error callback**
([error-handling](https://bun.com/docs/runtime/http/error-handling)):
`attachServePublicErrorHandler(opts, { development })` strips a custom `error`
handler when `development: true` so Bun serves its in-browser page; when
development is off, attaches `servePublicErrorHandler` → JSON
`{ error: "Internal Server Error" }` with status 500 (no stack on the wire).

**TOML bind prefs**: optional operator file `config/serve-public.toml` is
**gitignored** (not in the git tree). Load/merge via
[`serve-public-config.ts`](serve-public-config.ts)
(`resolveServePublicBindPrefs()`). Env/`--port`/`BUN_PORT`/`PORT`/`NODE_PORT`
activate Bun's native port chain (omit `port` on `Bun.serve`); otherwise
`[server] port` / `host` from local TOML apply. Operator reference:
[`docs/harness/tenants/serve-public-bind.md`](../../docs/harness/tenants/serve-public-bind.md).

### Verification scripts via stdin (`bun run -`)

Canonical:
[bun run -](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin)

```bash
# Local serve-public (no saved files)
curl -sf http://127.0.0.1:3000/api/defaults/script | bun run -
curl -sf http://127.0.0.1:3000/api/networking/script | bun run - --local-only

# Metadata + verified pipe one-liner
curl -sf http://127.0.0.1:3000/api/defaults/script.meta | jq .

# Verify SHA-256 before execute
curl -sf http://127.0.0.1:3000/api/defaults/script | bun tools/run-verified.ts --verify-hash=<sha256>

# package.json shortcuts (serve-public must be up)
bun run check:defaults:pipe
bun run check:networking:pipe
curl -sf http://127.0.0.1:3000/api/doc-refs/script | bun run - --save
bun run build:doc-index
```

Script integrity uses **content SHA-256** (`X-Script-SHA256` header /
`.script.meta` JSON). Run proof hashes (`proofHash` in
`public/registry/*-proof.json`) are separate — they attest last verification
output.

### Bun.serve bind shape (port + protocol)

Cross-reference SSOT: [`bun-serve-shape.ts`](bun-serve-shape.ts) (identity
fields) · [`bun-serve-lifecycle.ts`](bun-serve-lifecycle.ts) (methods + options)
· helpers: [`bun-server.ts`](bun-server.ts) · startup card:
[`bind-identity-card.ts`](bind-identity-card.ts)

| Source                                                                                           | Role                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [Server #reference](https://bun.com/docs/runtime/http/server#reference)                          | Published Server fields (`url`, `port`, `hostname` — **no `protocol` yet**)     |
| [Port / hostname](https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname)       | `$BUN_PORT` → `$PORT` → `$NODE_PORT` → `3000`                                   |
| [Environment variables](https://bun.com/docs/runtime/environment-variables)                      | Auto `.env` → `Bun.env`; `BUN_OPTIONS` prepends CLI flags                       |
| [oven-sh/bun serve.d.ts](https://github.com/oven-sh/bun/blob/main/packages/bun-types/serve.d.ts) | Adds `readonly protocol: "http" \| "https" \| null`                             |
| [bun.com/rss.xml](https://bun.com/rss.xml)                                                       | Release feed → `tools/release-index.json` (no `protocol` RSS note as of 1.3.14) |
| Runtime probe                                                                                    | `probeServerShape()` on this Bun                                                |

```bash
bun run check:serve-shape          # shape + lifecycle + bind-identity (+ bun-server/defaults)
bun test tests/bun-serve-shape.test.ts tests/bun-serve-lifecycle.test.ts \
  tests/bind-identity-card.test.ts --timeout 3000
bun run brand:status:bind
bun run brand:status:lifecycle
bun tools/bun-doc-refs.ts suggest "Bun.serve reference"
bun tools/bun-doc-refs.ts suggest "Bun.serve port"
```

Two shapes on the same listener (read **after** bind — never re-read env):

```ts
console.log(server.port); // number — chosen listen port
console.log(server.url); // URL — href like http://localhost:3000/
// server.url.port === String(server.port) for non-80/443
// server.url.protocol === `${server.protocol}:`
```

| Field                 | Type             | Use                                                     |
| --------------------- | ---------------- | ------------------------------------------------------- |
| `server.port`         | `number`         | Store / log the bound port                              |
| `server.url`          | `URL`            | Console origin, `new URL(path, server.url)`, fetch base |
| `server.url.port`     | `string`         | Wire twin of `server.port` (empty on 80/443)            |
| `server.protocol`     | `http`/`https`   | Bare scheme                                             |
| `server.url.protocol` | `http:`/`https:` | URL scheme with colon                                   |

Helpers in [`bun-server.ts`](./bun-server.ts): `formatServerPortUrlLines` ·
`assertServerPortUrlAligned` · `serveBindSnapshot`.

`serve-public` uses `bindServePublicPort()` + `serveBindSnapshot()` for typed
startup, ephemeral fallback, and loopback URLs when bound to `0.0.0.0`. Startup
logs append **BIND IDENTITY** via
[`bind-identity-card.ts`](bind-identity-card.ts). Operator doc:
[`docs/harness/tenants/serve-public-bind.md`](../../docs/harness/tenants/serve-public-bind.md).

### Portal spine + flag-order

Local portal wiring: root `package.json` (`serve:public:hot` /
`serve:public:watch`) →
[`scripts/serve-public.ts`](../../scripts/serve-public.ts) → this directory
(`bun-serve-shape`, `live-reload`, `public-routes` in
[`public-routes.ts`](public-routes.ts)).

**Flag-order verification:** `bun run verify:flag-order` scans all repo
`package.json` scripts for `bun run --watch|--hot` (use `bun --watch` /
`bun --hot` immediately after `bun`). See
[`docs/portal-foundation.md`](../../docs/portal-foundation.md#dev-reload-watch-hot-browser-sse)
(dev reload + verification note).

Canonical:
[content-type-handling](https://bun.com/docs/runtime/networking/fetch#content-type-handling)

Every decision separates layers — never one fuzzy string:

| Column           | Meaning                                                              |
| ---------------- | -------------------------------------------------------------------- |
| **defaultValue** | Bun auto CT when header omitted                                      |
| **ourValue**     | What we set, or `—` if we defer                                      |
| **wireValue**    | Observed on built `Request`/`Response` (includes multipart boundary) |
| **expected**     | Contract                                                             |
| **status**       | `ok` · `mismatch` · `missing` · `override` · `defer` · `unknown`     |
| **severity**     | `pass` · `warn` · `fail`                                             |

```bash
bun tools/content-type-table.ts
bun tools/content-type-table.ts --json
bun tools/content-type-table.ts --live=http://127.0.0.1:3000
bun tools/content-type-table.ts --fail   # exit 1 on real fails (demo rows excluded)

# runtime
curl -s http://127.0.0.1:3000/api/content-type | head
# also embedded under /health → contentType.rows
```

API: `decideRequestContentType` · `decideResponseContentType` ·
`decideFromResponse` · `evaluateContentType` · `contentTypePolicyCatalog` ·
`summarizeContentTypeMatrix` · `probeLiveContentTypes`.

### File uploads (FormData)

Canonical:
[file-uploads](https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata)

```ts
// receive
const form = await req.formData();
const pic = form.get('profilePicture'); // Blob
await Bun.write('profilePicture.png', pic);

// send (no Content-Type header)
const form = new FormData();
form.set('file', blob, 'artifact.tgz');
await fetch(url, {
  method: 'POST',
  body: form,
  headers: { Authorization: '…' },
});
```

Helpers: `requireFormBlob`, `writeFormBlob`, `buildFileUploadForm` in
`form-upload.ts`.

### Outbound fetch (custom headers)

Canonical:
[custom-headers](https://bun.com/docs/runtime/networking/fetch#custom-headers)

```ts
import {
  installGlobalFetchHeaders,
  mergeFetchHeaders,
  mergeFetchInit,
} from '../lib/http/fetch-headers.ts';

installGlobalFetchHeaders(); // optional — installs process-wide default headers
await fetch(url, mergeFetchInit({ headers: { Accept: 'application/json' } }));
```

Default headers: `User-Agent: factorywager-http/1.0`. Caller headers override.
