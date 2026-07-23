# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching headers).

| File | Role |
|------|------|
| [`fetch-headers.ts`](fetch-headers.ts) | Shared Accept/UA header merging for outbound `fetch` ([custom-headers](https://bun.com/docs/runtime/networking/fetch#custom-headers)) |
| [`fetch-preconnect.ts`](fetch-preconnect.ts) | DNS prefetch + fetch.preconnect warming |
| [`static-response.ts`](static-response.ts) | Buffered / file responses with ETag-friendly headers |
| [`content-type.ts`](content-type.ts) | Request/response Content-Type (Bun FormData/Blob auto CT) |
| [`form-upload.ts`](form-upload.ts) | FormData file receive/send (`req.formData` + `Bun.write`) |
| [`data-etag.ts`](data-etag.ts) | Shared ETag for JSON health/summary bodies |
| [`live-reload.ts`](live-reload.ts) | Local SSE browser live-reload + HTML inject (serve-public HMR) |
| [`bun-server.ts`](bun-server.ts) | `Bun.serve` Server helpers — identity, probes, lifecycle |
| [`bun-serve-shape.ts`](bun-serve-shape.ts) | Docs / bun-types / runtime cross-ref matrix for Server bind fields |
| [`../docs/bun-release-tracker.ts`](../docs/bun-release-tracker.ts) | Release-note changelog → verification probes (TLS system CA, GC smoke) |
| [`verification-scripts.ts`](verification-scripts.ts) | Pipe-friendly verify scripts (`curl …/script \| bun run -`) |

### Verification scripts via stdin (`bun run -`)

Canonical: [bun run -](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin)

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

Script integrity uses **content SHA-256** (`X-Script-SHA256` header / `.script.meta` JSON).
Run proof hashes (`proofHash` in `public/registry/*-proof.json`) are separate — they attest last verification output.

### Bun.serve bind shape (port + protocol)

Cross-reference SSOT: [`bun-serve-shape.ts`](bun-serve-shape.ts) · helpers: [`bun-server.ts`](bun-server.ts)

| Source | Role |
|--------|------|
| [Server #reference](https://bun.com/docs/runtime/http/server#reference) | Published Server fields (`url`, `port`, `hostname` — **no `protocol` yet**) |
| [Port / hostname](https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname) | `$BUN_PORT` → `$PORT` → `$NODE_PORT` → `3000` |
| [oven-sh/bun serve.d.ts](https://github.com/oven-sh/bun/blob/main/packages/bun-types/serve.d.ts) | Adds `readonly protocol: "http" \| "https" \| null` |
| [bun.com/rss.xml](https://bun.com/rss.xml) | Release feed → `tools/release-index.json` (no `protocol` RSS note as of 1.3.14) |
| Runtime probe | `probeServerShape()` on this Bun |

```bash
bun run check:serve-shape          # 41 tests ([test].timeout=10s in bunfig.toml)
bun test tests/bun-serve-shape.test.ts --timeout 3000  # CLI overrides bunfig per-test limit
bun tools/bun-doc-refs.ts suggest "Bun.serve reference"
bun tools/bun-doc-refs.ts suggest "Bun.serve port"
```

Two shapes on the same listener:

- `server.port` (number) · `server.url.port` (string; empty only on default 80/443)
- `server.protocol` (`http` / `https`) · `server.url.protocol` (`http:` / `https:`)

`serve-public` uses `serveBindSnapshot()` for typed startup + loopback URLs when bound to `0.0.0.0`.


Canonical: [content-type-handling](https://bun.com/docs/runtime/networking/fetch#content-type-handling)

Every decision separates layers — never one fuzzy string:

| Column | Meaning |
|--------|---------|
| **defaultValue** | Bun auto CT when header omitted |
| **ourValue** | What we set, or `—` if we defer |
| **wireValue** | Observed on built `Request`/`Response` (includes multipart boundary) |
| **expected** | Contract |
| **status** | `ok` · `mismatch` · `missing` · `override` · `defer` · `unknown` |
| **severity** | `pass` · `warn` · `fail` |

```bash
bun tools/content-type-table.ts
bun tools/content-type-table.ts --json
bun tools/content-type-table.ts --live=http://127.0.0.1:3000
bun tools/content-type-table.ts --fail   # exit 1 on real fails (demo rows excluded)

# runtime
curl -s http://127.0.0.1:3000/api/content-type | head
# also embedded under /health → contentType.rows
```

API: `decideRequestContentType` · `decideResponseContentType` · `decideFromResponse` ·
`evaluateContentType` · `contentTypePolicyCatalog` · `summarizeContentTypeMatrix` ·
`probeLiveContentTypes`.

### File uploads (FormData)

Canonical: [file-uploads](https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata)

```ts
// receive
const form = await req.formData();
const pic = form.get("profilePicture"); // Blob
await Bun.write("profilePicture.png", pic);

// send (no Content-Type header)
const form = new FormData();
form.set("file", blob, "artifact.tgz");
await fetch(url, { method: "POST", body: form, headers: { Authorization: "…" } });
```

Helpers: `requireFormBlob`, `writeFormBlob`, `buildFileUploadForm` in `form-upload.ts`.

### Outbound fetch (custom headers)

Canonical: [custom-headers](https://bun.com/docs/runtime/networking/fetch#custom-headers)

```ts
import { installGlobalFetchHeaders, mergeFetchHeaders, mergeFetchInit } from "../lib/http/fetch-headers.ts";

installGlobalFetchHeaders(); // optional — installs process-wide default headers
await fetch(url, mergeFetchInit({ headers: { Accept: "application/json" } }));
```

Default headers: `User-Agent: factorywager-http/1.0`. Caller headers override.
