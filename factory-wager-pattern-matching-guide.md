# Factory-Wager Pattern Matching Guide

## Pattern Categories

### COOKIES
- **Count**: 1 patterns
- **Common Tags**: ab-testing, variant, cookie, ui, admin
- **Avg Performance**: 66,576 ops/s

### R2
- **Count**: 1 patterns
- **Common Tags**: r2, upload, storage, cloudflare, json
- **Avg Performance**: 634,840 ops/s

### CDN
- **Count**: 1 patterns
- **Common Tags**: etag, hash, sha256, cdn, crypto
- **Avg Performance**: 13,233 ops/s

### SUBDOMAINS
- **Count**: 1 patterns
- **Common Tags**: subdomain, routing, host-header, admin, reverse-proxy
- **Avg Performance**: 189,970 ops/s

### PROFILING
- **Count**: 1 patterns
- **Common Tags**: junior-runner, post, markdown, profile, api
- **Avg Performance**: 800,000 ops/s

### S3-PRESIGN
- **Count**: 1 patterns
- **Common Tags**: s3, presign, download, attachment, content-disposition
- **Avg Performance**: 45,000 ops/s

### PERFORMANCE
- **Count**: 2 patterns
- **Common Tags**: benchmark, performance, timing, crypto, optimization
- **Avg Performance**: 1,432,989 ops/s

## Pattern Recognition Matrix

| Use Case | Pattern | Complexity | Code Type |
|----------|---------|------------|-----------|
| A/B testing UI variants | `curl -H "Cookie: variant={VARIANT}" {URL}` | simple | curl |
| Object storage upload | `fetch("cf://{bucket}/{path}", {method: "PUT", body: data})` | intermediate | r2 |
| Cache validation and ETag generation | `new Bun.CryptoHasher("sha256").update(data).digest("hex")` | simple | crypto |
| Subdomain routing simulation | `curl -H "Host: {subdomain}.{domain}" {url}` | simple | curl |
| Profile data submission | `curl -d {data} -X POST {endpoint}` | simple | curl |
| Secure file download URLs | `s3.file("{key}").presign({method: "GET", contentDisposition: "attachment; filename=\"{filename}\"", type: "{contentType}"})` | advanced | s3 |
| Performance testing and optimization | `const t0=performance.now();{operations};console.log(performance.now()-t0)` | intermediate | bun-e |
| Bulk data processing optimization | `const promises=[];for(let i=0;i<{count};i++){promises.push({operation})}await Promise.all(promises)` | intermediate | bun-e |

## Tag-Based Filtering

### Available Tags (37)
- `ab-testing`
- `variant`
- `cookie`
- `ui`
- `admin`
- `r2`
- `upload`
- `storage`
- `cloudflare`
- `json`
- `etag`
- `hash`
- `sha256`
- `cdn`
- `crypto`
- `subdomain`
- `routing`
- `host-header`
- `reverse-proxy`
- `junior-runner`
- `post`
- `markdown`
- `profile`
- `api`
- `s3`
- `presign`
- `download`
- `attachment`
- `content-disposition`
- `benchmark`
- `performance`
- `timing`
- `optimization`
- `bulk`
- `parallel`
- `promise-all`
- `concurrency`

### Popular Tag Combinations
- **ab-testing + cookie**: 1 patterns
- **r2 + upload**: 1 patterns
- **performance + benchmark**: 1 patterns
- **s3 + presign**: 1 patterns
- **subdomain + routing**: 1 patterns
