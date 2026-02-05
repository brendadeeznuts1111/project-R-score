---
title: Bun tls configuration
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Tls Configuration
acceptEncoding: ""
acceptLanguage: ""
allCookies: {}
analyticsId: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
config_type: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun TLS Configuration

> Configure TLS/SSL for secure HTTP and WebSocket connections

**Reference**: [Bun Server TLS Options](https://bun.com/docs/runtime/http/server)

---

## Overview

Bun supports full TLS/SSL configuration for secure server connections, including Server Name Indication (SNI), certificate management, and custom TLS options.

---

## Basic TLS Configuration

### Simple TLS Setup

```typescript
Bun.serve({
  port: 443,
  
  tls: {
    cert: Bun.file("./cert.pem"),
    key: Bun.file("./key.pem"),
  },
  
  fetch(req) {
    return new Response("Hello from HTTPS!");
  },
});
```

---

## Server Name Indication (SNI)

SNI allows a server to present multiple certificates on the same IP address and port, based on the hostname the client is connecting to.

### Basic SNI Configuration

```typescript
Bun.serve({
  port: 443,
  
  tls: {
    serverName: "my-server.com", // SNI
  },
  
  fetch(req) {
    return new Response("Hello!");
  },
});
```

---

## Complete TLS Options

### Full TLS Configuration

```typescript
Bun.serve({
  port: 443,
  
  tls: {
    // Server certificate
    cert: Bun.file("./cert.pem"),
    // Or array of certificates for multiple domains
    cert: [
      Bun.file("./cert1.pem"),
      Bun.file("./cert2.pem"),
    ],
    
    // Private key
    key: Bun.file("./key.pem"),
    // Or array of keys matching certificates
    key: [
      Bun.file("./key1.pem"),
      Bun.file("./key2.pem"),
    ],
    
    // Certificate authority chain
    ca: Bun.file("./ca.pem"),
    // Or array of CA certificates
    ca: [
      Bun.file("./ca1.pem"),
      Bun.file("./ca2.pem"),
    ],
    
    // Server name for SNI
    serverName: "my-server.com",
    
    // Private key passphrase (if key is encrypted)
    passphrase: "my-passphrase",
    
    // Path to DH parameters file
    dhParamsFile: "./dhparams.pem",
    
    // Reduce TLS memory usage
    lowMemoryMode: true,
    
    // OpenSSL options flags
    secureOptions: 0,
  },
  
  fetch(req) {
    return new Response("Secure connection!");
  },
});
```

---

## Certificate Formats

### String Certificates

```typescript
Bun.serve({
  tls: {
    cert: `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
...
-----END CERTIFICATE-----`,
    key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----`,
  },
});
```

### Buffer Certificates

```typescript
const certBuffer = await Bun.file("./cert.pem").arrayBuffer();
const keyBuffer = await Bun.file("./key.pem").arrayBuffer();

Bun.serve({
  tls: {
    cert: new Uint8Array(certBuffer),
    key: new Uint8Array(keyBuffer),
  },
});
```

### BunFile Certificates

```typescript
Bun.serve({
  tls: {
    cert: Bun.file("./cert.pem"),
    key: Bun.file("./key.pem"),
  },
});
```

---

## Multiple Certificates (SNI)

### Hostname-Based Certificate Selection

```typescript
Bun.serve({
  port: 443,
  
  tls: {
    // Multiple certificates for different domains
    cert: [
      Bun.file("./api.example.com.pem"),
      Bun.file("./www.example.com.pem"),
      Bun.file("./admin.example.com.pem"),
    ],
    
    key: [
      Bun.file("./api.example.com.key"),
      Bun.file("./www.example.com.key"),
      Bun.file("./admin.example.com.key"),
    ],
    
    // Server name for SNI matching
    serverName: "api.example.com",
  },
  
  fetch(req) {
    const hostname = new URL(req.url).hostname;
    return new Response(`Serving ${hostname} with SNI`);
  },
});
```

---

## Environment-Based Configuration

### Development vs Production

```typescript
const isProduction = Bun.env.NODE_ENV === "production";

