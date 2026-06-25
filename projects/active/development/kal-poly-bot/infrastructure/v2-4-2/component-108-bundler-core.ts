#!/usr/bin/env bun
/**
 * Component #108: Bundler-Core
 * Primary API: Bun.build()
 * Secondary API: Bun.Transpiler
 * Performance SLA: 150 pages/sec (with parallel workers)
 * Parity Lock: 9i0j...1k2l
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

interface BuildOptions {
  entrypoints: string[];
  outdir?: string;
  target?: "browser" | "node" | "bun";
  splitting?: boolean;
  minify?: boolean;
  sourcemap?: "inline" | "external" | "none";
}

export class BundlerCore {
  private static instance: BundlerCore;

  private constructor() {}

  static getInstance(): BundlerCore {
    if (!this.instance) {
      this.instance = new BundlerCore();
    }
    return this.instance;
  }

  async build(options: BuildOptions): Promise<any> {
    if (!feature("BUNDLER_CORE")) {
      return Bun.build({
        entrypoints: options.entrypoints,
        outdir: options.outdir || "./dist",
        target: options.target || "bun",
      });
    }

    const startTime = performance.now();
    
    const result = await Bun.build({
      entrypoints: options.entrypoints,
      outdir: options.outdir || "./dist",
      target: options.target || "bun",
      splitting: options.splitting ?? true,
      minify: options.minify ?? true,
      sourcemap: options.sourcemap || "external",
      // Parallel workers for 150 pages/sec target
      experimental: {
        parallel: true,
      },
    });

    const duration = performance.now() - startTime;
    const pagesPerSec = result.outputs.length / (duration / 1000);

    if (pagesPerSec < 150) {
      console.warn(`⚠️  Bundler SLA breach: ${pagesPerSec.toFixed(1)} pages/sec < 150`);
    }

    return result;
  }

  async transpile(code: string, filename: string): Promise<string> {
    const transpiler = new Bun.Transpiler({
      loader: filename.endsWith(".ts") ? "ts" : "js",
    });

    return transpiler.transform(code);
  }
}

export const bundlerCore = feature("BUNDLER_CORE")
  ? BundlerCore.getInstance()
  : {
      build: async (options: BuildOptions) => Bun.build(options),
      transpile: async (code: string, filename: string) => {
        const transpiler = new Bun.Transpiler({
          loader: filename.endsWith(".ts") ? "ts" : "js",
        });
        return transpiler.transform(code);
      },
    };

export default bundlerCore;
