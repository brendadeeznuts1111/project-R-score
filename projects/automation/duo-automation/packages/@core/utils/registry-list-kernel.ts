/**
 * RegistryListKernel (Ticket 20.1.1.1.4)
 * Integration of bun pm ls capabilities for Sovereign fleet dependency inspection
 */

import { $ } from "bun";

export class RegistryListKernel {
  /**
   * List dependencies using bun pm ls
   */
  static async listDependencies(showAll: boolean = false) {
    console.log(`📋 Inspecting ${showAll ? "TOTAL " : ""}dependency tree...`);
    
    try {
      // Use bun pm ls for high-speed dependency listing
      const args = ["pm", "ls"];
      if (showAll) args.push("--all");
      
      const proc = Bun.spawn(["bun", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();

      if (await proc.exited !== 0) {
        throw new Error(error || "Failed to list dependencies");
      }

      console.log(output);
      return output;
    } catch (e) {
      console.error(`❌ Error listing dependencies:`, e.message);
      return null;
    }
  }
}

if (import.meta.main) {
  RegistryListKernel.listDependencies().catch(console.error);
}