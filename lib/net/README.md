# lib/net

Network shared types and helpers.

| File | Purpose |
|------|---------|
| [`proxy.ts`](proxy.ts) | `FetchProxyOptions` — Bun fetch `proxy` option (string / URL / object-with-headers), `isProxyObjectForm` guard |

Related: Kalshi WS proxy handling (`Kalshi-bot/src/bot/kalshi-ws.ts`)
uses the same object shape for the client `WebSocket` `proxy` option.
