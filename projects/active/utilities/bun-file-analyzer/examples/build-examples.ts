/**
 * Demonstrating Bun.build with reactFastRefresh option
 */

// Example 1: Development build with React Fast Refresh
async function buildDevelopment() {
  console.info("🔥 Building for development with React Fast Refresh...");
  
  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./public/dev",
    target: "browser",
    format: "esm",
    
    // ✅ Enable React Fast Refresh for development
    reactFastRefresh: true,
    
    // Development settings
    sourcemap: "external",
    minify: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
      "__DEV__": "true",
    },
  });

  console.info(`✅ Development build completed!`);
  console.info(`📁 Output directory: ./public/dev`);
  console.info(`📦 Generated ${result.outputs.length} files`);
  
  // Show what was generated
  result.outputs.forEach((output, index) => {
    console.info(`   ${index + 1}. ${output.path} (${output.size} bytes)`);
  });

  return result;
}

// Example 2: Production build without React Fast Refresh
async function buildProduction() {
  console.info("🏭 Building for production (no React Fast Refresh)...");
  
  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./public/prod",
    target: "browser",
    format: "esm",
    
    // ❌ Disable React Fast Refresh for production
    reactFastRefresh: false,
    
    // Production optimizations
    sourcemap: false,
    minify: {
      whitespace: true,
      identifiers: true,
      syntax: true,
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "__DEV__": "false",
    },
  });

  console.info(`✅ Production build completed!`);
  console.info(`📁 Output directory: ./public/prod`);
  console.info(`📦 Generated ${result.outputs.length} files`);
  
  // Show what was generated
  result.outputs.forEach((output, index) => {
    console.info(`   ${index + 1}. ${output.path} (${output.size} bytes)`);
  });

  return result;
}

// Example 3: Compare builds with and without React Fast Refresh
async function compareBuilds() {
  console.info("🔍 Comparing builds with/without React Fast Refresh...");
  
  // Build with React Fast Refresh
  const withRefresh = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./public/with-refresh",
    target: "browser",
    reactFastRefresh: true,
    sourcemap: false,
    minify: false,
  });
  
  // Build without React Fast Refresh
  const withoutRefresh = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./public/without-refresh",
    target: "browser",
    reactFastRefresh: false,
    sourcemap: false,
    minify: false,
  });
  
  console.info("\n📊 Build Comparison:");
  console.info(`With React Fast Refresh: ${withRefresh.outputs[0]?.size} bytes`);
  console.info(`Without React Fast Refresh: ${withoutRefresh.outputs[0]?.size} bytes`);
  console.info(`Difference: ${Math.abs((withRefresh.outputs[0]?.size || 0) - (withoutRefresh.outputs[0]?.size || 0))} bytes`);
  
  // Show the injected code difference
  const withRefreshContent = await Bun.file(withRefresh.outputs[0]!.path).text();
  const withoutRefreshContent = await Bun.file(withoutRefresh.outputs[0]!.path).text();
  
  const hasRefreshSig = withRefreshContent.includes("$RefreshSig$");
  const hasRefreshReg = withRefreshContent.includes("$RefreshReg$");
  
  console.info(`\n🔍 React Fast Refresh Code Injection:`);
  console.info(`$RefreshSig$ injected: ${hasRefreshSig ? "✅" : "❌"}`);
  console.info(`$RefreshReg$ injected: ${hasRefreshReg ? "✅" : "❌"}`);
  
  // Show sample of injected code
  if (hasRefreshSig) {
    const sigMatch = withRefreshContent.match(/(\$RefreshSig\$\([^)]+\))/);
    if (sigMatch) {
      console.info(`\n💡 Sample injected code:`);
      console.info(sigMatch[0]);
    }
  }
  
  return { withRefresh, withoutRefresh };
}

// Run all examples
async function runAllExamples() {
  console.info("🚀 Bun.build reactFastRefresh Examples\n");
  
  try {
    await buildDevelopment();
    console.info("\n" + "=".repeat(50) + "\n");
    
    await buildProduction();
    console.info("\n" + "=".repeat(50) + "\n");
    
    await compareBuilds();
    
    console.info("\n✅ All examples completed successfully!");
    
  } catch (error) {
    console.error("❌ Build error:", error);
  }
}

// Export functions for individual use
export {
  buildDevelopment,
  buildProduction,
  compareBuilds,
  runAllExamples,
};

// Run if called directly
if (import.meta.main) {
  runAllExamples();
}
