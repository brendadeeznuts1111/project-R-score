/**
 * Demonstrating Bun.build files option for virtual files and overrides
 */

// Example 1: Pure virtual build - no files on disk needed
async function buildVirtualApp() {
  console.log("🌐 Building pure virtual application...");
  
  const result = await Bun.build({
    entrypoints: ["/app/index.ts"],
    files: {
      "/app/index.ts": `
        import { greet } from "./greet.ts";
        import { version } from "./version.ts";
        
        console.log(greet("World"));
        console.log(\`App version: \${version}\`);
        
        // Create a simple UI
        document.body.innerHTML = \`
          <div style="padding: 2rem; font-family: system-ui;">
            <h1>\${greet("Virtual App")}</h1>
            <p>Version: \${version}</p>
            <button onclick="alert('Hello from virtual build!')">Click me</button>
          </div>
        \`;
      `,
      "/app/greet.ts": `
        export function greet(name: string) {
          return "Hello, " + name + "!";
        }
        
        export function farewell(name: string) {
          return "Goodbye, " + name + "!";
        }
      `,
      "/app/version.ts": `
        export const version = "1.0.0-virtual";
        export const buildTime = new Date().toISOString();
      `,
    },
    outdir: "./public/virtual-app",
    target: "browser",
    format: "esm",
  });

  console.log(`✅ Virtual app built! Generated ${result.outputs.length} files`);
  result.outputs.forEach((output, index) => {
    console.log(`   ${index + 1}. ${output.path} (${output.size} bytes)`);
  });

  return result;
}

// Example 2: Override real files with virtual content
async function buildWithOverrides() {
  console.log("🔄 Building with file overrides...");
  
  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    files: {
      // Override config with production values
      "./src/config.ts": `
        export const API_URL = "https://api.production.com";
        export const DEBUG = false;
        export const ENVIRONMENT = "production";
        export const SENTRY_DSN = "https://sentry.production.com/123";
      `,
      
      // Override colors with production theme
      "./src/utils/colors.ts": `
        export const Palette = {
          frontend: { primary: "#1e40af", stroke: "#1e3a8a", gradient: "rgba(30, 64, 175, 0.1)" },
          api: { primary: "#15803d", stroke: "#166534", gradient: "rgba(21, 128, 61, 0.1)" },
          production: { primary: "#dc2626", stroke: "#b91c1c", gradient: "rgba(220, 38, 38, 0.1)" },
        } as const;
        
        console.log("🎨 Production color theme loaded");
      `,
      
      // Inject build-time constants
      "./src/build-info.ts": `
        export const BUILD_ID = "${crypto.randomUUID()}";
        export const BUILD_TIME = ${Date.now()};
        export const BUILD_VERSION = "${process.env.npm_package_version || "1.0.0"}";
        export const IS_PRODUCTION = true;
        
        console.log("🏭 Build info injected:", {
          id: BUILD_ID,
          time: new Date(BUILD_TIME).toISOString(),
          version: BUILD_VERSION,
        });
      `,
    },
    outdir: "./public/production-build",
    target: "browser",
    format: "esm",
    minify: true,
    sourcemap: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  console.log(`✅ Production build with overrides completed!`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  return result;
}

// Example 3: Code generation and injection
async function buildWithGeneratedCode() {
  console.log("⚡ Building with generated code...");
  
  // Generate some dynamic content
  const features = ["File Analysis", "DOM Inspector", "Cookie Manager", "URL Router"];
  const featureCode = features.map((feature, index) => `
    {
      id: ${index},
      name: "${feature}",
      description: "Advanced ${feature.toLowerCase()} functionality",
      enabled: true,
    }
  `).join(",\n");

  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    files: {
      // Generate feature registry
      "./src/generated/features.ts": `
        export interface Feature {
          id: number;
          name: string;
          description: string;
          enabled: boolean;
        }
        
        export const FEATURES: Feature[] = [
          ${featureCode}
        ];
        
        export const ENABLED_FEATURES = FEATURES.filter(f => f.enabled);
        export const FEATURE_COUNT = FEATURES.length;
        
        console.log("🚀 Generated features loaded:", FEATURE_COUNT, "features");
      `,
      
      // Generate mock API responses for development
      "./src/generated/mock-data.ts": `
        import { FEATURES } from "./features.ts";
        
        export const mockFileAnalysis = {
          success: true,
          data: {
            signature: "PNG",
            hash: "${crypto.randomUUID()}",
            size: 1024,
            metadata: {
              width: 800,
              height: 600,
              format: "image/png",
            }
          },
          timestamp: ${Date.now()},
        };
        
        export const mockHealthCheck = {
          status: "healthy",
          timestamp: ${Date.now()},
          version: "1.0.0",
          features: FEATURES.map(f => f.name),
        };
        
        console.log("🎭 Mock data generated");
      `,
      
      // Generate type definitions
      "./src/generated/types.ts": `
        export interface ApiResponse<T = any> {
          success: boolean;
          data?: T;
          error?: string;
          timestamp: number;
        }
        
        export interface FileAnalysisResult {
          signature: string;
          hash: string;
          size: number;
          metadata?: Record<string, any>;
        }
        
        export interface HealthCheckResult {
          status: "healthy" | "unhealthy";
          timestamp: number;
          version: string;
          features?: string[];
        }
      `,
    },
    outdir: "./public/generated-build",
    target: "browser",
    format: "esm",
    sourcemap: "external",
  });

  console.log(`✅ Build with generated code completed!`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  return result;
}

