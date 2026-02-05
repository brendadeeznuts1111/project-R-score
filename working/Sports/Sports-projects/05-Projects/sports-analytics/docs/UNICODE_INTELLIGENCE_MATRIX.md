# Unicode Intelligence Matrix: Evolution & Vector Integration

This document provides a detailed mapping of the Unicode Intelligence Layer within the T3-Lattice v3.3 system. It is designed to be accessible to junior engineers while maintaining senior-level architectural rigor.

## 📖 Glossary for Junior Engineers

| Term | Plain English Explanation | Technical Detail |
| :--- | :--- | :--- |
| **SIMD** | "Single Instruction, Multiple Data" - Like a supermarket checkout with 16 lanes instead of 1. | Processing multiple data points (e.g., 16 characters) in a single CPU register cycle. |
| **Vector** | A "pack" of data that moves together. | A fixed-size array (e.g., 128-bit) that the CPU treats as a single unit. |
| **Two-Stage Table** | A smart way to store data that saves space by not repeating the same patterns. | O(1) lookup using a block index (Stage 1) and bit-packed property data (Stage 2). |
| **Lattice Component** | A specific "module" or "slot" in our system that handles one job. | A numbered registry item (1-24) in the T3-Lattice v3.3 specification. |

## 📊 Performance Units & Targets

| Unit | Full Name | What it measures | Target |
| :--- | :--- | :--- | :--- |
| **GB/s** | Gigabytes per Second | **Throughput**: How much data we can scan in one second. | **1.8 GB/s** (SIMD) |
| **μs** | Microseconds | **Latency**: How long it takes to check a single message. | **4 μs** (SIMD) |
| **ms** | Milliseconds | **Startup**: How fast the program turns on. | **40 ms** (Smol Mode) |

## 🗺️ Intelligence Mapping Matrix

This matrix shows how Unicode properties are mapped to Lattice components for semantic routing.

| Unicode Property | Category | Lattice Component | Purpose in Sports Analytics | Performance Target |
| :--- | :--- | :--- | :--- | :--- |
| `isIDStart` | `L`, `Nl`, `Other_ID_Start` | **16: Compile** | Validating player IDs and system identifiers. | 1.5 GB/s |
| `isCurrency` | `Sc` (Currency) | **22: Env Exp** | Extracting betting odds and contract values ($ , £, €). | 2.0 GB/s |
| `isMath` | `Sm` (Math) | **1: TOML Config** | Parsing statistical formulas and performance metrics. | 1.8 GB/s |
| `isEmoji` | `So` (Other Symbol) | **11: Dashboard** | Sanitizing social media feeds and fan sentiment data. | 2.2 GB/s |
| `isWhitespace` | `Zs`, `Zl`, `Zp` | **10: Proxy** | Fast-skipping empty space in high-speed data streams. | 2.5 GB/s |

## 🛠️ Implementation Pattern: The "10x" Jump

To achieve the 10x performance jump, we move from **Scalar** (one-by-one) to **Vector** (16-at-a-time).

### ❌ Scalar (Slow: ~0.18 GB/s)
```typescript
// Checking characters one by one is like walking to the store for every single item.
for (const char of data) {
  if (isCurrency(char)) { /* ... */ }
}
```

### ✅ Vector (Fast: ~1.8 GB/s)
```typescript
// Vectorization is like using a 16-lane highway.
const vec: @Vector(16, u21) = load_16_chars(data);
const results = isCurrencyVector(vec); // Checks all 16 at once!
```

## 🔗 Source References & URLs

- **T3-Lattice v3.3 Spec**: "Advanced code analysis features, including ECMAScript-compliant Unicode identifier validation."
- **Bun Documentation**: [Bun Build & Compile](https://bun.sh/docs/bun-build#compile)
- **Bun Performance**: "2x faster startup with bytecode compilation."

## 🧪 Testing & Benchmarks

Every property must pass two checks:
1. **Correctness**: `bun test src/tests/unicode-validation.test.ts`
2. **Performance**: `bun run src/benchmarks/harness.ts` (Must hit >1.0 GB/s)
