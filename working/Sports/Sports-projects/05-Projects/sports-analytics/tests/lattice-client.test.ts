import { expect, test, describe, beforeAll } from "bun:test";
import { validateRegimePattern, generateWyHash } from "../src/t3-lattice-registry";

describe("T3-Lattice Registry Client", () => {
  beforeAll(() => {
    process.env.LATTICE_TOKEN = "test-token-for-testing";
  });

  describe("Regime Pattern Validation", () => {
    test("validates stable pattern", () => {
      expect(validateRegimePattern("▵⟂⥂")).toBe(true);
    });

    test("validates drift pattern", () => {
      expect(validateRegimePattern("⥂⟂(▵⟜⟳)")).toBe(true);
    });

    test("validates chaotic pattern", () => {
      expect(validateRegimePattern("⟳⟲⟜(▵⊗⥂)")).toBe(true);
    });

    test("validates phase-locked pattern", () => {
      expect(validateRegimePattern("(▵⊗⥂)⟂⟳")).toBe(true);
    });

    test("validates halted pattern", () => {
      expect(validateRegimePattern("⊟")).toBe(true);
    });

    test("rejects invalid pattern", () => {
      expect(validateRegimePattern("invalid_pattern")).toBe(false);
    });
  });

  describe("WyHash Generation", () => {
    test("generates 16-char hash", () => {
      const hash = generateWyHash("test_input");
      expect(hash.length).toBe(16);
    });

    test("generates consistent hashes", () => {
      const hash1 = generateWyHash("same_input");
      const hash2 = generateWyHash("same_input");
      expect(hash1).toBe(hash2);
    });

    test("generates different hashes for different inputs", () => {
      const hash1 = generateWyHash("input_a");
      const hash2 = generateWyHash("input_b");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Client Initialization", () => {
    test("creates client with env token", async () => {
      const { LatticeRegistryClient } = await import("../src/t3-lattice-registry");
      const client = new LatticeRegistryClient();
      expect(client).toBeDefined();
    });

    test("client has getMetrics method", async () => {
      const { LatticeRegistryClient } = await import("../src/t3-lattice-registry");
      const client = new LatticeRegistryClient();
      const metrics = client.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe("Constants Export", () => {
    test("exports LATTICE_REGISTRY object", async () => {
      const { LATTICE_REGISTRY } = await import("../src/t3-lattice-registry");
      expect(typeof LATTICE_REGISTRY).toBe("object");
      expect(LATTICE_REGISTRY.BASE_URL).toBeDefined();
      expect(LATTICE_REGISTRY.AGENT_ID).toBeDefined();
    });

    test("has supported encodings", async () => {
      const { LATTICE_REGISTRY } = await import("../src/t3-lattice-registry");
      expect(Array.isArray(LATTICE_REGISTRY.SUPPORTED_ENCODINGS)).toBe(true);
    });
  });
});
