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
- `tournament-series-glossary.ts` — Factory domain-glossary authority for
  `sport.table_tennis` · `league.wtt` · `league.ittf` · `tournament.*` · gender
  facets

### Domain glossary bake

```bash
bun run glossary:portal          # projects series into public/registry/domain-glossary.json
bun run glossary:portal:check    # fail if bake stale
bun run verify:tournament-glossary -- setka_cup_ua_w
bun run verify:pages-edge:tournament -- --offline   # local bake + snap ownership
bun run verify:pages-edge:tournament                # live Pages domain-glossary
```

After bake, ownership for known series prefers **domain-glossary** over
tennis-hq / known-map when the projection is present.
