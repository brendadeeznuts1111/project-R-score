# Telegram chats · plays · balances · bets · deals · accounting

Operator map for **FactoryWager Telegram** — partner package forums, house
surfaces, seat capital desks, Soft plays/balances, and Accounting proof.

| Surface | Path |
|---------|------|
| Partners board (desk UI) | [`/portal/partners/`](./partners/) |
| Factory board (bot wire) | [`/portal/factory/`](./factory/) |
| Ops pulse | [`/portal/ops/`](./ops/) |
| Handshake bake | [`/registry/telegram-handshake.json`](../registry/telegram-handshake.json) |
| Handshake catalog | [`/registry/telegram-handshake-catalog.json`](../registry/telegram-handshake-catalog.json) |
| Seat capital desk | [`/registry/seat-capital-desk.json`](../registry/seat-capital-desk.json) |
| Partners-ops v2 | [`/registry/partners-ops.json`](../registry/partners-ops.json) |
| Soft accounting export | [`/registry/soft-accounting-export.json`](../registry/soft-accounting-export.json) |
| **DOD review** (image proofs) | [`/portal/dod/`](./dod/) · [dod.md](./dod.md) · `/registry/dod-queue.json` |

Two **different** chat grammars — do not mix house topics onto partner forums.

## 1. Partner package forums (one chat per CODE)

Title: `TOC Ops · {CODE} · {DisplayName}` (e.g. `TOC Ops · ASH · Ash Ops`).

**Identical topic titles** on every partner forum. Thread ids live in
`reports/telegram/forums/{CODE}.json` (`topicsThreadMap`).

| Topic title | Map key | What lands here |
|-------------|---------|-----------------|
| **General** | `general` | Implicit thread `1` · membership / intro |
| **Ops** | `ops` | House ops posts · day-to-day coordination |
| **Alerts** | `alerts` | Outbox alerts (`route_alerts`) |
| **Liquidity/Outs** | `liquidity/outs` | **Pinned seat capital desk** — books, deposit rails, **max bet**, freeplay %, FUND status, incomplete outs |
| **Accounting** | `accounting` | Deposit / withdraw / **bet-slip proof** (screenshots) · Soft deals mirror |

SSOT: `PARTNER_PACKAGE_FORUM_TOPIC_PLAN` in
[`lib/telegram/package-group-forum.ts`](../../lib/telegram/package-group-forum.ts) ·
machine: `bun run telegram:handshake:catalog --json` → `packageForumTopics`.

### Liquidity/Outs · seat capital desk

Pinned message per call-sign (e.g. `ASH-001`). Columns:

| Column | Meaning |
|--------|---------|
| # | Out number |
| BOOK | Sportsbook / venue |
| USERNAME | Login (no passwords on the desk) |
| DEPOSIT METHOD | venmo · wire · crypto · … (`deposit.method.*`) |
| SEND TO | Rail target |
| MAX BET | Stake cap (e.g. `$500`) |
| FP% DEP | Freeplay match % on deposits |
| STATUS | ready · deferred · paused · blocked |

Confirm balances and funding via FUND line + checklist on the rich desk.
CLI:

```bash
bun run seat:desk:refresh CALL-001
bun run seat:desk:partner-message CALL-001 --json
bun run seat:desk:accounting-prompt CALL-001 --thread-id N --post
```

