# DOD — Daily Operations Document (Visual Evidence)

Agent-submitted image proof pipeline. Agents upload photos (balance, slip, receipt, location, device, other) which are verified, watermarked, stored, and reviewed.

## Files

| File | Purpose |
|------|---------|
| `evidence.ts` | Evidence package: pack/unpack/verify, average hash, HMAC signing, registry |
| `verifier.ts` | Processing pipeline: `DODVerifier` class with image validation, rate limiting, watermark, OCR, tamper detection, SQLite persistence |

## DOD Types

`balance` · `slip` · `receipt` · `location` · `device` · `other`

## Flow

1. Agent submits image → `DODVerifier.process()`
2. Image validated (magic bytes), rate limit checked
3. Bun.Image loaded → metadata extracted → perceptual hash (aHash)
4. Ops watermark applied via Bun.WebView
5. Resized/compressed (1024px WebP 85%) → stored at randomized path
6. Metadata hash + HMAC-SHA256 signature
7. Tamper detection scored (0–100)
8. OCR extracted for slip/receipt types
9. Balance DODs: `platformHint` / OCR aliases cross-checked against
   `partner_platform_accounts` + `sb_accounts`. Missing account → flagged (+30
   tamper). Set `DOD_PLATFORM_DETECT=0` to disable.
10. Persisted to SQLite (`dod_submissions`)
11. Ops notified via Telegram if flagged (score > 70 or missing platform account)

## Usage

```ts
import { DODVerifier } from "../lib/dod/verifier.ts";

const verifier = new DODVerifier("data/ops.db");
const result = await verifier.process({
  id: "evt_abc123",
  agentId: "agent_xyz",
  type: "balance",
  rawImage: await Bun.file("photo.webp").bytes(),
  submittedAt: new Date().toISOString(),
});
```

## Storage (R2 vs local)

`DODVerifier` picks store in order: explicit `opts.store` →
`r2EvidenceStoreFromEnv()` → `localEvidenceStore('public/evidence')`.

| Env | Purpose |
|-----|---------|
| `DOD_R2_BUCKET` | R2 bucket name (required for R2 mode) |
| `CLOUDFLARE_ACCOUNT_ID` | R2 S3 endpoint account |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | S3 API credentials |
| `DOD_PROOF_SECRET` | HMAC + path salt (never default in prod) |
| `DOD_ID_ENCRYPTION_KEY` | AES-GCM for `type: id` at rest |

Object key: `dod/{crc32-prefix}/{dodId}.webp` (or `.webp.enc` when encrypted).
Portal board previews via `/evidence/{s3_path}` on serve-public.

## Telegram · Accounting

- Outbox topic `dod` routes to house surface **`hq`**
  ([`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md)).
- Partner package forum **Accounting** holds deposit / bet-slip screenshots for
  **amount confirmation** — board deep-links CODE → Partners Telegram Accounting.
- Operator map: [`public/portal/dod.md`](../../public/portal/dod.md) ·
  [`public/portal/telegram.md`](../../public/portal/telegram.md).

## Related

- [`tests/dod-verifier.test.ts`](../../tests/dod-verifier.test.ts) — verifier pipeline tests
- [`tests/dod-evidence.test.ts`](../../tests/dod-evidence.test.ts) — evidence package tests
- [`tests/dod-portal.test.ts`](../../tests/dod-portal.test.ts) — board · partner Accounting confirm
- [`tools/dod-evidence.ts`](../../tools/dod-evidence.ts) — CLI for packing/verifying evidence
- [`public/portal/dod/index.html`](../../public/portal/dod/index.html) — admin review UI
- [`docs/IMAGES.md`](../../docs/IMAGES.md) — non-DOD Bun.Image templates
- [`functions-bun-only/api/dod/index.ts`](../../functions-bun-only/api/dod/index.ts) — review API (Bun runtime; isolated from edge `functions/` in 6ff0514)
