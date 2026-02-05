/**
 * Demonstrating Bun.build with reactFastRefresh option
 */

// Example 1: Development build with React Fast Refresh
async function buildDevelopment() {
  console.log("🔥 Building for development with React Fast Refresh...");
  
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

  console.log(`✅ Development build completed!`);
  console.log(`📁 Output directory: ./public/dev`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  // Show what was generated
  result.outputs.forEach((output, index) => {
    console.log(`   ${index + 1}. ${output.path} (${output.size} bytes)`);
  });

  return result;
}

// Example 2: Production build without React Fast Refresh
async function buildProduction() {
  console.log("🏭 Building for production (no React Fast Refresh)...");
  
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

  console.log(`✅ Production build completed!`);
  console.log(`📁 Output directory: ./public/prod`);
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  // Show what was generated
  result.outputs.forEach((output, index) => {
    console.log(`   ${index + 1}. ${output.path} (${output.size} bytes)`);
  });

  return result;
}

// Example 3: Compare builds with and without React Fast Refresh
async function compareBuilds() {
  console.log("🔍 Comparing builds with/without React Fast Refresh...");
  
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
  
  console.log("\n📊 Build Comparison:");
  console.log(`With React Fast Refresh: ${withRefresh.outputs[0]?.size} bytes`);
  console.log(`Without React Fast Refresh: ${withoutRefresh.outputs[0]?.size} bytes`);
  console.log(`Difference: ${Math.abs((withRefresh.outputs[0]?.size || 0) - (withoutRefresh.outputs[0]?.size || 0))} bytes`);
  
  // Show the injected code difference
  const withRefreshContent = await Bun.file(withRefresh.outputs[0]!.path).text();
  const withoutRefreshContent = await Bun.file(withoutRefresh.outputs[0]!.path).text();
  
  const hasRefreshSig = withRefreshContent.includes("$RefreshSig$");
  const hasRefreshReg = withRefreshContent.includes("$RefreshReg$");
  
  console.log(`\n🔍 React Fast Refresh Code Injection:`);
  console.log(`$RefreshSig$ injected: ${hasRefreshSig ? "✅" : "❌"}`);
  console.log(`$RefreshReg$ injected: ${hasRefreshReg ? "✅" : "❌"}`);
  
  // Show sample of injected code
  if (hasRefreshSig) {
    const sigMatch = withRefreshContent.match(/(\$RefreshSig\$\([^)]+\))/);
    if (sigMatch) {
      console.log(`\n💡 Sample injected code:`);
      console.log(sigMatch[0]);
    }
  }
  
  return { withRefresh, withoutRefresh };
}

// Run all examples
async function runAllExamples() {
  console.log("🚀 Bun.build reactFastRefresh Examples\n");
  
  try {
    await buildDevelopment();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await buildProduction();
    console.log("\n" + "=".repeat(50) + "\n");
    
    await compareBuilds();
    
    console.log("\n✅ All examples completed successfully!");
    
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
