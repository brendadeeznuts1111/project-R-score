#!/usr/bin/env bun
/**
 * Component #142: Low-Level-Internals
 * Primary API: Bun.mmap
 * Performance SLA: Hardware-speed
 * Parity Lock: 5o6p...7q8r
 * Status: ISOLATED
 */

import { feature } from "bun:bundle";

export class LowLevelInternals {
  private static instance: LowLevelInternals;

  private constructor() {}

  static getInstance(): LowLevelInternals {
    if (!this.instance) {
      this.instance = new LowLevelInternals();
    }
    return this.instance;
  }

  mmap(path: string): Uint8Array {
    if (!feature("LOW_LEVEL_INTERNALS")) {
      return new Uint8Array();
    }

    return Bun.mmap(path);
  }
}

export const lowLevelInternals = feature("LOW_LEVEL_INTERNALS")
  ? LowLevelInternals.getInstance()
  : {
      mmap: () => new Uint8Array(),
    };

export default lowLevelInternals;
