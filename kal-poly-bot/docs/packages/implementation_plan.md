# Implementation Plan: Bun.Semaphore/RWLock Concurrency Primitives

[Overview]
Implement polyfill concurrency primitives (Semaphore and RWLock) for the surgical-precision-mcp project that match the expected Bun API and work in current Bun v1.3.5.

The current Bun v1.3.5 does not include native `Bun.Semaphore` or `Bun.RWLock` APIs - these are planned for a future version. This implementation provides high-performance polyfill classes that:
- Match the expected Bun API pattern (acquire/release for Semaphore, acquireRead/acquireWrite/releaseRead/releaseWrite for RWLock)
- Use Promise-based async/await patterns
- Work in current Bun v1.3.5 runtime
- Can be transparently replaced with native implementations when they become available
- Follow surgical precision standards: zero-collateral operations, 98.5%+ success rates, sub-100ms critical operations
- Integrate with existing BunTypes pattern in `precision-utils.ts` for native detection with fallback

The implementation follows the existing pattern established by BunTypes (e.g., `Bun.isTypedArray` with fallback to `ArrayBuffer.isView`).

[Types]
Type definitions for Semaphore and RWLock concurrency primitives matching expected Bun API.

```typescript
// Semaphore Types
interface SemaphoreOptions {
  permits: number;  // Maximum concurrent permits (default: 1)
  timeout?: number; // Optional timeout in milliseconds
}

interface Semaphore {
  acquire(): Promise<void>;
  release(): void;
  tryAcquire(): boolean;
  availablePermits(): number;
  getQueueLength(): number;
}

// RWLock Types
interface RWLockOptions {
  fairness?: 'read-priority' | 'write-priority' | 'fair';  // Lock fairness policy
  timeout?: number; // Optional timeout in milliseconds
}

interface RWLock {
  acquireRead(): Promise<void>;
  acquireWrite(): Promise<void>;
  releaseRead(): void;
  releaseWrite(): void;
  tryAcquireRead(): boolean;
  tryAcquireWrite(): boolean;
  getReadLockCount(): number;
  isWriteLocked(): boolean;
  getQueueLength(): number;
}

// Export types for external use
export type { Semaphore, SemaphoreOptions, RWLock, RWLockOptions };
```

[Files]
New and modified files for concurrency primitives implementation.

**New Files:**
1. `surgical-precision-mcp/concurrency-primitives.ts`
   - Main implementation file containing Semaphore and RWLock polyfill classes
   - Native detection with automatic fallback
   - Exported factory functions and types
   - ~300 lines

2. `surgical-precision-mcp/__tests__/concurrency-primitives.test.ts`
   - Comprehensive test suite for both Semaphore and RWLock
   - Tests: basic acquire/release, concurrent access limits, queue ordering, timeout handling, zero-collateral verification
   - ~200 lines

3. `surgical-precision-mcp/__tests__/concurrency-primitives.bench.ts`
   - Performance benchmarks for both primitives
   - Metrics: acquire latency, release latency, queue throughput, contention handling
   - ~150 lines

4. `surgical-precision-mcp/types/concurrency.d.ts`
   - TypeScript declarations for Semaphore and RWLock types
   - Augments global Bun namespace for future compatibility
   - ~50 lines

**Modified Files:**
1. `surgical-precision-mcp/precision-utils.ts`
   - Add exports for `BunConcurrency` namespace (similar to `BunTypes`)
   - Add Semaphore and RWLock factory functions with native detection
   - ~30 lines added

2. `surgical-precision-mcp/__tests__/bun-v1.3.5-features.test.ts`
   - Update skipped tests to use polyfill implementation
   - Change `test.skip` to active tests with polyfill
   - Add import for concurrency primitives
   - ~20 lines modified

3. `surgical-precision-mcp/surgical-precision-bench.ts`
   - Update Category 6 (Semaphore) to use polyfill
   - Update Category 7 (RWLock) to use polyfill
   - ~40 lines modified

4. `surgical-precision-mcp/benchmark-results-summary.md`
   - Update feature status from "Not available" to "Polyfill active"
   - ~5 lines modified

5. `surgical-precision-mcp/index.ts`
   - Add exports for concurrency primitives
   - ~3 lines added

[Functions]
Function signatures and purposes for new and modified functions.

**New Functions (in concurrency-primitives.ts):**

1. `createSemaphore(permits: number = 1, options?: SemaphoreOptions): Semaphore`
   - Factory function that returns native Bun.Semaphore if available, otherwise polyfill
   - File: `concurrency-primitives.ts`

2. `createRWLock(options?: RWLockOptions): RWLock`
   - Factory function that returns native Bun.RWLock if available, otherwise polyfill
   - File: `concurrency-primitives.ts`

3. `class SemaphorePolyfill implements Semaphore`
   - `constructor(permits: number, options?: SemaphoreOptions)`
   - `acquire(): Promise<void>` - Wait for a permit, queues if none available
   - `release(): void` - Release a permit, unblocks waiting acquirers
   - `tryAcquire(): boolean` - Non-blocking acquire attempt
   - `availablePermits(): number` - Get current available permits
   - `getQueueLength(): number` - Get number of waiting acquirers
   - File: `concurrency-primitives.ts`

4. `class RWLockPolyfill implements RWLock`
   - `constructor(options?: RWLockOptions)`
   - `acquireRead(): Promise<void>` - Acquire read lock (multiple readers allowed)
   - `acquireWrite(): Promise<void>` - Acquire exclusive write lock
   - `releaseRead(): void` - Release read lock
   - `releaseWrite(): void` - Release write lock
   - `tryAcquireRead(): boolean` - Non-blocking read lock attempt
   - `tryAcquireWrite(): boolean` - Non-blocking write lock attempt
   - `getReadLockCount(): number` - Current active readers
   - `isWriteLocked(): boolean` - Check if write lock is held
   - `getQueueLength(): number` - Total waiting (readers + writers)
   - File: `concurrency-primitives.ts`

