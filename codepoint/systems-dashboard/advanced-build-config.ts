#!/usr/bin/env bun
// advanced-build-config.ts - Demonstrates Bun's advanced build configuration

console.log("🔧 Advanced Bun Build Configuration Examples\n");

// Example 1: Environment variable injection
console.log("1️⃣ Environment Variable Injection:");
console.log("// Inline all environment variables");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  env: 'inline', // Inject ALL env vars as string literals");
console.log("});");
console.log("");

// Example 2: Prefix-based environment injection
console.log("2️⃣ Prefix-Based Environment Injection:");
console.log("// Only inline public-facing environment variables");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  env: 'PUBLIC_*', // Only vars starting with PUBLIC_");
console.log("});");
console.log("");

// Example 3: Disable environment injection
console.log("3️⃣ Disable Environment Injection:");
console.log("// Keep process.env references in bundle");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  env: 'disable', // No env var injection");
console.log("});");
console.log("");

// Example 4: Source maps - linked
console.log("4️⃣ Linked Source Maps:");
console.log("// Generate separate .js.map files");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  sourcemap: 'linked', // Separate .js.map files");
console.log("});");
console.log("");

// Example 5: Source maps - external
console.log("5️⃣ External Source Maps:");
console.log("// Generate .js.map files without sourceMappingURL comments");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  sourcemap: 'external', // No sourceMappingURL comments");
console.log("});");
console.log("");

// Example 6: Source maps - inline
console.log("6️⃣ Inline Source Maps:");
console.log("// Append base64-encoded sourcemap to bundle");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  sourcemap: 'inline', // Base64 encoded in bundle");
console.log("});");
console.log("");

// Example 7: Production build with all optimizations
console.log("7️⃣ Production Build Configuration:");
console.log("// Complete production setup");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dist',");
console.log("  env: 'PUBLIC_*', // Only public env vars");
console.log("  sourcemap: 'linked', // For debugging");
console.log("  minify: true, // Minify output");
console.log("  target: 'browser', // Browser compatibility");
console.log("  splitting: true, // Code splitting");
console.log("  treeShaking: true, // Remove dead code");
console.log("});");
console.log("");

// Example 8: Development build
console.log("8️⃣ Development Build Configuration:");
console.log("// Optimized for development");
console.log("await Bun.build({");
console.log("  entrypoints: ['./src/index.tsx'],");
console.log("  outdir: './dev',");
console.log("  env: 'inline', // All env vars for debugging");
console.log("  sourcemap: 'inline', // Inline for easy debugging");
console.log("  minify: false, // Keep readable");
console.log("  target: 'bun', // Bun runtime");
console.log("});");
console.log("");

// Example 9: Multi-environment build
console.log("9️⃣ Multi-Environment Build:");
console.log("// Build for different environments");
console.log("const environments = ['development', 'staging', 'production'];");
console.log("");
console.log("for (const env of environments) {");
console.log("  await Bun.build({");
console.log("    entrypoints: ['./src/index.tsx'],");
console.log("    outdir: `./dist/\${env}`,");
console.log("    env: env === 'production' ? 'PUBLIC_*' : 'inline',");
console.log("    sourcemap: env === 'production' ? 'external' : 'inline',");
console.log("    minify: env === 'production',");
console.log("  });");
console.log("}");
console.log("");

// Example 10: Health monitoring build
console.log("🏥 Health Monitoring Dashboard Build:");
console.log("// Specialized for our dashboard");
console.log("await Bun.build({");
console.log("  entrypoints: [");
console.log("    './SystemsDashboard.tsx',");
console.log("    './src/health-server.ts',");
console.log("    './src/performance-benchmark.ts'");
console.log("  ],");
console.log("  outdir: './dist',");
console.log("  env: 'PUBLIC_*', // Public URLs only");
console.log("  sourcemap: 'linked', // For debugging");
console.log("  minify: true, // Production ready");
console.log("  target: 'bun', // Bun runtime optimization");
console.log("  external: ['react', 'react-dom'], // Keep React external");
console.log("});");
console.log("");

console.log("✅ Advanced Build Configuration Examples Generated!");
console.log("");
console.log("🔧 Environment Variables:");
console.log("   export PUBLIC_API_URL=https://api.example.com");
console.log("   export PUBLIC_VERSION=1.0.0");
console.log("   export SECRET_KEY=keep-private");
console.log("");
console.log("📋 Usage:");
console.log("   bun run advanced-build-config.ts");
console.log("   bun build --env=inline --sourcemap=linked src/index.tsx");
