# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching headers).

| File | Role |
|------|------|
| [`fetch-client.ts`](fetch-client.ts) | Default custom headers on outbound `fetch` ([custom-headers](https://bun.com/docs/runtime/networking/fetch#custom-headers)) |
| [`fetch-preconnect.ts`](fetch-preconnect.ts) | DNS prefetch + fetch.preconnect warming |
| [`static-response.ts`](static-response.ts) | Buffered / file responses with ETag-friendly headers |
| [`content-type.ts`](content-type.ts) | Request/response Content-Type (Bun FormData/Blob auto CT) |
| [`form-upload.ts`](form-upload.ts) | FormData file receive/send (`req.formData` + `Bun.write`) |
| [`data-etag.ts`](data-etag.ts) | Shared ETag for JSON health/summary bodies |
| [`live-reload.ts`](live-reload.ts) | Local SSE browser live-reload + HTML inject (serve-public HMR) |

### Content-Type (deep matrix)

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
import { factoryFetch, installGlobalFetchHeaders, mergeFetchHeaders } from "../lib/http/fetch-client.ts";

installGlobalFetchHeaders(); // optional — patches global fetch once per process
await factoryFetch(url, { headers: mergeFetchHeaders({ Accept: "application/json" }) });
```

Default headers: `User-Agent: FactoryWager/fetch (Bun/…)`, `Accept-Language: en`. Caller headers override.
