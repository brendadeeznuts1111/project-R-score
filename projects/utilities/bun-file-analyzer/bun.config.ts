/// <reference types="bun-types" />

// Parse JSONC config at build time
const packageJson = await Bun.file("./package.json").json();
const tsconfig = Bun.JSONC.parse(
  await Bun.file("./tsconfig.json").text()
);

// Load build-time color theme from macro system
async function loadBuildTimeTheme(): Promise<string> {
  try {
    const themeSource = await Bun.file("./src/theme/build-time-colors.ts").text();
    
    return `
      // Macro-generated theme with zero runtime overhead
      ${themeSource}
      
      // Build-specific metadata
      export const BUILD_THEME_METADATA = {
        bunVersion: ${JSON.stringify(Bun.version)},
        buildTime: ${Date.now()},
        buildId: ${JSON.stringify(Bun.randomUUIDv7())},
        environment: ${JSON.stringify(process.env.NODE_ENV || "development")},
        generatedAt: ${Date.now()},
        hasMacroSupport: true,
        zeroRuntimeOverhead: true,
        wcagCompliant: true,
      } as const;
      
      // CSS custom properties for runtime injection
      export const CSS_VARIABLES = ${JSON.stringify(
        Object.entries({
          primary: Bun.color("hsl(210, 90%, 55%)", "hex"),
          success: Bun.color("hsl(145, 63%, 42%)", "hex"),
          warning: Bun.color("hsl(25, 85%, 55%)", "hex"),
          error: Bun.color("hsl(0, 75%, 60%)", "hex"),
          info: Bun.color("hsl(195, 85%, 55%)", "hex"),
          brand: Bun.color("hsl(220, 85%, 60%)", "hex"),
          accent: Bun.color("hsl(280, 70%, 60%)", "hex"),
          profit: Bun.color("hsl(145, 70%, 45%)", "hex"),
          loss: Bun.color("hsl(0, 70%, 55%)", "hex"),
          background: "#ffffff",
          surface: "#f8fafc",
          border: "#e2e8f0",
          textPrimary: "#0f172a",
          textSecondary: "#475569",
          textMuted: "#64748b",
        }).map(([key, value]) => `--color-${key}: ${value}`).join(';\n        ')
      )};
      
      // Runtime theme injector
      export function injectTheme(): void {
        if (typeof document !== 'undefined') {
          const style = document.createElement('style');
          style.textContent = \`
            :root {
              \${CSS_VARIABLES}
            }
          \`;
          document.head.appendChild(style);
        }
      }
      
      // Type-safe color accessor
      export function getColor(name: keyof typeof THEME.hex): string {
        return THEME.hex[name];
      }
      
      // RGB accessor for canvas/WebGL operations
      export function getColorRgb(name: keyof typeof THEME.rgb): number[] {
        return THEME.rgb[name];
      }
    `;
  } catch (error) {
    console.warn("⚠️ Could not load build-time theme, falling back to runtime generation");
    return generateThemeFile();
  }
}

// Generate theme file with Bun.color (optimized)
function generateThemeFile(): string {
  // Pre-compute colors once for performance
  const colors = {
    primary: Bun.color("hsl(210, 90%, 55%)", "hex"),
    success: Bun.color("hsl(145, 63%, 42%)", "hex"),
    warning: Bun.color("hsl(25, 85%, 55%)", "hex"),
    error: Bun.color("hsl(0, 75%, 60%)", "hex"),
    info: Bun.color("hsl(195, 85%, 55%)", "hex"),
  };
  
  // Generate semantic colors with WCAG AA compliance
  const semantic = {
    env: Bun.color("hsl(145, 63%, 42%)", "hex"), // Green for environment
    const: Bun.color("hsl(210, 90%, 55%)", "hex"), // Blue for constants
    runtime: Bun.color("hsl(25, 85%, 55%)", "hex"), // Orange for runtime
    dep: Bun.color("hsl(270, 60%, 60%)", "hex"), // Purple for dependencies
    config: Bun.color("hsl(195, 85%, 55%)", "hex"), // Cyan for configuration
  };
  
  return `
    // Auto-generated theme using Bun.color() for WCAG AA compliance
    export const THEME = {
      colors: {
        primary: "${colors.primary}",
        success: "${colors.success}",
        warning: "${colors.warning}",
        error: "${colors.error}",
        info: "${colors.info}",
      },
      gradients: {
        primary: "linear-gradient(135deg, ${colors.primary}, ${colors.success})",
        ocean: "linear-gradient(135deg, ${colors.info}, ${colors.primary})",
        sunset: "linear-gradient(135deg, ${colors.warning}, ${colors.error})",
      },
      semantic: {
        env: "${semantic.env}",
        const: "${semantic.const}",
        runtime: "${semantic.runtime}",
        dep: "${semantic.dep}",
        config: "${semantic.config}",
      },
      accessibility: {
        contrastRatio: "4.5:1", // WCAG AA compliant
        fontSize: {
          small: "0.875rem",
          medium: "1rem",
          large: "1.125rem",
          xlarge: "1.25rem",
        },
      },
    } as const;
    
    // Export individual colors for easy import
    export const PRIMARY = "${colors.primary}";
    export const SUCCESS = "${colors.success}";
    export const WARNING = "${colors.warning}";
    export const ERROR = "${colors.error}";
    export const INFO = "${colors.info}";
  `;
}

