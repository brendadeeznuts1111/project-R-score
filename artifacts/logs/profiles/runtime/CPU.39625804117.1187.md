# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 27.9ms | 7 | 1.0ms | 13 |

**Top 10:** `text` 59.2%, `async asyncModuleEvaluation` 12.8%, `async loadAndEvaluateModule` 7.6%, `parseModule` 5.9%, `fetch` 5.3%, `evaluate` 5.2%, `resolve` 3.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 59.2% | 16.5ms | 59.2% | 16.5ms | `text` | `[native code]` |
| 12.8% | 3.5ms | 93.1% | 26.0ms | `async asyncModuleEvaluation` | `[native code]` |
| 7.6% | 2.1ms | 20.5% | 5.7ms | `async loadAndEvaluateModule` | `[native code]` |
| 5.9% | 1.6ms | 5.9% | 1.6ms | `parseModule` | `[native code]` |
| 5.3% | 1.4ms | 5.3% | 1.4ms | `fetch` | `[native code]` |
| 5.2% | 1.4ms | 64.5% | 18.0ms | `evaluate` | `[native code]` |
| 3.7% | 1.0ms | 3.7% | 1.0ms | `resolve` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 93.1% | 26.0ms | 12.8% | 3.5ms | `async asyncModuleEvaluation` | `[native code]` |
| 64.5% | 18.0ms | 5.2% | 1.4ms | `evaluate` | `[native code]` |
| 59.2% | 16.5ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/barbershop/profile-workload.ts:20` |
| 59.2% | 16.5ms | 59.2% | 16.5ms | `text` | `[native code]` |
| 20.5% | 5.7ms | 7.6% | 2.1ms | `async loadAndEvaluateModule` | `[native code]` |
| 20.3% | 5.6ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 5.9% | 1.6ms | 5.9% | 1.6ms | `parseModule` | `[native code]` |
| 5.3% | 1.4ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 5.3% | 1.4ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 5.3% | 1.4ms | 5.3% | 1.4ms | `fetch` | `[native code]` |
| 5.3% | 1.4ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 5.3% | 1.4ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 3.7% | 1.0ms | 3.7% | 1.0ms | `resolve` | `[native code]` |

## Function Details

### `text`
`[native code]` | Self: 59.2% (16.5ms) | Total: 59.2% (16.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 12.8% (3.5ms) | Total: 93.1% (26.0ms) | Samples: 1

**Called by:**
- `async asyncModuleEvaluation` (3)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async asyncModuleEvaluation` (3)
- `evaluate` (2)

### `async loadAndEvaluateModule`
`[native code]` | Self: 7.6% (2.1ms) | Total: 20.5% (5.7ms) | Samples: 1

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async asyncModuleEvaluation` (1)
- `async loadAndEvaluateModule` (1)

### `parseModule`
`[native code]` | Self: 5.9% (1.6ms) | Total: 5.9% (1.6ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `fetch`
`[native code]` | Self: 5.3% (1.4ms) | Total: 5.3% (1.4ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `evaluate`
`[native code]` | Self: 5.2% (1.4ms) | Total: 64.5% (18.0ms) | Samples: 1

**Called by:**
- `async asyncModuleEvaluation` (2)

**Calls:**
- `(module)` (1)

### `resolve`
`[native code]` | Self: 3.7% (1.0ms) | Total: 3.7% (1.0ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `(module)`
`/Users/nolarose/Projects/barbershop/profile-workload.ts:20` | Self: 0.0% (0us) | Total: 59.2% (16.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `text` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 5.3% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 5.3% (1.4ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 5.3% (1.4ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 20.3% (5.6ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)
- `requestInstantiate` (1)

**Calls:**
- `requestFetch` (1)
- `async (anonymous)` (1)
- `resolve` (1)
- `parseModule` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 5.3% (1.4ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 100.0% | 27.9ms | `[native code]` |