Board: Partners → **Betting deposits** · **Partner messages** ·
[Outs inventory](./partners/#section:outs).

### Accounting · deals · bet slips · DOD

| Flow | Where |
|------|--------|
| Partner posts deposit / withdraw / **bet slip** screenshots | Package forum · **Accounting** topic |
| Ops reviews agent image proofs (balance / slip / receipt) | [`/portal/dod/`](./dod/) — confirm amount deep-links back to this Accounting topic |
| Bootstrap Accounting thread | `bun run telegram:package-group:accounting` · `telegram:package-group:enhance CODE --accounting-prompt` |
| Soft Balance / deals (mutations stay in `ct`) | Soft bake mirror on Partners · Accounting deals |
| Soft plays / weeks / book types | Partners Soft tables · [`soft-accounting-export.json`](../registry/soft-accounting-export.json) |
| Cross-partner rollup (ops only) | House surface **`all-accounting`** (separate group) |

Concepts: `telegram.topic.accounting` · `ops.view.per_play` · `ops.view.per_week` ·
`ops.view.per_account` · `accounting.free_roll` · glossary on Partners board.

**Amount confirmation loop:** DOD card (OCR / partner CODE) → Partners
`#partner/CODE/telegram/accounting` → human matches stake / deposit dollars →
approve on DOD when live.

### Plays · routing

| Concern | Routing |
|---------|---------|
| New plays | Outbox topic **`plays`** / package **Ops** (and house `ash-staging` · plays when Soft staging) |
| Lane | Handshake `route_plays` → forum thread |
| Soft plays table | Partners board Soft plays · `soft:accounting:bake` / `:from-ct` |

House staging surface `ash-staging` topics: **plays · balances · onboard · alerts**
(not the same titles as partner package forums).

## 2. House surfaces (ops desks — not partner CODE chats)

| Slug | Group title | Topics |
|------|-------------|--------|
| `hq` | TOC Ops · HQ | alerts · day-ops · aar · identity |
| `ash-staging` | TOC Ops · ASH · staging | **plays** · **balances** · onboard · alerts |
| `all-accounting` | TOC Ops · Accounting | Deposits · Withdrawals · Reconcile |
| `sandbox` | TOC Ops · sandbox | scratch · experiments |

Bind chat ids: `TELEGRAM_SURFACES` JSON (`pkg-{code}` for package forums;
`hq` / `ash-staging` / `all-accounting` for house). Primary fallback:
`TELEGRAM_OPS_CHAT_ID`.

## 3. Balances · bets · amounts (where to look)

| Need | Telegram | Portal bake / board |
|------|----------|---------------------|
| Out **max bet** / freeplay % | Liquidity/Outs pinned desk | `partners-ops` outs · seat-capital-desk · Partners deposits |
| **FUND** / incomplete outs | Desk FUND line + status | seat-capital-desk · Partners partner messages |
| Soft **balance** confirmation | Staging balances topic (house) · package Accounting proof | Soft export · Partners Soft tables |
| **Deal** / commission week | Accounting topic + Soft | Soft weeks · partners Soft `ops.view.per_week` |
| **Play** stake / PnL | plays routing · Soft | Soft plays · `ops.view.per_play` |
| Package readiness | Membership + invite | telegram-handshake · Ops desk pulse |

## 4. DOD · Bun.Image · R2 (image holding)

Agent / bot photo submissions are **not** left as raw Telegram CDN URLs. The
DOD pipeline holds durable copies:

| Layer | Role |
|-------|------|
| **Bun.Image** | Decode · metadata · 8×8 aHash · 1024 inside WebP 85% · evidence pack |
| **R2** | Production store when `DOD_R2_BUCKET` (+ account + R2 keys) set — key `dod/{prefix}/{id}.webp` |
| **Local fallback** | `public/evidence/` when R2 env missing (dev / CI) |
| **Queue** | SQLite `dod_submissions` · bake `dod-queue.json` · board `/portal/dod/` |
| **Outbox** | Route `dod` → house **`hq`** (see `telegram-factory.md`) |

ID documents encrypt at rest (`.webp.enc`) with `DOD_ID_ENCRYPTION_KEY`. HMAC
proof uses `DOD_PROOF_SECRET`. Full map: [dod.md](./dod.md) ·
[`lib/dod/README.md`](../../lib/dod/README.md) · non-DOD image CLI
[`docs/IMAGES.md`](../../docs/IMAGES.md).

## 5. Portal boards

| Board | Telegram-related sections |
|-------|---------------------------|
| [Partners](./partners/) | Package groups · Accounting deals · Betting deposits · Outs inventory · Soft plays/weeks/book types · Partner messages |
| [Factory](./factory/) | Bot wire · handshake readiness · webhook |
| [Ops](./ops/) | Partner desk pulse · handshake gaps · seat incomplete · outbox pending |
| [**DOD**](./dod/) | Evidence queue · Bun.Image/R2 · confirm amounts → Accounting |
| [Limits](./limits/) | Limit raises · CLV (linked from partner CODE) |
| [Bookmakers](./bookmakers/) | Book registry (outs / raise book ids) |
| [Account](./account/) | Per-account dossier · Soft accounting chrome |
| [Routing audit](./routing.md) | Pages vs local API · discover / check:routes |

Markdown: [partners.md](./partners.md) · [factory.md](./factory.md) ·
[ops.md](./ops.md) · [dod.md](./dod.md) · [limits.md](./limits.md) ·
[bookmakers.md](./bookmakers.md) · [routing.md](./routing.md) · [index.md](./index.md).

## 6. CLI day loop

```bash
# Bot + wire
bun run telegram:verify
bun run telegram:discover
bun run telegram:ops -- directory --rich
bun run telegram:ops:consume

# Package forums · topics · accounting
bun run telegram:handshake:catalog
bun run telegram:handshake:readiness --deep
bun run telegram:handshake:invite-gap
bun run telegram:package-group:enhance CODE --ensure-topics
bun run telegram:package-group:accounting

# Seat desk · balances rails · partner prompts
bun run seat:desk:refresh
bun run seat:desk:partner-message CALL --json
bun run partners:build && bun run partners:validate

# Soft plays / weeks / book types (read-only Factory mirror)
bun run soft:accounting:bake
# or from ct: bun run soft:accounting:from-ct

# DOD evidence queue (Bun.Image · R2 when configured)
bun run ops:snapshot --no-seed
# local approve/reject: bun run serve:public → /portal/dod/

# Ops rollup
bun run ops:snapshot --no-seed
```

## 7. Docs (harness)

| Topic | Doc |
|-------|-----|
| Factory bot env / webhook / rate limits | [`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md) |
| Package-group handshake · forum plans | [`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) |
| Seat capital desk · max bet · FUND | [`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md) |
| Partner domain / Soft views | [`partner-domain-map.md`](../../docs/harness/tenants/partner-domain-map.md) |
| Soft handshake design | [`docs/design/soft-handshake.md`](../../docs/design/soft-handshake.md) |
| DOD · R2 · Bun.Image | [dod.md](./dod.md) · [`lib/dod/README.md`](../../lib/dod/README.md) · [`docs/IMAGES.md`](../../docs/IMAGES.md) |

## 8. Failure paths

| Symptom | Fix |
|---------|-----|
| Invite gap `2·house!` | `telegram:handshake:invite-gap` · send invite · partner joins |
| Missing Accounting / Liquidity topics | `telegram:package-group:enhance CODE --ensure-topics` (bot needs Manage Topics) |
| Plays not routing | Handshake lane `route_plays` · thread map for Ops/plays · `telegram:ops:consume` |
| Desk stale / wrong max bet | `seat:desk:refresh CALL` · patch intake JSON · never post passwords |
| Soft tables empty on Partners | `soft:accounting:bake` or `:from-ct` · check Soft stays in `ct` for mutations |
| DOD confirm chip missing partner | OCR lacks `CODE` / `CODE-NNN` · set caption platformHint · reseed demo `ops:seed:dod` |
| DOD images missing on board | R2 env incomplete → local `public/evidence` · check `s3_path` · `DOD_R2_BUCKET` |
| Webhook 503 | Set `TELEGRAM_WEBHOOK_SECRET` on Pages + local · redeploy |

Bot: `@factorywager_bot` · Soft TOC bot separate (`@TOC_Op_bot` for some seat prompts).
Never mix production HQ alerts with staging Soft plays/balances.
