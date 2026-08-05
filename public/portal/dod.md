# DOD review · Telegram Accounting · R2 · Bun.Image

**Document-of-deposit** evidence queue — balance slips, bet amounts, receipts,
IDs, location proofs. Agents submit images (often from Telegram); Bun.Image
processes them; R2 (or local disk) holds bytes; operators review on this board
and **confirm amounts** in partner package-forum **Accounting**.

| Surface | Role |
|---------|------|
| Board | [`/portal/dod/`](./dod/) |
| Markdown (this page) | [`/portal/dod.md`](./dod.md) |
| Bake / embed | `/registry/dod-queue.json` · `#dod-embed` · `bun run ops:snapshot` |
| Live API | `GET /api/dod` · `POST /api/dod/approve` · `POST /api/dod/reject` (serve-public + SQLite) |
| Evidence store | R2 when `DOD_R2_BUCKET` set · else `public/evidence/` |
| Handshake chips | `/registry/telegram-handshake.json` (partner CODEs → Accounting) |
| Soft accounting mirror | [`/registry/soft-accounting-export.json`](../registry/soft-accounting-export.json) |
| Gate | `bun run public:audit:verify` |

**Filters:** hash `#status=flagged|pending|verified|rejected|all` · clickable
stats.

**Modes:** Pages = read-only snapshot. Local `bun run serve:public` = writable
review.

## End-to-end flow

```text
Telegram photo / agent upload
  → Accounting ingest (package forum + house all-accounting) when applicable
  → magic-byte validate
  → Bun.Image (metadata · aHash · resize · WebP)
  → watermark (Bun.WebView when available)
  → OCR (slip / receipt / balance-as-needed)
  → stake reconcile (expected_amount vs accounting_amount · play_distribution)
  → store key: dod/{prefix}/{id}.webp[.enc]
  → R2 (DOD_R2_BUCKET) or public/evidence/
  → SQLite dod_submissions + dod-queue bake + dod-meta.ndjson (Bun.Image strip)
  → /portal/dod/ review
  → Confirm amount in partner Telegram Accounting + Soft/Partners desk
```

