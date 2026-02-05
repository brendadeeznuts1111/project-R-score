/**
 * RegistryInfoKernel (Ticket 20.1.1.1.3)
 * Integration of bun info capabilities for Sovereign Registry inspection
 */

import { $ } from "bun";

export class RegistryInfoKernel {
  /**
   * Fetch package metadata from the Sovereign Registry
   */
  static async getPackageInfo(packageName: string, property?: string) {
    console.log(`🔍 Inspecting registry metadata for: ${packageName}...`);
    
    try {
      // In a Sovereign v4.0 environment, we wrap 'bun info' to use our mTLS/Bearer-secured registry
      // Note: bun info uses .npmrc configuration by default
      const args = ["info", packageName];
      if (property) args.push(property);
      args.push("--json");

      const proc = Bun.spawn(["bun", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();

      if (await proc.exited !== 0) {
        throw new Error(error || "Failed to fetch package info");
      }

      return JSON.parse(output);
    } catch (e) {
      console.error(`❌ Error fetching info for ${packageName}:`, e.message);
      return null;
    }
  }

  /**
   * Sovereign Package Management (SPM): get
   */
  static async pkgGet(property?: string) {
    const args = ["pm", "pkg", "get"];
    if (property) args.push(property);
    
    console.log(`📋 SPM: get ${property || "all"}`);
    const proc = Bun.spawn(["bun", ...args]);
    return await proc.exited;
  }

  /**
   * Sovereign Package Management (SPM): set
   */
  static async pkgSet(keyValues: string[], isJson: boolean = false) {
    const args = ["pm", "pkg", "set", ...keyValues];
    if (isJson) args.push("--json");
    
    console.log(`🖋️ SPM: set ${keyValues.join(" ")} ${isJson ? "[JSON]" : ""}`);
    const proc = Bun.spawn(["bun", ...args]);
    return await proc.exited;
  }

  /**
   * Sovereign Package Management (SPM): delete
   */
  static async pkgDelete(properties: string[]) {
    const args = ["pm", "pkg", "delete", ...properties];
    
    console.log(`🗑️ SPM: delete ${properties.join(" ")}`);
    const proc = Bun.spawn(["bun", ...args]);
    return await proc.exited;
  }

  /**
   * Sovereign Package Management (SPM): fix
   */
  static async pkgFix() {
    const args = ["pm", "pkg", "fix"];
    
    console.log("🛠️ SPM: fix");
    const proc = Bun.spawn(["bun", ...args]);
    return await proc.exited;
  }

  /**
   * Display high-density package summary
   */
  static async displaySummary(packageName: string) {
    const info = await this.getPackageInfo(packageName);
    if (!info) return;

    console.log(`
📦 ${info.name} (Latest: ${info["dist-tags"]?.latest || "unknown"})
==================================================
Description: ${info.description || "N/A"}
Homepage:    ${info.homepage || "N/A"}
License:     ${info.license || "N/A"}
Maintainers: ${info.maintainers?.map((m: any) => m.name).join(", ") || "N/A"}
Dependencies: ${Object.keys(info.dependencies || {}).length}
==================================================
    `);
  }
}

if (import.meta.main) {
  const pkg = process.argv[2] || "react";
  RegistryInfoKernel.displaySummary(pkg).catch(console.error);
}