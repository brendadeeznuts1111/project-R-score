#!/usr/bin/env bun
// advanced-build-config.ts - Demonstrates Bun's advanced build configuration

console.info("🔧 Advanced Bun Build Configuration Examples\n");

// Example 1: Environment variable injection
console.info("1️⃣ Environment Variable Injection:");
console.info("// Inline all environment variables");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  env: 'inline', // Inject ALL env vars as string literals");
console.info("});");
console.info("");

// Example 2: Prefix-based environment injection
console.info("2️⃣ Prefix-Based Environment Injection:");
console.info("// Only inline public-facing environment variables");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  env: 'PUBLIC_*', // Only vars starting with PUBLIC_");
console.info("});");
console.info("");

// Example 3: Disable environment injection
console.info("3️⃣ Disable Environment Injection:");
console.info("// Keep process.env references in bundle");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  env: 'disable', // No env var injection");
console.info("});");
console.info("");

// Example 4: Source maps - linked
console.info("4️⃣ Linked Source Maps:");
console.info("// Generate separate .js.map files");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  sourcemap: 'linked', // Separate .js.map files");
console.info("});");
console.info("");

// Example 5: Source maps - external
console.info("5️⃣ External Source Maps:");
console.info("// Generate .js.map files without sourceMappingURL comments");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  sourcemap: 'external', // No sourceMappingURL comments");
console.info("});");
console.info("");

// Example 6: Source maps - inline
console.info("6️⃣ Inline Source Maps:");
console.info("// Append base64-encoded sourcemap to bundle");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  sourcemap: 'inline', // Base64 encoded in bundle");
console.info("});");
console.info("");

// Example 7: Production build with all optimizations
console.info("7️⃣ Production Build Configuration:");
console.info("// Complete production setup");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dist',");
console.info("  env: 'PUBLIC_*', // Only public env vars");
console.info("  sourcemap: 'linked', // For debugging");
console.info("  minify: true, // Minify output");
console.info("  target: 'browser', // Browser compatibility");
console.info("  splitting: true, // Code splitting");
console.info("  treeShaking: true, // Remove dead code");
console.info("});");
console.info("");

// Example 8: Development build
console.info("8️⃣ Development Build Configuration:");
console.info("// Optimized for development");
console.info("await Bun.build({");
console.info("  entrypoints: ['./src/index.tsx'],");
console.info("  outdir: './dev',");
console.info("  env: 'inline', // All env vars for debugging");
console.info("  sourcemap: 'inline', // Inline for easy debugging");
console.info("  minify: false, // Keep readable");
console.info("  target: 'bun', // Bun runtime");
console.info("});");
console.info("");

// Example 9: Multi-environment build
console.info("9️⃣ Multi-Environment Build:");
console.info("// Build for different environments");
console.info("const environments = ['development', 'staging', 'production'];");
console.info("");
console.info("for (const env of environments) {");
console.info("  await Bun.build({");
console.info("    entrypoints: ['./src/index.tsx'],");
console.info("    outdir: `./dist/\${env}`,");
console.info("    env: env === 'production' ? 'PUBLIC_*' : 'inline',");
console.info("    sourcemap: env === 'production' ? 'external' : 'inline',");
console.info("    minify: env === 'production',");
console.info("  });");
console.info("}");
console.info("");

// Example 10: Health monitoring build
console.info("🏥 Health Monitoring Dashboard Build:");
console.info("// Specialized for our dashboard");
console.info("await Bun.build({");
console.info("  entrypoints: [");
console.info("    './SystemsDashboard.tsx',");
console.info("    './src/health-server.ts',");
console.info("    './src/performance-benchmark.ts'");
console.info("  ],");
console.info("  outdir: './dist',");
console.info("  env: 'PUBLIC_*', // Public URLs only");
console.info("  sourcemap: 'linked', // For debugging");
console.info("  minify: true, // Production ready");
console.info("  target: 'bun', // Bun runtime optimization");
console.info("  external: ['react', 'react-dom'], // Keep React external");
console.info("});");
console.info("");

console.info("✅ Advanced Build Configuration Examples Generated!");
console.info("");
console.info("🔧 Environment Variables:");
console.info("   export PUBLIC_API_URL=https://api.example.com");
console.info("   export PUBLIC_VERSION=1.0.0");
console.info("   export SECRET_KEY=keep-private");
console.info("");
console.info("📋 Usage:");
console.info("   bun run advanced-build-config.ts");
console.info("   bun build --env=inline --sourcemap=linked src/index.tsx");
