// Feed Project - Environment Variable Substitutor
//
// Replaces $env:VAR patterns with actual values
// Example: $env:DASH_ROOT → /actual/path

const ENV_PATTERN = /\$env:([A-Z_][A-Z0-9_]*)/g;

export function substituteEnvVars(value: string): string {
  return value.replace(ENV_PATTERN, (match, varName) => {
    const envValue = Bun.env[varName];
    if (envValue === undefined) {
      return match; // Keep original if not defined
    }
    return envValue;
  });
}

export function substituteInObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as T;

  for (const key of Object.keys(result)) {
    const value = result[key as keyof T];

    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = substituteEnvVars(value);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === "string" ? substituteEnvVars(item) : item
      );
    } else if (typeof value === "object" && value !== null) {
      (result as Record<string, unknown>)[key] = substituteInObject(
        value as Record<string, unknown>
      );
    }
  }

  return result;
}

export function extractEnvVars(value: string): string[] {
  const matches = value.matchAll(ENV_PATTERN);
  return [...matches].map((m) => m[1]);
}

export function validateEnvVars(vars: string[]): { valid: boolean; missing: string[] } {
  const missing = vars.filter((v) => Bun.env[v] === undefined);
  return {
    valid: missing.length === 0,
    missing,
  };
}
