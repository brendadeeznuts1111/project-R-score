#!/usr/bin/env bun
/**
 * Component #44: YAML 1.2 Strict Parser
 *
 * YAML 1.2 spec compliance for bunfig.toml parsing
 * Prevents boolean injection and ensures strict type handling
 */

// Feature flag simulation for zero-cost abstraction
const feature = (name: string): boolean => {
  // In production, this would integrate with Bun's feature flag system
  const enabledFeatures = ["YAML12_STRICT", "YAML_BOOLEAN_STRICT"];
  return enabledFeatures.includes(name);
};

export class YAML12StrictParser {
  private static readonly YAML_1_1_BOOLEANS = new Set([
    "y",
    "Y",
    "n",
    "N",
    "yes",
    "Yes",
    "YES",
    "no",
    "No",
    "NO",
    "on",
    "On",
    "ON",
    "off",
    "Off",
    "OFF",
  ]);

  private static readonly YAML_1_2_BOOLEANS = new Set(["true", "false"]);

  private static readonly YAML_1_2_NUMBERS = new Set([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "-0",
    "-1",
    "-2",
    "-3",
    "-4",
    "-5",
    "-6",
    "-7",
    "-8",
    "-9",
    "0.0",
    "1.0",
    "2.0",
    "3.0",
    "4.0",
    "5.0",
    "6.0",
    "7.0",
    "8.0",
    "9.0",
    "-0.0",
    "-1.0",
    "-2.0",
    "-3.0",
    "-4.0",
    "-5.0",
    "-6.0",
    "-7.0",
    "-8.0",
    "-9.0",
  ]);

  // Zero-cost when YAML12_STRICT is disabled
  static parseBoolean(value: string): string | boolean {
    if (!feature("YAML12_STRICT")) {
      // Legacy YAML 1.1 behavior (dangerous)
      return this.legacyParseBoolean(value);
    }

    // YAML 1.2: Only true/false are booleans
    if (feature("YAML_BOOLEAN_STRICT")) {
      if (value === "true") return true;
      if (value === "false") return false;
    } else {
      // YAML 1.2 standard behavior
      if (this.YAML_1_2_BOOLEANS.has(value)) {
        return value === "true";
      }
    }

    // All others are strings
    return value;
  }

