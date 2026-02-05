/**
 * infrastructure/v1-3-3/yaml-boolean-strict-parser.ts
 * Component #95: YAML-Boolean-Strict-Parser
 * Level 1: Parse | CPU: O(n) | YAML 1.2
 * yes/no/on/off as strings (not booleans)
 */


// Helper to check if feature is enabled
function isFeatureEnabled(): boolean {
  return process.env.FEATURE_YAML_BOOLEAN_STRICT === "1" || process.env.FEATURE_YAML_BOOLEAN_STRICT === "1";
}

// YAML 1.2 Strict Boolean Parser
export class YAMLBooleanStrictParser {
  private static parseCount = 0;
  private static strictCount = 0;

  // YAML 1.2 boolean values (strict)
  private static readonly YAML12_BOOLEANS = {
    true: true,
    false: false,
    yes: "yes",  // Treat as string in strict mode
    no: "no",    // Treat as string in strict mode
    on: "on",    // Treat as string in strict mode
    off: "off",  // Treat as string in strict mode
    y: "y",      // Treat as string in strict mode
    n: "n",      // Treat as string in strict mode
  };

  // YAML 1.1 boolean values (legacy - for comparison)
  private static readonly YAML11_BOOLEANS = {
    true: true,
    false: false,
    yes: true,
    no: false,
    on: true,
    off: false,
    y: true,
    n: false,
    "1": true,
    "0": false,
  };