// Load build-time color theme from macro system
const buildTimeTheme = await loadBuildTimeTheme();

/**
 * Bun v1.3.6+ Enhanced Configuration
 * Virtual Files, Metafile Analysis, React Fast Refresh & Cross-Compilation
 */

const buildResult = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./public",
  target: "browser",
  
  // React Fast Refresh (native, no plugin needed)
  reactFastRefresh: process.env.NODE_ENV !== "production",
  
  // Bundle analysis for CI/CD
  metafile: true,
  
  // Source maps for debugging
  sourcemap: process.env.NODE_ENV === "development" ? "external" : false,
  
  // Virtual files override (files that don't exist on disk)
  files: {
    // Override production config
    "./src/build-config.ts": `
      export const BUILD_CONFIG = {
        bunVersion: ${JSON.stringify(Bun.version)},
        buildTime: ${Date.now()},
        buildId: ${JSON.stringify(Bun.randomUUIDv7())},
        debug: ${process.env.NODE_ENV === "development"},
        version: ${JSON.stringify(packageJson.version)},
        apiUrl: ${JSON.stringify(process.env.API_URL || "http://localhost:3007")},
        frontendUrl: ${JSON.stringify(process.env.FRONTEND_URL || "http://localhost:3879")},
      } as const;
      
      export const PORT_CONFIG = {
        frontend: ${JSON.stringify(process.env.PORT || "3879")},
        api: ${JSON.stringify(process.env.API_PORT || "3007")},
        environment: ${JSON.stringify(process.env.NODE_ENV || "development")},
      } as const;
    `,
    
    // Inject build-time constants
    "./src/build-info.ts": `
      export const BUILD_ID = ${JSON.stringify(Bun.randomUUIDv7())};
      export const BUILD_TIME = ${Date.now()};
      export const BUN_VERSION = ${JSON.stringify(Bun.version)};
      export const COMMIT_SHA = ${JSON.stringify(process.env.COMMIT_SHA || "dev")};
      export const BUNDLE_SIZE = __BUNDLE_SIZE__; // Replaced post-build
      export const IS_COMPILED = __IS_COMPILED__;
      export const TARGET = ${JSON.stringify(process.env.TARGET || "browser")};
    `,
    
    // Mock module for testing
    "./src/api/mock-responses.ts": `
      export const mockFiles = ${JSON.stringify([
        { id: "1", name: "test.png", size: 1024, type: "image/png" },
        { id: "2", name: "data.bin", size: 2048, type: "application/octet-stream" },
        { id: "3", name: "config.jsonc", size: 512, type: "application/jsonc" },
      ])};
      
      export const mockArchive = new Bun.Archive({
        "README.md": "# Virtual Archive\\nGenerated at build time",
        "config.json": JSON.stringify({ virtual: true, buildTime: ${Date.now()} }, null, 2),
        "data.txt": "This is virtual file content injected at build time",
      });
      
      export const mockApiResponse = {
        success: true,
        message: "Virtual API response from build-time injection",
        timestamp: ${Date.now()},
        buildId: ${JSON.stringify(Bun.randomUUIDv7())},
      };
    `,
    
    // Generated API client
    "./src/api/generated-client.ts": `
      // Auto-generated API client for Bun Enhanced File Analyzer
      const API_BASE = ${JSON.stringify(process.env.API_URL || "http://localhost:3007")};
      
      export class FileAnalyzerClient {
        static async analyzeFile(file: File): Promise<any> {
          const formData = new FormData();
          formData.append("file", file);
          
          const response = await fetch(\`\${API_BASE}/api/files/analyze\`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          
          return response.json();
        }
        
        static async createArchive(fileIds: string[]): Promise<any> {
          return fetch(\`\${API_BASE}/api/files/archive\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileIds }),
            credentials: "include",
          }).then(r => r.json());
        }
        
        static async getConfig(): Promise<any> {
          return fetch(\`\${API_BASE}/api/config\`).then(r => r.json());
        }
      }
    `,
    
    // Color palette for runtime using Bun.color() - now macro-generated
    "./src/theme/colors.ts": buildTimeTheme,
    
    // Virtual worker for file processing
    "./src/workers/file-processor.ts": `
      // Virtual worker for file processing
      self.onmessage = async (e) => {
        const { files, operation } = e.data;
        
        try {
          let result;
          
          switch (operation) {
            case "analyze":
              result = files.map(file => ({
                id: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
              }));
              break;
              
            case "archive":
              const archive = new Bun.Archive();
              files.forEach(file => {
                archive.add(file.name, file);
              });
              result = { archiveBytes: archive.bytes() };
              break;
              
            default:
              throw new Error(\`Unknown operation: \${operation}\`);
          }
          
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `,
  },
  
  // Define globals for virtual files (minimal set)
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  
  // Loaders for virtual files
  loader: {
    ".svg": "dataurl",
    ".png": "file",
    ".jsonc": "json",
    ".json": "json",
  },
  
  // Minification for production
  minify: process.env.NODE_ENV === "production",
  
  // Naming conventions with hashes
  naming: {
    entry: "[dir]/[name].[hash:8].[ext]",
    chunk: "[dir]/[name].[hash:8].[ext]",
    asset: "[dir]/[name].[hash:8].[ext]",
  },
});

