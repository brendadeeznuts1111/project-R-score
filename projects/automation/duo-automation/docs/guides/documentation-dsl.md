# Empire Documentation DSL: Abstraction Compression

This guide explains the markup and methodology used for the "Pattern Matrix" documentation style, which achieves up to 78% token savings by shifting from linear function documentation to pattern-based inference.

## The Semantic Markup

The matrix uses a specific set of symbols to signal semantic meaning to both humans and AI models:

### 1. § (Section/Pattern Anchor)

Defines a reusable API pattern.

- **Format**: `§Name:Count`
- **Example**: `§Filter:42` (42 functions follow the Filter pattern)
- **Inference**: Signals that the implementation follows a standardized interface (`EmpireOneLiner`).

### 2. Constructor Inference

Instead of full parameter documentation, use symbolic representation:

- `new Pattern(input)` -> Single argument pattern.
- `new Pattern({init})` -> Configuration object pattern.

### 3. Semantics Column

Describes the shape of the `exec()` return object.

- **Format**: `{key1, key2}`
- **Example**: `{result, groups}` implies `PatternResult` containing those properties.

### 4. Multiplier Column

Indicates the performance overhead compared to the system baseline (usually `URLPattern`).

- **Example**: `10x` (10 times faster than baseline).

## Mathematical Justification

The DSL amortizes the cost of documentation after the 1.3 function breakpoint.

```text
Total Tokens = P + (n * I)
P (Pattern Overhead): ~150 tokens
I (Per-Item Matrix Row): ~35 tokens
L (Legacy Per-Item Doc): ~150 tokens

Savings at n=16: ~70%
```

## Best Practices

1. **Maintain Interface Symmetries**: Only apply a pattern (e.g., `§Filter`) if the functions literally share the exact same method signatures.
2. **Contextual Inference**: Leverage the fact that the pattern name (e.g., `Gate`, `Upload`) implies behavior (Validation vs. I/O).
3. **Implicit Error Handling**: Document standard error behavior once in the "Usage Inference" section, rather than repeating for every function.
