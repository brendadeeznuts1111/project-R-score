# Provider Cross-Reference Matrix

> Factory-Wager patterns cross-referenced with provider enums

## Provider → Patterns Mapping

| Provider | Pattern Count | Categories | APIs |
|----------|--------------|------------|------|
| Bun Official | 8 | cookies, r2, s3-presign, performance | fetch, Request, Response, Headers, R2Bucket, R2Object, cf:// protocol, S3Client, S3File, presign, contentDisposition, performance.now, CryptoHasher, Bun.gc, PerformanceObserver |
| MDN Web Docs | 3 | cookies, performance | fetch, Request, Response, Headers, performance.now, CryptoHasher, Bun.gc, PerformanceObserver |
| GitHub | 5 | cookies, r2, s3-presign | fetch, Request, Response, Headers, R2Bucket, R2Object, cf:// protocol, S3Client, S3File, presign, contentDisposition |
| Cloudflare | 5 | cookies, r2, s3-presign | fetch, Request, Response, Headers, R2Bucket, R2Object, cf:// protocol, S3Client, S3File, presign, contentDisposition |
| Vercel | 1 | cookies | fetch, Request, Response, Headers |
| Web.dev Performance | 2 | performance | performance.now, CryptoHasher, Bun.gc, PerformanceObserver |

## Pattern → Providers Mapping

| Pattern | Primary Provider | Related Providers | Integration Providers |
|---------|------------------|------------------|----------------------|
| Cookie A/B Testing - Variant A | Bun Official | MDN Web Docs, GitHub | Bun Official, Cloudflare, Vercel |
| R2 Profile Upload | Cloudflare | Bun Official, GitHub | Cloudflare, Bun Official, GitHub |
| S3 Presigned Download URL | Bun Official | GitHub, Cloudflare | Bun Official, Cloudflare, GitHub |
| Performance Benchmark Suite | Bun Official | Web.dev Performance, MDN Web Docs | Bun Official, Web.dev Performance, MDN Web Docs |
