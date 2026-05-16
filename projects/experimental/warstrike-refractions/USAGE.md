## Documentation Patterns

### Core TypedArray Patterns
```javascript
import { BUN_DOCS } from './lib/docs'

// TypedArray reference
console.log(BUN_DOCS.typedArray.base)    // https://bun.sh/docs/runtime/binary-data#typedarray

// With .com domain
console.log(BUN_DOCS.toCom(BUN_DOCS.typedArray.base))
// → https://bun.com/docs/runtime/binary-data#typedarray

// File reading patterns
console.log(BUN_DOCS.file.arrayBuffer)   // https://bun.sh/docs/guides/read-file#arraybuffer
console.log(BUN_DOCS.file.uint8Array)    // https://bun.sh/docs/guides/read-file#uint8array

// GitHub reference
console.log(BUN_DOCS.github.bunTypes())  // Latest commit
console.log(BUN_DOCS.github.bunTypes('specific-commit-hash'))
```

### Pattern Neighbors
```javascript
// Get related patterns
const neighbors = DOC_PATTERNS.getPatternNeighbors(BUN_DOCS.typedArray.base)
// → Returns file reading and streaming URLs

// Check if URL is Bun docs
DOC_PATTERNS.isBunUrl('https://bun.sh/docs/runtime/binary-data') // → true
```

### Code Comments
```javascript
// TypedArray reference: https://bun.sh/docs/runtime/binary-data#typedarray
// Related: File reading (https://bun.sh/docs/guides/read-file#arraybuffer)
// Related: Streaming (https://bun.sh/docs/api/streams#binary)

const buffer = new ArrayBuffer(16)
const view = new Uint8Array(buffer)
```

## Summary
**Total: ~60 lines** of actually useful code. No abstractions, no validators, just direct references with pattern awareness.
