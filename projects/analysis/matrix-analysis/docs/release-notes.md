# Bun Runtime Release Notes

## node:https & TLS

### Fixes
- **TLS Options**: Fixed TLS options (`ca`, `cert`, `key`, `passphrase`, `ciphers`, `servername`, `secureOptions`, `rejectUnauthorized`) from `agent.options` and `agent.connectOpts` not being respected in the https module, improving compatibility with libraries like https-proxy-agent
- **Race Condition**: Fixed race condition where `request.socket._secureEstablished` could return false in HTTPS request handlers even after the TLS handshake had completed
- **TLS v1.2 Renegotiation**: Fixed `rejectUnauthorized` option being incorrectly ignored in TLS socket `setVerifyMode`, which could cause certificate verification to behave unexpectedly during TLS renegotiation

---

## node:http

### Fixes
- **GET Request Bodies**: Request bodies in GET requests are now supported
- **Multipart Uploads**: Fixed multipart uploads with `form-data` + `node-fetch@2` + `fs.createReadStream()` being truncated

---

## WebSocket (ws)

### Fixes
- **handleProtocols Option**: Fixed `handleProtocols` option in ws WebSocketServer not correctly setting the selected protocol in WebSocket upgrade responses
- **ws.once()**: Fixed `ws.once()` only working on the first call for each event type in the ws package

---

## Node-API (NAPI)

### Fixes
- **Memory Corruption**: Fixed crash in Node-API that caused corrupted data when using native modules like impit:
  - Fixed issue where property name strings were freed by the caller but Bun retained dangling pointers in the atom string table
  - Fixed issue where extracting `.buffer` from an external buffer would prematurely free the backing data when the original Buffer was garbage collected

---

## Streams

### Fixes
- **ReadableStreamDefaultController.desiredSize**: Fixed throwing `TypeError: null is not an object` instead of returning `null` when accessing it after the stream has been detached during cleanup (e.g., when piping a ReadableStream body to fetch and the downstream closes unexpectedly)

---

## bun:sql (MySQL)

### Fixes
- **Transaction Hanging**: Fixed MySQL transactions hanging when executing sequential transactions in a loop where an INSERT is awaited inside the transaction callback and a SELECT query is returned as an array without being awaited
- **Binary Collations**: Fixed MySQL VARCHAR/CHAR/TEXT columns with binary collations (like `utf8mb4_bin`) incorrectly returning Buffer instead of string

---

## Bun.Terminal

### Fixes
- **AsyncLocalStorage**: Fixed Bun.Terminal callbacks (`data`, `exit`, `drain`) not being invoked when the terminal was created inside `AsyncLocalStorage.run()`
