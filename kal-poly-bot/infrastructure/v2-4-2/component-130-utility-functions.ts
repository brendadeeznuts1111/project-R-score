#!/usr/bin/env bun
/**
 * Component #130: Utility-Functions
 * Primary API: Bun.version (primary)
 * Secondary API: Bun.env (secondary)
 * Performance SLA: Zero-cost
 * Parity Lock: 7s8t...9u0v
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class UtilityFunctions {
  private static instance: UtilityFunctions;

  private constructor() {}

  static getInstance(): UtilityFunctions {
    if (!this.instance) {
      this.instance = new UtilityFunctions();
    }
    return this.instance;
  }

  getVersion(): string {
    return Bun.version;
  }

  getEnv(): Record<string, string> {
    return Bun.env as Record<string, string>;
  }

  isProduction(): boolean {
    return Bun.env.NODE_ENV === "production";
  }

  getPlatform(): string {
    return Bun.env.BUN_INSTALL || "bun";
  }
}

export const utilityFunctions = feature("UTILITY_FUNCTIONS")
  ? UtilityFunctions.getInstance()
  : {
      getVersion: () => "0.0.0",
      getEnv: () => ({}),
      isProduction: () => false,
      getPlatform: () => "bun",
    };

export default utilityFunctions;
