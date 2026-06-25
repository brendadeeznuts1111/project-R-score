# Bun.spawnSync() Performance Fix - Linux ARM64

## Overview

Bun v1.3.6 fixes a critical performance regression where `Bun.spawnSync()` was up to **30x slower** than expected on Linux systems with high file descriptor limits, particularly affecting ARM64 architecture.

## The Problem

### Root Cause

The issue occurred because the `close_range()` syscall number wasn't being defined at compile time on older glibc versions (before 2.34), causing Bun to fall back to iterating through all possible file descriptors individually.

### Performance Impact

```typescript
// Before: ~13ms per spawn with default ulimit
for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);

// After: ~0.4ms per spawn
for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);
```

### Technical Details

1. **Missing syscall definition**: `close_range()` syscall number not available
2. **Fallback mechanism**: Iterate through FDs 0-65535
3. **System call overhead**: Each `close()` call on non-existent FD
4. **Result**: ~13ms additional overhead per `spawnSync()`

## The Solution

### Implementation

The fix hardcodes the `close_range()` syscall number for ARM64 architecture, ensuring it's available at compile time regardless of glibc version.

### Code Changes

```c
// ARM64 close_range syscall number
#ifndef __NR_close_range
#define __NR_close_range 436
#endif
```

### Benefits

- ✅ **30x faster** `spawnSync()` on Linux ARM64
- ✅ Eliminates slow fallback path
- ✅ Works with older glibc versions
- ✅ Maintains compatibility

## Performance Benchmarks

### Test Environment

- **Platform**: Linux ARM64
- **glibc**: < 2.34 (older versions)
- **File descriptor limit**: Default ulimit (typically 1024)

### Results

| Metric         | Before Fix | After Fix | Improvement      |
|----------------|------------|-----------|------------------|
| Time per spawn | ~13ms      | ~0.4ms    | **32.5x faster** |
| 100 spawns     | ~1300ms    | ~40ms     | **32.5x faster** |
| Overhead       | 13ms       | 0.4ms     | **Eliminated**   |

### Code Example

```typescript
// Benchmark test
const SPAWN_COUNT = 100;

console.time("spawnSync");
for (let i = 0; i < SPAWN_COUNT; i++) {
  Bun.spawnSync(["true"]);
}
console.timeEnd("spawnSync");

// Before: ~1300ms
// After: ~40ms
```

## Platform Impact

### Most Affected

- **Linux ARM64**: Maximum improvement (~30x)
- **Older glibc**: < 2.34 versions
- **High FD limits**: Systems with large ulimit values

### Also Benefits

- **Linux x86_64**: Some improvement expected
- **Other architectures**: If close_range() is available

### Not Affected

- **macOS**: Uses different syscalls
- **Windows**: Different process spawning mechanism

## Detection

### How to Check if Fixed

```typescript
// Run this benchmark
const start = performance.now();
Bun.spawnSync(["true"]);
const end = performance.now();

const time = (end - start) * 1000; // ms
console.log(`Time per spawn: ${time.toFixed(3)}ms`);

// < 1ms = Fixed
// > 10ms = Likely using fallback
```

### System Check

```bash
# Check glibc version
ldd --version

# Check file descriptor limits
ulimit -n
```

## Migration Guide

### No Changes Required
The fix is transparent - existing code automatically benefits:

```typescript
// This code is now ~30x faster on Linux ARM64
const result = Bun.spawnSync(["echo", "hello"]);
// This is an example of a code that benefits from the fix
```

### Best Practices

1. **Monitor performance**: If spawns are still slow, check FD limits
2. **Update glibc**: Consider updating to glibc 2.34+ if possible
3. **Test on target**: Verify performance on production systems

## Technical Deep Dive

### close_range() Syscall

- **Purpose**: Efficiently close a range of file descriptors
- **Introduced**: Linux 5.9, glibc 2.34
- **ARM64 number**: 436
- **Benefits**: Single syscall vs thousands

### Fallback Path (Before Fix)

```c
// Inefficient fallback
for (int fd = low; fd <= high; fd++) {
    close(fd); // 65K syscalls in worst case
}
```

### Optimized Path (After Fix)

```c
// Efficient syscall
syscall(__NR_close_range, low, high, 0); // Single syscall
```

## Conclusion

This fix represents a significant performance improvement for Bun users on Linux ARM64:

- 🚀 **30x faster** process spawning
- 🔧 **Transparent** - no code changes needed
- 🛡️ **Compatible** - works with older glibc
- 📈 **Scalable** - benefits increase with FD limits

The fix ensures Bun remains one of the fastest JavaScript runtimes for process management on Linux ARM64 systems.
