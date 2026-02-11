# Bun Bugfixes and Improvements Reference

Reference for important fixes in Bun (v1.3.9+) that affect APIs, Web APIs, and TypeScript types.

---

## Bun APIs

### `Bun.stringWidth` – Thai and Lao spacing vowels

**Fixed:** Thai SARA AA (U+0E32), SARA AM (U+0E33), and Lao equivalents (U+0EB2, U+0EB3) were incorrectly reported as zero-width. They are **spacing vowels**, not combining marks, so they should count as width 1.

| Character | Code point | Description        | Width (correct) |
|-----------|------------|--------------------|-----------------|
| า         | U+0E32     | Thai SARA AA       | 1               |
| ำ         | U+0E33     | Thai SARA AM       | 1               |
| າ         | U+0EB2     | Lao SARA AA        | 1               |
| ໍ         | U+0EB3     | Lao SARA AM        | 1               |

**Example:** The Thai word **คำ** (word) now correctly returns width **2** instead of 1.

See `string-width-thai-lao.ts` for a runnable example.

---

## Web APIs

### WebSocket – `binaryType = "blob"` with no listener

**Fixed:** A crash could occur in the WebSocket client when `binaryType` was set to `"blob"` and `"data"` events were received with **no event listener** attached. The client now handles this case without crashing.

**Takeaway:** Still best practice to attach `onmessage` (or equivalent) before or when expecting data, but the runtime no longer crashes if you don’t.

---

### HTTP – Proxy-style absolute URLs and keep-alive

**Fixed:** Sequential HTTP requests using **proxy-style absolute URLs** (e.g. `GET http://example.com/path HTTP/1.1`) could hang on the **2nd and later** requests when using **keep-alive** connections. This affected HTTP proxy servers built with Bun, which could effectively handle only one request per connection.

**Takeaway:** Proxy servers built with Bun can now correctly handle multiple requests per connection when clients send absolute request-URIs and keep-alive.

---

### HTTP server – Chunked encoding security

**Fixed:** A **security issue** in the HTTP server **chunked encoding** parser that could lead to **request smuggling**. Upgrading is important for any Bun HTTP server accepting chunked request bodies.

**Takeaway:** Keep Bun updated when exposing HTTP servers to untrusted clients.

---

## TypeScript types

### `Bun.Build.CompileTarget` – SIMD / Linux x64 targets

**Fixed:** The `CompileTarget` type was missing SIMD variants such as `bun-linux-x64-modern`, causing type errors when cross-compiling with specific architecture targets.

**Fixed:** Missing **`bun-linux-x64-baseline`** and **`bun-linux-x64-modern`** in the TypeScript definitions, which caused type errors when using `Bun.build()` with these valid targets.

**Example (now valid):**

```ts
await Bun.build({
  entrypoints: ["./app.ts"],
  target: "bun-linux-x64-modern", // or "bun-linux-x64-baseline"
  outdir: "./out",
});
```

---

### `Socket.reload()` – handler shape

**Fixed:** `Socket.reload()` TypeScript types now expect **`{ socket: handler }`** to match runtime behavior. The runtime requires the handler to be wrapped in a `socket` property.

**Example (correct shape):**

```ts
reload({ socket: myWebSocketHandler });
```

---

## Summary

| Area           | Fix summary |
|----------------|-------------|
| Bun APIs       | `Bun.stringWidth` Thai/Lao spacing vowels → width 1 |
| Web APIs       | WebSocket no crash when `binaryType = "blob"` and no listener |
| Web APIs       | HTTP proxy keep-alive with absolute-URL requests |
| Web APIs       | HTTP server chunked encoding request smuggling |
| TypeScript     | `Bun.Build.CompileTarget` SIMD/Linux x64 variants |
| TypeScript     | `Socket.reload()` expects `{ socket: handler }` |