// Production-hardened post-build processing (runs in all environments)
async function processBuildResult(result: Awaited<ReturnType<typeof Bun.build>>) {
  if (!result.metafile) {
    console.warn("⚠️ No metafile available for post-processing");
    return;
  }

  // Calculate total bundle size
  const totalSize = Object.values(result.metafile.outputs).reduce(
    (sum: number, out: any) => sum + out.bytes,
    0
  );

  // Bundle budget enforcement (500KB limit)
  const BUDGET_KB = 500;
  if (totalSize > BUDGET_KB * 1024) {
    console.error(`❌ Bundle exceeds ${BUDGET_KB}KB! (${(totalSize / 1024).toFixed(1)} KB)`);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Replace __BUNDLE_SIZE__ in build-info.js
  const buildInfoPath = "./public/build-info.js";
  if (await Bun.file(buildInfoPath).exists()) {
    let content = await Bun.file(buildInfoPath).text();
    content = content.replace(/__BUNDLE_SIZE__/g, totalSize.toString());
    content = content.replace(/__IS_COMPILED__/g, "true");
    await Bun.write(buildInfoPath, content);
  }

  // Save metafile for analysis
  await Bun.write(
    "./public/metafile.json",
    JSON.stringify(result.metafile, null, 2)
  );

  // Validate critical virtual files exist
  const requiredFiles = [
    "./public/build-config.js",
    "./public/build-info.js",
    "./public/theme/colors.js"
  ];

  for (const file of requiredFiles) {
    if (!(await Bun.file(file).exists())) {
      throw new Error(`❌ Missing virtual file: ${file}`);
    }
  }

  // Run WCAG color validation in production
  if (process.env.NODE_ENV === "production") {
    try {
      console.log("🎨 Running WCAG color validation...");
      const { validateTheme } = await import("./scripts/validate-colors.ts");
      validateTheme();
      console.log("✅ WCAG validation passed");
    } catch (error) {
      console.error("❌ WCAG validation failed:", error);
      throw error;
    }
  }

  // Log build metrics with colorful output
  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(
    `📦 Build Complete: ${sizeMB} MB | ${Object.keys(result.metafile.outputs).length} files | ${Bun.version}`
  );
  
  const colors = {
    primary: Bun.color("hsl(210, 90%, 55%)", "hex"),
    success: Bun.color("hsl(145, 63%, 42%)", "hex"),
    warning: Bun.color("hsl(25, 85%, 55%)", "hex"),
    error: Bun.color("hsl(0, 75%, 60%)", "hex"),
  };
  
  console.log(
    `🎨 Theme Generated: ${colors.primary} | ${colors.success} | ${colors.warning} | ${colors.error}`
  );

  return { totalSize, fileCount: Object.keys(result.metafile.outputs).length };
}

// Run post-build processing (works in both dev and production)
const buildMetrics = await processBuildResult(buildResult);

// Optional: Run post-build hooks if they exist
try {
  const { runPostBuildHooks } = await import("./scripts/build-hooks.ts");
  await runPostBuildHooks(buildResult, {
    outputDir: "./public",
    generateHeaders: true,
    trackSize: true,
    createReports: true,
    metrics: buildMetrics,
  });
} catch (error) {
  // Build hooks are optional, continue without them
  console.log("ℹ️ Build hooks not available, continuing without them");
}

// HMR-specific disposal (dev only)
if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    const config = await import.meta.hot!.data.config;
    const result = await Bun.build(config);
    await processBuildResult(result);
  });
}

export default buildResult;
