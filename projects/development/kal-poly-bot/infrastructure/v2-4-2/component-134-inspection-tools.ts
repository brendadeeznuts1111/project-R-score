#!/usr/bin/env bun
/**
 * Component #134: Inspection-Tools
 * Primary API: Bun.inspect() (primary)
 * Secondary API: Bun.deepEquals (secondary)
 * Performance SLA: <1ms (small objects)
 * Parity Lock: 3i4j...5k6l
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

export class InspectionTools {
  private static instance: InspectionTools;

  private constructor() {}

  static getInstance(): InspectionTools {
    if (!this.instance) {
      this.instance = new InspectionTools();
    }
    return this.instance;
  }

  inspect(value: any, options?: any): string {
    if (!feature("INSPECTION_TOOLS")) {
      return JSON.stringify(value);
    }

    const startTime = performance.now();
    const result = Bun.inspect(value, options);
    const duration = performance.now() - startTime;

    if (duration > 1) {
      console.warn(`⚠️  Inspection SLA breach: ${duration.toFixed(2)}ms > 1ms`);
    }

    return result;
  }

  deepEquals(a: any, b: any): boolean {
    if (!feature("INSPECTION_TOOLS")) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return Bun.deepEquals(a, b);
  }

  formatError(error: any): string {
    return Bun.inspect(error);
  }
}

export const inspectionTools = feature("INSPECTION_TOOLS")
  ? InspectionTools.getInstance()
  : {
      inspect: (value: any) => JSON.stringify(value),
      deepEquals: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      formatError: (error: any) => String(error),
    };

export default inspectionTools;
