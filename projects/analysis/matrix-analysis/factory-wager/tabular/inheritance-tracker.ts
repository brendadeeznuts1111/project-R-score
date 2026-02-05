// factory-wager/tabular/inheritance-tracker.ts
// FactoryWager YAML-Native Tabular v4.5 - Advanced Inheritance Chain Tracking

import type { YAMLNode } from "./types-v45";

export interface InheritanceChain {
  base: string;           // &defaults
  mergedInto: string[];   // [development, staging, production]
  overriddenKeys: Map<string, string[]>; // production: [cache.ttl]
  inheritedKeys: Map<string, string[]>;  // staging: [timeout, retries]
}

export interface InheritanceAnalysis {
  baseAnchor: string;
  environments: string[];
  chain: InheritanceChain;
  summary: {
    totalEnvironments: number;
    totalOverrides: number;
    totalInherited: number;
    hardeningLevel: 'development' | 'staging' | 'production';
  };
}

export class InheritanceTracker {
  analyzeInheritanceChains(rows: YAMLNode[]): InheritanceAnalysis | null {
    // Input validation
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    // Find base anchor and merge environments
    const baseAnchor = this.findBaseAnchor(rows);
    const environments = this.findMergeEnvironments(rows);

    if (!baseAnchor || environments.length === 0) {
      return null;
    }

    // Extract base configuration
    const baseConfig = this.extractBaseConfiguration(rows, baseAnchor);

    // Analyze each environment
    const chain: InheritanceChain = {
      base: baseAnchor,
      mergedInto: environments,
      overriddenKeys: new Map(),
      inheritedKeys: new Map()
    };

    let totalOverrides = 0;
    let totalInherited = 0;

    for (const env of environments) {
      const envConfig = this.extractEnvironmentConfiguration(rows, env);
      const { overridden, inherited } = this.compareConfigurations(baseConfig, envConfig);

      // Atomic updates to prevent race conditions
      chain.overriddenKeys.set(env, [...overridden]);
      chain.inheritedKeys.set(env, [...inherited]);

      totalOverrides += overridden.length;
      totalInherited += inherited.length;
    }

    // Determine hardening level
    const hardeningLevel = this.determineHardeningLevel(chain);

    return {
      baseAnchor,
      environments,
      chain,
      summary: {
        totalEnvironments: environments.length,
        totalOverrides,
        totalInherited,
        hardeningLevel
      }
    };
  }

  private findBaseAnchor(rows: YAMLNode[]): string | null {
    if (!Array.isArray(rows)) {
      return null;
    }

    for (const row of rows) {
      if (row?.isMerge && row?.alias) {
        return row.alias;
      }
    }
    return null;
  }

  private findMergeEnvironments(rows: YAMLNode[]): string[] {
    if (!Array.isArray(rows)) {
      return [];
    }

    const environments = new Set<string>();
    const validEnvs = ['development', 'staging', 'production'];

    for (const row of rows) {
      if (row?.isMerge && row?.key && row.key.includes('.')) {
        const envName = row.key.split('.')[0];
        if (validEnvs.includes(envName)) {
          environments.add(envName);
        }
      }
    }

    return Array.from(environments).sort();
  }

  private extractBaseConfiguration(rows: YAMLNode[], anchor: string): Record<string, any> {
    const config: Record<string, any> = {};
    const anchorPrefix = `${anchor}.`;

    for (const row of rows) {
      if (row.key && row.key.startsWith(anchorPrefix)) {
        const key = row.key.slice(anchorPrefix.length);
        this.setNestedValue(config, key, row._rawValue);
      }
    }

    return config;
  }

  private extractEnvironmentConfiguration(rows: YAMLNode[], environment: string): Record<string, any> {
    const config: Record<string, any> = {};
    const envPrefix = `${environment}.`;

    for (const row of rows) {
      if (row.key && row.key.startsWith(envPrefix) && !row.isMerge) {
        const key = row.key.slice(envPrefix.length);
        this.setNestedValue(config, key, row._rawValue);
      }
    }

    return config;
  }

  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private compareConfigurations(
    base: Record<string, any>,
    env: Record<string, any>
  ): { overridden: string[]; inherited: string[] } {
    const overridden: string[] = [];
    const inherited: string[] = [];

    const allKeys = new Set([
      ...this.getAllKeys(base),
      ...this.getAllKeys(env)
    ]);

    for (const key of allKeys) {
      const baseValue = this.getNestedValue(base, key);
      const envValue = this.getNestedValue(env, key);

      if (baseValue !== undefined && envValue !== undefined) {
        if (JSON.stringify(baseValue) !== JSON.stringify(envValue)) {
          overridden.push(key);
        } else {
          inherited.push(key);
        }
      } else if (baseValue !== undefined && envValue === undefined) {
        // Key exists in base but not in env (implicitly inherited)
        inherited.push(key);
      }
    }

    return { overridden, inherited };
  }

