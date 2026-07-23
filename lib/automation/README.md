# Automation — Account Provisioning & Workflows

Automated partner account management using Bun-native APIs.

**Dual-mode / experiments lane:** see [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md) — sandbox-gated WebView (`automated_test` only), provisioning queue, A/B experiments, coverage prediction backtests. Manual production path is queue + KYC DOD, not live-book WebView.

## Files

| File | Purpose |
|------|---------|
| `provision-accounts.ts` | WebView-based automated account creation on **sandbox/test** platforms only. Navigates signup forms, fills credentials, encrypts with AES-GCM, stores to `partner_platform_accounts` (`is_test=1`). |

## Usage

```ts
import { provisionAccounts } from "../lib/automation/provision-accounts.ts";

const results = await provisionAccounts({
  platformId: "draftkings",
  partnerIds: ["partner-1", "partner-2"],
  credentials: [
    { username: "pk1", password: "Secure123!", email: "p1@example.com" },
    { username: "pk2", password: "Secure456!", email: "p2@example.com" },
  ],
});

for (const r of results) {
  console.log(`${r.partnerId}: ${r.success ? "✅" : "❌"} ${r.durationMs}ms`);
}
```

## Encryption

Credentials are encrypted with AES-GCM via `encryptAesGcm` from the DOD pipeline, keyed by `PROVISION_ENCRYPTION_KEY` env var.
