# Glossary helpers

FactoryWager-side glossary utilities that sit beside portal/Kalshi SSOT bakes.

## Tournament snap ownership

Warehouse snaps often encode **tournament + region + gender** as one token:

```text
setka_cup_ua_w  →  tournament.setka_cup + region=ua + gender=FEMALE
```

Ownership is on the series leaf (`tournament.setka_cup`), not every edition.
Aligns with Tennis HQ table-tennis hierarchy:

`sport → league → series → tournament → gender → match`

### CLI

```bash
bun run verify:tournament-glossary -- setka_cup_ua_w
bun run verify:tournament-glossary -- --list-known
bun run verify:tournament-glossary -- setka_cup_ua_w --json
```

### Code

- `tournament-snap.ts` — `parseTournamentSnap`, `verifyTournamentSnapOwnership`
