// factory-wager/tabular/inheritance-diff.ts
// FactoryWager YAML-Native Tabular v4.5 - Inheritance Diff View

import type { YAMLNode } from "./types-v45";

export interface InheritanceDiff {
  key: string;
  devValue: string;
  stagingValue: string;
  prodValue: string;
  changeType: 'inherited' | 'override' | 'env-var' | 'added';
  hasEnvVar: boolean;
}

export interface DiffConfig {
  environments: string[];
  baseAnchor: string;
  changes: InheritanceDiff[];
}

export class InheritanceDiffAnalyzer {
  analyzeInheritanceDiff(rows: YAMLNode[]): DiffConfig | null {
    // Find merge key environments and base anchor
    const mergeEnvironments = this.findMergeEnvironments(rows);
    const baseAnchor = this.findBaseAnchor(rows);
    
    if (!baseAnchor || mergeEnvironments.length < 2) {
      return null;
    }

    const changes: InheritanceDiff[] = [];
    
    // Extract values for each environment
    const envValues = this.extractEnvironmentValues(rows, mergeEnvironments, baseAnchor);
    
    // Analyze each key for changes
    for (const [key, values] of Object.entries(envValues)) {
      const diff = this.analyzeKeyDiff(key, values);
      if (diff) {
        changes.push(diff);
      }
    }

    return {
      environments: mergeEnvironments,
      baseAnchor,
      changes
    };
  }

  private findMergeEnvironments(rows: YAMLNode[]): string[] {
    const environments: string[] = [];
    
    for (const row of rows) {
      if (row.isMerge && row.key.includes('.')) {
        const envName = row.key.split('.')[0];
        if (!environments.includes(envName)) {
          environments.push(envName);
        }
      }
    }
    
    return environments.sort();
  }

  private findBaseAnchor(rows: YAMLNode[]): string | null {
    for (const row of rows) {
      if (row.isMerge && row.alias) {
        return row.alias;
      }
    }
    return null;
  }

  private extractEnvironmentValues(
    rows: YAMLNode[], 
    environments: string[], 
    baseAnchor: string
  ): Record<string, Record<string, string>> {
    const values: Record<string, Record<string, string>> = {};
    
    // Initialize environments
    for (const env of environments) {
      values[env] = {};
    }
    
    // Extract base anchor values
    const baseValues = this.extractAnchorValues(rows, baseAnchor);
    
    // Extract environment-specific values
    for (const env of environments) {
      const envPrefix = `${env}.`;
      const envRows = rows.filter(row => row.key.startsWith(envPrefix));
      
      for (const row of envRows) {
        if (!row.isMerge) {
          const key = row.key.replace(envPrefix, '');
          values[env][key] = row.value;
        }
      }
    }
    
    // Merge base values with environment overrides
    for (const env of environments) {
      values[env] = { ...baseValues, ...values[env] };
    }
    
    return values;
  }

  private extractAnchorValues(rows: YAMLNode[], anchor: string): Record<string, string> {
    const values: Record<string, string> = {};
    const anchorPrefix = `${anchor}.`;
    
    for (const row of rows) {
      if (row.key.startsWith(anchorPrefix) && !row.key.includes('.')) {
        // Top-level anchor object
        continue;
      }
      
      if (row.key.startsWith(anchorPrefix)) {
        const key = row.key.replace(anchorPrefix, '');
        values[key] = row.value;
      }
    }
    
    return values;
  }

  private analyzeKeyDiff(key: string, values: Record<string, string>): InheritanceDiff | null {
    const environments = Object.keys(values).sort();
    if (environments.length < 2) return null;
    
    const devValue = values['development'] || 'none';
    const stagingValue = values['staging'] || devValue;
    const prodValue = values['production'] || stagingValue;
    
    // Determine change type
    let changeType: InheritanceDiff['changeType'] = 'inherited';
    let hasEnvVar = false;
    
    // Check for environment variables
    if (stagingValue.includes('${') || prodValue.includes('${')) {
      changeType = 'env-var';
      hasEnvVar = true;
    }
    
    // Check for overrides
    if (devValue !== stagingValue || stagingValue !== prodValue) {
      if (hasEnvVar) {
        changeType = 'env-var';
      } else {
        changeType = 'override';
      }
    }
    
    // Check for added keys
    if (devValue === 'none' && stagingValue !== 'none') {
      changeType = 'added';
    }
    
    return {
      key,
      devValue,
      stagingValue,
      prodValue,
      changeType,
      hasEnvVar
    };
  }
}

export function renderInheritanceDiff(diff: DiffConfig): void {
  const c = (hsl: string) => (Bun.color(hsl) ?? "").toString();
  const reset = "\x1b[0m";
  
  console.info('\n' + "┌".repeat(58) + "┐");
  console.info(`│  ${c("hsl(280, 60%, 60%)")}🔄 INHERITANCE DIFF: dev → staging → production${reset}      │`);
  console.info("├".repeat(58) + "┤");
  
  for (const change of diff.changes) {
    let icon = "✓";
    let color = c("hsl(145, 80%, 45%)"); // Green for inherited
    
    switch (change.changeType) {
      case 'override':
        icon = "⚠";
        color = c("hsl(10, 90%, 55%)"); // Red for override
        break;
      case 'env-var':
        icon = "⚠";
        color = c("hsl(10, 90%, 55%)"); // Red for env var
        break;
      case 'added':
        icon = "+";
        color = c("hsl(48, 100%, 60%)"); // Gold for added
        break;
    }
    
    const keyDisplay = change.key.padEnd(16);
    const devDisplay = change.devValue.padEnd(12);
    const stagingDisplay = change.stagingValue.padEnd(20);
    const prodDisplay = change.prodValue.padEnd(12);
    
    let description = "(inherited)";
    if (change.changeType === 'override') description = "(prod override)";
    if (change.changeType === 'env-var') description = "(env var)";
    if (change.changeType === 'added') description = "(added)";
    
    console.info(`│  ${keyDisplay} ${devDisplay} → ${stagingDisplay} → ${prodDisplay} ${color}${icon}${reset} ${description.padEnd(16)} │`);
  }
  
  console.info("└".repeat(58) + "┘");
  console.info(`\n${c("hsl(210, 20%, 50%)")}Base anchor: ${diff.baseAnchor}${reset}`);
  console.info(`${c("hsl(210, 20%, 50%)")}Environments: ${diff.environments.join(" → ")}${reset}\n`);
}
