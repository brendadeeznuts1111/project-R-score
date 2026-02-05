#!/usr/bin/env bun
/**
 * Component #139: Memory-Management
 * Primary API: Bun.ArrayBufferSink
 * Secondary API: Bun.allocUnsafe
 * Performance SLA: Zero-copy
 * Parity Lock: 3c4d...5e6f
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

export class MemoryManagement {
  private static instance: MemoryManagement;

  private constructor() {}

  static getInstance(): MemoryManagement {
    if (!this.instance) {
      this.instance = new MemoryManagement();
    }
    return this.instance;
  }

  createArrayBufferSink(): any {
    if (!feature("MEMORY_MANAGEMENT")) {
      return {
        write: () => {},
        end: () => new Uint8Array(),
      };
    }

    return new Bun.ArrayBufferSink();
  }

  allocUnsafe(size: number): Uint8Array {
    if (!feature("MEMORY_MANAGEMENT")) {
      return new Uint8Array(size);
    }

    return Bun.allocUnsafe(size);
  }

  copyWithin(array: Uint8Array, target: number, start: number, end?: number): Uint8Array {
    return array.copyWithin(target, start, end);
  }
}

export const memoryManagement = feature("MEMORY_MANAGEMENT")
  ? MemoryManagement.getInstance()
  : {
      createArrayBufferSink: () => ({
        write: () => {},
        end: () => new Uint8Array(),
      }),
      allocUnsafe: (size: number) => new Uint8Array(size),
      copyWithin: (array: Uint8Array, target: number, start: number, end?: number) =>
        array.copyWithin(target, start, end),
    };

export default memoryManagement;
