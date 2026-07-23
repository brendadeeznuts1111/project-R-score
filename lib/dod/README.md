# DOD — Daily Operations Document (Visual Evidence)

Agent-submitted image proof: pack/verify (aHash + optional HMAC), process pipeline (store + SQLite review), Telegram `/dod`, portal review UI.

## Files

| File | Purpose |
|------|---------|
| `evidence.ts` | Evidence package: pack/unpack/verify, aHash, HMAC, registry, WebP preview |
| `verifier.ts` | `DODVerifier`: validate → aHash → optional watermark → store → sign → tamper → SQLite |
| `index.ts` | Re-exports evidence + verifier |

## Types

`balance` · `slip` · `receipt` · `location` · `device` · `other` (plus internal `id` encrypt path)

## Flow

1. Agent submits image → `DODVerifier.process()` or CLI `tools/dod-evidence.ts pack`
2. Magic-byte validate + per-agent rate limit
3. Bun.Image metadata + shared `averageHash` from `evidence.ts`
4. Optional WebView watermark (`DOD_WATERMARK=0` skips)
5. `storePreviewWebp` (1024 inside, WebP 85%) → local/R2 randomized path
6. Metadata hash + HMAC-SHA256 (`DOD_PROOF_SECRET`)
7. Tamper score 0–100 (dimension / missing EXIF heuristics; Bun.Image meta is width/height/format)
8. Optional OCR (local tesseract, then WebView CDN fallback) for slip/receipt auto-approve
9. SQLite `dod_submissions` + registry JSON
10. Telegram ops notify if flagged; review via `/portal/dod` + `/api/dod`

## Telegram

```
/dod <type> [book]  — caption a photo (`/dod balance draftkings`)
/dodstatus          — recent submissions for this agent
/coverage           — platform coverage %
/platforms          — catalog + account counts
/myaccounts         — your platform accounts
```

Balance DODs cross-check `platformHint` / OCR aliases against `partner_platform_accounts` + `sb_accounts`. Missing account → flagged (+30 tamper). Set `DOD_PLATFORM_DETECT=0` to disable.

## Usage

```ts
import { DODVerifier } from "../lib/dod/index.ts";

const verifier = new DODVerifier("data/operations.db");
const result = await verifier.process({
  id: Bun.randomUUIDv7(),
  agentId: "agent_xyz",
  type: "balance",
  rawImage: await Bun.file("photo.webp").bytes(),
  submittedAt: new Date().toISOString(),
});
```

```bash
bun tools/dod-evidence.ts pack photo.png --kind=slip --out=e.json --preview
bun tools/dod-evidence.ts verify photo.png e.json
```

## Related

- [`tests/dod-verifier.test.ts`](../../tests/dod-verifier.test.ts)
- [`tests/dod-evidence.test.ts`](../../tests/dod-evidence.test.ts)
- [`tools/dod-evidence.ts`](../../tools/dod-evidence.ts)
- [`lib/telegram/ops-bot.ts`](../telegram/ops-bot.ts)
- [`public/portal/dod/index.html`](../../public/portal/dod/index.html)
- [`functions/api/dod/index.ts`](../../functions/api/dod/index.ts)
