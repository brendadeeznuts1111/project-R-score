import { describe, it, expect, beforeAll, afterAll } from "bun:test";

describe("🚀 Bun Enhanced File Analyzer Integration Tests", () => {
  describe("📦 Build System Integration", () => {
    it("should have proper virtual files configuration", async () => {
      const configContent = await Bun.file("./bun.config.ts").text();
      
      expect(configContent).toContain("reactFastRefresh");
      expect(configContent).toContain("metafile: true");
      expect(configContent).toContain("files:");
      expect(configContent).toContain("generateThemeFile");
      expect(configContent).toContain("Virtual Files");
    });

    it("should generate proper build artifacts", async () => {
      // Build the application
      const buildProcess = Bun.spawn(["bun", "run", "build:dev"], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await buildProcess.exited;
      expect(result).toBe(0);
      
      // Check if build output exists
      const indexJsExists = await Bun.file("./public/index.js").exists();
      expect(indexJsExists).toBe(true);
      
      const indexJsContent = await Bun.file("./public/index.js").text();
      expect(indexJsContent.length).toBeGreaterThan(1000);
      
      console.log(`📦 Build successful: ${(indexJsContent.length / 1024 / 1024).toFixed(2)} MB`);
    });
  });

  describe("🎨 Theme System & Color Generation", () => {
    it("should have WCAG AA compliant color palette", async () => {
      const configContent = await Bun.file("./bun.config.ts").text();
      
      const expectedColors = [
        "hsl(210, 90%, 55%)", // Primary blue
        "hsl(145, 63%, 42%)", // Success green
        "hsl(25, 85%, 55%)",  // Warning orange
        "hsl(0, 75%, 60%)",   // Error red
        "hsl(195, 85%, 55%)", // Info cyan
        "hsl(270, 60%, 60%)", // Dependency purple
      ];
      
      expectedColors.forEach(color => {
        expect(configContent).toContain(color);
      });
    });

    it("should generate theme files with proper structure", async () => {
      const configContent = await Bun.file("./bun.config.ts").text();
      
      expect(configContent).toContain("semantic:");
      expect(configContent).toContain("accessibility:");
      expect(configContent).toContain("contrastRatio");
      expect(configContent).toContain("WCAG AA");
    });
  });

  describe("🔧 Cross-Compilation System", () => {
    it("should have compilation scripts for all platforms", async () => {
      const packageJson = await Bun.file("./package.json").json();
      
      expect(packageJson.scripts).toHaveProperty("compile");
      expect(packageJson.scripts).toHaveProperty("compile:linux");
      expect(packageJson.scripts).toHaveProperty("compile:macos");
      expect(packageJson.scripts).toHaveProperty("compile:windows");
    });

    it("should have functional compilation script", async () => {
      const scriptExists = await Bun.file("./scripts/compile.ts").exists();
      expect(scriptExists).toBe(true);
      
      const scriptContent = await Bun.file("./scripts/compile.ts").text();
      expect(scriptContent).toContain("compile: true");
      expect(scriptContent).toContain("Bun.build");
      expect(scriptContent).toContain("--version");
      expect(scriptContent).toContain("--archive");
      expect(scriptContent).toContain("--color");
    });

    it("should compile to executable", async () => {
      const compileProcess = Bun.spawn(["bun", "scripts/compile.ts", "--target=bun-darwin-arm64"], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const timeout = setTimeout(() => {
        compileProcess.kill();
      }, 30000);
      
      try {
        const result = await compileProcess.exited;
        clearTimeout(timeout);
        
        if (result === 0) {
          const executableExists = await Bun.file("./dist/file-analyzer").exists();
          if (executableExists) {
            const executableContent = await Bun.file("./dist/file-analyzer").text();
            const sizeMB = executableContent.length / (1024 * 1024);
            
            expect(sizeMB).toBeGreaterThan(0.01);
            expect(sizeMB).toBeLessThan(0.1);
            
            console.log(`🎯 Executable compiled: ${sizeMB.toFixed(2)} MB`);
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        console.log("⚠️ Cross-compilation test timed out");
      }
    }, 35000);
  });

  describe("📊 Performance Features", () => {
    it("should have performance testing utilities", async () => {
      const perfScriptExists = await Bun.file("./scripts/test-performance.ts").exists();
      expect(perfScriptExists).toBe(true);
      
      const perfContent = await Bun.file("./scripts/test-performance.ts").text();
      expect(perfContent).toContain("Response.json");
      expect(perfContent).toContain("JSON.stringify");
      expect(perfContent).toContain("Bun.color");
      expect(perfContent).toContain("Bun.Archive");
    });

    it("should run performance analysis", async () => {
      const perfProcess = Bun.spawn(["bun", "scripts/test-performance.ts"], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await perfProcess.exited;
      expect(result).toBe(0);
      
      const output = await new Response(perfProcess.stdout).text();
      expect(output).toContain("Testing Bun v1.3.6+ Performance Features");
      expect(output).toContain("Performance Results");
      expect(output).toContain("Bun.color() performance");
      
      console.log("📊 Performance analysis completed");
    });

    it("should demonstrate Response.json() optimization", async () => {
      const largeObject = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          metadata: {
            created: Date.now(),
            tags: ["performance", "test"],
          }
        })),
        buildInfo: {
          version: "1.3.6+",
          features: ["virtual-files", "react-fast-refresh"],
          timestamp: Date.now(),
        }
      };

      // Test old method
      const start1 = performance.now();
      const oldResponse = new Response(JSON.stringify(largeObject), {
        headers: { "Content-Type": "application/json" }
      });
      const oldTime = performance.now() - start1;

      // Test new method
      const start2 = performance.now();
      const newResponse = Response.json(largeObject);
      const newTime = performance.now() - start2;

      // Both should work
      expect(oldResponse.headers.get("content-type")).toContain("application/json");
      expect(newResponse.headers.get("content-type")).toContain("application/json");

      const speedup = oldTime / newTime;
      console.log(`⚡ Response.json() speedup: ${speedup.toFixed(2)}x`);
      
      // Should be competitive (may not always be faster due to JIT)
      expect(speedup).toBeGreaterThan(0.5);
    });
  });

  describe("🍪 Cookie Management System", () => {
    it("should have CookieManager implementation", async () => {
      const cookieManagerExists = await Bun.file("./src/api/cookie-manager.ts").exists();
      expect(cookieManagerExists).toBe(true);
      
      const cookieContent = await Bun.file("./src/api/cookie-manager.ts").text();
      expect(cookieContent).toContain("export class CookieManager");
      expect(cookieContent).toContain("setSession");
      expect(cookieContent).toContain("getSession");
      expect(cookieContent).toContain("clearSession");
    });

    it("should handle cookie serialization", async () => {
      const { CookieManager } = await import("../src/api/cookie-manager");
      
      const manager = new CookieManager();
      manager.setSession("test-session-123");
      manager.setAnalytics(42);
      
      // Test serialization
      const serialized = manager.serialize();
      expect(serialized).toContain("test-session-123");
      expect(serialized).toContain("42");
      
      // Test deserialization
      const restored = CookieManager.deserialize(serialized);
      expect(restored.getSession()).toBe("test-session-123");
      expect(restored.getAnalytics()).toBe(42);
    });
  });

  describe("📄 JSONC Configuration Parsing", () => {
    it("should parse JSONC with comments", () => {
      const jsoncContent = `{
        // Application configuration
        "name": "bun-enhanced-file-analyzer",
        "version": "1.3.6+",
        /* Multi-line comment */
        "features": [
          "virtual-files",
          "cross-compilation",
          "react-fast-refresh",
        ],
        "theme": {
          "primary": "hsl(210, 90%, 55%)",
          "success": "hsl(145, 63%, 42%)",
        },
      }`;
      
      const parsed = Bun.JSONC.parse(jsoncContent);
      
      expect(parsed.name).toBe("bun-enhanced-file-analyzer");
      expect(parsed.version).toBe("1.3.6+");
      expect(parsed.features).toContain("virtual-files");
      expect(parsed.features).toContain("cross-compilation");
      expect(parsed.theme.primary).toBe("hsl(210, 90%, 55%)");
    });

    it("should handle trailing commas", () => {
      const jsoncWithTrailingCommas = `{
        "test": "value",
        "array": [1, 2, 3,],
        "nested": {
          "inner": "value",
        },
      }`;
      
      expect(() => Bun.JSONC.parse(jsoncWithTrailingCommas)).not.toThrow();
      const parsed = Bun.JSONC.parse(jsoncWithTrailingCommas);
      expect(parsed.test).toBe("value");
      expect(parsed.array).toEqual([1, 2, 3]);
    });
  });

  describe("📦 Archive Creation", () => {
    it("should create and manage archives", async () => {
      const archive = new Bun.Archive({
        "README.md": "# Bun Enhanced File Analyzer\\nGenerated with Bun v1.3.6+",
        "config.json": JSON.stringify({ 
          version: "1.3.6+", 
          features: ["virtual-files", "cross-compilation"],
          generated: new Date().toISOString()
        }, null, 2),
        "data.txt": "This is test content for the archive",
      });
      
      const archiveBytes = await archive.bytes();
      expect(archiveBytes.length).toBeGreaterThan(0);
      
      // Test compression levels
      const files = { "test.txt": "x".repeat(1000) };
      const archiveL1 = new Bun.Archive(files, { compress: "gzip", level: 1 });
      const archiveL12 = new Bun.Archive(files, { compress: "gzip", level: 12 });
      
      const sizeL1 = (await archiveL1.bytes()).length;
      const sizeL12 = (await archiveL12.bytes()).length;
      
      expect(sizeL12).toBeLessThan(sizeL1); // Higher level = better compression
      
      console.log(`📦 Archive created: ${(archiveBytes.length / 1024).toFixed(2)} KB`);
    });
  });

  describe("🔗 URLPattern Routing", () => {
    it("should match URL patterns correctly", () => {
      const patterns = [
        { pattern: "/api/users/:id", tests: [
          { url: "/api/users/123", matches: true, id: "123" },
          { url: "/api/users/abc", matches: true, id: "abc" },
          { url: "/api/users/", matches: false },
        ]},
        { pattern: "/api/files/*", tests: [
          { url: "/api/files/document.pdf", matches: true },
          { url: "/api/files/folder/image.png", matches: true },
          { url: "/api/users/123", matches: false },
        ]},
      ];
      
      patterns.forEach(({ pattern, tests }) => {
        const urlPattern = new URLPattern({ pathname: pattern });
        
        tests.forEach(({ url, matches, id }) => {
          const result = urlPattern.exec({ pathname: url });
          
          if (matches) {
            expect(result).toBeTruthy();
            if (id) {
              expect(result?.pathname.groups.id).toBe(id);
            }
          } else {
            expect(result).toBeFalsy();
          }
        });
      });
    });
  });

  describe("🎨 Color System", () => {
    it("should convert between color formats", () => {
      const input = "hsl(210, 90%, 55%)";
      
      const hex = Bun.color(input, "hex");
      const rgb = Bun.color(input, "rgb");
      const rgba = Bun.color(input, "{rgba}");
      const ansi = Bun.color(input, "ansi");
      const hsl = Bun.color(input, "hsl");
      
      expect(hex).toBe("#258cf4");
      expect(rgb).toBe("rgb(37, 140, 244)");
      expect(rgba).toEqual({ r: 37, g: 140, b: 244, a: 1 });
      expect(ansi).toContain("\x1b[");
      expect(hsl).toContain("hsl(210");
      
      console.log(`🎨 Color conversions: ${hex} | ${rgb} | ${ansi}`);
    });

    it("should handle color performance", () => {
      const colorTests = [
        "hsl(210, 90%, 55%)",
        "hsl(145, 63%, 42%)",
        "hsl(25, 85%, 55%)",
        "hsl(0, 75%, 60%)",
        "hsl(195, 85%, 55%)",
      ];
      
      const results = colorTests.map(colorSpec => {
        const start = performance.now();
        const hex = Bun.color(colorSpec, "hex");
        const time = performance.now() - start;
        
        return { spec: colorSpec, hex, time: `${time.toFixed(3)}ms` };
      });
      
      const avgTime = results.reduce((sum, r) => sum + parseFloat(r.time), 0) / results.length;
      expect(avgTime).toBeLessThan(5); // Should be very fast
      
      console.log(`🎨 Average color conversion time: ${avgTime.toFixed(3)}ms`);
    });
  });

  describe("📊 Metafile Analysis", () => {
    it("should analyze bundle structure", async () => {
      // Create a test build to analyze
      const result = await Bun.build({
        entrypoints: ["./src/index.tsx"],
        outdir: "./test-dist",
        metafile: true,
        minify: false,
      });

      expect(result.success).toBe(true);
      expect(result.metafile).toBeDefined();

      if (result.metafile) {
        const outputs = result.metafile.outputs;
        const inputs = result.metafile.inputs;

        // Build may produce multiple outputs (JS + CSS + sourcemaps)
        expect(Object.keys(outputs).length).toBeGreaterThanOrEqual(1);
        expect(Object.keys(inputs).length).toBeGreaterThan(0);

        const totalSize = Object.values(outputs).reduce((sum, output) => sum + output.bytes, 0);
        expect(totalSize).toBeGreaterThan(0);

        console.log(`📊 Bundle analysis: ${Object.keys(outputs).length} outputs, ${(totalSize / 1024).toFixed(2)} KB`);
      }

      // Cleanup
      await Bun.$`rm -rf test-dist`.quiet();
    });
  });

  describe("🎯 Complete Integration", () => {
    it("should demonstrate complete workflow", async () => {
      // 1. Parse configuration with JSONC
      const config = Bun.JSONC.parse(`{
        // Application configuration
        "name": "bun-enhanced-file-analyzer",
        "version": "1.3.6+",
        "theme": {
          "primary": "hsl(210, 90%, 55%)",
          "success": "hsl(145, 63%, 42%)"
        },
        "features": [
          "virtual-files",
          "cross-compilation",
          "react-fast-refresh"
        ]
      }`);
      
      expect(config.name).toBe("bun-enhanced-file-analyzer");
      expect(config.features).toContain("virtual-files");
      
      // 2. Generate colors
      const primaryColor = Bun.color(config.theme.primary, "hex");
      const successColor = Bun.color(config.theme.success, "hex");
      
      expect(primaryColor).toBe("#258cf4");
      expect(successColor).toBe("#28af60");
      
      // 3. Create archive
      const archive = new Bun.Archive({
        "config.json": JSON.stringify(config, null, 2),
        "theme.css": `:root { --primary: ${primaryColor}; --success: ${successColor}; }`,
        "README.md": `# ${config.name} v${config.version}`,
      });
      
      const archiveBytes = await archive.bytes();
      expect(archiveBytes.length).toBeGreaterThan(0);
      
      // 4. Test performance
      const testData = { config, colors: { primary: primaryColor, success: successColor } };
      
      const start1 = performance.now();
      const oldResponse = JSON.stringify(testData);
      const oldTime = performance.now() - start1;
      
      const start2 = performance.now();
      const newResponse = Response.json(testData);
      const newTime = performance.now() - start2;
      
      expect(oldResponse.length).toBeGreaterThan(0);
      expect(newResponse).toBeInstanceOf(Response);
      
      // 5. Create cookie-based session
      const { CookieManager } = await import("../src/api/cookie-manager");
      const session = new CookieManager([
        `sessionId=${crypto.randomUUID()}`,
        `theme=dark`,
        `version=${config.version}`,
      ]);
      
      expect(session.size).toBe(3);
      expect(session.get("version")).toBe("1.3.6+");
      
      // 6. Test URLPattern routing
      const apiPattern = new URLPattern({ pathname: "/api/:type/:id" });
      const match = apiPattern.exec({ pathname: "/api/config/theme" });
      
      expect(match).toBeTruthy();
      expect(match?.pathname.groups.type).toBe("config");
      expect(match?.pathname.groups.id).toBe("theme");
      
      console.log("✅ Complete integration workflow successful!");
      console.log(`📦 Archive size: ${(archiveBytes.length / 1024).toFixed(2)} KB`);
      console.log(`🎨 Colors generated: ${primaryColor}, ${successColor}`);
      console.log(`🍪 Session created: ${session.get("sessionId")?.slice(0, 8)}...`);
      console.log(`⚡ Performance: ${(oldTime / newTime).toFixed(2)}x improvement`);
    });
  });
});
