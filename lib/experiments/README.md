# Factorial experiments (ops C4)

Multi-factor designs for partner policy (routing, cut %, coverage floor, timing, …).

| Piece | Role |
|-------|------|
| `design.ts` | Full / regular-2level / balanced-subset designs (pure) |
| `engine.ts` | SQLite create → sticky balanced assign → metrics → analyze |
| `analyze.ts` | Main effects + 2-way interactions + simple predict |
| `schema.ts` | `experiments`, `experiment_variants`, `experiment_assignments`, `experiment_metrics` |

## CLI

```bash
bun run ops:experiments --help
bun run ops:experiments design --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 1
bun run ops:experiments create --name routing-cut --factors 'routing:static,dynamic;cut:0.10,0.15'
bun run ops:experiments activate --id <experimentId>
bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
bun run ops:experiments analyze --id <experimentId>
```

## Coverage gate hook

Active assignments may set `min_coverage_pct` or `coverage_floor` on the variant.
`canOfferOnPlatform(db, platformId, stake, minPct, partnerId)` uses that floor when present.
`canOfferStakeForNode` / `reservePlay(..., { checkCoverage: true })` resolve the partner subject, sticky-assign into active experiments, then apply the floor.

## Outcome plumbing (settlement)

`settlePlay` calls `recordPlaySettlementOutcomes` (best-effort):

1. Resolve partner subject (walk leaf → root; prefer `type = partner`)
2. Sticky-assign into every **active** experiment
3. Record primary metric (`win_rate` 1/0 on win/loss, or `pnl`) + auxiliary `pnl` when primary is win_rate
4. push/void → no win_rate row (no signal)

Analyze with `bun run ops:experiments analyze --id <id>` after settlements accumulate.

## Brands

`ExperimentId` · `ExperimentVariantId` · `ExperimentAssignmentId` · `TreeNodeId` from `lib/types/branded`.
