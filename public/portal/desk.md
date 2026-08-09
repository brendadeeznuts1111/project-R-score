# Morning desk

<!-- REF:ID 0.1.desk-portal-source -->
<a id="0.1.desk-portal-source"></a>

Quiet **morning board** for operators: accounts and logins by partner / type / skin /
live, limit totals, balances, soft net (24h / 7d / all), Telegram handshake signals,
and freezes.

Ops tooling (filters, advanced inventory, deep links) stays on
[`/portal/partners/`](./partners/).

| Board | Path |
|-------|------|
| HTML | [`/portal/desk/`](./desk/) |
| Primary bake | [`/registry/partners-dashboard.json`](../registry/partners-dashboard.json) |
| Soft accounting | [`/registry/soft-accounting-export.json`](../registry/soft-accounting-export.json) |
| Seat capital | [`/registry/seat-capital-desk.json`](../registry/seat-capital-desk.json) |
| Partners-ops (logins · type · freeplay) | [`/registry/partners-ops.json`](../registry/partners-ops.json) |
| Bookmakers (skin) | [`/registry/bookmakers.json`](../registry/bookmakers.json) |
| Telegram handshake | [`/registry/telegram-handshake.json`](../registry/telegram-handshake.json) |
| Partners ops board | [partners.md](./partners.md) · [`/portal/partners/`](./partners/) |

## What you see

1. **Summary chips** — partners · accounts · live · limits Σ · balances · soft 24h/7d · freezes · Telegram signals  
2. **Accounts table** — login · book · type · skin · live · status · limit · balance · freeplay %  
3. **Money by partner** — balance · limit sum · soft windows · ledger settlements  
4. **Rollups** — by type · skin · live  
5. **Telegram** — handshake status · gaps · next steps (**not** live message bodies)  
6. **Freezes · freeroll · attention** — deferred/blocked outs · freeplay seats · dashboard attention  

Pure join: [`desk-board.js`](./desk/desk-board.js). Bake: `bun run partner:dashboard:bake`.
