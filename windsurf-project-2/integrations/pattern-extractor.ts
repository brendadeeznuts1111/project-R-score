export interface TomlPattern {
  pattern: string;
  keyPath: string;
  envVars: string[];
  isDynamic: boolean;
  location: PatternLocation;
}

export interface PatternLocation {
  file: string;
  line: number;
  column: number;
}

export interface PatternExtractionResult {
  patterns: TomlPattern[];
  staticPatterns: TomlPattern[];
  dynamicPatterns: TomlPattern[];
  envVarReferences: Map<string, string[]>;
}

export function extractURLPatternsFromToml(
  obj: any,
  keyPath = '',
  fileLocation = ''
): TomlPattern[] {
  const patterns: TomlPattern[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;

    if (typeof value === 'string' && looksLikeURLPattern(value)) {
      patterns.push({
        pattern: value,
        keyPath: currentPath,
        envVars: extractEnvVars(value),
        isDynamic: value.includes('${'),
        location: parseLocation(fileLocation)
      });
    } else if (typeof value === 'object' && value !== null) {
      patterns.push(...extractURLPatternsFromToml(value, currentPath, fileLocation));
    }
  }

  return patterns;
}

export function extractPatternsWithContext(
  obj: any,
  fileLocation = ''
): PatternExtractionResult {
  const allPatterns = extractURLPatternsFromToml(obj, '', fileLocation);
  const staticPatterns = allPatterns.filter((p) => !p.isDynamic);
  const dynamicPatterns = allPatterns.filter((p) => p.isDynamic);

  const envVarReferences = new Map<string, string[]>();
  for (const pattern of allPatterns) {
    for (const envVar of pattern.envVars) {
      const existing = envVarReferences.get(envVar) || [];
      existing.push(pattern.keyPath);
      envVarReferences.set(envVar, existing);
    }
  }

  return {
    patterns: allPatterns,
    staticPatterns,
    dynamicPatterns,
    envVarReferences
  };
}

function looksLikeURLPattern(value: string): boolean {
  return (
    value.includes(':') ||
    value.includes('*') ||
    /https?:\/\//.test(value) ||
    value.startsWith('/')
  );
}

function extractEnvVars(value: string): string[] {
  const matches = [...value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)/g)];
  return matches.map((m) => m[1]);
}

function parseLocation(fileLocation: string): PatternLocation {
  if (!fileLocation) {
    return { file: '', line: 0, column: 0 };
  }

  const lineMatch = fileLocation.match(/:(\d+)(?::(\d+))?$/);
  return {
    file: fileLocation.replace(/:(\d+)(?::(\d+))?$/, ''),
    line: lineMatch ? parseInt(lineMatch[1], 10) : 0,
    column: lineMatch && lineMatch[2] ? parseInt(lineMatch[2], 10) : 0
  };
}

export function filterPatternsByEnvVars(
  patterns: TomlPattern[],
  availableEnv: Record<string, string>
): TomlPattern[] {
  return patterns.filter((pattern) => {
    if (!pattern.isDynamic) return true;
    return pattern.envVars.every((v) => v in availableEnv);
  });
}

export function resolveDynamicPatterns(
  patterns: TomlPattern[],
  env: Record<string, string>
): string[] {
  return patterns
    .filter((p) => p.isDynamic)
    .map((p) => {
      let resolved = p.pattern;
      for (const envVar of p.envVars) {
        resolved = resolved.replace(
          new RegExp(`\\$\\{${envVar}(?::-[^}]+)?\\}`, 'g'),
          env[envVar] || ''
        );
      }
      return resolved;
    });
}
