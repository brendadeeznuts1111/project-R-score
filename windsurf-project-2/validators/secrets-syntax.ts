export interface ValidationResult {
  valid: boolean;
  variables: VariableInfo[];
  errors: SyntaxError[];
}

export interface VariableInfo {
  name: string;
  hasDefault: boolean;
  isDangerous: boolean;
  classification: 'public' | 'private' | 'secret' | 'dangerous';
}

export interface SyntaxError {
  message: string;
  position: number;
  severity: 'error' | 'warning' | 'info';
}

export const BUN_SECRET_PATTERNS = {
  envVar: /\$\{([A-Z_][A-Z0-9_]*)((?::-\w+)?)\}/g,

  publicVar: /^\$\{PUBLIC_[A-Z_]+\}$/,
  privateVar: /^\$\{PRIVATE_[A-Z_]+\}$/,
  secretVar: /^\$\{SECRET_[A-Z_]+\}$/,
  trustedVar: /^\$\{TRUSTED_[A-Z_]+\}$/,

  dangerousVar: /\$\{(PASSWORD|TOKEN|KEY|SECRET)\b/i,
  userInputVar: /\$\{.*USER_INPUT.*\}/,
  requestVar: /\$\{.*REQUEST.*\}/
};

export function validateSecretSyntax(value: string): ValidationResult {
  const matches: RegExpMatchArray[] = [...value.matchAll(BUN_SECRET_PATTERNS.envVar)];

  const variables: VariableInfo[] = matches.map((match) => {
    const name = match[1];
    const defaultVal = match[2];
    return {
      name,
      hasDefault: !!defaultVal,
      isDangerous: BUN_SECRET_PATTERNS.dangerousVar.test(name),
      classification: classifyVariable(name)
    };
  });

  return {
    valid: matches.length > 0,
    variables,
    errors: findSyntaxErrors(value)
  };
}

export function classifyVariable(
  name: string
): 'public' | 'private' | 'secret' | 'dangerous' {
  if (name.startsWith('PUBLIC_')) return 'public';
  if (name.startsWith('PRIVATE_')) return 'private';
  if (name.startsWith('SECRET_')) return 'secret';
  if (BUN_SECRET_PATTERNS.dangerousVar.test(name)) return 'dangerous';
  return 'private';
}

function findSyntaxErrors(value: string): SyntaxError[] {
  const errors: SyntaxError[] = [];

  if (BUN_SECRET_PATTERNS.userInputVar.test(value)) {
    errors.push({
      message: 'USER_INPUT detected in secret variable - potential injection risk',
      position: value.indexOf('USER_INPUT'),
      severity: 'error'
    });
  }

  if (BUN_SECRET_PATTERNS.requestVar.test(value)) {
    errors.push({
      message: 'REQUEST detected in secret variable - avoid exposing request data',
      position: value.indexOf('REQUEST'),
      severity: 'warning'
    });
  }

  const unclosed = (value.match(/\$\{/g) || []).length - (value.match(/\}/g) || []).length;
  if (unclosed > 0) {
    errors.push({
      message: `Unclosed variable syntax: ${unclosed} unmatched '{'`,
      position: value.length,
      severity: 'error'
    });
  }

  return errors;
}

export function isValidSecretPattern(value: string): boolean {
  const result = validateSecretSyntax(value);
  return result.valid && result.errors.length === 0;
}

export function extractSecretNames(value: string): string[] {
  const matches = [...value.matchAll(BUN_SECRET_PATTERNS.envVar)];
  return matches.map((m) => m[1]);
}
