#!/usr/bin/env bun
/**
 * Enterprise Dashboard - Optimized Build Script
 *
 * Uses Bun's latest performance features:
 * - Virtual Files for build-time constants (no temp files)
 * - Feature flag variants (bun:bundle) for dead code elimination
 * - Metafile for bundle analysis
 * - SIMD-optimized bundling
 * - CRC32 integrity checksums (hardware accelerated ~9 GB/s)
 * - %j format specifier for 3x faster JSON logging
 */

import { $ } from "bun";
import { resolve, basename } from "path";
import { validateThemes, validateShortcuts, validateCRC32 } from "./src/client/config/validate";
import { generateThemeCSS, DEFAULT_OUT_PATH } from "./src/client/config/build-css";

interface BuildConfig {
  variant: string;
  features: string[];
  minify: boolean;
  target: "bun" | "browser";
  compile: boolean;
}

const VARIANTS: Record<string, string[]> = {
  free: ["CORE", "PERFORMANCE_POLISH"],
  premium: ["CORE", "PERFORMANCE_POLISH", "PREMIUM"],
  debug: ["CORE", "PERFORMANCE_POLISH", "DEBUG"],
  beta: ["CORE", "PERFORMANCE_POLISH", "BETA_FEATURES"],
  mock: ["CORE", "PERFORMANCE_POLISH", "MOCK_API"],
  full: ["CORE", "PERFORMANCE_POLISH", "PREMIUM", "DEBUG", "BETA_FEATURES", "MOCK_API"],
};

async function loadFeaturesConfig(): Promise<{ variants: Record<string, string[]> }> {
  const configPath = resolve("./config/features.toml");
  const configFile = Bun.file(configPath);
  if (!(await configFile.exists())) {
    return { variants: VARIANTS };
  }

  try {
    const content = await configFile.text();
    const lines = content.split("\n");
    const variants: Record<string, string[]> = {};
    let currentVariant: string | null = null;
    let currentFeatures: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[variants.") && trimmed.endsWith("]")) {
        if (currentVariant) {
          variants[currentVariant] = currentFeatures;
        }
        currentVariant = trimmed.slice(11, -1);
        currentFeatures = [];
      } else if (trimmed.startsWith("features = [")) {
        const match = trimmed.match(/\[(.*?)\]/);
        if (match) {
          currentFeatures = match[1]
            .split(",")
            .map((f) => f.trim().replace(/"/g, ""))
            .filter(Boolean);
        }
      }
    }

    if (currentVariant) {
      variants[currentVariant] = currentFeatures;
    }

    return { variants: Object.keys(variants).length > 0 ? variants : VARIANTS };
  } catch {
    return { variants: VARIANTS };
  }
}

function parseArgs(): Partial<BuildConfig> {
  const args = process.argv.slice(2);
  const config: Partial<BuildConfig> = {
    variant: "free",
    minify: true,
    target: "bun",
    compile: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--variant=")) {
      config.variant = arg.split("=")[1];
    } else if (arg === "--no-minify") {
      config.minify = false;
    } else if (arg.startsWith("--target=")) {
      config.target = arg.split("=")[1] as "bun" | "browser";
    } else if (arg === "--compile") {
      config.compile = true;
    }
  }

  return config;
}

async function getFeatures(variant: string, availableVariants: Record<string, string[]>): Promise<string[]> {
  return availableVariants[variant] ?? availableVariants.free ?? VARIANTS.free;
}

const startTime = performance.now();

