# Bun Official Integration Patterns

> Factory-Wager one-liners enhanced with Bun Official cross-references

## Overview

- **Total Patterns**: 8
- **Categories**: cookies, r2, s3-presign, performance
- **Integration Types**: fetch, Request, Response, Headers, R2Bucket, R2Object, cf:// protocol, S3Client, S3File, presign, contentDisposition, performance.now, CryptoHasher, Bun.gc, PerformanceObserver

## Patterns

### Cookie A/B Testing - Variant A

**Category**: cookies
**Complexity**: simple
**Tags**: `ab-testing`, `variant`, `cookie`, `ui`, `admin`, `http`, `header`

#### Command
```bash
curl -H "Cookie: variant=A" http://localhost:3000
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: MDN Web Docs, GitHub
- **Integration APIs**: fetch, Request, Response, Headers

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/api/fetch)
- **MDN Web Docs**: [Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie)

#### Performance
- **Ops/sec**: 66,576
- **Avg Time**: 0.02ms
- **Reliability**: high

---

### Cookie A/B Testing - Variant A

**Category**: cookies
**Complexity**: simple
**Tags**: `ab-testing`, `variant`, `cookie`, `ui`, `admin`, `http`, `header`

#### Command
```bash
curl -H "Cookie: variant=A" http://localhost:3000
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: MDN Web Docs, GitHub
- **Integration APIs**: fetch, Request, Response, Headers

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/api/fetch)
- **MDN Web Docs**: [Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie)

#### Performance
- **Ops/sec**: 66,576
- **Avg Time**: 0.02ms
- **Reliability**: high

---

### R2 Profile Upload

**Category**: r2
**Complexity**: intermediate
**Tags**: `r2`, `upload`, `storage`, `cloudflare`, `json`, `object-storage`

#### Command
```bash
bun -e 'fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})'
```

#### Provider Integration
- **Primary Provider**: Cloudflare
- **Related Providers**: Bun Official, GitHub
- **Integration APIs**: R2Bucket, R2Object, fetch, cf:// protocol

#### Documentation References
- **Cloudflare**: [Documentation](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- **Bun Official**: [Documentation](https://bun.sh/docs/runtime/cloudflare-r2)

#### Performance
- **Ops/sec**: 634,840
- **Avg Time**: 0ms
- **Reliability**: high

---

### R2 Profile Upload

**Category**: r2
**Complexity**: intermediate
**Tags**: `r2`, `upload`, `storage`, `cloudflare`, `json`, `object-storage`

#### Command
```bash
bun -e 'fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})'
```

#### Provider Integration
- **Primary Provider**: Cloudflare
- **Related Providers**: Bun Official, GitHub
- **Integration APIs**: R2Bucket, R2Object, fetch, cf:// protocol

#### Documentation References
- **Cloudflare**: [Documentation](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- **Bun Official**: [Documentation](https://bun.sh/docs/runtime/cloudflare-r2)

#### Performance
- **Ops/sec**: 634,840
- **Avg Time**: 0ms
- **Reliability**: high

---

### S3 Presigned Download URL

**Category**: s3-presign
**Complexity**: advanced
**Tags**: `s3`, `presign`, `download`, `attachment`, `content-disposition`, `v1.3.7`

#### Command
```bash
bun -e 'import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\"profile.json\"",type:"application/json"}))'
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: GitHub, Cloudflare
- **Integration APIs**: S3Client, S3File, presign, contentDisposition

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/api/s3)

#### Performance
- **Ops/sec**: 45,000
- **Avg Time**: 0.05ms
- **Reliability**: high

---

### S3 Presigned Download URL

**Category**: s3-presign
**Complexity**: advanced
**Tags**: `s3`, `presign`, `download`, `attachment`, `content-disposition`, `v1.3.7`

#### Command
```bash
bun -e 'import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\"profile.json\"",type:"application/json"}))'
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: GitHub, Cloudflare
- **Integration APIs**: S3Client, S3File, presign, contentDisposition

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/api/s3)

#### Performance
- **Ops/sec**: 45,000
- **Avg Time**: 0.05ms
- **Reliability**: high

---

### Performance Benchmark Suite

**Category**: performance
**Complexity**: intermediate
**Tags**: `benchmark`, `performance`, `timing`, `crypto`, `optimization`, `measurement`

#### Command
```bash
bun -e 'const t0=performance.now();for(let i=0;i<100;i++){await new Bun.CryptoHasher("sha256").update("test"+i).digest("hex")}console.log(performance.now()-t0)'
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: Web.dev Performance, MDN Web Docs
- **Integration APIs**: performance.now, CryptoHasher, Bun.gc, PerformanceObserver

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/performance)
- **Web.dev Performance**: [Documentation](https://web.dev/performance)

#### Performance
- **Ops/sec**: 1,432,989
- **Avg Time**: 0.19ms
- **Reliability**: high

---

### Performance Benchmark Suite

**Category**: performance
**Complexity**: intermediate
**Tags**: `benchmark`, `performance`, `timing`, `crypto`, `optimization`, `measurement`

#### Command
```bash
bun -e 'const t0=performance.now();for(let i=0;i<100;i++){await new Bun.CryptoHasher("sha256").update("test"+i).digest("hex")}console.log(performance.now()-t0)'
```

#### Provider Integration
- **Primary Provider**: Bun Official
- **Related Providers**: Web.dev Performance, MDN Web Docs
- **Integration APIs**: performance.now, CryptoHasher, Bun.gc, PerformanceObserver

#### Documentation References
- **Bun Official**: [Documentation](https://bun.sh/docs/performance)
- **Web.dev Performance**: [Documentation](https://web.dev/performance)

#### Performance
- **Ops/sec**: 1,432,989
- **Avg Time**: 0.19ms
- **Reliability**: high

---

