// ============================================
// HEADER CONSTANTS
// ============================================

export const HEADERS = {
  CONFIG_VERSION: "X-Bun-Config-Version",
  REGISTRY_HASH: "X-Bun-Registry-Hash",
  FEATURE_FLAGS: "X-Bun-Feature-Flags",
  TERMINAL_MODE: "X-Bun-Terminal-Mode",
  TERMINAL_ROWS: "X-Bun-Terminal-Rows",
  TERMINAL_COLS: "X-Bun-Terminal-Cols",
  CONFIG_DUMP: "X-Bun-Config-Dump",
  PROXY_TOKEN: "X-Bun-Proxy-Token",
  DOMAIN: "X-Bun-Domain",
  DOMAIN_HASH: "X-Bun-Domain-Hash",
} as const;

// ============================================
// VALIDATION ERROR CLASS
// ============================================

export type ValidationErrorCode =
  | "INVALID_FORMAT"
  | "OUT_OF_RANGE"
  | "CHECKSUM_MISMATCH"
  | "INVALID_TOKEN"
  | "UNKNOWN_DOMAIN"
  | "UNKNOWN_HEADER"
  | "MISSING_HEADER";

export class ProxyHeaderError extends Error {
  constructor(
    public code: ValidationErrorCode,
    public header: string,
    public value: string,
    message: string
  ) {
    super(`[${code}] ${header}: ${value} - ${message}`);
    this.name = "ProxyHeaderError";
  }
}

// ============================================
// VALIDATION RESULTS
// ============================================

export type ValidationResult<T = any> = 
  | { valid: true; parsed: T; duration: number }
  | { valid: false; error: ProxyHeaderError; duration: number };

// ============================================
// VALIDATION REGISTRY
// ============================================

type Validator = (value: string) => ValidationResult;

const VALIDATORS: Record<string, Validator> = {
  [HEADERS.CONFIG_VERSION]: validateConfigVersion,
  [HEADERS.REGISTRY_HASH]: validateRegistryHash,
  [HEADERS.FEATURE_FLAGS]: validateFeatureFlags,
  [HEADERS.TERMINAL_MODE]: validateTerminalMode,
  [HEADERS.TERMINAL_ROWS]: validateTerminalRows,
  [HEADERS.TERMINAL_COLS]: validateTerminalCols,
  [HEADERS.CONFIG_DUMP]: validateConfigDump,
  [HEADERS.PROXY_TOKEN]: validateProxyToken,
  [HEADERS.DOMAIN]: validateDomain,
  [HEADERS.DOMAIN_HASH]: validateDomainHash,
};

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export function validateProxyHeader(
  name: string, 
  value: string
): ValidationResult {
  const start = nanoseconds();
  
  // Find validator case-insensitively
  const validatorKey = Object.keys(VALIDATORS).find(k => k.toLowerCase() === name.toLowerCase());
  const validator = validatorKey ? VALIDATORS[validatorKey] : null;

  if (!validator) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "UNKNOWN_HEADER",
        name,
        value,
        "Unrecognized X-Bun header"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  try {
    return validator(value);
  } catch (error) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        name,
        value,
        error instanceof Error ? error.message : String(error)
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
}

// ============================================
// INDIVIDUAL VALIDATORS
// ============================================

