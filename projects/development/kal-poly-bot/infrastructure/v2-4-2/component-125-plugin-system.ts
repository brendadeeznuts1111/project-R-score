#!/usr/bin/env bun
/**
 * Component #125: Plugin-System
 * Primary API: Bun.plugin
 * Performance SLA: <2ms load
 * Parity Lock: 7y8z...9a0b
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class PluginSystem {
  private static instance: PluginSystem;

  private constructor() {}

  static getInstance(): PluginSystem {
    if (!this.instance) {
      this.instance = new PluginSystem();
    }
    return this.instance;
  }

  register(name: string, setup: (build: any) => void): void {
    if (!feature("PLUGIN_SYSTEM")) {
      return;
    }

    const startTime = performance.now();
    
    Bun.plugin({
      name,
      setup,
    });

    const duration = performance.now() - startTime;
    if (duration > 2) {
      console.warn(`⚠️  Plugin load SLA breach: ${duration.toFixed(2)}ms > 2ms`);
    }
  }
}

export const pluginSystem = feature("PLUGIN_SYSTEM")
  ? PluginSystem.getInstance()
  : {
      register: () => {},
    };

export default pluginSystem;