async function buildDashboard(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Enterprise Dashboard Build System");
  console.log("Bun 1.3.6 + Feature Flags");
  console.log("=".repeat(60));

  const args = parseArgs();
  const { variants } = await loadFeaturesConfig();

  const variant = args.variant ?? "free";
  const features = await getFeatures(variant, variants);

  console.log(`\nBuild Configuration:`);
  console.log(`  Variant: ${variant}`);
  console.log(`  Target: ${args.target}`);
  console.log(`  Minify: ${args.minify}`);
  console.log(`  Compile: ${args.compile}`);
  console.log(`  Features: ${features.join(", ")}`);

  const gitCommit = await $`git rev-parse --short HEAD 2>/dev/null || echo "unknown"`.text().then((s) => s.trim());
  const gitBranch = await $`git branch --show-current 2>/dev/null || echo "main"`.text().then((s) => s.trim());

  const outdir = resolve(`./dist/${variant}`);
  const serverEntry = resolve("./src/server/index.ts");
  const clientEntry = resolve("./src/client/index.tsx");

  const serverFile = Bun.file(serverEntry);
  const clientFile = Bun.file(clientEntry);
  if (!(await serverFile.exists()) || !(await clientFile.exists())) {
    console.error(`\nError: Entry points not found`);
    process.exit(1);
  }

  console.log(`\nBuilding to: ${outdir}`);

  const envFeatures = features.map((f) => `FEATURE_${f}=1`).join(",");

  try {
    console.log("\n--- Config validation ---");
    const themeErrors = validateThemes();
    const shortcutErrors = validateShortcuts();
    const crcErrors = validateCRC32();
    const allErrors = [...themeErrors, ...shortcutErrors, ...crcErrors];
    if (allErrors.length > 0) {
      console.error("❌ Config validation failed:");
      console.table(allErrors.map((e) => ({ Error: e })));
      process.exit(1);
    }
    console.log("  ✓ Themes, shortcuts, CRC32 OK");

    console.log("\n--- Generating theme CSS ---");
    await generateThemeCSS(DEFAULT_OUT_PATH);
    console.log(`  ✓ ${resolve(DEFAULT_OUT_PATH)}`);

    console.log("\n--- Building Server ---");
    const result = await Bun.build({
      entrypoints: [serverEntry],
      outdir,
      minify: args.minify,
      target: "bun",
      sourcemap: variant === "debug" ? "external" : "none",
      format: "esm",
      external: [],

      files: {
        "./src/build-info.ts": `
// Auto-generated at build time - DO NOT EDIT
export const BUILD_ID = "${crypto.randomUUID()}";
export const BUILD_TIMESTAMP = ${Date.now()};
export const BUILD_DATE = "${new Date().toISOString()}";
export const GIT_COMMIT = "${gitCommit}";
export const GIT_BRANCH = "${gitBranch}";
export const BUN_VERSION = "${Bun.version}";
export const BUILD_VARIANT = "${variant}";
export const ENABLED_FEATURES = ${JSON.stringify(features)};
`,
      },

      metafile: true,
    });

    if (!result.success) {
      console.error("Server build failed:");
      for (const log of result.logs) {
        console.error(log);
      }
      process.exit(1);
    }

    let totalServerBytes = 0;
    if (result.outputs) {
      for (const output of result.outputs) {
        const sizeKB = (output.size / 1024).toFixed(2);
        totalServerBytes += output.size;
        console.log(`  ${basename(output.path)}: ${sizeKB} KB`);
      }
    }

    console.log("\n--- Building Client ---");
    const clientResult = await Bun.build({
      entrypoints: [clientEntry],
      outdir: `${outdir}/public`,
      minify: args.minify,
      target: "browser",
      sourcemap: variant === "debug" ? "external" : "none",
      format: "esm",
      external: [],
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env.BUILD_VARIANT": JSON.stringify(variant),
        "process.env.ENABLED_FEATURES": JSON.stringify(features.join(",")),
        "BUN_DEBUG": variant === "debug" ? "1" : "0",
        "__DEV__": "false",
        "__PROD__": "true",
      },
      metafile: true,
    });

    if (!clientResult.success) {
      console.error("Client build failed:", clientResult.logs);
      process.exit(1);
    }

    let totalClientBytes = 0;
    if (clientResult.outputs) {
      for (const output of clientResult.outputs) {
        const sizeKB = (output.size / 1024).toFixed(2);
        totalClientBytes += output.size;
        console.log(`  public/${basename(output.path)}: ${sizeKB} KB`);
      }
    }

    console.log("\n--- Building CSS ---");
    const cssResult = Bun.spawnSync([
      "./node_modules/.bin/tailwindcss",
      "-i",
      "./src/client/styles.css",
      "-o",
      `${outdir}/public/styles.css`,
      args.minify ? "--minify" : "",
    ]);

    if (cssResult.exitCode === 0) {
      const cssFile = Bun.file(`${outdir}/public/styles.css`);
      if (await cssFile.exists()) {
        const cssBytes = await cssFile.arrayBuffer();
        const cssChecksum = Bun.hash.crc32(new Uint8Array(cssBytes));
        console.log(
          `  public/styles.css: ${(cssBytes.byteLength / 1024).toFixed(2)} KB (CRC32: ${cssChecksum
            .toString(16)
            .padStart(8, "0")})`
        );
      }
    } else {
      console.error("  CSS build failed:", cssResult.stderr.toString());
    }

    console.log("\n--- Generating Manifest ---");
    const manifest = {
      buildId: crypto.randomUUID(),
      timestamp: Date.now(),
      date: new Date().toISOString(),
      git: { commit: gitCommit, branch: gitBranch },
      bun: Bun.version,
      variant,
      features,
      files: {
        server: result.outputs?.map((o) => ({ path: o.path, size: o.size })) ?? [],
        client: clientResult.outputs?.map((o) => ({ path: o.path, size: o.size })) ?? [],
      },
      buildTime: ((performance.now() - startTime) / 1000).toFixed(2) + "s",
    };

    await Bun.write(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));
    console.log(`  Generated manifest.json`);

    const buildTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\nBuild complete in ${buildTime}s`);

    console.log("\nFinal Stats: %j", {
      variant,
      features: features.length,
      serverSize: (totalServerBytes / 1024).toFixed(2) + " KB",
      clientSize: (totalClientBytes / 1024).toFixed(2) + " KB",
      buildTime: `${buildTime}s`,
    });

    const featureGroups = {
      Core: features.filter((f) => ["CORE", "PERFORMANCE_POLISH"].includes(f)),
      Premium: features.filter((f) => f.startsWith("PREMIUM")),
      Debug: features.filter((f) => f.startsWith("DEBUG")),
      Beta: features.filter((f) => f.startsWith("BETA")),
      Mock: features.filter((f) => f.startsWith("MOCK")),
    };

    console.log("\nFeature Breakdown:");
    for (const [group, items] of Object.entries(featureGroups)) {
      if (items.length > 0) {
        console.log(`  ${group}: ${items.join(", ")}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✓ ${variant.toUpperCase()} bundle ready at dist/${variant}/`);
    console.log("=".repeat(60));

    console.log("\nTo run the production build:");
    console.log(`  bun ./dist/${variant}/index.js`);
    console.log("\nBuild variants:");
    console.log(`  bun run build:free     → CORE + PERFORMANCE_POLISH`);
    console.log(`  bun run build:premium  → CORE + PREMIUM features`);
    console.log(`  bun run build:debug    → CORE + DEBUG features`);
    console.log(`  bun run build:beta     → CORE + BETA features`);
    console.log(`  bun run build:mock     → CORE + MOCK features`);

    if (args.compile && variant !== "debug") {
      console.log("\n--- Compiling Standalone Binary ---");
      const compileResult = await Bun.build({
        entrypoints: [serverEntry],
        outdir: `./dist/${variant}-binary`,
        minify: true,
        target: "bun",
        compile: true,
        define: {
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.env.BUILD_VARIANT": JSON.stringify(variant),
        },
      });

      if (compileResult.success) {
        console.log("Binary compilation complete");
      }
    }
  } catch (error) {
    console.error("\nBuild error:", error);
    process.exit(1);
  }
}

buildDashboard();
