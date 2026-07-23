# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching headers).

| File | Role |
|------|------|
| [`static-response.ts`](static-response.ts) | Buffered / file responses with ETag-friendly headers |
| [`content-type.ts`](content-type.ts) | Request/response Content-Type (Bun FormData/Blob auto CT) |
| [`data-etag.ts`](data-etag.ts) | Shared ETag for JSON health/summary bodies |
| [`live-reload.ts`](live-reload.ts) | Local SSE browser live-reload + HTML inject (serve-public HMR) |

### Content-Type (fetch)

Canonical: [content-type-handling](https://bun.com/docs/runtime/networking/fetch#content-type-handling)

| Body | Bun sets Content-Type? |
|------|------------------------|
| `FormData` | Yes — multipart + boundary (**never** set CT yourself) |
| `Blob` / `File` | Yes — from `blob.type` when header omitted |
| `string` / `Uint8Array` | **No** — set CT explicitly or use `jsonBlob()` |

Responses (serve-public) always set CT via `guessContentType` / `Response.json`.
