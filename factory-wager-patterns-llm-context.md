# Factory-Wager One-Liners v3.8 - LLM Optimized Context

## Pattern Summary
- Total Patterns: 3
- Categories: cookies, r2, s3-presign
- Complexity Levels: simple, intermediate, advanced
- Code Types: curl, r2, s3

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

## Pattern 3: S3 Presign Download URL

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

