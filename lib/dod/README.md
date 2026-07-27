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

## Related

- [`tests/dod-verifier.test.ts`](../../tests/dod-verifier.test.ts) — verifier pipeline tests
- [`tests/dod-evidence.test.ts`](../../tests/dod-evidence.test.ts) — evidence package tests
- [`tools/dod-evidence.ts`](../../tools/dod-evidence.ts) — CLI for packing/verifying evidence
- [`public/portal/dod/index.html`](../../public/portal/dod/index.html) — admin review UI
- [`functions-bun-only/api/dod/index.ts`](../../functions-bun-only/api/dod/index.ts) — review API (Bun runtime; isolated from edge `functions/` in 6ff0514)
