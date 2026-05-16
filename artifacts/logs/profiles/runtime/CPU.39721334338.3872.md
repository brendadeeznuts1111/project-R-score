# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 22.7ms | 6 | 1.0ms | 14 |

**Top 10:** `async asyncModuleEvaluation` 72.1%, `fetch` 11.2%, `parseModule` 6.2%, `moduleEvaluation` 5.4%, `log` 4.9%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 72.1% | 16.3ms | 98.0% | 22.2ms | `async asyncModuleEvaluation` | `[native code]` |
| 11.2% | 2.5ms | 11.2% | 2.5ms | `fetch` | `[native code]` |
| 6.2% | 1.4ms | 6.2% | 1.4ms | `parseModule` | `[native code]` |
| 5.4% | 1.2ms | 5.4% | 1.2ms | `moduleEvaluation` | `[native code]` |
| 4.9% | 1.1ms | 4.9% | 1.1ms | `log` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 98.0% | 22.2ms | 72.1% | 16.3ms | `async asyncModuleEvaluation` | `[native code]` |
| 18.1% | 4.1ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 11.2% | 2.5ms | 11.2% | 2.5ms | `fetch` | `[native code]` |
| 10.6% | 2.4ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 10.1% | 2.3ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 6.2% | 1.4ms | 6.2% | 1.4ms | `parseModule` | `[native code]` |
| 5.9% | 1.3ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 5.9% | 1.3ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 5.9% | 1.3ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 5.9% | 1.3ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 5.4% | 1.2ms | 5.4% | 1.2ms | `moduleEvaluation` | `[native code]` |
| 5.2% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:19` |
| 4.9% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:29` |
| 4.9% | 1.1ms | 4.9% | 1.1ms | `log` | `[native code]` |

## Function Details

### `async asyncModuleEvaluation`
`[native code]` | Self: 72.1% (16.3ms) | Total: 98.0% (22.2ms) | Samples: 1

**Called by:**
- `async asyncModuleEvaluation` (3)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async asyncModuleEvaluation` (3)
- `evaluate` (2)

### `fetch`
`[native code]` | Self: 11.2% (2.5ms) | Total: 11.2% (2.5ms) | Samples: 2

**Called by:**
- `(module)` (1)
- `requestFetch` (1)

### `parseModule`
`[native code]` | Self: 6.2% (1.4ms) | Total: 6.2% (1.4ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `moduleEvaluation`
`[native code]` | Self: 5.4% (1.2ms) | Total: 5.4% (1.2ms) | Samples: 1

**Called by:**
- `async loadAndEvaluateModule` (1)

### `log`
`[native code]` | Self: 4.9% (1.1ms) | Total: 4.9% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 5.9% (1.3ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 5.9% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 5.9% (1.3ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:19` | Self: 0.0% (0us) | Total: 5.2% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `fetch` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 5.9% (1.3ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:29` | Self: 0.0% (0us) | Total: 4.9% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `log` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 10.1% (2.3ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (2)

**Calls:**
- `(module)` (1)
- `(module)` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 18.1% (4.1ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)
- `requestInstantiate` (1)

**Calls:**
- `requestFetch` (1)
- `async (anonymous)` (1)
- `parseModule` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 10.6% (2.4ms) | Samples: 0

**Calls:**
- `moduleEvaluation` (1)
- `async asyncModuleEvaluation` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 100.0% | 22.7ms | `[native code]` |
