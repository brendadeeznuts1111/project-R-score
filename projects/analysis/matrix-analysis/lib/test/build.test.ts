import { describe, it, expect } from "bun:test";
import { build, bundleToString } from "../src/core/build.ts";
import type { BuildPlugin } from "../src/core/build.ts";

const ENTRY = "/tmp/test-build-entry.ts";
const ENTRY_SRC = 'export const x = 42;\nconsole.log(x);\n';

describe("build", () => {
  describe("BN-107: Build/Bundle", () => {
    it("should bundle a simple entrypoint", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({ entrypoints: [ENTRY] });
      expect(result.success).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
      expect(result.outputs[0].kind).toBe("entry-point");
      expect(result.outputs[0].hash).not.toBeNull();
      expect(result.outputs[0].loader).toBe("ts");
    });

    it("should return failure for missing file", async () => {
      const result = await build({ entrypoints: ["/tmp/nonexistent-build-test.ts"] });
      expect(result.success).toBe(false);
      expect(result.metafile).toBeNull();
    });

    it("should bundle to string", async () => {
      const tmpFile = "/tmp/test-build-string.ts";
      await Bun.write(tmpFile, 'export const msg = "hello";\n');
      const output = await bundleToString(tmpFile);
      expect(output).not.toBeNull();
      expect(output).toContain("hello");
    });

    it("should return null for bundleToString with missing file", async () => {
      expect(await bundleToString("/tmp/nonexistent-build-xyz.ts")).toBeNull();
    });

    it("should build with minify option", async () => {
      const tmpFile = "/tmp/test-build-minify.ts";
      await Bun.write(tmpFile, 'export const longVariableName = 42;\nconsole.log(longVariableName);\n');
      const result = await build({ entrypoints: [tmpFile], minify: true });
      expect(result.success).toBe(true);
    });

    it("should build with external option", async () => {
      const tmpFile = "/tmp/test-build-external.ts";
      await Bun.write(tmpFile, 'import fs from "fs";\nconsole.log(fs);\n');
      const result = await build({ entrypoints: [tmpFile], external: ["fs"] });
      expect(result.success).toBe(true);
    });
  });

  describe("BN-107b: Bytecode Compilation", () => {
    it("should produce bytecode output", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({
        entrypoints: [ENTRY],
        bytecode: true,
        format: "cjs",
      });
      expect(result.success).toBe(true);
      expect(result.outputs.length).toBe(2);
      const kinds = result.outputs.map((o) => o.kind);
      expect(kinds).toContain("entry-point");
      expect(kinds).toContain("bytecode");
    });
  });

  describe("BN-107c: Env Inlining", () => {
    it("should inline env vars matching glob", async () => {
      const tmpFile = "/tmp/test-build-env.ts";
      await Bun.write(tmpFile, 'export const val = process.env.PUBLIC_TEST_VAR;\n');
      const result = await build({ entrypoints: [tmpFile], env: "PUBLIC_*" });
      expect(result.success).toBe(true);
    });

    it("should inline all env vars with inline mode", async () => {
      const tmpFile = "/tmp/test-build-env-inline.ts";
      await Bun.write(tmpFile, 'export const val = process.env.PATH;\n');
      const result = await build({
        entrypoints: [tmpFile],
        env: "inline",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("BN-107d: Metafile", () => {
    it("should return metafile when requested", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({ entrypoints: [ENTRY], metafile: true });
      expect(result.success).toBe(true);
      expect(result.metafile).not.toBeNull();
      expect(result.metafile!.inputs).toBeDefined();
      expect(result.metafile!.outputs).toBeDefined();
    });

    it("should have input bytes in metafile", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({ entrypoints: [ENTRY], metafile: true });
      const inputs = result.metafile!.inputs;
      const key = Object.keys(inputs)[0];
      expect(inputs[key].bytes).toBeGreaterThan(0);
    });

    it("should have output exports in metafile", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({ entrypoints: [ENTRY], metafile: true });
      const outputs = result.metafile!.outputs;
      const key = Object.keys(outputs)[0];
      expect(outputs[key].exports).toContain("x");
    });

    it("should return null metafile when not requested", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({ entrypoints: [ENTRY] });
      expect(result.metafile).toBeNull();
    });
  });

  describe("BN-107e: Naming & Paths", () => {
    it("should apply naming pattern", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({
        entrypoints: [ENTRY],
        naming: "[name]-[hash].[ext]",
      });
      expect(result.success).toBe(true);
      expect(result.outputs[0].path).toContain("-");
    });

    it("should accept publicPath", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({
        entrypoints: [ENTRY],
        publicPath: "/assets/",
      });
      expect(result.success).toBe(true);
    });

    it("should accept root option", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({
        entrypoints: [ENTRY],
        root: "/tmp",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("BN-107f: Virtual Files", () => {
    it("should build from in-memory files", async () => {
      const result = await build({
        entrypoints: ["./virtual.ts"],
        files: { "./virtual.ts": "export const v = 99;" },
      });
      expect(result.success).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
    });

    it("should resolve imports between virtual files", async () => {
      const result = await build({
        entrypoints: ["./main.ts"],
        files: {
          "./main.ts": 'import { x } from "./dep.ts"; console.log(x);',
          "./dep.ts": "export const x = 42;",
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("BN-107g: Plugins", () => {
    it("should run plugin with virtual module", async () => {
      const tmpFile = "/tmp/test-build-plugin.ts";
      await Bun.write(tmpFile, 'import cfg from "virtual:config";\nconsole.log(cfg);\n');

      const plugin: BuildPlugin = {
        name: "virtual",
        setup(build) {
          build.onResolve({ filter: /^virtual:/ }, (args: any) => ({
            path: args.path,
            namespace: "virtual",
          }));
          build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
            contents: "export default { key: 42 }",
            loader: "js",
          }));
        },
      };

      const result = await build({
        entrypoints: [tmpFile],
        plugins: [plugin],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("BN-107h: Sourcemap Modes", () => {
    it("should build with inline sourcemap", async () => {
      await Bun.write(ENTRY, ENTRY_SRC);
      const result = await build({
        entrypoints: [ENTRY],
        sourcemap: "inline",
      });
      expect(result.success).toBe(true);
    });

    it("should build with drop option", async () => {
      const tmpFile = "/tmp/test-build-drop.ts";
      await Bun.write(tmpFile, 'console.log("debug");\nexport const val = 1;\n');
      const result = await build({
        entrypoints: [tmpFile],
        drop: ["console"],
      });
      expect(result.success).toBe(true);
    });
  });
});