Outbox route: `dod` → house surface **`hq`** (not partner CODE forum). Partner
**Accounting** is where humans post deposit / withdraw / bet-slip screenshots
for amount confirmation — see [telegram.md](./telegram.md). Tennis runtime contracts: [tennis.factory-wager.com](https://tennis.factory-wager.com/) `partners/capacity` · `accounting/finance` · board [tennis.md](./tennis.md).

## Types → confirm path

| DOD type | Typical proof | Confirm in |
|----------|---------------|------------|
| `balance` | Book balance screenshot | Telegram Accounting · Soft balance tables |
| `slip` | Bet slip · stake amount | Telegram Accounting · Soft plays |
| `receipt` | Deposit / withdraw receipt | Telegram Accounting · Soft deals · seat FUND |
| `id` | Identity doc (encrypted at rest) | Manual review only (no amount chip) |
| `location` / `device` | Geo / device context | Ops review |

Board deep-links: OCR / fields → partner **CODE** →
`/portal/partners/#partner/CODE/telegram/accounting` and Accounting desk.

## Bun.Image (processing)

Pipeline lives in [`lib/dod/verifier.ts`](../../lib/dod/verifier.ts) +
[`lib/dod/evidence.ts`](../../lib/dod/evidence.ts):

| Step | Bun.Image use |
|------|----------------|
| Load | `new Bun.Image(rawBytes)` |
| Metadata | `img.metadata()` (EXIF / dimensions) |
| Perceptual hash | 8×8 resize → average hash (dedupe / tamper) |
| Storage encode | `resize(1024, 1024, { fit: 'inside' }).webp({ quality: 85 })` |
| Package tool | `bun tools/dod-evidence.ts` · pack/verify |

Portal/avatar heroes use the separate CLI in
[`docs/IMAGES.md`](../../docs/IMAGES.md) (`bun run images:generate`). **DOD
evidence is not that path** — do not mix avatar warehouse with `dod/` keys.

Canonical: [Bun.Image](https://bun.com/docs/runtime/image).

## R2-backed image holding

| Mode | When | Where bytes live |
|------|------|------------------|
| **R2** | `DOD_R2_BUCKET` + `CLOUDFLARE_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | Bucket key `dod/{crc-prefix}/{dodId}.webp` |
| **Local** | R2 env incomplete | `public/evidence/dod/…` (dev / CI scratch) |

- `r2EvidenceStoreFromEnv()` → `Bun.S3Client` endpoint
  `https://{accountId}.r2.cloudflarestorage.com`
- Queue field `s3_path` is the **object key** (not a full HTTPS URL)
- Board preview: `/evidence/{s3_path}` (local serve maps evidence root; Pages
  may omit private objects — snapshot embeds metadata, not always pixels)
- **ID** type: AES-GCM encrypt at rest when `DOD_ID_ENCRYPTION_KEY` present →
  key ends `.webp.enc`
- Secrets: `DOD_PROOF_SECRET` (HMAC / path salt) · vault map
  [`proton-integration.md`](../../docs/harness/tenants/proton-integration.md)

Never put agent passwords in DOD captions or Accounting chat text.

## Accounting ingest · reconcile · meta log

| Piece | Role |
|-------|------|
| `lib/dod/telegram-accounting-ingest.ts` | Package Accounting + house Deposits/Withdrawals/Reconcile photo → `DODVerifier.process`; caption CODE; telegram message dedupe |
| `lib/dod/reconcile.ts` | Compare OCR `accounting_amount` vs `expected_amount` / `play_distribution.stake_actual` |
| `lib/dod/meta-log.ts` | Append stripped Bun.Image metadata to `data/dod-meta.ndjson` for agent learning |
| Board | Mismatch shows yellow `.dod-reconcile-banner` on the DOD card |

House **all-accounting** topics require partner CODE in caption (`ASH · slip`). Package forum Accounting inherits CODE from registry when omitted.

## Accounting · Soft · Telegram

| Need | Where |
|------|--------|
| Bet / deposit **amount** confirm | Package forum **Accounting** · [telegram.md](./telegram.md) § Accounting |
| Soft plays / weeks / deals | Partners Soft tables · `soft:accounting:bake` |
| Seat max bet / FUND | Liquidity/Outs desk · [Partners](./partners/) |
| Cross-partner rollup | House surface `all-accounting` |
| Flagged queue triage | This board · `#status=flagged` |

Telegram flag notify (high tamper / missing platform account) points ops to
`/portal/dod/` and partner Accounting confirm.

## CLI

```bash
# Review bake
bun run ops:snapshot --no-seed   # rebakes dod-queue + embeds
bun run ops:seed:dod             # demo rows (partner CODEs in OCR)
bun run public:audit:verify

# Live local review
bun run serve:public
open http://localhost:3000/portal/dod/

# Evidence pack / verify (Bun.Image)
bun tools/dod-evidence.ts --help

# Partner Accounting topics
bun run telegram:package-group:accounting
bun run telegram:handshake:catalog
bun run soft:accounting:bake
```

## Related partner domain

| Concern | Board / map |
|---------|-------------|
| Confirm bet / deposit amounts | [telegram.md](./telegram.md) Accounting · Partners |
| Limit raises / coverage | [limits.md](./limits.md) · [`/portal/limits/`](./limits/) |
| Book registry (id / domain) | [bookmakers.md](./bookmakers.md) · `bookmakers.json` |
| URL / API audit (Pages vs local) | [routing.md](./routing.md) |
| Soft plays · weeks | Partners Soft · soft-accounting-export |

## Related

| Doc / board | Why |
|-------------|-----|
| [telegram.md](./telegram.md) | Chat grammar · plays · balances · bets · Accounting |
| [partners.md](./partners.md) | Desk sections · Soft · deposits |
| [factory.md](./factory.md) | Bot wire · handshake |
| [ops.md](./ops.md) | Desk pulse · snapshot |
| [limits.md](./limits.md) · [bookmakers.md](./bookmakers.md) · [routing.md](./routing.md) | Partner domain audit mesh |
| [`lib/dod/README.md`](../../lib/dod/README.md) | Pipeline code map |
| [`docs/IMAGES.md`](../../docs/IMAGES.md) | Non-DOD Bun.Image templates |
| [`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md) | Outbox `dod` → `hq` |

Tests: `tests/dod-portal.test.ts` · `tests/dod-telegram-accounting-ingest.test.ts` ·
`tests/dod-reconcile.test.ts` · `tests/dod-enrich-entry.test.ts` ·
`tests/dod-verifier.test.ts` ·
`tests/dod-evidence.test.ts` · `tests/dod-lifecycle.test.ts` ·
`tests/portal-domain-gap-map.test.ts`.
