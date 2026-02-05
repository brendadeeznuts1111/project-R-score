/**
 * Transpilation Manager CLI
 * Manages Bun transpilation and language feature configuration
 */

/**
 * JSX Runtime Type
 */
export type JSXRuntime = "automatic" | "classic";

/**
 * Supported File Loaders
 */
export type FileLoader =
  | "js"
  | "jsx"
  | "ts"
  | "tsx"
  | "json"
  | "toml"
  | "text"
  | "file"
  | "wasm"
  | "napi";

/**
 * Transpilation Configuration
 */
export interface TranspilationConfig {
  tsconfigOverride?: string;
  define?: Record<string, string>;
  drop?: string[];
  loaders?: Map<string, FileLoader>;
  noMacros?: boolean;
  jsxFactory?: string;
  jsxFragment?: string;
  jsxImportSource?: string;
  jsxRuntime?: JSXRuntime;
  jsxSideEffects?: boolean;
  ignoreDceAnnotations?: boolean;
}

/**
 * Transpilation Command
 */
export interface TranspilationCommand {
  action:
    | "configure"
    | "apply"
    | "validate"
    | "show"
    | "reset"
    | "parse-define"
    | "parse-loader"
    | "parse-drop";
  config?: Partial<TranspilationConfig>;
  value?: string;
  key?: string;
}

/**
 * Validation result for transpilation configuration
 */
export interface TranspilationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Default transpilation configuration
 */
export const DEFAULT_TRANSPILATION_CONFIG: TranspilationConfig = {
  tsconfigOverride: undefined,
  define: {},
  drop: [],
  loaders: new Map(),
  noMacros: false,
  jsxFactory: undefined,
  jsxFragment: undefined,
  jsxImportSource: "react",
  jsxRuntime: "automatic",
  jsxSideEffects: false,
  ignoreDceAnnotations: false,
};

/**
 * Valid file loaders
 */
const VALID_LOADERS: Set<FileLoader> = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "toml",
  "text",
  "file",
  "wasm",
  "napi",
]);

/**
 * Parses CLI arguments into a transpilation command
 */
export function parseTranspilationCommand(args: string[]): TranspilationCommand {
  const [action, ...params] = args;

  const command: TranspilationCommand = {
    action: action as any,
    value: params[0],
    key: params[1],
  };

  return command;
}

/**
 * Parses --define flag format (K:V pairs)
 */
export function parseDefineFlag(input: string): Record<string, any> {
  const result: Record<string, any> = {};

  const pairs = input.split(",");
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split(":");
    const value = valueParts.join(":").trim();

    if (!key || !value) {
      throw new Error(
        `Invalid define format: "${pair}". Expected "K:V" format.`
      );
    }

    try {
      // Parse value as JSON if possible, otherwise as string
      result[key.trim()] = JSON.parse(value);
    } catch {
      result[key.trim()] = value;
    }
  }

  return result;
}

/**
 * Parses --loader flag format (.ext:loader pairs)
 */
export function parseLoaderFlag(input: string): Map<string, FileLoader> {
  const result: Map<string, FileLoader> = new Map();

  const pairs = input.split(",");
  for (const pair of pairs) {
    const [ext, loader] = pair.split(":").map((s) => s.trim());

    if (!ext || !loader) {
      throw new Error(
        `Invalid loader format: "${pair}". Expected ".ext:loader" format.`
      );
    }

    if (!ext.startsWith(".")) {
      throw new Error(
        `Invalid extension: "${ext}". Extensions must start with a dot.`
      );
    }

    if (!VALID_LOADERS.has(loader as FileLoader)) {
      throw new Error(
        `Invalid loader: "${loader}". Valid loaders: ${Array.from(VALID_LOADERS).join(", ")}`
      );
    }

    result.set(ext, loader as FileLoader);
  }

  return result;
}

/**
 * Parses --drop flag format (comma-separated functions)
 */