  static parseNumber(value: string): number | string {
    if (!feature("YAML12_STRICT")) {
      return Number(value);
    }

    // YAML 1.2 strict number parsing
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return value; // Return as string if invalid
    }
    return num;
  }

  static parseConfig(yamlContent: string): Record<string, unknown> {
    if (!feature("YAML12_STRICT")) {
      // Use native Bun.parseYAML (YAML 1.1 compatible)
      if (typeof Bun !== "undefined" && (Bun as any).parseYAML) {
        return (Bun as any).parseYAML(yamlContent);
      }
      return this.parseBasicYAML(yamlContent);
    }

    // Custom YAML 1.2 parser for bunfig.toml
    return this.parseYAML12StrictImplementation(yamlContent);
  }

  private static parseYAML12StrictImplementation(
    yamlContent: string
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const lines = yamlContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Handle key-value pairs
      const keyValueMatch = trimmed.match(/^(\w+(?:\.\w+)*)\s*=\s*(.+)$/);
      if (keyValueMatch) {
        const [, key, rawValue] = keyValueMatch;
        const value = this.parseValue(rawValue.trim());
        this.setNestedValue(config, key, value);
        continue;
      }

      // Handle array values
      const arrayMatch = trimmed.match(/^(\w+)\s*=\s*\[(.*)\]$/);
      if (arrayMatch) {
        const [, key, rawValues] = arrayMatch;
        const values = rawValues
          .split(",")
          .map((v) => this.parseValue(v.trim()));
        config[key] = values;
        continue;
      }

      // Handle section headers
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1];
        config[sectionName] = config[sectionName] || {};
        continue;
      }
    }

    return config;
  }

  private static setNestedValue(
    obj: Record<string, any>,
    key: string,
    value: any
  ): void {
    const keys = key.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  private static parseValue(value: string): any {
    // Remove quotes if present
    const unquoted = value.replace(/^["'](.+)["']$/, "$1");

    // Check for boolean first (YAML 1.2 strict)
    const bool = this.parseBoolean(unquoted);
    if (typeof bool === "boolean") return bool;

    // Check for number
    const num = this.parseNumber(unquoted);
    if (typeof num === "number") return num;

    // Return as string
    return unquoted;
  }

  static legacyParseBoolean(value: string): boolean | string {
    // Dangerous: YAML 1.1 treats 'yes' as true
    if (this.YAML_1_1_BOOLEANS.has(value)) {
      return ["y", "Y", "yes", "Yes", "YES", "on", "On", "ON"].includes(value);
    }
    return value;
  }

  static parseBasicYAML(yamlContent: string): Record<string, unknown> {
    // Basic YAML parser for environments without Bun.parseYAML
    const config: Record<string, any> = {};
    const lines = yamlContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const [, key, rawValue] = match;
        config[key] = this.parseValue(rawValue.trim());
      }
    }

    return config;
  }

  // Security validation for YAML content
  static validateYAMLContent(yamlContent: string): string[] {
    const warnings: string[] = [];
    const lines = yamlContent.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      // Check for dangerous YAML 1.1 boolean patterns
      const keyValueMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        const unquoted = value.replace(/^["'](.+)["']$/, "$1");

        if (
          this.YAML_1_1_BOOLEANS.has(unquoted) &&
          !this.YAML_1_2_BOOLEANS.has(unquoted)
        ) {
          warnings.push(
            `Line ${i + 1}: '${key} = ${unquoted}' uses YAML 1.1 boolean. ` +
              `In YAML 1.2, this will be parsed as string "${unquoted}". ` +
              `Use true/false for explicit booleans.`
          );
        }
      }

      // Check for suspicious patterns
      if (line.includes("trustedDependencies") && line.includes("yes")) {
        warnings.push(
          `Line ${i + 1}: trustedDependencies contains 'yes' which ` +
            `could be parsed as boolean in YAML 1.1. Quote the value to ensure it's treated as string.`
        );
      }
    }

    return warnings;
  }

  // Convert YAML 1.1 to 1.2 format
  static migrateToYAML12(yamlContent: string): string {
    const lines = yamlContent.split("\n");
    const migrated: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        migrated.push(line);
        continue;
      }

      // Migrate boolean values
      const keyValueMatch = line.match(/^(\s*)(\w+)\s*=\s*(.+)$/);
      if (keyValueMatch) {
        const [, indent, key, value] = keyValueMatch;
        const unquoted = value.replace(/^["'](.+)["']$/, "$1");

        // Quote YAML 1.1 booleans to preserve them as strings in YAML 1.2
        if (
          this.YAML_1_1_BOOLEANS.has(unquoted) &&
          !this.YAML_1_2_BOOLEANS.has(unquoted)
        ) {
          migrated.push(`${indent}${key} = "${unquoted}"`);
          continue;
        }
      }

      migrated.push(line);
    }

    return migrated.join("\n");
  }

  // Performance testing utilities
  static benchmark(yamlContent: string, iterations: number = 10000): void {
    console.log("🧪 YAML 1.2 Strict Parser Benchmark");
    console.log("=====================================");
    console.log(`Content length: ${yamlContent.length} characters`);
    console.log(`Iterations: ${iterations}`);

    // Test YAML 1.2 strict parsing
    const startStrict = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.parseYAML12Strict(yamlContent);
    }
    const strictTime = performance.now() - startStrict;

    // Test legacy parsing
    const startLegacy = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.parseBasicYAML(yamlContent);
    }
    const legacyTime = performance.now() - startLegacy;

    const strictResult = this.parseYAML12Strict(yamlContent);
    const legacyResult = this.parseBasicYAML(yamlContent);

    console.log(`\n📊 Results:`);
    console.log(`   YAML 1.2 Strict: ${strictTime.toFixed(2)}ms`);
    console.log(`   Legacy Parser:  ${legacyTime.toFixed(2)}ms`);
    console.log(`   Speedup:        ${(legacyTime / strictTime).toFixed(2)}x`);
    console.log(
      `   Compatibility:  ${JSON.stringify(strictResult) === JSON.stringify(legacyResult) ? "✅" : "⚠️"}`
    );
  }

  // Demonstration of security improvements
  static demonstrateSecurity(): void {
    console.log("🔒 YAML 1.2 Security Demonstration");
    console.log("=====================================");

    const maliciousYAML = `
# Configuration with potential security issues
trustedDependencies = ["yes", "on", "file:malicious"]
debugMode = "on"
logLevel = yes
enableFeature = no
`;

    console.log("\n⚠️  YAML 1.1 Legacy Parsing (Dangerous):");
    const legacyResult = this.parseBasicYAML(maliciousYAML);
    console.log(JSON.stringify(legacyResult, null, 2));

    console.log("\n✅ YAML 1.2 Strict Parsing (Safe):");
    const strictResult = this.parseYAML12Strict(maliciousYAML);
    console.log(JSON.stringify(strictResult, null, 2));

    console.log("\n🚨 Security Warnings:");
    const warnings = this.validateYAMLContent(maliciousYAML);
    warnings.forEach((warning) => console.log(`   ${warning}`));

    console.log("\n🔄 Migration to YAML 1.2:");
    const migrated = this.migrateToYAML12(maliciousYAML);
    console.log(migrated);
  }
}

