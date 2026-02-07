# Factory-Wager Pattern Matching Guide

## Pattern Categories

### COOKIES
- **Count**: 1 patterns
- **Avg Performance**: 66,576 ops/s
- **Complexities**: simple (1)
- **Code Types**: curl

### R2
- **Count**: 1 patterns
- **Avg Performance**: 634,840 ops/s
- **Complexities**: intermediate (1)
- **Code Types**: r2

### CDN
- **Count**: 1 patterns
- **Avg Performance**: 13,233 ops/s
- **Complexities**: simple (1)
- **Code Types**: crypto

### SUBDOMAINS
- **Count**: 1 patterns
- **Avg Performance**: 189,970 ops/s
- **Complexities**: simple (1)
- **Code Types**: curl

### PROFILING
- **Count**: 1 patterns
- **Avg Performance**: 800,000 ops/s
- **Complexities**: simple (1)
- **Code Types**: curl

### S3-PRESIGN
- **Count**: 1 patterns
- **Avg Performance**: 45,000 ops/s
- **Complexities**: advanced (1)
- **Code Types**: s3

### PERFORMANCE
- **Count**: 2 patterns
- **Avg Performance**: 1,432,989 ops/s
- **Complexities**: intermediate (2)
- **Code Types**: bun-e

## Pattern Recognition Matrix

| Use Case | Pattern Template | Complexity | Code Type | Performance |
|----------|------------------|------------|-----------|-------------|
| A/B testing UI variants | `curl -H "Cookie: variant={}" {}` | simple | curl | 66,576 ops/s |
| Object storage upload | `fetch("cf://{}/{}", {})` | intermediate | r2 | 634,840 ops/s |
| Cache validation and ETag generation | `new Bun.CryptoHasher("sha256").update(data).digest("hex")` | simple | crypto | 13,233 ops/s |
| Subdomain routing simulation | `curl -H "Host: {}.{}" {}` | simple | curl | 189,970 ops/s |
| Profile data submission | `curl -d {} -X POST {}` | simple | curl | 800,000 ops/s |
| Secure file download URLs | `s3.file("{}").presign({}\"", type: "{}"})` | advanced | s3 | 45,000 ops/s |
| Performance testing and optimization | `const t0=performance.now();{};console.log(performance.now()-t0)` | intermediate | bun-e | 1,411,433 ops/s |
| Bulk data processing optimization | `const promises=[];for(let i=0;i<{};i++){})}await Promise.all(promises)` | intermediate | bun-e | 1,454,545 ops/s |

## Tag-Based Filtering

### Available Tags (37)
- `ab-testing`
- `admin`
- `api`
- `attachment`
- `benchmark`
- `bulk`
- `cdn`
- `cloudflare`
- `concurrency`
- `content-disposition`
- `cookie`
- `crypto`
- `download`
- `etag`
- `hash`
- `host-header`
- `json`
- `junior-runner`
- `markdown`
- `optimization`
- `parallel`
- `performance`
- `post`
- `presign`
- `profile`
- `promise-all`
- `r2`
- `reverse-proxy`
- `routing`
- `s3`
- `sha256`
- `storage`
- `subdomain`
- `timing`
- `ui`
- `upload`
- `variant`

### Popular Tag Combinations
- **ab-testing + cookie**: 1 patterns
- **r2 + upload**: 1 patterns
- **performance + benchmark**: 1 patterns
- **s3 + presign**: 1 patterns
- **subdomain + routing**: 1 patterns
