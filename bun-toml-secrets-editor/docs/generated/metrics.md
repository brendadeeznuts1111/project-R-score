# Performance Metrics

## API Performance

| API | Metrics |
|-----|---------|

## Performance Improvements in v1.3.7

- **Buffer.from()**: 50% faster using CPU intrinsics
- **Buffer.swap16()**: 1.8x faster
- **Buffer.swap64()**: 3.6x faster
- **Bun.wrapAnsi()**: 88x faster than manual wrapping
- **JSON5 parsing**: Native performance with comments
- **HTTP headers**: Zero-copy header preservation