// Example 4: Testing with virtual mocks
async function buildForTesting() {
  console.log("🧪 Building for testing with virtual mocks...");
  
  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    files: {
      // Mock API responses
      "./src/api/mock-client.ts": `
        export const mockClient = {
          async analyzeFile(file: File) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return {
              success: true,
              data: {
                signature: "MOCK",
                hash: "mock-hash-12345",
                size: file.size,
                metadata: { mocked: true }
              },
              timestamp: Date.now(),
            };
          },
          
          async healthCheck() {
            return {
              status: "healthy",
              timestamp: Date.now(),
              version: "test-mode",
            };
          }
        };
        
        console.log("🎭 Mock API client initialized");
      `,
      
      // Mock React components for testing
      "./src/components/MockFileAnalyzer.tsx": `
        import React from 'react';
        import { mockClient } from '../api/mock-client';
        
        export const MockFileAnalyzer = () => {
          const [files, setFiles] = React.useState([]);
          
          const handleMockFile = async () => {
            const mockFile = new File(['test content'], 'mock.txt', { type: 'text/plain' });
            const result = await mockClient.analyzeFile(mockFile);
            setFiles(prev => [...prev, { ...result.data, name: 'mock.txt' }]);
          };
          
          return (
            <div style={{ padding: '1rem', border: '2px dashed #ccc' }}>
              <h3>🧪 Mock File Analyzer</h3>
              <button onClick={handleMockFile}>
                Add Mock File
              </button>
              <div>
                {files.map((file, i) => (
                  <div key={i} style={{ margin: '0.5rem 0', padding: '0.5rem', background: '#f5f5f5' }}>
                    <strong>{file.name}</strong> - {file.signature} ({file.size} bytes)
                  </div>
                ))}
              </div>
            </div>
          );
        };
      `,
      
      // Test configuration override
      "./src/config.ts": `
        export const API_URL = "http://mock-api.test";
        export const DEBUG = true;
        export const TESTING = true;
        export const MOCK_MODE = true;
      `,
    },
    outdir: "./public/test-build",
    target: "browser",
    format: "esm",
    define: {
      "process.env.NODE_ENV": JSON.stringify("test"),
      "__TEST__": "true",
    },
  });

  console.log(`✅ Test build with mocks completed!`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  return result;
}

