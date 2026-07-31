# Types

Shared type surfaces and the FactoryWager branded-domain-value forge.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API
surface.

| Entry                                          | Role                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [`branded.ts`](./branded.ts)                   | Stable import for brands, constructors, catalog, and aggregate types |
| [`branded/README.md`](./branded/README.md)     | Agent and maintainer routing                                         |
| [`brand-manifest.json`](./brand-manifest.json) | Generated 58-value institutional record                              |
| [`branded/_core.ts`](./branded/_core.ts)       | Nominal primitive and constructor-tier semantics                     |

Prefer narrow domain imports inside the forge and `lib/types/branded.ts` from
consumers. Never hand-edit the generated manifest.
