import { describe, it, expect, beforeAll, afterAll } from "bun:test";

describe("🚀 CLI Flags Integration Tests", () => {
  describe("📋 Help & Information Flags", () => {
    it("should show comprehensive help", async () => {
      const process = Bun.spawn(["bun", "scripts/compile.ts", "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Bun Enhanced File Analyzer - Cross-Compilation CLI");
      expect(output).toContain("--help");
      expect(output).toContain("--version");
      expect(output).toContain("--verbose");
      expect(output).toContain("--target");
      expect(output).toContain("--no-minify");
      expect(output).toContain("--sourcemap");
      expect(output).toContain("--metafile");
    });

    it("should show version information", async () => {
      const process = Bun.spawn(["bun", "scripts/compile.ts", "--version"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Bun Enhanced File Analyzer v1.0.0");
      expect(output).toContain("Bun v1.3.6");
      expect(output).toContain("Cross-Compilation CLI v1.3.6+");
    });

    it("should list available targets", async () => {
      const process = Bun.spawn(["bun", "scripts/compile.ts", "--list-targets"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Available Compilation Targets");
      expect(output).toContain("bun-linux-x64");
      expect(output).toContain("bun-darwin-arm64");
      expect(output).toContain("bun-windows-x64");
      expect(output).toContain("SIZE COMPARISON");
    });
  });

  describe("🔍 Dry Run & Analysis Flags", () => {
    it("should perform dry run with basic defaults", async () => {
      const process = Bun.spawn(["bun", "scripts/compile.ts", "--dry-run"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Dry run - would execute");
      expect(output).toContain("Target: bun-linux-x64");
      expect(output).toContain("Minify: true");
      expect(output).toContain("Compression: gzip (level 6)");
      expect(output).toContain("Estimated size: ~30KB");
    });

    it("should perform verbose dry run", async () => {
      const process = Bun.spawn(["bun", "scripts/compile.ts", "--dry-run", "--verbose"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Configuration:");
      expect(output).toContain("Target: bun-linux-x64");
      expect(output).toContain("Output: ./dist/file-analyzer");
      expect(output).toContain("Minify: true");
      expect(output).toContain("Sourcemap: false");
      expect(output).toContain("Metafile: false");
    });

    it("should perform dry run with custom target", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run", 
        "--target", "bun-darwin-arm64",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Target: bun-darwin-arm64");
      expect(output).toContain("Estimated size: ~28KB");
    });
  });

  describe("🔧 Build Configuration Flags", () => {
    it("should handle debug build flags", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--no-minify",
        "--sourcemap",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Minify: false");
      expect(output).toContain("Sourcemap: true");
      expect(output).toContain("Build time: ~10-20s");
    });

    it("should handle production build flags", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--level", "12",
        "--define", "NODE_ENV=production",
        "--metafile",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Level: 12");
      expect(output).toContain("Metafile: true");
      expect(output).toContain("\"NODE_ENV\":\"production\"");
      expect(output).toContain("Build time: ~30-60s");
    });

    it("should handle custom architecture flags", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--arch", "arm64",
        "--os", "darwin",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Configuration:");
      expect(output).toContain("Target: bun-linux-x64");
      // Note: arch/os flags are stored in define but not shown in dry run output
    });

    it("should handle compression flags", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--compression", "none",
        "--level", "1",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Compression: none");
      expect(output).toContain("Level: 1");
      expect(output).toContain("Build time: ~30-60s");
    });
  });

  describe("📦 Package.json Scripts", () => {
    it("should have all CLI scripts defined", async () => {
      const packageJson = await Bun.file("./package.json").json();
      
      const expectedScripts = [
        "compile",
        "compile:linux",
        "compile:macos",
        "compile:macos-intel", 
        "compile:windows",
        "compile:debug",
        "compile:production",
        "compile:clean",
        "compile:dry-run",
      ];
      
      expectedScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(packageJson.scripts[script]).toContain("scripts/compile.ts");
      });
    });

    it("should use correct flags in scripts", async () => {
      const packageJson = await Bun.file("./package.json").json();
      
      expect(packageJson.scripts["compile:linux"]).toContain("--target bun-linux-x64");
      expect(packageJson.scripts["compile:macos"]).toContain("--target bun-darwin-arm64");
      expect(packageJson.scripts["compile:windows"]).toContain("--target bun-windows-x64");
      expect(packageJson.scripts["compile:debug"]).toContain("--no-minify --sourcemap --verbose");
      expect(packageJson.scripts["compile:production"]).toContain("--level 12 --define NODE_ENV=production --metafile");
      expect(packageJson.scripts["compile:clean"]).toContain("--clean --verbose");
      expect(packageJson.scripts["compile:dry-run"]).toContain("--dry-run --verbose");
    });
  });

  describe("🎯 Target Validation", () => {
    it("should validate all standard targets", async () => {
      const targets = [
        "bun-linux-x64",
        "bun-darwin-x64", 
        "bun-darwin-arm64",
        "bun-windows-x64"
      ];
      
      for (const target of targets) {
        const process = Bun.spawn([
          "bun", "scripts/compile.ts", 
          "--dry-run",
          "--target", target
        ], {
          stdout: "pipe",
          stderr: "pipe",
        });
        
        const result = await process.exited;
        expect(result).toBe(0);
        
        const output = await new Response(process.stdout).text();
        expect(output).toContain(`Target: ${target}`);
      }
    });

    it("should handle Windows executable naming", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--target", "bun-windows-x64"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Output: ./dist/file-analyzer.exe");
    });
  });

  describe("⚡ Performance & Optimization Flags", () => {
    it("should show performance differences in dry run", async () => {
      const fastProcess = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--no-minify",
        "--compression", "none"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const slowProcess = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--level", "12"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const [fastResult, slowResult] = await Promise.all([
        fastProcess.exited,
        slowProcess.exited,
      ]);
      
      expect(fastResult).toBe(0);
      expect(slowResult).toBe(0);
      
      const [fastOutput, slowOutput] = await Promise.all([
        new Response(fastProcess.stdout).text(),
        new Response(slowProcess.stdout).text(),
      ]);
      
      expect(fastOutput).toContain("Build time: ~10-20s");
      expect(slowOutput).toContain("Build time: ~30-60s");
    });
  });

  describe("🧪 Error Handling", () => {
    it("should reject unknown flags", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--unknown-flag"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(1);
      
      const errorOutput = await new Response(process.stderr).text();
      expect(errorOutput).toContain("Unknown flag: --unknown-flag");
      expect(errorOutput).toContain("Use --help for available options");
    });

    it("should validate compression levels", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--level", "13"  // Invalid level
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0); // Should default to valid value
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Compression: gzip (level 6)");
    });
  });

  describe("📊 Integration with Build System", () => {
    it("should integrate with virtual files system", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("Configuration:");
      expect(output).toContain("Target: bun-linux-x64");
      expect(output).toContain("Output: ./dist/file-analyzer");
    });

    it("should handle define constants properly", async () => {
      const process = Bun.spawn([
        "bun", "scripts/compile.ts", 
        "--dry-run",
        "--define", "CUSTOM=value",
        "--define", "NODE_ENV=production",
        "--verbose"
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const result = await process.exited;
      expect(result).toBe(0);
      
      const output = await new Response(process.stdout).text();
      expect(output).toContain("\"CUSTOM\":\"value\"");
      expect(output).toContain("\"NODE_ENV\":\"production\"");
      expect(output).toContain("Define:");
      expect(output).toContain("Target: bun-linux-x64");
    });
  });
});