function validateConfigVersion(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  // Format: decimal integer 0-255
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.CONFIG_VERSION,
        value,
        "Must be decimal integer (0-255)"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 10);
  if (num < 0 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.CONFIG_VERSION,
        value,
        "Must be between 0 and 255"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateRegistryHash(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.REGISTRY_HASH,
        value,
        "Must be 0x + 8 hexadecimal characters"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 16);
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateFeatureFlags(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.FEATURE_FLAGS,
        value,
        "Must be 0x + 8 hexadecimal characters"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 16);
  
  // Validate 32-bit unsigned integer
  if (num < 0 || num > 0xFFFFFFFF) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.FEATURE_FLAGS,
        value,
        "Must be 32-bit unsigned integer"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateTerminalMode(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^[0-3]$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_MODE,
        value,
        "Must be 0 (disabled), 1 (cooked), 2 (raw), or 3 (pipe)"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: parseInt(value, 10),
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateTerminalRows(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_ROWS,
        value,
        "Must be decimal integer"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 10);
  if (num < 1 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.TERMINAL_ROWS,
        value,
        "Must be between 1 and 255 rows"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateTerminalCols(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_COLS,
        value,
        "Must be decimal integer"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 10);
  if (num < 1 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.TERMINAL_COLS,
        value,
        "Must be between 1 and 255 columns"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateConfigDump(value: string): ValidationResult<Uint8Array> {
  const start = nanoseconds();
  
  if (!/^0x[a-fA-F0-9]{26}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.CONFIG_DUMP,
        value,
        "Must be 0x + 26 hexadecimal characters (13 bytes)"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const bytes = new Uint8Array(13);
  const hex = value.slice(2);
  for (let i = 0; i < 26; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  
  // Verify checksum: byte 12 = XOR of bytes 0-11
  const checksum = bytes[12];
  const calculated = bytes.slice(0, 12).reduce((a, b) => a ^ b, 0);
  
  if (checksum !== calculated) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "CHECKSUM_MISMATCH",
        HEADERS.CONFIG_DUMP,
        value,
        `Checksum mismatch: expected 0x${calculated.toString(16)}, got 0x${checksum.toString(16)}`
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: bytes,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateProxyToken(value: string): ValidationResult<any> {
  const start = nanoseconds();
  
  try {
    // Minimal JWT format check
    if (!/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value)) {
      throw new Error("Invalid JWT format");
    }
    
    // Mock payload for demo
    const mockPayload = {
      domain: "@domain1",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      aud: `proxy-a1b2c3d4`,
    };
    
    return {
      valid: true,
      parsed: mockPayload,
      duration: nsToNumber(nanoseconds() - start),
    };
  } catch (error) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_TOKEN",
        HEADERS.PROXY_TOKEN,
        value.slice(0, 10) + "...",
        error instanceof Error ? error.message : String(error)
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
}

function validateDomain(value: string): ValidationResult<string> {
  const start = nanoseconds();
  
  if (value !== "@domain1" && value !== "@domain2") {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "UNKNOWN_DOMAIN",
        HEADERS.DOMAIN,
        value,
        "Must be @domain1 or @domain2"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  return {
    valid: true,
    parsed: value,
    duration: nsToNumber(nanoseconds() - start),
  };
}

function validateDomainHash(value: string): ValidationResult<number> {
  const start = nanoseconds();
  
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.DOMAIN_HASH,
        value,
        "Must be 0x + 8 hexadecimal characters"
      ),
      duration: nsToNumber(nanoseconds() - start),
    };
  }
  
  const num = parseInt(value, 16);
  
  return {
    valid: true,
    parsed: num,
    duration: nsToNumber(nanoseconds() - start),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function nanoseconds(): bigint {
  return process.hrtime.bigint();
}

function nsToNumber(ns: bigint): number {
  return Number(ns);
}

// ============================================
// BATCH VALIDATION
// ============================================

export interface ValidationReport {
  total: number;
  valid: number;
  invalid: number;
  totalDuration: number;
  averageDuration: number;
  results: Record<string, ValidationResult>;
}

export function validateAllHeaders(headers: Headers): ValidationReport {
  const start = nanoseconds();
  const results: Record<string, ValidationResult> = {};
  let valid = 0;
  let invalid = 0;
  let totalDuration = 0;
  
  for (const [name, value] of headers.entries()) {
    // Only validate headers starting with x-bun-
    if (name.toLowerCase().startsWith("x-bun-")) {
      const result = validateProxyHeader(name, value);
      results[name] = result;
      totalDuration += result.duration;
      
      if (result.valid) {
        valid++;
      } else {
        invalid++;
        // Detailed logging for invalid headers
        console.warn(`[validator] Invalid header detected: ${name}=${value.length > 20 ? value.substring(0, 20) + '...' : value}. Error: ${result.error.message}`);
      }
    }
  }
  
  const total = valid + invalid;
  const overallDuration = nsToNumber(nanoseconds() - start);

  return {
    total,
    valid,
    invalid,
    totalDuration: overallDuration,
    averageDuration: total > 0 ? totalDuration / total : 0,
    results,
  };
}

// ============================================
// GENERATE TEST HEADERS
// ============================================

export function generateValidHeaders(options?: Partial<Record<keyof typeof HEADERS, string>>): Headers {
  const headers = new Headers();
  
  const defaults: Record<string, string> = {
    [HEADERS.CONFIG_VERSION]: "1",
    [HEADERS.REGISTRY_HASH]: "0xa1b2c3d4",
    [HEADERS.FEATURE_FLAGS]: "0x00000007",
    [HEADERS.TERMINAL_MODE]: "2",
    [HEADERS.TERMINAL_ROWS]: "24",
    [HEADERS.TERMINAL_COLS]: "80",
    [HEADERS.PROXY_TOKEN]: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkb21haW4iOiJAZG9tYWluMSIsImV4cCI6MTcwMDAwMDAwMCwiYXVkIjoicHJveHktYTFjMmMzZDQifQ.fake-signature",
    [HEADERS.DOMAIN]: "@domain1",
    [HEADERS.DOMAIN_HASH]: "0xb1c3d4c5",
  };
  
  // Apply defaults and overrides
  Object.entries(defaults).forEach(([key, value]) => {
    if (options?.[key as keyof typeof HEADERS]) {
      headers.set(key, options[key as keyof typeof HEADERS]!);
    } else {
      headers.set(key, value);
    }
  });
  
  // Generate config dump
  const configBytes = new Uint8Array(13);
  configBytes[0] = parseInt(defaults[HEADERS.CONFIG_VERSION]);
  new DataView(configBytes.buffer).setUint32(1, parseInt(defaults[HEADERS.REGISTRY_HASH].slice(2), 16));
  new DataView(configBytes.buffer).setUint32(5, parseInt(defaults[HEADERS.FEATURE_FLAGS].slice(2), 16));
  configBytes[9] = parseInt(defaults[HEADERS.TERMINAL_MODE]);
  configBytes[10] = parseInt(defaults[HEADERS.TERMINAL_ROWS]);
  configBytes[11] = parseInt(defaults[HEADERS.TERMINAL_COLS]);
  
  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 12; i++) {
    checksum ^= configBytes[i];
  }
  configBytes[12] = checksum;
  
  const hex = Array.from(configBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  headers.set(HEADERS.CONFIG_DUMP, `0x${hex}`);
  
  return headers;
}
