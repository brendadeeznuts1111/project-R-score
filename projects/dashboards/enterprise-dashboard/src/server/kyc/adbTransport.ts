/**
 * [KYC][TRANSPORT][CLASS][META:{export}][BUN-NATIVE][BUN-SPAWN]
 * ADB command execution abstraction with sanitization
 * #REF:ISSUE-KYC-005
 */

import { spawn } from "bun";
import { sanitizeAdbCommand } from "./adbSanitizer";

export interface ADBCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class ADBTransport {
  constructor(private readonly adbPath: string) {}

  /**
   * [KYC][TRANSPORT][FUNCTION][META:{async}][META:{public}][BUN-SPAWN]
   * Execute an ADB command with sanitization
   */
  async execute(args: string[]): Promise<ADBCommandResult> {
    const validation = sanitizeAdbCommand(["adb", ...args]);
    if (!validation.valid) {
      throw new Error(`ADB command blocked: ${validation.error}`);
    }

    const proc = spawn([this.adbPath, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
  }

  /**
   * [KYC][TRANSPORT][FUNCTION][META:{async}][META:{public}]
   * Get an Android system property
   */
  async getProperty(property: string): Promise<string> {
    const result = await this.execute(["shell", "getprop", property]);
    return result.exitCode === 0 ? result.stdout : "";
  }

  /**
   * [KYC][TRANSPORT][FUNCTION][META:{async}][META:{public}]
   * Check if a binary exists on the device
   */
  async shellWhich(binary: string): Promise<boolean> {
    const result = await this.execute(["shell", "which", binary]);
    return result.exitCode === 0 && result.stdout.length > 0;
  }

  /**
   * Dump package information
   */
  async dumpPackage(packageName: string): Promise<string> {
    const result = await this.execute(["shell", "dumpsys", "package", packageName]);
    return result.exitCode === 0 ? result.stdout : "";
  }

  /**
   * List all installed packages (no shell pipe - filter in parser)
   */
  async listPackages(): Promise<string> {
    const result = await this.execute(["shell", "pm", "list", "packages"]);
    return result.exitCode === 0 ? result.stdout : "";
  }
}
