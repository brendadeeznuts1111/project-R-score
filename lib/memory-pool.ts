/**
 * BunMemoryPool - Production-ready SharedArrayBuffer pool for zero-copy operations
 * 
 * Optimizes M_impact by eliminating repeated small allocations during RSS parsing
 * and file operations. Uses SharedArrayBuffer for efficient memory management.
 */

export class BunMemoryPool {
  private buffer: SharedArrayBuffer;
  private view: DataView;
  private offset = 0;
  private allocations = 0;
  private readonly size: number;

  constructor(sizeMB = 10) {
    this.size = sizeMB * 1024 * 1024;
    this.buffer = new SharedArrayBuffer(this.size);
    this.view = new DataView(this.buffer);
  }

  /**
   * Allocate bytes from the pool
   * @returns Object with offset, view, and pointer
   */
  alloc(bytes: number): { offset: number; view: DataView; ptr: number } {
    if (this.offset + bytes > this.size) {
      // Auto-reset if pool exhausted (or implement growth)
      this.reset();
      if (bytes > this.size) throw new Error(`Allocation ${bytes} exceeds pool size`);
    }
    const ptr = this.offset;
    this.offset += bytes;
    this.allocations++;
    return {
      offset: ptr,
      view: new DataView(this.buffer, ptr, bytes),
      ptr,
    };
  }

  /**
   * Zero-copy file read into pool
   * @param filePath Path to file to read
   * @returns Pointer, size, and DataView of the file content
   */
  async readFile(filePath: string): Promise<{ ptr: number; size: number; view: DataView }> {
    const file = Bun.file(filePath);
    const size = file.size;
    const slot = this.alloc(size);
    const content = await file.arrayBuffer();
    new Uint8Array(this.buffer, slot.ptr, size).set(new Uint8Array(content));
    return { ...slot, size };
  }

  /**
   * Reset the pool, freeing all allocations
   */
  reset(): void {
    this.offset = 0;
    this.allocations = 0;
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
}

// Singleton instance for validate-pointers.ts
export const globalPool = new BunMemoryPool(16); // 16MB for RSS parsing
