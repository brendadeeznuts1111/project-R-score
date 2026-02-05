# Version Alignment with Bun's Official Benchmarks

## Mitata Version

**Bun's official version**: `mitata@0.1.14`  
**Our version**: `mitata@1.0.34`

### Rationale

We're using a newer version of Mitata (1.0.34) which includes:
- Improved performance
- Better statistical analysis
- Enhanced JSON output support
- Bug fixes and stability improvements

The API is compatible, so benchmarks work identically. Using the newer version provides better performance and features while maintaining compatibility with Bun's benchmark structure.

## Structure Alignment

✅ **Package.json structure** - Matches Bun's pattern:
- Separate `package.json` in benchmark directory
- Scripts for individual benchmarks
- `all` script to run everything
- `all:json` script for CI/CD

✅ **Mitata wrapper** - Aligned with Bun's `runner.mjs`:
- Same function signatures
- Same JSON output handling
- Same export pattern

✅ **Benchmark organization** - Follows Bun's patterns:
- Uses `group()` for related benchmarks
- Uses `bench()` for individual operations
- Includes warmup iterations
- Provides statistical analysis

## Compatibility

All benchmarks are compatible with both versions:
- `mitata@0.1.14` (Bun's version)
- `mitata@1.0.34` (Our version)

The newer version provides better performance and features while maintaining API compatibility.

## Reference

- [Bun's Benchmark Lockfile](https://github.com/oven-sh/bun/blob/main/bun.lockb)
- [Bun's Benchmark Package.json](https://github.com/oven-sh/bun/tree/main/bench)
