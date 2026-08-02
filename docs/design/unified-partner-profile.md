# Unified Partner Profile

Design v0 — one canonical partner model across FactoryWager ops and Sports
Terminal. Approved 2026-08-02 (full merge · CODE as single key · registry-linked
books · vault-only credentials).

## Why

"Partner profile" was six parallel fragments with triplicated identity, two
parallel lifecycle enums, duplicated `maxBet`, jurisdiction/cultivation/
settlement existing only in the Sports Terminal product, bookmaker accounts as
free-text URLs, and credentials split between intake JSON and the vault.

| Fragment             | File                                                                                        | Unique fields                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Onboarding/bridge    | `lib/operations/partner-onboarding.ts` · `config/partner-templates/*.toml`                  | cut, lineage (parent/expert), template binding, `[sor]` rules                            |
| Partners-ops         | `lib/telegram/partner-ops-registry.ts`                                                      | CODE, call-sign, phase, telegram chat+topics, rail taxonomy, ledger                      |
| Seat intake          | `lib/telegram/seat-intake.ts`                                                               | password (secret), balance, withdrawPath, desk thread                                    |
| Account dossier      | `/portal/account/`                                                                          | pure join view (no own fields)                                                           |
| Sports Terminal      | `.agents/skills/partner-profile-os/` · `projects/active/sports-terminal-os/profiles/*.toml` | jurisdiction, sources, cultivation, settlement, balance, compliance, graduated lifecycle |
| Vault / limit-raises | `lib/security/partner-vault.ts` · `/registry/limit-raises.json`                             | node-scoped AES-GCM secrets; raise history + multi-factor scores                         |

## Unified model (v0)

Keyed by **CODE** (`^[A-Z]{3,6}$`); `callSign` (`CODE-NNN`) and `treeNodeId` are
derived aliases. Canonical glossary concept ids reused (`book.type.*`,
`partner.phase.*`, `deposit.method.*`, `out.status.*`, `telegram.topic.*`,
`accounting.*`).

```toml
[meta]            template_id · name · version · source(referral|portal|telegram|promoted)
[identity]        code · callSign · treeNodeId · status
[lineage]         parent · expert · cutPct
[lifecycle]       status: signup|materialized|kyc_pending|active|cultivating|
                           graduated|suspended|terminated      # ONE enum
                  phase: derived (operator_ready|onboarding|incomplete|paused)
[telegram]        chatId · topics{general,ops,alerts,liquidity,accounting}
[jurisdiction]    type · allowedStates · allowedCountries · minAge · kycTier ·
                  geoFenceEnabled · taxForm · selfExclusionCheck
[rules.sor]       eligibleTiers · maxExposurePerSignal · maxDailyExposure ·
                  maxSingleBet · bookWhitelist · bookBlacklist ·
                  signalGates(steam/arb/clv/manual/predictive) ·
                  requireOpsecGreen · opsecScoreMax
[books.<bookId>]  type(legal|offshore|pph|crypto|sweepstakes|exchange) ·
                  account{username, vaultKey} · funding{method, railId, target} ·
                  limits{maxBet, freeRollPct} · status · withdrawPath
[cultivation]     initialDepositTarget · depositScheduleWeeks · depositAmounts ·
                  initialLimit · limitRaiseTarget · raiseRequestWeek ·
                  recreationalMix · roundStakes · casinoPlayPct ·
                  oddsBoostAcceptance · maxBetFrequencyDaily · requiredSportsDiversity
[settlement]      commissionStructure · commissionTiers · makeup* · payout* ·
                  currency · holdTargetPct
[balance]         initialCapitalRequirement · marginCallThreshold ·
                  marginCallAction · autoInject*
[compliance]      autoSuspendRules · reviewRequiredFor · auditRetentionDays ·
                  maxOpsecScore · require2FA
[accounting]      fundStatus · deposits[] · credits[] · freeRoll{total,used} · ledger[]
[tracking]        accounts · limits coverage · communication readiness · accounting aggregates
```

## Invariants

1. **CODE is the single key** — vault, limits, dossier, telegram, boards all key
   off CODE; callSign/TreeNodeId are aliases.
2. **Books are registry-linked** — `books.<bookId>` references the canonical
   `@factorywager/bookmakers` entry (many bookmakers per partner, many partners
   per bookmaker). `maxBet` collapses to `rules.sor.maxSingleBet` + per-book
   override.
3. **Credentials vault-only** — seat intake writes `partner_vault` (per-node
   AES-GCM) and keeps no plaintext password; the profile carries only
   `vaultKey`.

## Where it lives

- `lib/partner-profile/` — schema + validation + bake
- `config/partner-profiles/<CODE>.toml` — one profile per partner
- bake → `/registry/partner-profiles.json`
  (`bun run partner-profile:bake[:check]`)
- Consumers: account dossier, `/portal/partners/`, seat desk, and the Sports
  Terminal engine (same model, both products).

## Migration plan (per fragment, own PR)

| Phase | Fragment →                                          | Work                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **schema + bake** ✅ merged (#206)                  | `lib/partner-profile/` · `.example.toml` · weave artifact · tests · design doc                                                                                                                                                                                                                                                                                         |
| 2     | **register + seat-intake → vault** ✅ merged (#207) | `lib/partner-profile/register.ts` (tree lookup → vault write → intake upsert → profile upsert) · `partner:bookmaker:register` CLI · `partner:vault:migrate` (plaintext passwords → vault, idempotent) · `SeatOut.vaultKey`                                                                                                                                             |
| 3     | **one-command onboarding** ✅ (this PR)             | `lib/partner-profile/onboard.ts` (normalize code → identity create/reuse → forum request → book → bake → audit) · `partner:onboard` (identity + first book) · `partner:book:add` (pure add to existing partner — partner vs out decoupled) · `--dry-run` · idempotent upserts · audit JSONL `data/partner-registration.log` · `Bun.TOML.parse/stringify` profile merge |
| 4     | partners-ops → profile                              | derive `PartnersOpsPartner` from the unified profile (phase from lifecycle); rail/funding taxonomy moves into `books[].funding`                                                                                                                                                                                                                                        |
| 5     | tree_nodes identity                                 | CODE becomes the join key; callSign/TreeNodeId aliases; dossier keys off CODE                                                                                                                                                                                                                                                                                          |
| 6     | Sports Terminal profiles                            | re-express `profiles/*.toml` as unified profiles (jurisdiction/cultivation/settlement already in model); ST engine reads the same bake                                                                                                                                                                                                                                 |
| 7     | boards                                              | `/portal/partners/` + dossier read `/registry/partner-profiles.json` (no more six-way joins)                                                                                                                                                                                                                                                                           |

## Registration command (phase 2)

```bash
bun run partner:bookmaker:register <CODE> <bookKey> \
  --url <url> --username <user> --password <pass> \
  [--type pph] [--chat <chatId>] [--maxBet <n>]
```

Writes the password to `partner_vault` (node-scoped AES-GCM, key
`partner:<CODE>:<bookKey>`), upserts the seat-intake out (`bookLogin` +
`vaultKey`, **no plaintext password**), and upserts
`config/partner-profiles/<CODE>.toml`. Existing plaintext intake passwords
migrate via `bun run partner:vault:migrate` (idempotent).

## youwager (first real profile)

`YOU` → `books.youwager { type: pph, account{username, vaultKey}, limits{…} }` +
telegram binding. Blocks: partner code/call-sign, chat id, credentials (vault
write). Registration lands only after the schema PR merges.