**Modified Functions:**

1. `BunConcurrency.Semaphore(permits, options)` (new in precision-utils.ts)
   - Add to BunTypes pattern for consistency
   - Wrapper that detects native availability

2. `BunConcurrency.RWLock(options)` (new in precision-utils.ts)
   - Add to BunTypes pattern for consistency
   - Wrapper that detects native availability

[Classes]
Class definitions and hierarchies.

**New Classes:**

1. `SemaphorePolyfill` (concurrency-primitives.ts)
   - Primary semaphore implementation
   - Internal queue management using Promise resolve callbacks
   - Key methods: acquire, release, tryAcquire, availablePermits, getQueueLength
   - Properties: _permits (number), _queue (Array<() => void>), _available (number)

2. `RWLockPolyfill` (concurrency-primitives.ts)
   - Read-write lock with multiple concurrent readers, exclusive writers
   - Internal state: readCount, writeCount, readQueue, writeQueue
   - Key methods: acquireRead, acquireWrite, releaseRead, releaseWrite, tryAcquireRead, tryAcquireWrite
   - Properties: _readCount (number), _writeLocked (boolean), _readQueue (Array), _writeQueue (Array)

**No classes modified or removed.**

[Dependencies]
No new npm dependencies required.

The implementation uses only:
- Native JavaScript Promise API (supported by Bun/Node)
- TypeScript for type definitions
- Existing project patterns and utilities

No external concurrency libraries needed - the polyfill is self-contained.

[Testing]
Testing strategy for concurrency primitives.

**Test File:** `surgical-precision-mcp/__tests__/concurrency-primitives.test.ts`

**Test Groups:**

1. **Semaphore Basic Operations** (5 tests)
   - Constructor with default permits
   - acquire() returns Promise
   - release() increases available permits
   - tryAcquire() non-blocking behavior
   - availablePermits() accuracy

2. **Semaphore Concurrency Control** (4 tests)
   - Limits concurrent access to permit count
   - Queues excess acquirers
   - FIFO queue ordering
   - Multiple sequential acquire/release cycles

3. **Semaphore Performance** (3 tests)
   - Sub-1ms acquire/release latency
   - 10k ops/sec throughput
   - No memory leaks in long-running scenarios

4. **RWLock Basic Operations** (6 tests)
   - Constructor with default options
   - acquireRead()/releaseRead() basic flow
   - acquireWrite()/releaseWrite() basic flow
   - tryAcquireRead() non-blocking
   - tryAcquireWrite() non-blocking
   - getReadLockCount()/isWriteLocked() accuracy

5. **RWLock Concurrent Reads** (3 tests)
   - Multiple simultaneous readers allowed
   - Readers block writers
   - Write lock waits for all readers

6. **RWLock Exclusive Writes** (3 tests)
   - Only one writer at a time
   - Writer blocks readers
   - Writer blocks other writers

7. **RWLock Fairness** (2 tests)
   - Queue ordering respects arrival order
   - No reader/writer starvation

8. **Zero-Collateral Verification** (3 tests)
   - No state corruption on error
   - Clean resource release on timeout
   - Proper cleanup after exceptions

**Benchmark File:** `surgical-precision-mcp/__tests__/concurrency-primitives.bench.ts`

**Benchmark Categories:**
- Semaphore acquire latency (1000 iterations)
- Semaphore release throughput (10000 operations)
- RWLock read acquire latency (1000 iterations)
- RWLock write acquire latency (1000 iterations)
- Contention scenario (100 concurrent workers)

[Implementation Order]
Sequential implementation steps to minimize conflicts.

1. **Create type definitions** (types/concurrency.d.ts)
   - Define interfaces for Semaphore and RWLock
   - Augment global Bun namespace
   - No dependencies on other changes

2. **Implement SemaphorePolyfill class** (concurrency-primitives.ts)
   - Core semaphore logic with Promise-based queue
   - Factory function with native detection
   - Standalone file, no imports from project

3. **Implement RWLockPolyfill class** (concurrency-primitives.ts)
   - Read-write lock logic with reader/writer queues
   - Factory function with native detection
   - Add to same file as Semaphore

4. **Add exports to precision-utils.ts**
   - Create BunConcurrency namespace
   - Export factory functions
   - Maintain consistency with BunTypes pattern

5. **Create test suite** (concurrency-primitives.test.ts)
   - Implement all test groups
   - Verify zero-collateral operation
   - Run and fix any issues

6. **Create benchmark suite** (concurrency-primitives.bench.ts)
   - Implement benchmark categories
   - Establish baseline metrics
   - Verify sub-100ms performance targets

7. **Update existing tests** (bun-v1.3.5-features.test.ts)
   - Change test.skip to active tests
   - Import and use polyfill
   - Verify tests pass

8. **Update existing benchmarks** (surgical-precision-bench.ts)
   - Update Category 6 (Semaphore) to use polyfill
   - Update Category 7 (RWLock) to use polyfill
   - Verify benchmark output

9. **Update documentation** (benchmark-results-summary.md)
   - Update feature status
   - Add benchmark results section
   - Document polyfill availability

10. **Export from index.ts**
    - Add exports for concurrency primitives
    - Verify MCP server still builds and runs

11. **Final verification**
    - Run full test suite: `bun test`
    - Run full benchmark: `bun run bench`
    - Verify all surgical precision standards met

---

*Last Updated: 2025-12-18*
*Implementation Target: surgical-precision-mcp v1.3.0*
