/**
 * Build Configuration for Enterprise Scanner
 * Handles embedded files and build-time constants
 */

import { file } from "bun";
import * as path from "path";

export interface EmbeddedFile {
  path: string;
  content: string;
}

/**
 * Load embedded files for build
 */
export async function loadEmbeddedFiles(): Promise<EmbeddedFile[]> {
  const files: EmbeddedFile[] = [];

  // Load .scannerrc if exists
  try {
    const configPath = path.join(process.cwd(), ".scannerrc");
    const configContent = await file(configPath).text();
    files.push({ path: ".scannerrc", content: configContent });
  } catch {
    // Use default
    files.push({
      path: ".scannerrc",
      content: JSON.stringify({
        mode: "enforce",
        metricsPort: 9090,
        cacheDir: ".bunpm/scan-cache"
      }, null, 2)
    });
  }

  // Load baseline if exists
  try {
    const baselinePath = path.join(process.cwd(), "scanner-baseline.json");
    const baselineContent = await file(baselinePath).text();
    files.push({ path: "scanner-baseline.json", content: baselineContent });
  } catch {
    // Use empty baseline
    files.push({
      path: "scanner-baseline.json",
      content: JSON.stringify({
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        issues: []
      }, null, 2)
    });
  }

  return files;
}

/**
 * Generate build-time constants
 */
export function getBuildConstants(): Record<string, string> {
  return {
    "process.env.SCANNER_BUILD_VERSION": JSON.stringify(
      process.env.SCANNER_VERSION || "1.0.0"
    ),
    "process.env.SCANNER_BUILD_DATE": JSON.stringify(
      new Date().toISOString()
    ),
    "process.env.SCANNER_BUILD_PLATFORM": JSON.stringify(
      process.platform
    ),
    "process.env.SCANNER_BUILD_ARCH": JSON.stringify(
      process.arch
    )
  };
}

/**
 * Write embedded files to output directory
 */
export async function writeEmbeddedFiles(
  files: EmbeddedFile[],
  outputDir: string
): Promise<void> {
  for (const file of files) {
    const outputPath = path.join(outputDir, file.path);
    await Bun.write(outputPath, file.content);
  }
}