  private getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
    let keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  private determineHardeningLevel(chain: InheritanceChain): 'development' | 'staging' | 'production' {
    const hasProd = chain.mergedInto.includes('production');
    const hasStaging = chain.mergedInto.includes('staging');

    if (hasProd) {
      const prodOverrides = chain.overriddenKeys.get('production')?.length || 0;
      return prodOverrides > 0 ? 'production' : (hasStaging ? 'staging' : 'development');
    }

    if (hasStaging) {
      const stagingOverrides = chain.overriddenKeys.get('staging')?.length || 0;
      return stagingOverrides > 0 ? 'staging' : 'development';
    }

    return 'development';
  }
}

export function renderInheritanceChain(analysis: InheritanceAnalysis): void {
  const c = (hsl: string) => (Bun.color(hsl) ?? "").toString();
  const reset = "\x1b[0m";

  console.log('\n' + "┌".repeat(70) + "┐");
  console.log(`│  ${c("hsl(280, 60%, 60%)")}🧬 INHERITANCE CHAIN ANALYSIS${reset} ${"".padEnd(33, ' ')} │`);
  console.log("├".repeat(70) + "┤");

  // Base anchor info
  console.log(`│  ${c("hsl(210, 20%, 50%)")}Base Anchor: ${analysis.baseAnchor}${reset} ${"".padEnd(47 - analysis.baseAnchor.length, ' ')} │`);

  // Environments
  const envList = analysis.environments.join(" → ");
  console.log(`│  ${c("hsl(210, 20%, 50%)")}Environments: ${envList}${reset} ${"".padEnd(47 - envList.length, ' ')} │`);
  console.log("│".padEnd(71, ' ') + "│");

  // Override analysis
  console.log(`│  ${c("hsl(10, 90%, 55%)")}⚠ OVERRIDES DETECTED:${reset} ${"".padEnd(48, ' ')} │`);

  for (const env of analysis.environments) {
    const overrides = analysis.chain.overriddenKeys.get(env) || [];
    if (overrides.length > 0) {
      console.log(`│    ${c("hsl(10, 90%, 55%)")}• ${env}:${reset} ${overrides.join(', ')} ${"".padEnd(45 - env.length - overrides.join(', ').length, ' ')} │`);
    }
  }

  // Inheritance analysis
  console.log("│".padEnd(71, ' ') + "│");
  console.log(`│  ${c("hsl(145, 80%, 45%)")}✓ INHERITED KEYS:${reset} ${"".padEnd(52, ' ')} │`);

  for (const env of analysis.environments) {
    const inherited = analysis.chain.inheritedKeys.get(env) || [];
    if (inherited.length > 0) {
      const display = inherited.length > 3 ?
        `${inherited.slice(0, 3).join(', ')}... (${inherited.length} total)` :
        inherited.join(', ');
      console.log(`│    ${c("hsl(145, 80%, 45%)")}• ${env}:${reset} ${display} ${"".padEnd(45 - env.length - display.length, ' ')} │`);
    }
  }

  // Summary
  console.log("│".padEnd(71, ' ') + "│");
  const hardeningColor = analysis.summary.hardeningLevel === 'production' ? c("hsl(10, 90%, 55%)") :
                        analysis.summary.hardeningLevel === 'staging' ? c("hsl(48, 100%, 60%)") :
                        c("hsl(145, 80%, 45%)");

  console.log(`│  ${c("hsl(210, 20%, 50%)")}Summary:${reset} ${analysis.summary.totalEnvironments} envs, ${analysis.summary.totalOverrides} overrides, ${analysis.summary.totalInherited} inherited ${"".padEnd(0, ' ')} │`);
  console.log(`│  ${hardeningColor}Hardening Level: ${analysis.summary.hardeningLevel.toUpperCase()}${reset} ${"".padEnd(38 - analysis.summary.hardeningLevel.length, ' ')} │`);

  console.log("└".repeat(70) + "┘");

  // Chromatic Legend - Visual Color Reference
  console.log("\n" + "─".repeat(70));
  console.log(
    c("hsl(145, 80%, 45%)") + "████" + reset + " Inherited   " +
    c("hsl(10, 90%, 55%)") + "████" + reset + " Overridden   " +
    c("hsl(220, 20%, 40%)") + "████" + reset + " Base Configuration"
  );
  console.log(
    c("hsl(280, 60%, 60%)") + "████" + reset + " Merge Analysis   " +
    c("hsl(48, 100%, 60%)") + "████" + reset + " Staging Level   " +
    c("hsl(210, 20%, 50%)") + "████" + reset + " Summary Information"
  );
  console.log("─".repeat(70) + "\n");
}

export function generateInheritanceReport(analysis: InheritanceAnalysis): string {
  const report = {
    base: analysis.baseAnchor,
    mergedInto: analysis.environments,
    overridden: {} as Record<string, string[]>,
    inherited: {} as Record<string, string[]>
  };

  // Convert Maps to plain objects
  for (const [env, keys] of analysis.chain.overriddenKeys) {
    report.overridden[env] = keys;
  }

  for (const [env, keys] of analysis.chain.inheritedKeys) {
    report.inherited[env] = keys;
  }

  return `// For your config, this generates:\nconst inheritance = ${JSON.stringify(report, null, 2)};`;
}