export function parseDropFlag(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Validates transpilation configuration
 */
export function validateTranspilationConfig(
  config: Partial<TranspilationConfig>
): TranspilationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate tsconfig override
  if (config.tsconfigOverride !== undefined) {
    if (typeof config.tsconfigOverride !== "string") {
      errors.push("tsconfigOverride must be a string (file path)");
    } else if (config.tsconfigOverride.length === 0) {
      errors.push("tsconfigOverride cannot be empty");
    }
  }

  // Validate define
  if (config.define !== undefined) {
    if (typeof config.define !== "object" || Array.isArray(config.define)) {
      errors.push("define must be a key-value object");
    }
    for (const [key, value] of Object.entries(config.define)) {
      if (typeof key !== "string" || key.length === 0) {
        errors.push(`Invalid define key: "${key}"`);
      }
      if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        errors.push(
          `Invalid define value for "${key}": must be string, number, or boolean`
        );
      }
    }
  }

  // Validate drop
  if (config.drop !== undefined) {
    if (!Array.isArray(config.drop)) {
      errors.push("drop must be an array of function names");
    } else {
      for (const item of config.drop) {
        if (typeof item !== "string" || item.length === 0) {
          errors.push(`Invalid drop function: "${item}"`);
        }
      }
    }
  }

  // Validate loaders
  if (config.loaders !== undefined) {
    if (!(config.loaders instanceof Map)) {
      errors.push("loaders must be a Map of extension to loader type");
    } else {
      for (const [ext, loader] of config.loaders) {
        if (!ext.startsWith(".")) {
          errors.push(`Invalid extension: "${ext}". Must start with a dot.`);
        }
        if (!VALID_LOADERS.has(loader)) {
          errors.push(
            `Invalid loader "${loader}" for extension "${ext}". Valid loaders: ${Array.from(VALID_LOADERS).join(", ")}`
          );
        }
      }
    }
  }

  // Validate noMacros
  if (config.noMacros !== undefined && typeof config.noMacros !== "boolean") {
    errors.push("noMacros must be a boolean");
  }

  // Validate jsxFactory
  if (config.jsxFactory !== undefined && typeof config.jsxFactory !== "string") {
    errors.push("jsxFactory must be a string");
  }

  // Validate jsxFragment
  if (
    config.jsxFragment !== undefined &&
    typeof config.jsxFragment !== "string"
  ) {
    errors.push("jsxFragment must be a string");
  }

  // Validate jsxImportSource
  if (
    config.jsxImportSource !== undefined &&
    typeof config.jsxImportSource !== "string"
  ) {
    errors.push("jsxImportSource must be a string");
  }

  // Validate jsxRuntime
  if (config.jsxRuntime !== undefined) {
    if (!["automatic", "classic"].includes(config.jsxRuntime)) {
      errors.push(
        'jsxRuntime must be "automatic" or "classic" (default: "automatic")'
      );
    }
  }

  // Validate jsxSideEffects
  if (
    config.jsxSideEffects !== undefined &&
    typeof config.jsxSideEffects !== "boolean"
  ) {
    errors.push("jsxSideEffects must be a boolean");
  }

  // Validate ignoreDceAnnotations
  if (
    config.ignoreDceAnnotations !== undefined &&
    typeof config.ignoreDceAnnotations !== "boolean"
  ) {
    errors.push("ignoreDceAnnotations must be a boolean");
  }

  // Warnings
  if (config.jsxFactory && config.jsxRuntime === "automatic") {
    warnings.push(
      'jsxFactory is typically used with "classic" jsx runtime, not "automatic"'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Executes a transpilation command
 */
export function executeTranspilationCommand(
  command: TranspilationCommand,
  currentConfig: TranspilationConfig = DEFAULT_TRANSPILATION_CONFIG
): string {
  try {
    switch (command.action) {
      case "show":
        return formatTranspilationConfig(currentConfig);

      case "configure": {
        if (!command.config) {
          throw new Error("Configuration object required");
        }
        const validation = validateTranspilationConfig(command.config);
        if (!validation.valid) {
          throw new Error(`Configuration validation failed:\n${validation.errors.join("\n")}`);
        }
        const merged = { ...currentConfig, ...command.config };
        return `✅ Configuration updated:\n${formatTranspilationConfig(merged)}`;
      }

      case "validate": {
        if (!command.value) {
          throw new Error("Configuration JSON required for validate");
        }
        let config: Partial<TranspilationConfig>;
        try {
          config = JSON.parse(command.value);
        } catch (e) {
          throw new Error(
            `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
          );
        }
        const validation = validateTranspilationConfig(config);
        return formatValidationResult(validation);
      }

      case "parse-define": {
        if (!command.value) {
          throw new Error("Define input required");
        }
        try {
          const defines = parseDefineFlag(command.value);
          return `Parsed defines:\n${formatDefines(defines)}`;
        } catch (e) {
          throw new Error(
            `Failed to parse defines: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      case "parse-loader": {
        if (!command.value) {
          throw new Error("Loader input required");
        }
        try {
          const loaders = parseLoaderFlag(command.value);
          return `Parsed loaders:\n${formatLoaders(loaders)}`;
        } catch (e) {
          throw new Error(
            `Failed to parse loaders: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      case "parse-drop": {
        if (!command.value) {
          throw new Error("Drop input required");
        }
        try {
          const drops = parseDropFlag(command.value);
          return `Functions to drop:\n${drops.map((f) => `  - ${f}`).join("\n")}`;
        } catch (e) {
          throw new Error(
            `Failed to parse drops: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      case "reset": {
        return `✅ Configuration reset to defaults:\n${formatTranspilationConfig(DEFAULT_TRANSPILATION_CONFIG)}`;
      }

      case "apply": {
        if (!command.config) {
          throw new Error("Configuration object required");
        }
        const validation = validateTranspilationConfig(command.config);
        if (!validation.valid) {
          throw new Error(
            `Configuration is invalid:\n${validation.errors.join("\n")}`
          );
        }
        if (validation.warnings.length > 0) {
          console.warn(
            `⚠️  Warnings:\n${validation.warnings.map((w) => `  - ${w}`).join("\n")}`
          );
        }
        return `✅ Configuration applied successfully`;
      }

      default:
        throw new Error(`Unknown action: ${command.action}`);
    }
  } catch (error) {
    throw new Error(
      `Transpilation command error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Formats transpilation configuration for display
 */
function formatTranspilationConfig(config: TranspilationConfig): string {
  const lines: string[] = [
    "Transpilation Configuration:",
    "──────────────────────────────────────",
  ];

  if (config.tsconfigOverride) {
    lines.push(`  tsconfig Override: ${config.tsconfigOverride}`);
  }

  if (Object.keys(config.define || {}).length > 0) {
    lines.push(`  Define: ${formatDefines(config.define)}`);
  }

  if ((config.drop || []).length > 0) {
    lines.push(`  Drop: ${config.drop?.join(", ")}`);
  }

  if ((config.loaders?.size || 0) > 0) {
    lines.push(`  Loaders: ${formatLoaders(config.loaders)}`);
  }

  lines.push(`  No Macros: ${config.noMacros ? "enabled" : "disabled"}`);

  if (config.jsxFactory) {
    lines.push(`  JSX Factory: ${config.jsxFactory}`);
  }

  if (config.jsxFragment) {
    lines.push(`  JSX Fragment: ${config.jsxFragment}`);
  }

  lines.push(`  JSX Import Source: ${config.jsxImportSource}`);
  lines.push(`  JSX Runtime: ${config.jsxRuntime}`);
  lines.push(`  JSX Side Effects: ${config.jsxSideEffects ? "enabled" : "disabled"}`);
  lines.push(`  Ignore DCE Annotations: ${config.ignoreDceAnnotations ? "enabled" : "disabled"}`);

  return lines.join("\n");
}

/**
 * Formats defines for display
 */
function formatDefines(defines?: Record<string, string>): string {
  if (!defines || Object.keys(defines).length === 0) {
    return "(none)";
  }
  return Object.entries(defines)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
}

/**
 * Formats loaders for display
 */
function formatLoaders(loaders?: Map<string, FileLoader>): string {
  if (!loaders || loaders.size === 0) {
    return "(none)";
  }
  const entries: string[] = [];
  for (const [ext, loader] of loaders) {
    entries.push(`${ext}:${loader}`);
  }
  return entries.join(", ");
}

/**
 * Formats validation result for display
 */
function formatValidationResult(
  result: TranspilationValidationResult
): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push("✅ Configuration is valid");
  } else {
    lines.push("❌ Configuration validation failed");
    lines.push("\nErrors:");
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\n⚠️  Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates CLI command for applying configuration
 */
export function generateTranspilationCommand(
  config: TranspilationConfig
): string {
  const parts: string[] = ["bun build"];

  if (config.tsconfigOverride) {
    parts.push(`--tsconfig-override ${config.tsconfigOverride}`);
  }

  if (Object.keys(config.define || {}).length > 0) {
    const defineStr = Object.entries(config.define || {})
      .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
      .join(" --define ");
    parts.push(`--define ${defineStr}`);
  }

  if ((config.drop || []).length > 0) {
    for (const fn of config.drop || []) {
      parts.push(`--drop ${fn}`);
    }
  }

  if ((config.loaders?.size || 0) > 0) {
    const loaderStr = Array.from(config.loaders || [])
      .map(([ext, loader]) => `${ext}:${loader}`)
      .join(" --loader ");
    parts.push(`--loader ${loaderStr}`);
  }

  if (config.noMacros) {
    parts.push("--no-macros");
  }

  if (config.jsxFactory) {
    parts.push(`--jsx-factory ${config.jsxFactory}`);
  }

  if (config.jsxFragment) {
    parts.push(`--jsx-fragment ${config.jsxFragment}`);
  }

  if (config.jsxImportSource) {
    if (config.jsxImportSource !== "react") {
      parts.push(`--jsx-import-source ${config.jsxImportSource}`);
    } else {
      // Include default react import source in the command
      parts.push(`--jsx-import-source ${config.jsxImportSource}`);
    }
  }

  if (config.jsxRuntime && config.jsxRuntime !== "automatic") {
    parts.push(`--jsx-runtime ${config.jsxRuntime}`);
  }

  if (config.jsxSideEffects) {
    parts.push("--jsx-side-effects");
  }

  if (config.ignoreDceAnnotations) {
    parts.push("--ignore-dce-annotations");
  }

  return parts.join(" ");
}

/**
 * Displays help text for transpilation commands
 */
export function getTranspilationHelp(): string {
  return `
Transpilation & Language Features Commands:

  show                      Display current transpilation configuration
  configure <json>          Configure transpilation settings
  apply <json>              Apply and validate transpilation configuration
  validate <json>           Validate transpilation configuration
  reset                     Reset to default configuration
  parse-define <input>      Parse --define flag format (K:V pairs)
  parse-loader <input>      Parse --loader flag format (.ext:loader pairs)
  parse-drop <input>        Parse --drop flag format (comma-separated functions)

Flags & Options:
  --tsconfig-override       Specify custom tsconfig.json path
  --define                  Define K:V substitutions during parsing
  --drop                    Remove function calls (e.g. console.*)
  --loader                  Parse files with specific loaders (.ext:loader)
  --no-macros               Disable macros from being executed
  --jsx-factory             Change JSX element compilation function
  --jsx-fragment            Change JSX fragment compilation function
  --jsx-import-source       Module specifier for JSX factory imports (default: react)
  --jsx-runtime             JSX runtime: automatic (default) or classic
  --jsx-side-effects        Treat JSX elements as having side effects
  --ignore-dce-annotations  Ignore tree-shaking annotations like @PURE

Valid Loaders:
  js, jsx, ts, tsx, json, toml, text, file, wasm, napi

Examples:
  bun transpile show
  bun transpile parse-define "process.env.NODE_ENV:development,API_URL:http://localhost"
  bun transpile parse-loader ".ts:tsx,.js:jsx"
  bun transpile parse-drop "console,debugger"
  bun transpile validate '{
    "jsxRuntime": "automatic",
    "jsxImportSource": "react",
    "define": {"NODE_ENV": "production"}
  }'
`;
}
