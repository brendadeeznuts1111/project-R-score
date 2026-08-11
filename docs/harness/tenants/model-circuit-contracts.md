# Model circuit contracts

The operator-research harness keeps model features separate from operational
observations. The executable authority is
[`model-contracts.ts`](../../../lib/operator-research/model-contracts.ts); the
generated ownership projection is
[`files.md`](../../../lib/operator-research/files.md).

## Package and group ownership

The Bun package is `factorywager-enterprise`. Intake, circuit, models,
diagnostics, and controls are owner modules within that package; they are not
independent packages. File records keep `package` and `ownerModule` separate so
shared repository files can declare a narrow responsibility without being
claimed by a domain module.

| Owner module                    | Groups                   | May affect weights                                                                     |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `operator-research/intake`      | identity · provenance    | No; it proves where data came from and whether the circuit was verified.               |
| `operator-research/circuit`     | market · movement · risk | Yes; only reviewed edge type, odds, edge, EV, and Kelly properties.                    |
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
development and deterministic tests but cannot become downstream
weight-eligible.

`weight_eligible` is downstream eligibility evidence, not a weight mutation.
This artifact has no training or weight-mutation sink; any future sink must
consume and enforce the circuit contract explicitly.

The model feature vector contains only:

- closed edge classification;
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

## Markdown projection

`files.md` is generated from the typed file registry; hand edits are drift.
Generation remains deterministic text, while lowercase `Bun.markdown.render` and
`Bun.markdown.html` provide structural and rendered proofs. Bun documents
`Bun.markdown` as unstable, so its behavior stays covered by runtime contract
tests. Authority: [Bun Markdown guide](https://bun.com/docs/runtime/markdown)
and [API reference](https://bun.com/reference/bun/markdown).

## Proof

```bash
bun run model:contracts:check
bun run model:contracts:files:update
bun run docs:markdown:check
bun tools/bun-test-snapshots.ts --test --id model-circuit
bun run check:snapshots
```

The snapshot records package, owner-module, aggregate, property, vocabulary,
flag, weight-input, and file-accountability contracts.
