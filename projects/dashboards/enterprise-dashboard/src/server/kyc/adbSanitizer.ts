/**
 * ADB Command Sanitization
 * Prevents command injection attacks by validating and sanitizing ADB commands
 */

/**
 * Allowed ADB commands for KYC operations
 */
const ALLOWED_COMMANDS = new Set([
  "shell",
  "getprop",
  "dumpsys",
  "pm",
  "am",
  "cmd",
  "which",
]);

/**
 * Allowed shell commands
 */
const ALLOWED_SHELL_COMMANDS = new Set([
  "getprop",
  "dumpsys",
  "pm",
  "am",
  "cmd",
  "biometric",
  "which",
]);

/**
 * Allowed property names (read-only operations)
 */
const ALLOWED_PROPERTIES = new Set([
  "ro.product.model",
  "ro.build.version.security_patch",
  "ro.kernel.qemu",
  "ro.debuggable",
  "ro.secure",
]);

/**
 * Allowed package operations
 */
const ALLOWED_PACKAGE_OPS = new Set([
  "grant",
  "list",
]);

/**
 * Allowed activity manager operations
 */
const ALLOWED_AM_OPS = new Set([
  "start",
]);

/**
 * Sanitize ADB command arguments
 */
export function sanitizeAdbCommand(args: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Empty command" };
  }

  // First argument must be "adb"
  if (args[0] !== "adb") {
    return { valid: false, sanitized: [], error: "Invalid command prefix" };
  }

  const sanitized: string[] = [args[0]];

  // Validate second argument (main command)
  if (args.length < 2) {
    return { valid: false, sanitized: [], error: "Missing command" };
  }

  const command = args[1];
  if (!ALLOWED_COMMANDS.has(command)) {
    return { valid: false, sanitized: [], error: `Disallowed command: ${command}` };
  }

  sanitized.push(command);

  // Validate command-specific arguments
  if (command === "shell") {
    return sanitizeShellCommand(args.slice(2), sanitized);
  } else if (command === "getprop") {
    return sanitizeGetpropCommand(args.slice(2), sanitized);
  } else if (command === "pm") {
    return sanitizePackageManagerCommand(args.slice(2), sanitized);
  } else if (command === "am") {
    return sanitizeActivityManagerCommand(args.slice(2), sanitized);
  } else if (command === "dumpsys") {
    return sanitizeDumpsysCommand(args.slice(2), sanitized);
  }

  // For other allowed commands, pass through remaining args with basic validation
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    // Block dangerous patterns
    if (containsDangerousPattern(arg)) {
      return { valid: false, sanitized: [], error: `Dangerous pattern detected: ${arg}` };
    }
    sanitized.push(arg);
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize shell command arguments
 */
function sanitizeShellCommand(args: string[], sanitized: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Missing shell command" };
  }

  const shellCmd = args[0];
  if (!ALLOWED_SHELL_COMMANDS.has(shellCmd)) {
    return { valid: false, sanitized: [], error: `Disallowed shell command: ${shellCmd}` };
  }

  sanitized.push(shellCmd);

  // Validate remaining arguments based on shell command
  if (shellCmd === "getprop") {
    return sanitizeGetpropCommand(args.slice(1), sanitized);
  } else if (shellCmd === "pm") {
    return sanitizePackageManagerCommand(args.slice(1), sanitized);
  } else if (shellCmd === "am") {
    return sanitizeActivityManagerCommand(args.slice(1), sanitized);
  } else if (shellCmd === "which") {
    // "which su" is allowed
    if (args.length > 1 && args[1] === "su") {
      sanitized.push(args[1]);
      return { valid: true, sanitized };
    }
    return { valid: false, sanitized: [], error: "Invalid 'which' command" };
  } else if (shellCmd === "cmd" && args.length > 1 && args[1] === "biometric") {
    // Allow "cmd biometric authenticate"
    sanitized.push(args[1]);
    if (args.length > 2) {
      sanitized.push(...args.slice(2));
    }
    return { valid: true, sanitized };
  }

  // For other allowed commands, validate remaining args
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (containsDangerousPattern(arg)) {
      return { valid: false, sanitized: [], error: `Dangerous pattern detected: ${arg}` };
    }
    sanitized.push(arg);
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize getprop command
 */
function sanitizeGetpropCommand(args: string[], sanitized: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Missing property name" };
  }

  const property = args[0];
  if (!ALLOWED_PROPERTIES.has(property)) {
    return { valid: false, sanitized: [], error: `Disallowed property: ${property}` };
  }

  sanitized.push(property);
  return { valid: true, sanitized };
}

/**
 * Sanitize package manager command
 */
function sanitizePackageManagerCommand(args: string[], sanitized: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Missing package manager operation" };
  }

  const operation = args[0];
  if (!ALLOWED_PACKAGE_OPS.has(operation)) {
    return { valid: false, sanitized: [], error: `Disallowed package operation: ${operation}` };
  }

  sanitized.push(operation);

  // Validate remaining args (package name, permission)
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (containsDangerousPattern(arg)) {
      return { valid: false, sanitized: [], error: `Dangerous pattern detected: ${arg}` };
    }
    sanitized.push(arg);
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize activity manager command
 */
function sanitizeActivityManagerCommand(args: string[], sanitized: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Missing activity manager operation" };
  }

  const operation = args[0];
  if (!ALLOWED_AM_OPS.has(operation)) {
    return { valid: false, sanitized: [], error: `Disallowed activity operation: ${operation}` };
  }

  sanitized.push(operation);

  // Validate remaining args
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (containsDangerousPattern(arg)) {
      return { valid: false, sanitized: [], error: `Dangerous pattern detected: ${arg}` };
    }
    sanitized.push(arg);
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize dumpsys command
 */
function sanitizeDumpsysCommand(args: string[], sanitized: string[]): { valid: boolean; sanitized: string[]; error?: string } {
  if (args.length === 0) {
    return { valid: false, sanitized: [], error: "Missing dumpsys service" };
  }

  const service = args[0];
  // Only allow "package" service for Play Integrity checks
  if (service !== "package") {
    return { valid: false, sanitized: [], error: `Disallowed dumpsys service: ${service}` };
  }

  sanitized.push(service);

  // Validate package name if provided
  if (args.length > 1) {
    const packageName = args[1];
    if (containsDangerousPattern(packageName)) {
      return { valid: false, sanitized: [], error: `Dangerous pattern detected: ${packageName}` };
    }
    sanitized.push(packageName);
  }

  return { valid: true, sanitized };
}

/**
 * Check for dangerous patterns that could lead to command injection
 */
function containsDangerousPattern(arg: string): boolean {
  // Block command chaining
  if (arg.includes(";") || arg.includes("&&") || arg.includes("||") || arg.includes("|")) {
    return true;
  }

  // Block redirection
  if (arg.includes(">") || arg.includes("<") || arg.includes(">>")) {
    return true;
  }

  // Block command substitution
  if (arg.includes("$(") || arg.includes("`")) {
    return true;
  }

  // Block newlines
  if (arg.includes("\n") || arg.includes("\r")) {
    return true;
  }

  // Block path traversal
  if (arg.includes("../") || arg.includes("..\\")) {
    return true;
  }

  // Block absolute paths (except for known safe ones)
  if (arg.startsWith("/") && !arg.startsWith("/system/") && !arg.startsWith("/data/")) {
    return true;
  }

  return false;
}

/**
 * Validate ADB command before execution
 */
export function validateAdbCommand(args: string[]): void {
  const result = sanitizeAdbCommand(args);
  if (!result.valid) {
    throw new Error(`Invalid ADB command: ${result.error}`);
  }
}
