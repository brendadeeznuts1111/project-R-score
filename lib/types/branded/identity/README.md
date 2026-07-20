# Identity domain brands

**Module:** `lib/types/branded/identity.ts`

| Brand | Meaning | Authority notes |
|-------|---------|-----------------|
| `UserId` | Principal | user-input or wire |
| `AccountId` | Cloud account (R2/CF) | **wire/env only** — `tryAccountId` for soft merge, never empty forge |
| `IdentityId` | Federated identity record | system / wire |
| `AccessKeyId` | Access key **id** (not secret) | wire/env — secret stays plain `string` |
| `TokenId` | Token handle | system-internal |

Credential trio with soft merge: `AccountId` + `AccessKeyId` (+ secret string) via `lib/security/r2-credentials.ts`.
