#!/usr/bin/env bun
/**
 * Component #140: Module-Resolver
 * Primary API: Bun.resolveSync()
 * Performance SLA: <1ms resolution
 * Parity Lock: 7g8h...9i0j
 * Status: VERIFIED
 */

import { feature } from "bun:bundle";

export class ModuleResolver {
  private static instance: ModuleResolver;

  private constructor() {}

  static getInstance(): ModuleResolver {
    if (!this.instance) {
      this.instance = new ModuleResolver();
    }
    return this.instance;
  }

  resolveSync(module: string, parent?: string): string {
    if (!feature("MODULE_RESOLVER")) {
      return module;
    }

    const startTime = performance.now();
    const result = Bun.resolveSync(module, parent || process.cwd());
    const duration = performance.now() - startTime;

    if (duration > 1) {
      console.warn(`⚠️  Module resolution SLA breach: ${duration.toFixed(2)}ms > 1ms`);
    }

    return result;
  }

  async resolve(module: string, parent?: string): Promise<string> {
    if (!feature("MODULE_RESOLVER")) {
      return module;
    }

    return Bun.resolve(module, parent || process.cwd());
  }
}

export const moduleResolver = feature("MODULE_RESOLVER")
  ? ModuleResolver.getInstance()
  : {
      resolveSync: (module: string) => module,
      resolve: async (module: string) => module,
    };

export default moduleResolver;
