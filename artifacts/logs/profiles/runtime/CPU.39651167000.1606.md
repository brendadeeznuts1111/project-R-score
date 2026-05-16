# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 35.2ms | 12 | 1.0ms | 21 |

**Top 10:** `text` 47.7%, `fetch` 19.4%, `(module)` 10.4%, `parseModule` 8.6%, `slice` 4.2%, `Number` 3.2%, `evaluate` 3.1%, `moduleDeclarationInstantiation` 3.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 47.7% | 16.8ms | 47.7% | 16.8ms | `text` | `[native code]` |
| 19.4% | 6.8ms | 19.4% | 6.8ms | `fetch` | `[native code]` |
| 10.4% | 3.6ms | 10.4% | 3.6ms | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:30` |
| 8.6% | 3.0ms | 8.6% | 3.0ms | `parseModule` | `[native code]` |
| 4.2% | 1.4ms | 4.2% | 1.4ms | `slice` | `[native code]` |
| 3.2% | 1.1ms | 3.2% | 1.1ms | `Number` | `[native code]` |
| 3.1% | 1.1ms | 84.5% | 29.7ms | `evaluate` | `[native code]` |
| 3.0% | 1.0ms | 3.0% | 1.0ms | `moduleDeclarationInstantiation` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 57.5ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 84.5% | 29.7ms | 3.1% | 1.1ms | `evaluate` | `[native code]` |
| 47.7% | 16.8ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:20` |
| 47.7% | 16.8ms | 47.7% | 16.8ms | `text` | `[native code]` |
| 29.4% | 10.3ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 19.4% | 6.8ms | 19.4% | 6.8ms | `fetch` | `[native code]` |
| 16.0% | 5.6ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 15.7% | 5.5ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:19` |
| 10.4% | 3.6ms | 10.4% | 3.6ms | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:30` |
| 8.6% | 3.0ms | 8.6% | 3.0ms | `parseModule` | `[native code]` |
| 6.1% | 2.1ms | 0.0% | 0us | `link` | `[native code]` |
| 4.2% | 1.4ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:9` |
| 4.2% | 1.4ms | 4.2% | 1.4ms | `slice` | `[native code]` |
| 3.7% | 1.3ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 3.7% | 1.3ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 3.7% | 1.3ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 3.7% | 1.3ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 3.2% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:10` |
| 3.2% | 1.1ms | 3.2% | 1.1ms | `Number` | `[native code]` |
| 3.0% | 1.0ms | 3.0% | 1.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 3.0% | 1.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |

## Function Details

### `text`
`[native code]` | Self: 47.7% (16.8ms) | Total: 47.7% (16.8ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `fetch`
`[native code]` | Self: 19.4% (6.8ms) | Total: 19.4% (6.8ms) | Samples: 5

**Called by:**
- `(module)` (4)
- `requestFetch` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:30` | Self: 10.4% (3.6ms) | Total: 10.4% (3.6ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `parseModule`
`[native code]` | Self: 8.6% (3.0ms) | Total: 8.6% (3.0ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `slice`
`[native code]` | Self: 4.2% (1.4ms) | Total: 4.2% (1.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `Number`
`[native code]` | Self: 3.2% (1.1ms) | Total: 3.2% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `evaluate`
`[native code]` | Self: 3.1% (1.1ms) | Total: 84.5% (29.7ms) | Samples: 1

**Called by:**
- `async asyncModuleEvaluation` (9)

**Calls:**
- `(module)` (4)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 3.0% (1.0ms) | Total: 3.0% (1.0ms) | Samples: 1

**Called by:**
- `link` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 6.1% (2.1ms) | Samples: 0

**Called by:**
- `link` (1)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (1)
- `moduleDeclarationInstantiation` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:10` | Self: 0.0% (0us) | Total: 3.2% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Number` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 3.7% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 3.7% (1.3ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:9` | Self: 0.0% (0us) | Total: 4.2% (1.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `slice` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 3.7% (1.3ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:19` | Self: 0.0% (0us) | Total: 15.7% (5.5ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `fetch` (4)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 3.7% (1.3ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (57.5ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (21)
- `async loadAndEvaluateModule` (7)

**Calls:**
- `async asyncModuleEvaluation` (21)
- `evaluate` (9)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:20` | Self: 0.0% (0us) | Total: 47.7% (16.8ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `text` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 16.0% (5.6ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)
- `requestInstantiate` (1)

**Calls:**
- `requestFetch` (1)
- `async (anonymous)` (1)
- `parseModule` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 29.4% (10.3ms) | Samples: 0

**Calls:**
- `async asyncModuleEvaluation` (7)
- `linkAndEvaluateModule` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 3.0% (1.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 89.5% | 31.5ms | `[native code]` |
| 10.4% | 3.6ms | `/Users/nolarose/Projects/barbershop/profile-workload.ts` |
