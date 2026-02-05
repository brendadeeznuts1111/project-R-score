#!/usr/bin/env bun
/**
 * Component #129: Import-Meta-Resolver
 * Primary API: import.meta
 * Secondary API: Bun.fileURLToPath
 * Performance SLA: <1ms resolution
 * Parity Lock: 3o4p...5q6r
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

export class ImportMetaResolver {
  private static instance: ImportMetaResolver;

  private constructor() {}

  static getInstance(): ImportMetaResolver {
    if (!this.instance) {
      this.instance = new ImportMetaResolver();
    }
    return this.instance;
  }

  resolvePath(importMeta: ImportMeta, relativePath: string): string {
    if (!feature("IMPORT_META_RESOLVER")) {
      return relativePath;
    }

    const startTime = performance.now();
    const url = new URL(relativePath, importMeta.url);
    const path = Bun.fileURLToPath(url);
    const duration = performance.now() - startTime;

    if (duration > 1) {
      console.warn(`⚠️  Import meta resolution SLA breach: ${duration.toFixed(2)}ms > 1ms`);
    }

    return path;
  }

  getDir(importMeta: ImportMeta): string {
    if (!feature("IMPORT_META_RESOLVER")) {
      return "./";
    }

    return Bun.fileURLToPath(new URL(".", importMeta.url));
  }
}

export const importMetaResolver = feature("IMPORT_META_RESOLVER")
  ? ImportMetaResolver.getInstance()
  : {
      resolvePath: (importMeta: ImportMeta, relativePath: string) => relativePath,
      getDir: () => "./",
    };

export default importMetaResolver;