Bun.serve({
  port: isProduction ? 443 : 3000,
  
  tls: isProduction ? {
    cert: Bun.file("./prod-cert.pem"),
    key: Bun.file("./prod-key.pem"),
    serverName: "api.example.com",
  } : undefined,
  
  fetch(req) {
    return new Response("Hello!");
  },
});
```

---

## Self-Signed Certificates (Development)

### Local Development Setup

```typescript
Bun.serve({
  port: 8443,
  
  tls: {
    cert: Bun.file("./localhost-cert.pem"),
    key: Bun.file("./localhost-key.pem"),
    serverName: "localhost",
  },
  
  fetch(req) {
    return new Response("Development server with self-signed cert");
  },
});
```

**Note**: For development, you may need to disable certificate verification on the client side:

```typescript
// Client-side (Bun fetch)
const response = await fetch("https://localhost:8443", {
  // @ts-ignore - Bun-specific option
  tls: {
    rejectUnauthorized: false, // Only for development!
  },
});
```

---

## TLS Options Reference

### `cert`
- **Type**: `string | Buffer | BunFile | Array<string | Buffer | BunFile>`
- **Description**: Server certificate(s)
- **Required**: Yes (for TLS)

### `key`
- **Type**: `string | Buffer | BunFile | Array<string | Buffer | BunFile>`
- **Description**: Private key(s) matching certificate(s)
- **Required**: Yes (for TLS)

### `ca`
- **Type**: `string | Buffer | BunFile | Array<string | Buffer | BunFile>`
- **Description**: Certificate authority chain
- **Required**: No

### `serverName`
- **Type**: `string`
- **Description**: Server name for SNI (Server Name Indication)
- **Required**: No
- **Use Case**: Multiple domains on same IP/port

### `passphrase`
- **Type**: `string`
- **Description**: Private key passphrase (if key is encrypted)
- **Required**: No

### `dhParamsFile`
- **Type**: `string`
- **Description**: Path to DH parameters file
- **Required**: No

### `lowMemoryMode`
- **Type**: `boolean`
- **Description**: Reduce TLS memory usage
- **Default**: `false`
- **Use Case**: Memory-constrained environments

### `secureOptions`
- **Type**: `number`
- **Description**: OpenSSL options flags
- **Required**: No

---

## Practical Examples

### API Server with TLS

```typescript
const server = Bun.serve({
  port: 443,
  
  tls: {
    cert: Bun.file("./api-cert.pem"),
    key: Bun.file("./api-key.pem"),
    ca: Bun.file("./ca-chain.pem"),
    serverName: "api.example.com",
  },
  
  fetch(req) {
    return Response.json({ 
      message: "Secure API",
      protocol: req.url.startsWith("https") ? "HTTPS" : "HTTP"
    });
  },
});

console.log(`✅ HTTPS server running at ${server.url}`);
```

---

### WebSocket Server with TLS

```typescript
const server = Bun.serve({
  port: 443,
  
  tls: {
    cert: Bun.file("./wss-cert.pem"),
    key: Bun.file("./wss-key.pem"),
    serverName: "wss.example.com",
  },
  
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
  },
  
  fetch(req) {
    const upgraded = server.upgrade(req);
    if (!upgraded) {
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return undefined;
  },
});

console.log(`✅ WSS server running at wss://wss.example.com`);
```

---

### Multi-Domain Server (SNI)

```typescript
const server = Bun.serve({
  port: 443,
  
  tls: {
    // Serve different certificates based on SNI
    cert: [
      Bun.file("./api.example.com.pem"),
      Bun.file("./www.example.com.pem"),
    ],
    key: [
      Bun.file("./api.example.com.key"),
      Bun.file("./www.example.com.key"),
    ],
    serverName: "api.example.com", // Default SNI
  },
  
  fetch(req) {
    const hostname = new URL(req.url).hostname;
    
    if (hostname === "api.example.com") {
      return Response.json({ service: "API", domain: hostname });
    } else if (hostname === "www.example.com") {
      return Response.json({ service: "Web", domain: hostname });
    }
    
    return new Response("Unknown domain", { status: 404 });
  },
});
```

---

## Certificate Generation

### Using OpenSSL

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate signing request
openssl req -new -key key.pem -out csr.pem

# Generate self-signed certificate (development)
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem

# Generate certificate with CA (production)
openssl x509 -req -days 365 -in csr.pem -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem
```

### Using mkcert (Development)

```bash
# Install mkcert
brew install mkcert  # macOS
# or
apt install mkcert   # Linux

# Create local CA
mkcert -install

# Generate certificate for localhost
mkcert localhost 127.0.0.1 ::1

# Use in Bun
Bun.serve({
  tls: {
    cert: Bun.file("./localhost+2.pem"),
    key: Bun.file("./localhost+2-key.pem"),
    serverName: "localhost",
  },
});
```

---

## Best Practices

1. **Use Environment Variables**: Store certificate paths in environment variables
2. **Separate Dev/Prod**: Use different certificates for development and production
3. **SNI for Multiple Domains**: Use SNI when serving multiple domains
4. **CA Chain**: Always include full CA chain for production
5. **Key Security**: Never commit private keys to version control
6. **Certificate Rotation**: Plan for certificate renewal before expiration
7. **Low Memory Mode**: Enable `lowMemoryMode` in memory-constrained environments

---

## Security Considerations

1. **Private Key Protection**: Store keys securely, use encrypted keys with passphrase
2. **Certificate Validation**: Always validate certificates in production
3. **TLS Version**: Bun uses modern TLS by default
4. **Cipher Suites**: Bun selects secure cipher suites automatically
5. **HSTS**: Consider adding HSTS headers for production

---

## Related Documentation

- [Bun Server API](https://bun.com/docs/runtime/http/server)
- [Server Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)
- [WebSocket Configuration](./BUN_MCP_DOCUMENTATION_REVIEW.md#websocket-server-api)

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Documented  
**Reference**: [Bun Server TLS Options](https://bun.com/docs/runtime/http/server)