// Example 5: Multi-environment builds
async function buildMultiEnvironment() {
  console.log("🌍 Building for multiple environments...");
  
  const environments = ["development", "staging", "production"];
  const results = [];
  
  for (const env of environments) {
    console.log(`\n📦 Building for ${env}...`);
    
    const envConfig = {
      development: {
        API_URL: "http://localhost:3005",
        DEBUG: "true",
        SENTRY_DSN: "null",
        ANALYTICS: "false",
      },
      staging: {
        API_URL: "https://api-staging.example.com",
        DEBUG: "true",
        SENTRY_DSN: "https://sentry.staging.com/123",
        ANALYTICS: "true",
      },
      production: {
        API_URL: "https://api.example.com",
        DEBUG: "false",
        SENTRY_DSN: "https://sentry.example.com/456",
        ANALYTICS: "true",
      },
    };
    
    const config = envConfig[env as keyof typeof envConfig];
    
    const result = await Bun.build({
      entrypoints: ["./src/index.tsx"],
      files: {
        "./src/environment.ts": `
          export const ENVIRONMENT = "${env}";
          export const API_URL = "${config.API_URL}";
          export const DEBUG = ${config.DEBUG};
          export const SENTRY_DSN = ${config.SENTRY_DSN};
          export const ANALYTICS = ${config.ANALYTICS};
          
          console.log("🌍 Environment loaded:", {
            env: "${env}",
            apiUrl: "${config.API_URL}",
            debug: ${config.DEBUG},
          });
        `,
        
        "./src/build-meta.ts": `
          export const BUILD_ENVIRONMENT = "${env}";
          export const BUILD_ID = "${crypto.randomUUID()}";
          export const BUILD_TIME = ${Date.now()};
          export const BUILD_CONFIG = ${JSON.stringify(config)};
        `,
      },
      outdir: `./public/${env}`,
      target: "browser",
      format: "esm",
      minify: env === "production",
      sourcemap: env !== "production",
      define: {
        "process.env.NODE_ENV": JSON.stringify(env),
      },
    });
    
    results.push({ environment: env, result });
    console.log(`✅ ${env} build completed!`);
  }
  
  return results;
}

// Example 6: Using different content types
async function buildWithContentTypes() {
  console.log("📄 Building with different content types...");
  
  // Create different types of content
  const textContent = "export const message = 'Hello from text!';";
  const blobContent = new Blob([`export const blobMessage = 'Hello from Blob!';`], { type: "application/typescript" });
  const arrayBuffer = new TextEncoder().encode(`
    export const arrayBufferMessage = "Hello from ArrayBuffer!";
    export const timestamp = ${Date.now()};
  `).buffer;
  
  const result = await Bun.build({
    entrypoints: ["/demo/index.ts"],
    files: {
      "/demo/index.ts": `
        import { message } from "./text.ts";
        import { arrayBufferMessage, timestamp } from "./buffer.ts";
        import { blobMessage } from "./blob.ts";
        
        console.log(message);
        console.log(arrayBufferMessage);
        console.log(blobMessage);
        console.log("Timestamp:", timestamp);
        
        document.body.innerHTML = \`
          <div style="padding: 2rem; font-family: system-ui;">
            <h1>Content Types Demo</h1>
            <p>Text: \${message}</p>
            <p>Buffer: \${arrayBufferMessage}</p>
            <p>Blob: \${blobMessage}</p>
            <p>Timestamp: \${new Date(timestamp).toLocaleString()}</p>
          </div>
        \`;
      `,
      
      // String content
      "/demo/text.ts": textContent,
      
      // Blob content
      "/demo/blob.ts": blobContent,
      
      // ArrayBuffer content
      "/demo/buffer.ts": arrayBuffer,
    },
    outdir: "./public/content-types",
    target: "browser",
    format: "esm",
  });

  console.log(`✅ Content types demo built!`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  return result;
}

// Run all examples
async function runAllExamples() {
  console.log("🚀 Bun.build files option Examples\n");
  
  try {
    await buildVirtualApp();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildWithOverrides();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildWithGeneratedCode();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildForTesting();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildMultiEnvironment();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildWithContentTypes();
    
    console.log("\n✅ All files option examples completed successfully!");
    
  } catch (error) {
    console.error("❌ Build error:", error);
  }
}

// Export functions for individual use
export {
  buildVirtualApp,
  buildWithOverrides,
  buildWithGeneratedCode,
  buildForTesting,
  buildMultiEnvironment,
  buildWithContentTypes,
  runAllExamples,
};

// Run if called directly
if (import.meta.main) {
  runAllExamples();
}
