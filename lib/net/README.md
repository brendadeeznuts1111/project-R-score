# lib/net

Network shared types and helpers.

| File | Purpose |
|------|---------|
| [`proxy.ts`](proxy.ts) | `FetchProxyOptions` — Bun fetch `proxy` option, CONNECT reuse dimensions, and `isProxyObjectForm` guard |

HTTPS proxy pooling is runtime-owned: Bun ≥1.3.12 reuses a CONNECT tunnel and its inner TLS session only for the same proxy host/port, proxy credentials, target host/port, and TLS configuration. Proof: `bun test tests/fetch-proxy-keepalive.test.ts`.

Related: Kalshi WS proxy handling (`Kalshi-bot/src/bot/kalshi-ws.ts`)
uses the same object shape for the client `WebSocket` `proxy` option.
