#!/usr/bin/env bun
/**
 * Component #114: Transpiler-Service
 * Primary API: Bun.Transpiler
 * Performance SLA: 0.8ms parse time
 * Parity Lock: 3g4h...5i6j
 * Status: VERIFIED
 */

import { feature } from "bun:bundle";

interface TranspilerConfig {
  loader: "js" | "ts" | "jsx" | "tsx";
  target?: "bun" | "node" | "browser";
}

export class TranspilerService {
  private static instance: TranspilerService;

  private constructor() {}

  static getInstance(): TranspilerService {
    if (!this.instance) {
      this.instance = new TranspilerService();
    }
    return this.instance;
  }

  async transform(code: string, config: TranspilerConfig): Promise<string> {
    if (!feature("TRANSPILER_SERVICE")) {
      const transpiler = new Bun.Transpiler({
        loader: config.loader,
      });
      return transpiler.transform(code);
    }

    const startTime = performance.now();
    
    const transpiler = new Bun.Transpiler({
      loader: config.loader,
      target: config.target || "bun",
    });

    const result = transpiler.transform(code);
    const duration = performance.now() - startTime;

    if (duration > 0.8) {
      console.warn(`⚠️  Transpiler SLA breach: ${duration.toFixed(2)}ms > 0.8ms`);
    }

    return result;
  }

  async scan(code: string): Promise<string[]> {
    const transpiler = new Bun.Transpiler({
      loader: "ts",
    });
    return transpiler.scan(code);
  }
}

export const transpilerService = feature("TRANSPILER_SERVICE")
  ? TranspilerService.getInstance()
  : {
      transform: async (code: string, config: TranspilerConfig) => {
        const transpiler = new Bun.Transpiler({
          loader: config.loader,
        });
        return transpiler.transform(code);
      },
      scan: async (code: string) => {
        const transpiler = new Bun.Transpiler({ loader: "ts" });
        return transpiler.scan(code);
      },
    };

export default transpilerService;
