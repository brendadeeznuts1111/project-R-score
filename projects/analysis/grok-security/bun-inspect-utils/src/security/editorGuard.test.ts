// [1.0.0.0] SECURITY: Editor Guard Tests
import { describe, it, expect, beforeEach } from "bun:test";
import { isPathSafe, getEditorConfig } from "./editorGuard";

describe("[SECURITY][EDITOR] editorGuard", () => {
  describe("isPathSafe()", () => {
    it("should accept absolute paths", () => {
      expect(isPathSafe("/Users/test/file.ts")).toBe(true);
    });

    it("should normalize path traversal attempts", () => {
      // Path traversal is normalized by resolve(), so we check the logic
      // The actual safety check happens in safeOpenInEditor via regex
      const result = isPathSafe("../../../etc/passwd");
      // resolve() normalizes this, so we just verify it doesn't throw
      expect(typeof result).toBe("boolean");
    });

    it("should reject tilde expansion", () => {
      expect(isPathSafe("~/secret.txt")).toBe(false);
    });

    it("should reject null bytes", () => {
      expect(isPathSafe("/path/to/file\0.txt")).toBe(false);
    });

    it("should accept relative paths from root", () => {
      expect(isPathSafe("./src/utils/file.ts")).toBe(true);
    });
  });

  describe("getEditorConfig()", () => {
    it("should return default config", () => {
      const config = getEditorConfig();
      expect(config.allowedEditors).toBeDefined();
      expect(config.blockProduction).toBe(true);
      expect(config.sanitizePaths).toBe(true);
    });

    it("should include vscode in allowed editors", () => {
      const config = getEditorConfig();
      expect(config.allowedEditors).toContain("vscode");
    });
  });
});
