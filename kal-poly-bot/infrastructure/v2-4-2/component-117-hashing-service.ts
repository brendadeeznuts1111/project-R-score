#!/usr/bin/env bun
/**
 * Component #117: Hashing-Service
 * Primary API: Bun.CryptoHasher (primary)
 * Secondary API: Bun.hash (secondary)
 * Performance SLA: 175x baseline (SIMD)
 * Parity Lock: 5s6t...7u8v
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class HashingService {
  private static instance: HashingService;

  private constructor() {}

  static getInstance(): HashingService {
    if (!this.instance) {
      this.instance = new HashingService();
    }
    return this.instance;
  }

  hash(data: string, algorithm: string = "sha256"): string {
    if (!feature("HASHING_SERVICE")) {
      return Bun.hash(data).toString();
    }

    const hasher = new Bun.CryptoHasher(algorithm);
    hasher.update(data);
    return hasher.digest("hex");
  }

  verify(data: string, hash: string, algorithm: string = "sha256"): boolean {
    const newHash = this.hash(data, algorithm);
    return newHash === hash;
  }
}

export const hashingService = feature("HASHING_SERVICE")
  ? HashingService.getInstance()
  : {
      hash: (data: string) => Bun.hash(data).toString(),
      verify: (data: string, hash: string) => Bun.hash(data).toString() === hash,
    };

export default hashingService;
