/**
 * @fileoverview Ring Buffer for Zero-GC Tick Storage
 * @description Memory-efficient circular buffer for tick data
 * @module tick-analysis/collector/ring-buffer
 */

/**
 * Ring buffer implementation for zero-GC tick storage
 */
export class RingBuffer<T> {
  private buffer: (T | null)[];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  write(item: T): boolean {
    if (this.count === this.capacity) {
      return false; // Buffer full
    }

    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    this.count++;

    return true;
  }

  read(): T | null {
    if (this.count === 0) {
      return null;
    }

    const item = this.buffer[this.tail];
    this.buffer[this.tail] = null; // Clear reference
    this.tail = (this.tail + 1) % this.capacity;
    this.count--;

    return item;
  }

  get utilization(): number {
    return this.count / this.capacity;
  }

  get isEmpty(): boolean {
    return this.count === 0;
  }

  get isFull(): boolean {
    return this.count === this.capacity;
  }

  get position(): number {
    return this.head;
  }

  get size(): number {
    return this.count;
  }
}
