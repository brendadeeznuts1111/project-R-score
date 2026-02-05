#!/usr/bin/env bun
/**
 * Component #132: UUID-Generator
 * Primary API: Bun.randomUUIDv7()
 * Performance SLA: <0.01ms
 * Parity Lock: 5a6b...7c8d
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class UUIDGenerator {
  private static instance: UUIDGenerator;

  private constructor() {}

  static getInstance(): UUIDGenerator {
    if (!this.instance) {
      this.instance = new UUIDGenerator();
    }
    return this.instance;
  }

  generateV7(): string {
    if (!feature("UUID_GENERATOR")) {
      return crypto.randomUUID();
    }

    return Bun.randomUUIDv7();
  }

  generateV4(): string {
    return crypto.randomUUID();
  }
}

export const uuidGenerator = feature("UUID_GENERATOR")
  ? UUIDGenerator.getInstance()
  : {
      generateV7: () => crypto.randomUUID(),
      generateV4: () => crypto.randomUUID(),
    };

export default uuidGenerator;
