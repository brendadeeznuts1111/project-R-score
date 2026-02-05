# Empire Pattern Matrix

This documentation utilizes **abstraction compression** to represent the API surface of the Empire One-Liner ecosystem.

## Core Interface

All patterns follow the `EmpireOneLiner<TInput, TResult>` interface:

- `test(input): boolean`
- `exec(input): PatternResult<TResult> | null`
- `readonly hasRegExpGroups: boolean`

## Pattern Matrix

| Pattern | Signature | Perf | Semantics | Multiplier | Flags |
|---|---|---|---|---|---|
| §Gate:12 | `new Gate(input)` | `<10μs` | `{score, status}` | `1x` | `validation` |
| §Filter:42 | `new Filter(pattern)` | `<100μs` | `{result, groups}` | `10x` | `simd` | `regex` |
| §Path:18 | `new Path(namespace)` | `<50μs` | `{bucket, key}` | `5x` | `storage` | `r2` |
| §Upload:24 | `new Upload(target)` | `<200μs` | `{duration, saved}` | `8x` | `io` |
| §Pattern:64 | `new Pattern(init)` | `~1ms` | `{pathname, groups}` | `1x` | `urlpattern` | `native` |
| §Query:32 | `new Query(glob)` | `<500μs` | `{keys, latency}` | `15x` | `search` | `glob` |
| §BlobFarm:16 | `new BlobFarm(mode)` | `<50μs` | `{blob, speed}` | `100x` | `stream` | `native` |
| §Farm:8 | `new Farm(scale)` | `<10ms` | `{throughput, rate}` | `20x` | `infra` |

## Usage Inference

For any pattern `§Name`, the following properties are inferred:

- **Constructor**: Accepts either a string pattern or an init object.
- **Error Behavior**: Throws on invalid initialization; `exec()` returns `null` on mismatch.
- **Performance**: Normalized against standard URLPattern baseline.
