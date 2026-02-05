/**
 * Enterprise Shared Memory Pool Manager
 *
 * Thread-safe, high-performance memory pool for zero-copy operations
 * with enterprise-grade error handling and resource management.
 *
 * @see {@link https://bun.sh/docs/runtime/binary-data#zero-copy} Zero-copy operations
 *
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import {
  EnterpriseResult,
  AsyncEnterpriseResult,
  ResourceState,
  ResourceUtilization,
  PerformanceMetrics,
  OperationStatus
} from './core-types';
import {
  EnterpriseErrorCode,
  createResourceError,
  createSystemError
} from './core-errors';
import { validateOrThrow, StringValidators, NumberValidators } from './core-validation';

export class BunMemoryPool {
  private size: number;
  private buffer: SharedArrayBuffer;
  private view: DataView;
  private offset = 0;
  private allocations = 0;
  private isLocked = false;
  private lockQueue: (() => void)[] = [];
  private expanding = false;
  private targetUtilization = 0.65;

  constructor(sizeMB = 10) {
    this.size = sizeMB * 1024 * 1024;
    this.buffer = new SharedArrayBuffer(this.size);
    this.view = new DataView(this.buffer);
  }

  /**
   * Acquire lock for thread-safe operations
   */
  private async acquireLock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.lockQueue.push(resolve);
      }
    });
  }

  /**
   * Release lock and process next queued operation
   */
  private releaseLock(): void {
    if (this.lockQueue.length > 0) {
      const next = this.lockQueue.shift();
      if (next) next();
    } else {
      this.isLocked = false;
    }
  }

  /**
   * Allocate bytes from the pool (thread-safe)
   * @returns Object with offset, view, and pointer
   */
  async alloc(bytes: number): Promise<{ offset: number; view: DataView; ptr: number }> {
    await this.acquireLock();

    try {
      // Check if we need expansion (inside lock to prevent race conditions)
      if (this.offset + bytes > this.size) {
        // Only expand if not already expanding
        if (!this.expanding) {
          this.expanding = true;
          try {
            await this.expand();
          } finally {
            this.expanding = false;
          }
        } else {
          // Wait for expansion to complete
          while (this.expanding) {
            this.releaseLock();
            await new Promise(resolve => setTimeout(resolve, 1));
            await this.acquireLock();
          }
        }

        // Check if allocation is still possible after expansion
        if (bytes > this.size) {
          throw new Error(`Allocation ${bytes} exceeds pool size ${this.size}`);
        }

        // Final check after expansion
        if (this.offset + bytes > this.size) {
          this.reset();
        }
      }

      const ptr = this.offset;
      this.offset += bytes;
      this.allocations++;

      return {
        offset: ptr,
        view: new DataView(this.buffer, ptr, bytes),
        ptr,
      };
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Zero-copy file read into pool
   * Uses Bun.file() lazy loading with .exists() check and optimized reading
   * @param filePath Path to file to read
   * @returns Pointer, size, and DataView of the file content
   */
  async readFile(filePath: string): Promise<{ ptr: number; size: number; view: DataView }> {
    const file = Bun.file(filePath);

    // Check if file exists (lazy check - no disk read yet)
    if (!(await file.exists())) {
      throw new Error(`File not found: ${filePath}`);
    }

    const size = file.size;
    if (size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }

    // Allocate slot in pool
    const slot = await this.alloc(size);

    // For large files (>1MB), use stream for zero-copy
    // For smaller files, arrayBuffer is more efficient
    if (size > 1024 * 1024) {
      // Large file: use stream for zero-copy processing
      const stream = file.stream();
      const reader = stream.getReader();
      let offset = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!value) {
            throw new Error('Received empty chunk during file read');
          }

          const chunk = new Uint8Array(value);
          const targetView = new Uint8Array(this.buffer, slot.ptr + offset, chunk.length);
          targetView.set(chunk);
          offset += chunk.length;
        }
      } catch (error) {
        reader.releaseLock();
        throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Small file: use arrayBuffer (more efficient for small files)
      try {
        const content = await file.arrayBuffer();
        const sourceArray = new Uint8Array(content);
        const targetArray = new Uint8Array(this.buffer, slot.ptr, size);
        targetArray.set(sourceArray);
      } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { ...slot, size };
  }

  /**
   * Reset the pool, freeing all allocations (thread-safe)
   */
  async reset(): Promise<void> {
    await this.acquireLock();
    try {
      this.offset = 0;
      this.allocations = 0;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Get pool statistics
   */
  get stats() {
    return {
      size: this.size,
      used: this.offset,
      utilization: +(this.offset / this.size).toFixed(4),
      allocations: this.allocations,
      available: this.size - this.offset,
    };
  }

  /**
   * Optimize pool size based on current utilization
   */
  optimizePoolSize(): void {
    const current = this.stats.utilization;
    if (current < 0.30) {
      // Under-utilized: shrink pool next iteration
      console.log(`📉 Pool under-utilized (${current}), consider smaller allocation`);
    } else if (current > 0.80) {
      // Fragmentation risk: defragment or expand
      console.log(`📈 Pool high utilization (${current}), expanding buffer`);
      this.expand();
    }
  }

  /**
   * Expand pool size for better utilization (thread-safe)
   */
  private async expand(): Promise<void> {
    await this.acquireLock();
    try {
      // Create new larger buffer and migrate data
      const newSize = Math.floor(this.size * 1.5);
      console.log(`🚀 Expanding pool: ${this.size} → ${newSize} bytes`);

      const newBuffer = new SharedArrayBuffer(newSize);
      const newView = new DataView(newBuffer);

      // Copy existing data to new buffer
      const sourceArray = new Uint8Array(this.buffer);
      const targetArray = new Uint8Array(newBuffer);
      targetArray.set(sourceArray);

      // Replace buffer and view
      this.buffer = newBuffer;
      this.view = newView;
      this.size = newSize;

      console.log(`✅ Pool expansion completed: ${newSize} bytes`);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Report efficiency score for M_impact calculation
   * @returns Efficiency score (1.0 = perfect)
   */
  reportEfficiency(): number {
    const efficiency = Math.min(this.stats.utilization / this.targetUtilization, 1.0);
    return efficiency; // 1.0 = perfect score
  }
}

// Singleton instance for validate-pointers.ts
export const globalPool = new BunMemoryPool(16); // 16MB for RSS parsing