  // Parse YAML content with strict boolean handling
  static parseYAML(content: string, strict: boolean = true): Record<string, any> {
    if (!isFeatureEnabled()) {
      // Fallback: basic parsing
      return this.fallbackParse(content);
    }

    this.parseCount++;
    if (strict) this.strictCount++;

    const lines = content.split("\n");
    const result: Record<string, any> = {};
    const stack: any[] = [result];
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Calculate indentation
      const indent = line.search(/\S/);
      if (indent === -1) continue;

      // Handle indentation changes
      while (indent < currentIndent && stack.length > 1) {
        stack.pop();
        currentIndent = stack.length > 1 ? indent : 0;
      }

      // Parse key-value pairs
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        // Could be a list item or continuation
        continue;
      }

      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Handle empty values (nested structure)
      if (value === "") {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.search(/\S/) > indent) {
          // This is a nested object
          const nestedObj: Record<string, any> = {};
          stack[stack.length - 1][key] = nestedObj;
          stack.push(nestedObj);
          currentIndent = indent;
          continue;
        }
      }

      // Parse the value with strict boolean handling
      value = this.parseValue(value, strict);

      // Add to current object
      stack[stack.length - 1][key] = value;
    }

    return result;
  }

  // Parse individual value with strict boolean handling
  static parseValue(value: string, strict: boolean = true): any {
    if (!isFeatureEnabled()) {
      return this.fallbackParseValue(value);
    }

    // Remove quotes if present
    const unquoted = value.replace(/^["']|["']$/g, "");

    // Check for null/undefined
    if (unquoted === "" || unquoted === "null" || unquoted === "~") {
      return null;
    }

    // Check for numbers
    if (/^-?\d+(\.\d+)?$/.test(unquoted)) {
      return Number(unquoted);
    }

    // Check for arrays [item1, item2]
    if (unquoted.startsWith("[") && unquoted.endsWith("]")) {
      const arrayContent = unquoted.slice(1, -1).trim();
      if (arrayContent === "") return [];
      return arrayContent.split(",").map(item => this.parseValue(item.trim(), strict));
    }

    // Check for objects {key: value}
    if (unquoted.startsWith("{") && unquoted.endsWith("}")) {
      const objContent = unquoted.slice(1, -1).trim();
      if (objContent === "") return {};
      const obj: Record<string, any> = {};
      objContent.split(",").forEach(pair => {
        const [k, v] = pair.split(":").map(s => s.trim());
        if (k && v) {
          obj[k] = this.parseValue(v, strict);
        }
      });
      return obj;
    }

    // Boolean handling
    const lower = unquoted.toLowerCase();

    if (strict) {
      // STRICT MODE: yes/no/on/off remain as strings
      if (lower in this.YAML12_BOOLEANS) {
        const result = this.YAML12_BOOLEANS[lower as keyof typeof this.YAML12_BOOLEANS];
        // Return the value as-is (string for yes/no/on/off, boolean for true/false)
        return typeof result === "boolean" ? result : result;
      }
    } else {
      // NON-STRICT MODE: yes/no/on/off become booleans (YAML 1.1 style)
      if (lower in this.YAML11_BOOLEANS) {
        return this.YAML11_BOOLEANS[lower as keyof typeof this.YAML11_BOOLEANS];
      }
    }

    // Return as string if not recognized
    return unquoted;
  }

  // Validate YAML content for strict boolean compliance
  static validateYAMLContent(content: string): string[] {
    const warnings: string[] = [];

    if (!isFeatureEnabled()) {
      return warnings;
    }

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) continue;

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const value = trimmed.substring(colonIndex + 1).trim();
      const lowerValue = value.toLowerCase();

      // Check for YAML 1.1 style booleans that might be ambiguous
      if (["yes", "no", "on", "off", "y", "n"].includes(lowerValue)) {
        // Check if it's quoted
        if (!value.startsWith('"') && !value.startsWith("'")) {
          warnings.push(`Line ${i + 1}: "${value}" will be treated as string in strict mode (use "true"/"false" or quote the value)`);
        }
      }

      // Check for mixed boolean styles
      if (["true", "false"].includes(lowerValue) && value !== lowerValue) {
        warnings.push(`Line ${i + 1}: Mixed case boolean "${value}" - use lowercase for consistency`);
      }
    }

    return warnings;
  }

  // Convert YAML 1.1 to YAML 1.2 strict format
  static convertToStrict(content: string): string {
    if (!isFeatureEnabled()) {
      return content;
    }

    const lines = content.split("\n");
    const converted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        converted.push(line);
        continue;
      }

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        converted.push(line);
        continue;
      }

      const key = trimmed.substring(0, colonIndex);
      const value = trimmed.substring(colonIndex + 1).trim();
      const lowerValue = value.toLowerCase();

      // Convert YAML 1.1 booleans to quoted strings
      if (["yes", "no", "on", "off", "y", "n"].includes(lowerValue) && !value.startsWith('"') && !value.startsWith("'")) {
        converted.push(`${key}: "${value}"`);
      } else {
        converted.push(line);
      }
    }

    return converted.join("\n");
  }

  // Parse config with boolean type checking
  static parseConfig<T extends Record<string, any>>(
    content: string,
    expectedTypes: Partial<Record<keyof T, "string" | "number" | "boolean" | "object" | "array">>
  ): {
    config: Partial<T>;
    typeErrors: string[];
  } {
    const config = this.parseYAML(content, true) as Partial<T>;
    const typeErrors: string[] = [];

    if (!isFeatureEnabled()) {
      return { config, typeErrors };
    }

    for (const [key, expectedType] of Object.entries(expectedTypes)) {
      const value = config[key];
      const actualType = Array.isArray(value) ? "array" : typeof value;

      if (expectedType && actualType !== expectedType) {
        // Check if it's a boolean that should be string in strict mode
        if (expectedType === "string" && typeof value === "boolean") {
          typeErrors.push(`Config key "${key}" should be string, got boolean - use quotes in YAML`);
        } else if (expectedType === "boolean" && typeof value === "string") {
          // Check if it's a string that looks like a boolean
          if (["true", "false"].includes(value.toLowerCase())) {
            typeErrors.push(`Config key "${key}" should be boolean, got string - use true/false without quotes`);
          } else {
            typeErrors.push(`Config key "${key}" should be boolean, got string`);
          }
        } else {
          typeErrors.push(`Config key "${key}" should be ${expectedType}, got ${actualType}`);
        }
      }
    }

    return { config, typeErrors };
  }

  // Get parsing statistics
  static getStats(): {
    parseCount: number;
    strictCount: number;
    featureEnabled: boolean;
  } {
    return {
      parseCount: this.parseCount,
      strictCount: this.strictCount,
      featureEnabled: isFeatureEnabled(),
    };
  }

  // Fallback parsing (when feature is disabled)
  private static fallbackParse(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const rawValue = trimmed.substring(colonIndex + 1).trim();

      // Basic value parsing
      let value: any = rawValue;
      if (rawValue === "" || rawValue === "null") {
        value = "";
      } else if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
        value = rawValue;
      } else if (rawValue === "true" || rawValue === "false") {
        value = rawValue;
      } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        value = rawValue.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  // Fallback value parsing
  private static fallbackParseValue(value: string): string {
    if (value === "" || value === "null") return "";
    if (/^-?\d+(\.\d+)?$/.test(value)) return value;
    if (value === "true" || value === "false") return value;
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    return value;
  }
}

// Zero-cost export
export const yamlBooleanParser = isFeatureEnabled()
  ? YAMLBooleanStrictParser
  : {
      parseYAML: (content: string) => {
        const result: Record<string, any> = {};
        content.split("\n").forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex === -1) return;
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();
          result[key] = value;
        });
        return result;
      },
      parseValue: (value: string) => value,
      validateYAMLContent: () => [],
      convertToStrict: (content: string) => content,
      parseConfig: (content: string) => ({ config: {}, typeErrors: [] }),
      getStats: () => ({ parseCount: 0, strictCount: 0, featureEnabled: false }),
    };
