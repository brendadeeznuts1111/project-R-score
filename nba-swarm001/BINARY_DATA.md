# Binary Data Optimization

This project leverages Bun's native binary data capabilities for optimal performance.

## Key Improvements

### Ledger Optimizations
- **DataView**: Uses DataView for efficient batch reading/writing
- **Batch Append**: Pre-allocates buffers for bulk operations
- **Stream Export**: Supports ReadableStream for large datasets
- **Blob Export**: Web API compatible exports

### Binary Utilities
- Efficient Buffer ↔ Uint8Array conversion
- Binary hashing using Bun's native CryptoHasher
- Stream processing utilities
- Memory-efficient concatenation

See code for usage examples.

