# Factory-Wager One-Liners v3.8 - LLM Optimized Context

## Pattern Summary
- Total Patterns: 8
- Categories: cookies, r2, cdn, subdomains, profiling, s3-presign, performance
- Complexity Levels: simple, intermediate, advanced
- Code Types: curl, r2, crypto, s3, bun-e

## Pattern 1: Cookie A/B Testing - Variant A

**ID**: `cookie-variant-a`
**Category**: `cookies`
**Complexity**: `simple`
**Tags**: `ab-testing`, `variant`, `cookie`, `ui`, `admin`
**Use Case**: A/B testing UI variants
**Dependencies**: curl, HTTP server

### Command
```bash
curl -H "Cookie: variant=A" http://localhost:3000
```

### Patterns
- `curl -H "Cookie: variant={VARIANT}" {URL}`
- `fetch("{URL}", {headers: {Cookie: "variant={VARIANT}"}})`
- `HTTP header manipulation for A/B testing`

### Code Block Template
```curl
curl -H "Cookie: variant={variant}" {url}
```
**Variables**: `variant`, `url`

### Performance
- **Avg Time**: 0.02ms
- **Ops/sec**: 66,576
- **Reliability**: high

---

## Pattern 2: R2 Profile Upload

**ID**: `r2-upload-profile`
**Category**: `r2`
**Complexity**: `intermediate`
**Tags**: `r2`, `upload`, `storage`, `cloudflare`, `json`
**Use Case**: Object storage upload
**Dependencies**: Bun, Cloudflare R2

### Command
```bash
bun -e 'fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})'
```

### Patterns
- `fetch("cf://{bucket}/{path}", {method: "PUT", body: data})`
- `Cloudflare R2 direct protocol usage`
- `JSON payload upload to object storage`

### Code Block Template
```r2
fetch("cf://{bucket}/{path}",{method:"PUT",body:JSON.stringify({data})})
```
**Variables**: `bucket`, `path`, `data`

### Performance
- **Avg Time**: 0ms
- **Ops/sec**: 634,840
- **Reliability**: high

---

## Pattern 3: CDN ETag Generation

**ID**: `cdn-etag-generation`
**Category**: `cdn`
**Complexity**: `simple`
**Tags**: `etag`, `hash`, `sha256`, `cdn`, `crypto`
**Use Case**: Cache validation and ETag generation
**Dependencies**: Bun crypto API

### Command
```bash
bun -e 'new Bun.CryptoHasher("sha256").update("html").digest("hex")'
```

### Patterns
- `new Bun.CryptoHasher("sha256").update(data).digest("hex")`
- `Cryptographic hash generation for cache validation`
- `CDN ETag computation pattern`

### Code Block Template
```crypto
new Bun.CryptoHasher("{algorithm}").update({data}).digest("{format}")
```
**Variables**: `algorithm`, `data`, `format`

### Performance
- **Avg Time**: 0.2ms
- **Ops/sec**: 13,233
- **Reliability**: high

---

## Pattern 4: Subdomain Admin Routing

**ID**: `subdomain-routing-admin`
**Category**: `subdomains`
**Complexity**: `simple`
**Tags**: `subdomain`, `routing`, `host-header`, `admin`, `reverse-proxy`
**Use Case**: Subdomain routing simulation
**Dependencies**: curl, HTTP server

### Command
```bash
curl -H "Host: admin.factory-wager.com" http://localhost:3000
```

### Patterns
- `curl -H "Host: {subdomain}.{domain}" {url}`
- `Host header manipulation for subdomain routing`
- `Local development subdomain simulation`

### Code Block Template
```curl
curl -H "Host: {subdomain}.{domain}" {url}
```
**Variables**: `subdomain`, `domain`, `url`

### Performance
- **Avg Time**: 0ms
- **Ops/sec**: 189,970
- **Reliability**: high

---

## Pattern 5: JuniorRunner Profile POST

**ID**: `junior-runner-post`
**Category**: `profiling`
**Complexity**: `simple`
**Tags**: `junior-runner`, `post`, `markdown`, `profile`, `api`
**Use Case**: Profile data submission
**Dependencies**: curl, JuniorRunner API

### Command
```bash
curl -d '# Hi' -X POST http://localhost:3000/profile
```

### Patterns
- `curl -d {data} -X POST {endpoint}`
- `Markdown content submission pattern`
- `Profile data upload via REST API`

### Code Block Template
```curl
curl -d '{data}' -X POST {endpoint}
```
**Variables**: `data`, `endpoint`

### Performance
- **Avg Time**: 0ms
- **Ops/sec**: 800,000
- **Reliability**: high

---

## Pattern 6: S3 Presign Download URL

**ID**: `s3-presign-download`
**Category**: `s3-presign`
**Complexity**: `advanced`
**Tags**: `s3`, `presign`, `download`, `attachment`, `content-disposition`
**Use Case**: Secure file download URLs
**Dependencies**: Bun S3Client, AWS S3/R2

### Command
```bash
bun -e 'import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\"profile.json\"",type:"application/json"}))'
```

### Patterns
- `s3.file("{key}").presign({method: "GET", contentDisposition: "attachment; filename=\"{filename}\"", type: "{contentType}"})`
- `S3 presigned URL generation with content disposition`
- `File download vs inline viewing control`

### Code Block Template
```s3
s3.file("{key}").presign({method:"GET",expiresIn:{expiresIn},contentDisposition:"{disposition}",type:"{contentType}"})
```
**Variables**: `key`, `expiresIn`, `disposition`, `contentType`

### Performance
- **Avg Time**: 0.05ms
- **Ops/sec**: 45,000
- **Reliability**: high

---

## Pattern 7: Performance Benchmark Test

**ID**: `performance-benchmark`
**Category**: `performance`
**Complexity**: `intermediate`
**Tags**: `benchmark`, `performance`, `timing`, `crypto`, `optimization`
**Use Case**: Performance testing and optimization
**Dependencies**: Bun, performance API

### Command
```bash
bun -e 'const t0=performance.now();for(let i=0;i<100;i++){await new Bun.CryptoHasher("sha256").update("test"+i).digest("hex")}console.log(performance.now()-t0)'
```

### Patterns
- `const t0=performance.now();{operations};console.log(performance.now()-t0)`
- `JavaScript performance measurement pattern`
- `Loop-based benchmarking with timing`

### Code Block Template
```bun-e
const t0=performance.now();{operations};console.log(performance.now()-t0)
```
**Variables**: `operations`

### Performance
- **Avg Time**: 0.19ms
- **Ops/sec**: 1,411,433
- **Reliability**: high

---

## Pattern 8: Bulk Operations Parallel

**ID**: `bulk-operations-parallel`
**Category**: `performance`
**Complexity**: `intermediate`
**Tags**: `bulk`, `parallel`, `promise-all`, `optimization`, `concurrency`
**Use Case**: Bulk data processing optimization
**Dependencies**: Bun, Promise API

### Command
```bash
bun -e 'const promises=[];for(let i=0;i<10;i++){promises.push(new Bun.CryptoHasher("sha256").update("bulk"+i).digest("hex"))}await Promise.all(promises)'
```

### Patterns
- `const promises=[];for(let i=0;i<{count};i++){promises.push({operation})}await Promise.all(promises)`
- `Parallel execution pattern with Promise.all`
- `Bulk operation optimization`

### Code Block Template
```bun-e
const promises=[];for(let i=0;i<{count};i++){promises.push({operation})}await Promise.all(promises)
```
**Variables**: `count`, `operation`

### Performance
- **Avg Time**: 0.32ms
- **Ops/sec**: 1,454,545
- **Reliability**: high

---

