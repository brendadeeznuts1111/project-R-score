# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching headers).

| File | Role |
|------|------|
| [`static-response.ts`](static-response.ts) | Buffered / file responses with ETag-friendly headers |
| [`content-type.ts`](content-type.ts) | Request/response Content-Type (Bun FormData/Blob auto CT) |
| [`form-upload.ts`](form-upload.ts) | FormData file receive/send (`req.formData` + `Bun.write`) |
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
