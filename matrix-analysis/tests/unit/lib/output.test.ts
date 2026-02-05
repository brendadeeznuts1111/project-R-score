import { describe, it, expect } from "bun:test";
import {
  maskValue,
  isSensitiveKey,
  detectConflicts,
  computeChanges,
} from "../../lib/output";

describe("output", () => {
  describe("isSensitiveKey", () => {
    it("detects SECRET patterns", () => {
      expect(isSensitiveKey("SESSION_SECRET")).toBe(true);
      expect(isSensitiveKey("JWT_SECRET")).toBe(true);
      expect(isSensitiveKey("MY_SECRET_KEY")).toBe(true);
    });

    it("detects PASSWORD patterns", () => {
      expect(isSensitiveKey("DB_PASSWORD")).toBe(true);
      expect(isSensitiveKey("USER_PASSWORD")).toBe(true);
    });

    it("detects TOKEN patterns", () => {
      expect(isSensitiveKey("API_TOKEN")).toBe(true);
      expect(isSensitiveKey("ACCESS_TOKEN")).toBe(true);
      expect(isSensitiveKey("REFRESH_TOKEN")).toBe(true);
    });

    it("detects KEY patterns", () => {
      expect(isSensitiveKey("API_KEY")).toBe(true);
      expect(isSensitiveKey("PRIVATE_KEY")).toBe(true);
      expect(isSensitiveKey("ENCRYPTION_KEY")).toBe(true);
    });

    it("detects AUTH patterns", () => {
      expect(isSensitiveKey("GITHUB_AUTH")).toBe(true);
      expect(isSensitiveKey("NPM_AUTH_TOKEN")).toBe(true);
    });

    it("returns false for non-sensitive keys", () => {
      expect(isSensitiveKey("NODE_ENV")).toBe(false);
      expect(isSensitiveKey("PORT")).toBe(false);
      expect(isSensitiveKey("DEBUG")).toBe(false);
      expect(isSensitiveKey("LOG_LEVEL")).toBe(false);
    });
  });

  describe("maskValue", () => {
    it("masks sensitive values", () => {
      expect(maskValue("API_KEY", "sk-12345")).toBe("************");
      expect(maskValue("DB_PASSWORD", "hunter2")).toBe("************");
    });

    it("does not mask non-sensitive values", () => {
      expect(maskValue("NODE_ENV", "production")).toBe("production");
      expect(maskValue("PORT", "3000")).toBe("3000");
    });
  });

  describe("detectConflicts", () => {
    it("detects value changes", () => {
      const newEnv = { NODE_ENV: "production", PORT: "8080" };
      const currentEnv = { NODE_ENV: "development", PORT: "8080" };

      const conflicts = detectConflicts(newEnv, currentEnv);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].key).toBe("NODE_ENV");
      expect(conflicts[0].currentValue).toBe("development");
      expect(conflicts[0].newValue).toBe("production");
    });

    it("returns empty array when no conflicts", () => {
      const newEnv = { NEW_VAR: "value" };
      const currentEnv = { OTHER_VAR: "other" };

      const conflicts = detectConflicts(newEnv, currentEnv);
      expect(conflicts).toHaveLength(0);
    });

    it("ignores matching values", () => {
      const newEnv = { SAME: "value" };
      const currentEnv = { SAME: "value" };

      const conflicts = detectConflicts(newEnv, currentEnv);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("computeChanges", () => {
    it("identifies new variables", () => {
      const newEnv = { NEW_VAR: "value" };
      const currentEnv = {};

      const changes = computeChanges(newEnv, currentEnv);
      expect(changes).toHaveLength(1);
      expect(changes[0].isNew).toBe(true);
      expect(changes[0].isChanged).toBe(false);
    });

    it("identifies changed variables", () => {
      const newEnv = { EXISTING: "new-value" };
      const currentEnv = { EXISTING: "old-value" };

      const changes = computeChanges(newEnv, currentEnv);
      expect(changes).toHaveLength(1);
      expect(changes[0].isNew).toBe(false);
      expect(changes[0].isChanged).toBe(true);
    });

    it("identifies unchanged variables", () => {
      const newEnv = { SAME: "value" };
      const currentEnv = { SAME: "value" };

      const changes = computeChanges(newEnv, currentEnv);
      expect(changes).toHaveLength(1);
      expect(changes[0].isNew).toBe(false);
      expect(changes[0].isChanged).toBe(false);
    });
  });
});
