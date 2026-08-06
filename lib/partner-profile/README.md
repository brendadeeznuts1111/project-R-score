# Partner Profile — unified CODE-keyed partner model

<!-- REF:ID 0.1.partner-profile-readme -->
<a id="0.1.partner-profile-readme"></a>

One canonical partner record across FactoryWager ops and Sports Terminal:
`lib/partner-profile/schema.ts` (model + validation), `parse.ts` (TOML
parse), `bake.ts` (baked registry), `register.ts` (phase 2 — bookmaker
account registration: vault write + seat-intake out + profile TOML).

Keyed by CODE (`^[A-Z]{3,6}$`); `callSign` (`CODE-NNN`) and `treeNodeId`
are derived aliases. Credentials are vault-only (`account.vaultKey`, never
plaintext).

## Modules

| Module | Role |
|--------|------|
| `schema.ts` | `PartnerProfile` model, brand-typed fields (`PartnerTemplateId` · `TreeNodeId` · `OutId`), `validatePartnerProfile` |
| `parse.ts` | `parsePartnerProfileToml` — TOML → profile |
| `bake.ts` | `buildPartnerProfilesBake` — registry artifact |
| `register.ts` | `registerPartnerBookmaker` — vault + seat-intake + TOML (phase 2) |

## Design

See `docs/design/unified-partner-profile.md` (phase 2 flow: tree-node
resolve → vault write → seat-intake out → profile upsert).
