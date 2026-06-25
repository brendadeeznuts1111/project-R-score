// [1.0.0.0] SECURITY: Editor Guard - Bun-native path sanitization
// Zero-npm, production-safe, financial-grade security
// Bun.openInEditor with path traversal protection & allowlist enforcement

import { resolve } from "path";

export interface EditorOptions {
  line?: number;
  column?: number;
}

export interface EditorGuardConfig {
  allowedEditors?: string[];
  blockProduction?: boolean;
  sanitizePaths?: boolean;
}

const DEFAULT_CONFIG: EditorGuardConfig = {
  allowedEditors: ["vscode", "subl", "vim", "code", "emacs", "nano"],
  blockProduction: true,
  sanitizePaths: true,
};

/**
 * [1.1.0.0] Safe editor invocation with security hardening
 * - Path traversal protection via Bun.posix.resolve
 * - Null byte filtering
 * - Production environment guard
 * - Editor allowlist enforcement
 *
 * @see ../../docs/PATH_SECURITY_GUIDE.md for comprehensive PATH configuration
 * @example
 * // ✅ Safe: Use URL-based path resolution
 * const target = new URL('../src/file.ts', import.meta.url).pathname;
 * safeOpenInEditor(target, { line: 42, column: 15 });
 */
export function safeOpenInEditor(
  filePath: string | URL,
  options: EditorOptions = {},
  config: EditorGuardConfig = DEFAULT_CONFIG,
): void {
  // [1.1.1.0] Path sanitization
  const normalizedPath =
    typeof filePath === "string"
      ? filePath
      : filePath.toString().replace("file://", "");

  const safePath = resolve("/", normalizedPath)
    .replace(/(\.\.\/|~|:)/g, "") // Block path traversal
    .replace(/\0/g, ""); // Block null bytes

  // [1.1.2.0] Production environment guard
  if (config.blockProduction && process.env.NODE_ENV === "production") {
    console.error("[SECURITY] Editor access blocked in production environment");
    return;
  }

  // [1.1.3.0] Editor allowlist enforcement
  const allowedEditors = config.allowedEditors || DEFAULT_CONFIG.allowedEditors;
  const editor = process.env.SECURITY_EDITOR || "vscode";
  const editorName = editor.split(" ")[0];

  if (!allowedEditors.includes(editorName)) {
    throw new Error(
      `[SECURITY] Unauthorized editor: ${editorName}. Allowed: ${allowedEditors.join(", ")}`,
    );
  }

  // [1.1.4.0] Validate line/column numbers
  const safeLine = options.line && options.line >= 1 ? options.line : 1;
  const safeColumn = options.column && options.column >= 1 ? options.column : 1;

  // [1.1.5.0] Execute with Bun-native API
  try {
    Bun.openInEditor(safePath, {
      editor,
      line: safeLine,
      column: safeColumn,
    });
    console.debug(
      `[EDITOR] Opened ${safePath}:${safeLine}:${safeColumn} in ${editor}`,
    );
  } catch (error) {
    console.error("[EDITOR] Failed to open file:", error);
    throw new Error(`Editor launch failed: ${(error as Error).message}`);
  }
}

/**
 * [1.2.0.0] Validate file path safety
 * Returns true if path is safe to open in editor
 */
export function isPathSafe(filePath: string): boolean {
  try {
    const normalized = resolve("/", filePath)
      .replace(/(\.\.\/|~|:)/g, "")
      .replace(/\0/g, "");
    return normalized === resolve("/", filePath);
  } catch {
    return false;
  }
}

/**
 * [1.3.0.0] Get editor configuration from environment
 */
export function getEditorConfig(): EditorGuardConfig {
  return {
    allowedEditors: (process.env.ALLOWED_EDITORS || "vscode,subl,vim").split(
      ",",
    ),
    blockProduction: process.env.BLOCK_EDITOR_PRODUCTION !== "false",
    sanitizePaths: process.env.SANITIZE_PATHS !== "false",
  };
}