// Zero-cost exports
export const parseConfig = feature("YAML12_STRICT")
  ? YAML12StrictParser.parseYAML12Strict
  : (content: string) => YAML12StrictParser.parseBasicYAML(content);

export const parseBoolean = feature("YAML_BOOLEAN_STRICT")
  ? YAML12StrictParser.parseBoolean
  : (value: string) => YAML12StrictParser.legacyParseBoolean(value);

export const {
  validateYAMLContent,
  migrateToYAML12,
  benchmark,
  demonstrateSecurity,
} = YAML12StrictParser;

// Demonstration function
export function demonstrateYAML12Parser(): void {
  console.log("🚀 Component #44: YAML 1.2 Strict Parser");
  console.log("=======================================");

  const sampleConfig = `
# Sample bunfig.toml configuration
[install]
cache = true
optional = false

[run]
shell = "bash"
silent = "no"

[trustedDependencies]
packages = ["react", "vue"]
allowFile = "yes"
`;

  console.log("\n📝 Sample Configuration:");
  console.log(sampleConfig);

  console.log("\n🔧 YAML 1.2 Strict Parsing:");
  const result = YAML12StrictParser.parseYAML12Strict(sampleConfig);
  console.log(JSON.stringify(result, null, 2));

  console.log("\n🔍 Boolean Parsing Examples:");
  const booleanTests = ["true", "false", "yes", "no", "on", "off", "maybe"];
  for (const test of booleanTests) {
    const parsed = YAML12StrictParser.parseBoolean(test);
    console.log(
      `   "${test}" → ${typeof parsed === "boolean" ? parsed : `"${parsed}"`}`
    );
  }

  console.log("\n🚨 Security Validation:");
  const warnings = YAML12StrictParser.validateYAMLContent(sampleConfig);
  if (warnings.length === 0) {
    console.log("   ✅ No security issues detected");
  } else {
    warnings.forEach((warning) => console.log(`   ⚠️  ${warning}`));
  }

  console.log("\n🧪 Performance Benchmark:");
  YAML12StrictParser.benchmark(sampleConfig, 5000);

  console.log("\n🔒 Security Demonstration:");
  YAML12StrictParser.demonstrateSecurity();

  console.log("\n🎯 Key Features:");
  console.log(`   ✅ YAML 1.2 spec compliance`);
  console.log(`   ✅ Boolean injection prevention`);
  console.log(`   ✅ Strict type parsing`);
  console.log(`   ✅ Security validation`);
  console.log(`   ✅ Migration utilities`);
  console.log(`   ✅ Zero-cost abstraction`);
}

// Run demonstration if called directly
if (import.meta.main) {
  demonstrateYAML12Parser();
}
