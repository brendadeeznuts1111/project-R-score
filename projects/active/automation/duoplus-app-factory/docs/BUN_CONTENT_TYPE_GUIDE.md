# 📝 Bun Automatic Content-Type Handling Guide

Bun automatically sets `Content-Type` headers based on the response body type. This guide shows how it works and when you need to set it manually.

## Overview

Bun intelligently infers Content-Type from:
- **Blob objects** - Uses the blob's `.type` property
- **File objects** - Infers from file extension
- **FormData** - Sets `multipart/form-data` with boundary
- **URLSearchParams** - Sets `application/x-www-form-urlencoded`
- **Response.json()** - Sets `application/json`
- **Plain strings/ArrayBuffer** - **No default** (you must set it)

## 1. Blob → Content-Type from blob.type

```typescript
const png = new Blob([imageData], { type: "image/png" });
return new Response(png);
// ← Content-Type: image/png (automatically set)
```

**Key Point:** The blob's `.type` property is copied to the response header.

## 2. File → Content-Type from extension

```typescript
return new Response(Bun.file("styles.css"));
// ← Content-Type: text/css (inferred from .css extension)

return new Response(Bun.file("app.js"));
// ← Content-Type: application/javascript (inferred from .js)

return new Response(Bun.file("index.html"));
// ← Content-Type: text/html (inferred from .html)
```

**Supported Extensions:**
- `.css` → `text/css`
- `.js` → `application/javascript`
- `.ts` → `application/typescript`
- `.html` → `text/html`
- `.json` → `application/json`
- `.png` → `image/png`
- `.jpg` → `image/jpeg`
- `.gif` → `image/gif`
- `.svg` → `image/svg+xml`
- And many more...

## 3. String → No default (set manually!)

```typescript
return new Response("plain text");
// ← NO Content-Type header!

// ✅ Correct: Set it explicitly
return new Response("plain text", {
  headers: { "content-type": "text/plain" }
});
```

**Important:** Plain strings don't get a default Content-Type. Always set it if needed.

## 4. FormData → multipart/form-data

```typescript
if (req.method === "POST") {
  const form = await req.formData();
  return new Response(form);
  // ← Content-Type: multipart/form-data; boundary=----...
}
```

**Key Point:** Boundary is automatically generated.

## 5. URLSearchParams → application/x-www-form-urlencoded

```typescript
const params = new URLSearchParams({ q: "bun", v: "1.3" });
return new Response(params);
// ← Content-Type: application/x-www-form-urlencoded
// Body: q=bun&v=1.3
```

## 6. Response.json() → application/json

```typescript
return Response.json({ hello: "world" });
// ← Content-Type: application/json;charset=utf-8
// Body: {"hello":"world"}
```

**Best Practice:** Always use `Response.json()` for JSON responses.

## 7. ArrayBuffer → No default (set manually!)

```typescript
const buffer = new ArrayBuffer(8);
return new Response(buffer);
// ← NO Content-Type header!

// ✅ Correct: Set it explicitly
return new Response(buffer, {
  headers: { "content-type": "application/octet-stream" }
});
```

## Complete Example

```typescript
import { serve } from "bun";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // JSON endpoint
    if (url.pathname === "/api") {
      return Response.json({ status: "ok" });
      // ← Content-Type: application/json
    }

    // CSS file
    if (url.pathname === "/styles.css") {
      return new Response(Bun.file("styles.css"));
      // ← Content-Type: text/css
    }

    // Form submission
    if (url.pathname === "/upload" && req.method === "POST") {
      const form = await req.formData();
      return new Response(form);
      // ← Content-Type: multipart/form-data; boundary=...
    }

    // Plain text (must set manually)
    if (url.pathname === "/text") {
      return new Response("Hello, World!", {
        headers: { "content-type": "text/plain" }
      });
    }

    // Binary data (must set manually)
    if (url.pathname === "/binary") {
      const buffer = new ArrayBuffer(16);
      return new Response(buffer, {
        headers: { "content-type": "application/octet-stream" }
      });
    }

    return new Response("Not found", { status: 404 });
  },
});
```

## Testing

Run the demo:
```bash
bun bun-content-type-demo.ts
```

Test endpoints:
```bash
# JSON (automatic)
curl -i http://localhost:3002/api

# CSS file (automatic)
curl -i http://localhost:3002/style.css

# Plain text (no Content-Type)
curl -i http://localhost:3002/text

# URLSearchParams (automatic)
curl -i http://localhost:3002/search
```

## Key Takeaways

✅ **Automatic:**
- Blob objects (use `.type` property)
- File objects (infer from extension)
- FormData (multipart/form-data)
- URLSearchParams (application/x-www-form-urlencoded)
- Response.json() (application/json)

❌ **Manual (no default):**
- Plain strings
- ArrayBuffer
- Custom binary data

## Best Practices

1. **Use Response.json() for JSON:**
   ```typescript
   return Response.json(data); // ✅ Automatic
   return new Response(JSON.stringify(data)); // ❌ No Content-Type
   ```

2. **Use Bun.file() for static files:**
   ```typescript
   return new Response(Bun.file("style.css")); // ✅ Automatic
   ```

3. **Always set Content-Type for strings:**
   ```typescript
   return new Response("text", {
     headers: { "content-type": "text/plain" }
   });
   ```

4. **Use FormData for multipart:**
   ```typescript
   const form = await req.formData();
   return new Response(form); // ✅ Automatic boundary
   ```

## See Also

- [bun-content-type-demo.ts](./bun-content-type-demo.ts) - Working examples
- [Bun Documentation](https://bun.sh/docs)
- [HTTP Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)

