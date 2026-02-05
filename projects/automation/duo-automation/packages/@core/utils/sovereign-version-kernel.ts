/**
 * SovereignVersionKernel (Ticket 20.1.1.1.5)
 * Integration of bun pm version capabilities for Sovereign fleet versioning
 */

import { $ } from "bun";

export class SovereignVersionKernel {
  /**
   * Version the system or audit current versioning
   */
  static async version(action?: string, options: string[] = []) {
    console.log(`🔢 Sovereign Versioning: ${action || "Audit"}...`);
    
    try {
      const args = ["pm", "version"];
      if (action) {
        args.push(action);
        // Force versioning even if git is dirty for autonomous operations
        if (!options.includes("--force") && !options.includes("-f")) {
          args.push("--force");
        }
      }
      if (options.length > 0) args.push(...options);
      
      const proc = Bun.spawn(["bun", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();

      if (await proc.exited !== 0) {
        throw new Error(error || "Versioning operation failed");
      }

      console.log(output);
      return output;
    } catch (e) {
      console.error("❌ Versioning error:", e.message);
      return null;
    }
  }
}

if (import.meta.main) {
  const action = process.argv[2];
  const options = process.argv.slice(3);
  SovereignVersionKernel.version(action, options).catch(console.error);
}