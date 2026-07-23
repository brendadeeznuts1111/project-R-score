# Automation — Account Provisioning & Workflows

Automated partner account management using Bun-native APIs.

## Files

| File | Purpose |
|------|---------|
| `provision-accounts.ts` | WebView-based automated account creation on target platforms. Navigates signup forms, fills credentials, encrypts with AES-GCM, stores to `partner_platform_accounts`. |

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
