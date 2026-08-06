# routing

Load routing-algorithm artifacts from the factory registry without evaluating
registry-hosted code in-process.

| File                     | Role                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| [`loader.ts`](loader.ts) | `loadRoutingAlgorithm` — resolve + fetch bytes via `RegistryClient` |

Callers must extract the package into a controlled directory and import its
declared entry point through their normal trust/sandbox boundary.

Related: [`../factory/`](../factory/) · registry tenant docs.
