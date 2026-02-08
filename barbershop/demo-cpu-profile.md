# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 381.0ms | 271 | 1.0ms | 19 |

**Top 10:** `fibonacci` 94.8%, `stringify` 2.5%, `requestSatisfyUtil` 0.7%, `internalAll` 0.5%, `(module)` 0.3%, `parseModule` 0.3%, `memoryIntensiveTask` 0.3%, `memoryIntensiveTask` 0.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 94.8% | 361.2ms | 100.0% | 8.68s | `fibonacci` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:25` |
| 2.5% | 9.8ms | 2.5% | 9.8ms | `stringify` | `[native code]` |
| 0.7% | 2.8ms | 0.7% | 2.8ms | `requestSatisfyUtil` | `[native code]` |
| 0.5% | 2.2ms | 0.5% | 2.2ms | `internalAll` | `[native code]` |
| 0.3% | 1.3ms | 95.1% | 362.5ms | `(module)` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:101` |
| 0.3% | 1.1ms | 0.3% | 1.1ms | `parseModule` | `[native code]` |
| 0.3% | 1.1ms | 0.3% | 1.1ms | `memoryIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `memoryIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:57` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 8.68s | 94.8% | 361.2ms | `fibonacci` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:25` |
| 100.0% | 749.4ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.8% | 380.4ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 98.3% | 374.7ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 95.1% | 362.5ms | 0.3% | 1.3ms | `(module)` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:101` |
| 48.5% | 185.1ms | 0.0% | 0us | `cpuIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:30` |
| 46.2% | 176.1ms | 0.0% | 0us | `cpuIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:31` |
| 3.1% | 12.1ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:105` |
| 2.5% | 9.8ms | 0.0% | 0us | `memoryIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:71` |
| 2.5% | 9.8ms | 2.5% | 9.8ms | `stringify` | `[native code]` |
| 1.5% | 5.7ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.7% | 2.8ms | 0.7% | 2.8ms | `requestSatisfyUtil` | `[native code]` |
| 0.7% | 2.8ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.5% | 2.2ms | 0.5% | 2.2ms | `internalAll` | `[native code]` |
| 0.5% | 2.2ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.3% | 1.1ms | 0.3% | 1.1ms | `parseModule` | `[native code]` |
| 0.3% | 1.1ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.3% | 1.1ms | 0.3% | 1.1ms | `memoryIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `memoryIntensiveTask` | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:57` |

## Function Details

### `fibonacci`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:25` | Self: 94.8% (361.2ms) | Total: 100.0% (8.68s) | Samples: 258

**Called by:**
- `fibonacci` (5967)
- `cpuIntensiveTask` (135)
- `cpuIntensiveTask` (123)

**Calls:**
- `fibonacci` (5967)

### `stringify`
`[native code]` | Self: 2.5% (9.8ms) | Total: 2.5% (9.8ms) | Samples: 7

**Called by:**
- `memoryIntensiveTask` (7)

### `requestSatisfyUtil`
`[native code]` | Self: 0.7% (2.8ms) | Total: 0.7% (2.8ms) | Samples: 1

**Called by:**
- `requestSatisfy` (1)

### `internalAll`
`[native code]` | Self: 0.5% (2.2ms) | Total: 0.5% (2.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:101` | Self: 0.3% (1.3ms) | Total: 95.1% (362.5ms) | Samples: 1

**Called by:**
- `evaluate` (259)

**Calls:**
- `cpuIntensiveTask` (135)
- `cpuIntensiveTask` (123)

### `parseModule`
`[native code]` | Self: 0.3% (1.1ms) | Total: 0.3% (1.1ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `memoryIntensiveTask`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts` | Self: 0.3% (1.1ms) | Total: 0.3% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `memoryIntensiveTask`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:57` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `memoryIntensiveTask`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:71` | Self: 0.0% (0us) | Total: 2.5% (9.8ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `stringify` (7)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 1.5% (5.7ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async loadModule` (1)
- `requestSatisfy` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (2.8ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `cpuIntensiveTask`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:31` | Self: 0.0% (0us) | Total: 46.2% (176.1ms) | Samples: 0

**Called by:**
- `(module)` (123)

**Calls:**
- `fibonacci` (123)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Calls:**
- `internalAll` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (749.4ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (268)
- `async loadAndEvaluateModule` (268)

**Calls:**
- `moduleEvaluation` (268)
- `evaluate` (268)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 98.3% (374.7ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (268)

**Calls:**
- `(module)` (259)
- `(module)` (9)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (1.1ms) | Samples: 0

**Calls:**
- `parseModule` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.8% (380.4ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (268)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:105` | Self: 0.0% (0us) | Total: 3.1% (12.1ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `memoryIntensiveTask` (7)
- `memoryIntensiveTask` (1)
- `memoryIntensiveTask` (1)

### `cpuIntensiveTask`
`/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts:30` | Self: 0.0% (0us) | Total: 48.5% (185.1ms) | Samples: 0

**Called by:**
- `(module)` (135)

**Calls:**
- `fibonacci` (135)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 95.7% | 364.8ms | `/Users/nolarose/Projects/barbershop/examples/bun-markdown-benchmarking.ts` |
| 4.2% | 16.1ms | `[native code]` |
