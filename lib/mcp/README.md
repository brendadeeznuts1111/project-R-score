# mcp

MCP helpers that remain in use.

Inventory: [`../README.md`](../README.md).

| Entry                                                            |
| ---------------------------------------------------------------- |
| [`cloudflare-domain-manager.ts`](./cloudflare-domain-manager.ts) |
| [`domain-integration.ts`](./domain-integration.ts)               |
| [`r2-integration-fixed.ts`](./r2-integration-fixed.ts)           |
| [`stdio-jsonrpc.ts`](./stdio-jsonrpc.ts)                         |
| [`sports-leader.ts`](./sports-leader.ts)                         |

## sports-leader-mcp

Stdio client for
[WalrusQuant/sports-leader-mcp](https://github.com/WalrusQuant/sports-leader-mcp).
It reads ESPN scoreboards, odds, slates, and athlete reports. No API key.
Node.js 20 or newer must be on `PATH` (`node -v`). Do not set `PORT`: that
switches the server to HTTP, and this client only speaks stdio.

The checkout is gitignored under `vendor/sports-leader-mcp`. Install it on each
machine:

```bash
git clone https://github.com/WalrusQuant/sports-leader-mcp.git vendor/sports-leader-mcp
cd vendor/sports-leader-mcp
npm install && npm run build
```

Update with `git pull && npm install && npm run build` in that directory.
`dist/index.js` is the entry. `.mcp.json` registers it as `sports-leader`
(`command`: `node`, `args`:
`${workspaceFolder}/vendor/sports-leader-mcp/dist/index.js`).

`sports-leader.ts` exposes `getLiveScores`, `getGameOdds`, `getSlate`, and
`getPlayerReport`. Responses stay in the server's compact JSON. Do not pass
`raw: true`.

Sportsbook `providerId` values:

| ID   | Book       |
| ---- | ---------- |
| 38   | Caesars    |
| 37   | FanDuel    |
| 41   | DraftKings |
| 58   | BetMGM     |
| 68   | ESPN BET   |
| 2000 | Bet365     |

Helpers accept only the 30 verified leagues from `list_sports_and_leagues` (NFL,
NBA, MLB, NHL, Premier League, and the rest of that catalog). Other ESPN slugs
are unverified.
