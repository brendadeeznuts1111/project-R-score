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

## Brands

`ExperimentId` · `ExperimentVariantId` · `ExperimentAssignmentId` · `TreeNodeId` from `lib/types/branded`.
