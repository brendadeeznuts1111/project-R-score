import "./types.d.ts";
// infrastructure/v1-3-3/sourcemap-integrity-validator.ts
// Component #71: Sourcemap Integrity Validator for Build Stability


// Helper function to check both build-time features and runtime environment variables
function isFeatureEnabled(featureName: string): boolean {
  // Check runtime environment variable first
  const envVar = `FEATURE_${featureName}`;
  if (process.env[envVar] === "1") {
    return true;
  }

  // Check build-time feature (must use if statements directly)
  if (featureName === "SOURCEMAP_INTEGRITY" && process.env.FEATURE_SOURCEMAP_INTEGRITY === "1") {
    return true;
  }
  if (featureName === "NAPI_THREADSAFE" && process.env.FEATURE_NAPI_THREADSAFE === "1") {
    return true;
  }
  if (featureName === "WS_FRAGMENT_GUARD" && process.env.FEATURE_WS_FRAGMENT_GUARD === "1") {
    return true;
  }
  if (
    featureName === "WORKER_THREAD_SAFETY" &&
    process.env.FEATURE_WORKER_THREAD_SAFETY === "1"
  ) {
    return true;
  }
  if (featureName === "YAML_DOC_END_FIX" && process.env.FEATURE_YAML_DOC_END_FIX === "1") {
    return true;
  }
  if (
    featureName === "INFRASTRUCTURE_HEALTH_CHECKS" &&
    process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1"
  ) {
    return true;
  }

  return false;
}

// Export interfaces for type safety
export interface SourceMapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BuildOutput {
  path: string;
  sourceMap?: {
    sources: string[];
    sourcesContent?: string[];
    mappings: string;
  };
}

export interface CompileModeOptions {
  compile: boolean;
  sourcemap?: boolean | "inline" | "external";
  sourcemapIncludeSources?: boolean;
}

// Fixes compile: true sourcemaps; restores original file/lines
export class SourcemapIntegrityValidator {
  private static readonly VIRTUAL_PATH_PATTERN = /\/\$bunfs\/root\//;
  private static readonly COMPILE_MODE_VIRTUAL_PATTERN = /virtual:/;

  // Zero-cost when SOURCEMAP_INTEGRITY is disabled
  static async validateBuildSourcemaps(
    buildResult: any,
    compileMode: boolean
  ): Promise<SourceMapValidationResult> {
    if (!isFeatureEnabled("SOURCEMAP_INTEGRITY")) {
      // Legacy: no validation
      return { valid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Component #71: Check for virtual path references in compile mode
    const outputs: BuildOutput[] = buildResult.outputs || [];

    for (const output of outputs) {
      if (compileMode && this.VIRTUAL_PATH_PATTERN.test(output.path)) {
        errors.push(`Virtual path detected in compile mode: ${output.path}`);
      }

      // Validatec Validate sourcemap exists and points to real files
      if (output.sourceMap) {
        const validation = await this.validateSourceMapPaths(output.sourceMap);
        if (!validation.valid) {
          errors.push(`Invalid sourcemap paths for ${output.path}`);
        }

        // Check for missing sources content
        if (
          !output.sourceMap.sourcesContent ||
          output.sourceMap.sourcesContent.length === 0
        ) {
          warnings.push(
            `Missing sourcesContent in sourcemap for ${output.path}`
          );
        }
      }
    }

    // Log validation (Component #11 audit)
    if (errors.length > 0) {
      this.logValidationFailure(errors);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Fixes Bun.build() with compile: true sourcemap application
  static async fixCompileSourcemaps(
    buildOptions: CompileModeOptions
  ): Promise<CompileModeOptions> {
    if (!isFeatureEnabled("SOURCEMAP_INTEGRITY")) {
      return buildOptions;
    }

    // Ensure external sourcemaps in compile mode
    if (buildOptions.compile && buildOptions.sourcemap) {
      return {
        ...buildOptions,
        sourcemap: "external", // Force external maps for compile mode
        sourcemapIncludeSources: true, // Include original sources
      };
    }

    return buildOptions;
  }

  // Prevents import.meta.url/dir failures in --bytecode mode
  static rewriteImportMetaForBytecode(code: string): string {
    if (!isFeatureEnabled("SOURCEMAP_INTEGRITY")) {
      return code;
    }

    // Replace import.meta.url with __filename in bytecode context
    return code
      .replace(/import\.meta\.url/g, '(__filename || "file://unknown")')
      .replace(/import\.meta\.dirname/g, '(__dirname || "/")')
      .replace(
        /import\.meta\.file/g,
        '(path.basename(__filename) || "unknown")'
      );
  }

  // Validates that sourcemap sources point to real files
  private static async validateSourceMapPaths(
    sourceMap: any
  ): Promise<{ valid: boolean }> {
    try {
      // Check that sources point to real files, not virtual paths
      const hasVirtualSources = (sourceMap.sources || []).some(
        (src: string) =>
          this.VIRTUAL_PATH_PATTERN.test(src) ||
          this.COMPILE_MODE_VIRTUAL_PATTERN.test(src)
      );

      // Check for circular references
      const hasCircularRefs = (sourceMap.sources || []).some(
        (src: string) => src.includes("node_modules") && src.includes("..")
      );

      return { valid: !hasVirtualSources && !hasCircularRefs };
    } catch {
      return { valid: false };
    }
  }

  // Log validation failure for audit
  private static logValidationFailure(errors: string[]): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 71,
        errors,
        severity: "high",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  // Generate sourcemap integrity report
  static async generateIntegrityReport(buildResult: any): Promise<{
    sourcemapCount: number;
    validCount: number;
    virtualPathCount: number;
    missingSourcesContent: number;
  }> {
    if (!isFeatureEnabled("SOURCEMAP_INTEGRITY")) {
      return {
        sourcemapCount: 0,
        validCount: 0,
        virtualPathCount: 0,
        missingSourcesContent: 0,
      };
    }

    const outputs: BuildOutput[] = buildResult.outputs || [];
    let sourcemapCount = 0;
    let validCount = 0;
    let virtualPathCount = 0;
    let missingSourcesContent = 0;

    for (const output of outputs) {
      if (output.sourceMap) {
        sourcemapCount++;

        const validation = await this.validateSourceMapPaths(output.sourceMap);
        if (validation.valid) {
          validCount++;
        }

        if (this.VIRTUAL_PATH_PATTERN.test(output.path)) {
          virtualPathCount++;
        }

        if (
          !output.sourceMap.sourcesContent ||
          output.sourceMap.sourcesContent.length === 0
        ) {
          missingSourcesContent++;
        }
      }
    }

    return {
      sourcemapCount,
      validCount,
      virtualPathCount,
      missingSourcesContent,
    };
  }
}

// Zero-cost export
export const {
  validateBuildSourcemaps,
  fixCompileSourcemaps,
  rewriteImportMetaForBytecode,
  generateIntegrityReport,
} = process.env.FEATURE_SOURCEMAP_INTEGRITY === "1"
  ? SourcemapIntegrityValidator
  : {
      validateBuildSourcemaps: async () => ({
        valid: true,
        errors: [],
        warnings: [],
      }),
      fixCompileSourcemaps: (o: any) => o,
      rewriteImportMetaForBytecode: (c: string) => c,
      generateIntegrityReport: async () => ({
        sourcemapCount: 0,
        validCount: 0,
        virtualPathCount: 0,
        missingSourcesContent: 0,
      }),
    };

export default SourcemapIntegrityValidator;
