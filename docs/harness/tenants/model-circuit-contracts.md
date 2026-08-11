# Model circuit contracts

The operator-research harness keeps model features separate from operational
observations. The executable authority is
[`model-contracts.ts`](../../../lib/operator-research/model-contracts.ts); the
reviewed file boundary is [`files.md`](../../../lib/operator-research/files.md).

## Package and group ownership

| Package                         | Groups                   | May affect weights                                                                     |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `operator-research/intake`      | identity · provenance    | No; it proves where data came from and whether the circuit was verified.               |
| `operator-research/circuit`     | market · movement · risk | Yes; only reviewed odds, pattern, edge, EV, and Kelly properties.                      |
| `operator-research/models`      | prediction · provenance  | No; these are derived outputs and eligibility evidence.                                |
| `operator-research/diagnostics` | transport · environment  | No; latency, operational confidence, timestamps, and environment are observation-only. |
| `operator-research/controls`    | flags                    | No; controls can tighten the boundary but cannot authorize noise as a feature.         |

`MODEL_PROPERTY_CONTRACTS` owns every property, type, group, source, required
state, and `affectsWeights` decision. `MODEL_WEIGHT_INPUTS` is derived from that
catalog instead of maintained as a second list.

## Intake and weight boundary

Input provenance is `live`, `fixture`, or `synthetic`. A record is weight
eligible only when it is both `live` and `circuitVerified`. Missing provenance
fails closed. Fixtures and synthetic events remain useful for rapid shadow
development and deterministic tests but cannot update weights.

The model feature vector contains only:

- pattern and edge type;
- the two circuit odds;
- edge percentage and expected value;
- Kelly fraction.

Latency, latency-adjusted operational confidence, timestamps, host labels,
environment variables, and presentation strings are returned separately by
`buildModelDiagnostics`. Changing those properties must not change model
prediction or model confidence.

## Locked flags

[`model-harness.toml`](../../../config/operator-research/model-harness.toml)
defines the complete flag set. Every flag is locked `true`; unknown, omitted, or
disabled flags fail parsing. There is deliberately no compatibility flag that
permits transport or environment noise to enter model features.

## Proof

```bash
bun run model:contracts:check
bun run model:contracts:files:update
bun tools/bun-test-snapshots.ts --test --id model-circuit
bun run check:snapshots
```

The snapshot records the package/group/property catalog, pattern type, flags,
weight-input list, and file-accountability boundary.
