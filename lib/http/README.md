# http

HTTP helpers for Bun.serve surfaces (static response utilities, caching headers).

| File | Role |
|------|------|
| [`static-response.ts`](static-response.ts) | Buffered / file responses with ETag-friendly headers |
| [`data-etag.ts`](data-etag.ts) | Shared ETag for JSON health/summary bodies |
| [`live-reload.ts`](live-reload.ts) | Local SSE browser live-reload + HTML inject (serve-public HMR) |
