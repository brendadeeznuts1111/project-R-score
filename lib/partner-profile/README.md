# Partner Profile — unified CODE-keyed partner model

One canonical partner record across FactoryWager ops and Sports Terminal:
`lib/partner-profile/schema.ts` (model + validation), `parse.ts` (private TOML
parse), `bake.ts` (redacted public compatibility registry), `register.ts` (phase 2 — bookmaker
account registration: vault write + seat-intake out + profile TOML).

Keyed by CODE (`^[A-Z]{3,6}$`); `callSign` (`CODE-NNN`) and `treeNodeId`
are derived aliases. Credentials are vault-only (`account.vaultKey`, never
plaintext).

## Security boundary

`config/partner-profiles/<CODE>.toml` is private operational configuration. The
parser rejects unknown keys and secret-bearing field names at any depth;
credentials belong in the vault and the TOML may carry only a `vaultKey`
reference. Real partner files remain ignored by Git. The committed
`.example.toml` is the only profile document intended for source control.

`public/registry/partner-profiles.json` is **not** a full profile mirror. Its v2
schema projects only `meta.templateId`, `meta.version`, `identity.code`,
`identity.callSign`, `lifecycle.status`, and `lifecycle.phase`, which are the
facts used by the current compatibility portal. Telegram, bookmaker account,
funding, limits, policy, settlement, balance, compliance, and accounting data
do not cross this public boundary.

## Modules

| Module | Role |
|--------|------|
| `schema.ts` | `PartnerProfile` model, brand-typed fields (`PartnerTemplateId` · `TreeNodeId` · `OutId`), `validatePartnerProfile` |
| `parse.ts` | `parsePartnerProfileToml` — TOML → profile |
| `bake.ts` | `buildPartnerProfilesBake` — validated, redacted public compatibility artifact |
| `register.ts` | `registerPartnerBookmaker` — vault + seat-intake + TOML (phase 2) |

## Design

See `docs/design/unified-partner-profile.md` (phase 2 flow: tree-node
resolve → vault write → seat-intake out → profile upsert).
