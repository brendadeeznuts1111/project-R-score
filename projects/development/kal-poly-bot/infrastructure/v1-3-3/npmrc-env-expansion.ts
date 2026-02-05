/**
 * infrastructure/v1-3-3/npmrc-env-expansion.ts
 * Component #89: Npmrc-Env-Expansion
 * Level 3: Config | CPU: O(n) | .npmrc spec
 * ${VAR} expansion with ? optional modifier
 */


// Helper to check if feature is enabled
function isFeatureEnabled(): boolean {
  return process.env.FEATURE_NPMRC_ENV_EXPANSION === "1" || process.env.FEATURE_NPMRC_ENV_EXPANSION === "1";
}

// NPMRC Environment Variable Expansion Parser
export class NpmrcEnvExpansion {
  // Environment variable cache
  private static envCache = new Map<string, string | undefined>();

  // Parse and expand npmrc-style environment variables
  static expand(input: string, env: Record<string, string | undefined> = process.env): string {
    if (!isFeatureEnabled()) {
      // Fallback: basic expansion
      return input.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return env[varName] || match;
      });
    }

    let result = input;
    const pattern = /\$\{([^:?}]+)(\?([^}]*))?\}/g;

    result = result.replace(pattern, (match, varName, optional, defaultValue) => {
      const value = env[varName];

      // Handle optional modifier: ${VAR?default}
      if (optional) {
        if (value === undefined || value === "") {
          return defaultValue !== undefined ? defaultValue : "";
        }
      }

      // Return value or keep original if not found
      return value !== undefined ? value : match;
    });

    return result;
  }

  // Validate npmrc configuration for security
  static validateConfig(config: Record<string, string>): {
    valid: boolean;
    warnings: string[];
    expanded: Record<string, string>;
  } {
    const warnings: string[] = [];
    const expanded: Record<string, string> = {};
    const env = process.env;

    for (const [key, value] of Object.entries(config)) {
      // Check for dangerous patterns
      if (value.includes("&&") || value.includes("||") || value.includes(";")) {
        warnings.push(`Potential command injection in ${key}: ${value}`);
      }

      // Expand environment variables
      expanded[key] = this.expand(value, env);

      // Check for undefined required variables
      const undefinedVars = this.findUndefinedVariables(value, env);
      if (undefinedVars.length > 0) {
        warnings.push(`Undefined variables in ${key}: ${undefinedVars.join(", ")}`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      expanded,
    };
  }

  // Find all undefined variables in a string
  private static findUndefinedVariables(input: string, env: Record<string, string | undefined>): string[] {
    const undefinedVars: string[] = [];
    const pattern = /\$\{([^:?}]+)(\?([^}]*))?\}/g;

    let match;
    while ((match = pattern.exec(input)) !== null) {
      const varName = match[1];
      const optional = match[2];

      // Only report as undefined if not optional and not present
      if (!optional && env[varName] === undefined) {
        undefinedVars.push(varName);
      }
    }

    return undefinedVars;
  }

  // Batch expand multiple values
  static expandBatch(
    values: Record<string, string>,
    env: Record<string, string | undefined> = process.env
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(values)) {
      result[key] = this.expand(value, env);
    }

    return result;
  }

  // Parse npmrc file format
  static parseNpmrc(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split("\n");

    for (let line of lines) {
      // Remove comments and trim
      line = line.split("#")[0].trim();

      if (!line) continue;

      // Parse key=value
      const equalsIndex = line.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = line.substring(0, equalsIndex).trim();
      const value = line.substring(equalsIndex + 1).trim();

      // Remove quotes if present
      const unquotedValue = value.replace(/^["']|["']$/g, "");

      config[key] = unquotedValue;
    }

    return config;
  }

  // Expand npmrc file content
  static expandNpmrc(content: string, env: Record<string, string | undefined> = process.env): string {
    const config = this.parseNpmrc(content);
    const expanded = this.expandBatch(config, env);

    // Reconstruct npmrc content
    return Object.entries(expanded)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  }

  // Get environment variable with fallback chain
  static getWithFallback(
    varName: string,
    fallbacks: string[],
    env: Record<string, string | undefined> = process.env
  ): string | undefined {
    // Try primary variable
    if (env[varName]) {
      return env[varName];
    }

    // Try fallback variables
    for (const fallback of fallbacks) {
      if (env[fallback]) {
        return env[fallback];
      }
    }

    return undefined;
  }

  // Expand with custom resolver
  static expandWithResolver(
    input: string,
    resolver: (varName: string) => string | undefined
  ): string {
    const pattern = /\$\{([^:?}]+)(\?([^}]*))?\}/g;

    return input.replace(pattern, (match, varName, optional, defaultValue) => {
      const value = resolver(varName);

      if (optional) {
        if (value === undefined || value === "") {
          return defaultValue !== undefined ? defaultValue : "";
        }
      }

      return value !== undefined ? value : match;
    });
  }

  // Security audit for npmrc expansion
  static securityAudit(config: Record<string, string>): {
    safe: boolean;
    issues: string[];
    riskLevel: "low" | "medium" | "high";
  } {
    const issues: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    for (const [key, value] of Object.entries(config)) {
      // Check for command injection
      if (/[;&|`$]/.test(value) && value.includes("$")) {
        issues.push(`Potential command injection in ${key}`);
        riskLevel = "high";
      }

      // Check for path traversal
      if (value.includes("..") && value.includes("/")) {
        issues.push(`Potential path traversal in ${key}`);
        riskLevel = "medium";
      }

      // Check for excessive expansion depth
      const expansionDepth = (value.match(/\$\{/g) || []).length;
      if (expansionDepth > 5) {
        issues.push(`Excessive expansion depth in ${key}: ${expansionDepth}`);
        riskLevel = "medium";
      }

      // Check for recursive references
      if (/\$\{[^}]*\$\{/.test(value)) {
        issues.push(`Nested expansion in ${key}`);
        riskLevel = "medium";
      }
    }

    return {
      safe: issues.length === 0,
      issues,
      riskLevel,
    };
  }

  // Get expansion statistics
  static getExpansionStats(
    config: Record<string, string>,
    env: Record<string, string | undefined> = process.env
  ): {
    totalExpansions: number;
    successfulExpansions: number;
    failedExpansions: number;
    variablesUsed: Set<string>;
  } {
    const variablesUsed = new Set<string>();
    let totalExpansions = 0;
    let successfulExpansions = 0;
    let failedExpansions = 0;

    const pattern = /\$\{([^:?}]+)(\?([^}]*))?\}/g;

    for (const value of Object.values(config)) {
      let match;
      while ((match = pattern.exec(value)) !== null) {
        const varName = match[1];
        const optional = match[2];
        const defaultValue = match[3];

        totalExpansions++;
        variablesUsed.add(varName);

        if (env[varName]) {
          successfulExpansions++;
        } else if (optional && defaultValue !== undefined) {
          successfulExpansions++;
        } else if (optional) {
          successfulExpansions++; // Optional with no default is successful
        } else {
          failedExpansions++;
        }
      }
    }

    return {
      totalExpansions,
      successfulExpansions,
      failedExpansions,
      variablesUsed,
    };
  }
}

// Zero-cost export
export const npmrcExpansion = isFeatureEnabled()
  ? NpmrcEnvExpansion
  : {
      expand: (input: string) => input,
      validateConfig: (config: Record<string, string>) => ({
        valid: true,
        warnings: [],
        expanded: config,
      }),
      expandBatch: (values: Record<string, string>) => values,
      parseNpmrc: (content: string) => {
        const config: Record<string, string> = {};
        content.split("\n").forEach((line) => {
          const trimmed = line.split("#")[0].trim();
          if (trimmed) {
            const eq = trimmed.indexOf("=");
            if (eq > 0) {
              const key = trimmed.substring(0, eq).trim();
              const value = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
              config[key] = value;
            }
          }
        });
        return config;
      },
      expandNpmrc: (content: string) => content,
      getWithFallback: (varName: string, fallbacks: string[]) => {
        for (const fb of fallbacks) {
          if (process.env[fb]) return process.env[fb];
        }
        return process.env[varName];
      },
      expandWithResolver: (input: string, resolver: (v: string) => string | undefined) => {
        return input.replace(/\$\{([^}]+)\}/g, (m, v) => resolver(v) || m);
      },
      securityAudit: () => ({ safe: true, issues: [], riskLevel: "low" }),
      getExpansionStats: () => ({
        totalExpansions: 0,
        successfulExpansions: 0,
        failedExpansions: 0,
        variablesUsed: new Set<string>(),
      }),
    };
