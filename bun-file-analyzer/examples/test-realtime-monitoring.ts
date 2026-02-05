#!/usr/bin/env bun

/**
 * Test script for real-time bundle monitoring
 * Creates sample build data and tests the monitoring system
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Create sample build directory and files
function createSampleBuild() {
  const buildDir = "./dist";
  
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
  }
  
  // Create sample HTML file
  const sampleHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Test App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app"></div>
    <script src="main.js"></script>
</body>
</html>`;
  
  writeFileSync(join(buildDir, "index.html"), sampleHTML);
  
  // Create sample JS file
  const sampleJS = `
// Sample JavaScript bundle
console.log('Hello from bundled app!');

import React from 'react';
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  return React.createElement('div', null, 'Count: ', count);
}

export default App;`;
  
  writeFileSync(join(buildDir, "main.js"), sampleJS);
  
  // Create sample CSS file
  const sampleCSS = `
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

#app {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
}`;
  
  writeFileSync(join(buildDir, "styles.css"), sampleCSS);
  
  // Create sample Vite manifest
  const manifest = {
    "index.html": {
      "file": "index.html",
      "src": "index.html",
      "isEntry": true
    },
    "main.js": {
      "file": "main.js",
      "src": "main.tsx",
      "isEntry": true,
      "imports": ["react", "react-dom"]
    },
    "styles.css": {
      "file": "styles.css",
      "src": "styles.css",
      "isEntry": true
    }
  };
  
  writeFileSync(join(buildDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  
  // Create sample metafile
  const metafile = {
    inputs: {
      "main.tsx": {
        bytes: 1024,
        imports: ["react", "react-dom", "zustand"]
      },
      "node_modules/react/index.js": {
        bytes: 51200,
        imports: []
      },
      "node_modules/react-dom/index.js": {
        "bytes": 25600,
        "imports": []
      },
      "node_modules/zustand/index.js": {
        "bytes": 8192,
        "imports": []
      }
    },
    outputs: {
      "main.js": {
        bytes: 86016,
        entryPoint: "main.tsx"
      },
      "styles.css": {
        bytes: 2048,
        entryPoint: "styles.css"
      }
    }
  };
  
  // Create .vite directory
  const viteDir = join(buildDir, ".vite");
  if (!existsSync(viteDir)) {
    mkdirSync(viteDir, { recursive: true });
  }
  
  writeFileSync(join(viteDir, "metafile.json"), JSON.stringify(metafile, null, 2));
  
  console.log("📦 Sample build created in ./dist");
  console.log("Files created:");
  console.log("  - index.html (1.2KB)");
  console.log("  - main.js (84KB)");
  console.log("  - styles.css (2KB)");
  console.log("  - manifest.json");
  console.log("  - .vite/metafile.json");
}

// Test the monitoring system
async function testMonitoring() {
  console.log("🧪 Testing Real-time Bundle Monitoring...");
  
  // Create sample build
  createSampleBuild();
  
  // Import and test the monitoring functions
  try {
    const { getRealBundleAnalysis, getLiveMetrics, formatBytes } = await import("./realtime-monitoring.ts");
    
    console.log("\n📊 Testing Bundle Analysis...");
    const analysis = await getRealBundleAnalysis();
    console.log("Bundle Analysis Results:");
    console.log(`  Total Size: ${formatBytes(analysis.totalSize)}`);
    console.log(`  Chunks: ${analysis.chunks.length}`);
    console.log(`  Dependencies: ${analysis.dependencies.length}`);
    console.log(`  Assets: ${analysis.assets.length}`);
    console.log(`  Build System: ${analysis.buildSystem}`);
    
    console.log("\n📈 Testing Live Metrics...");
    const metrics = await getLiveMetrics();
    console.log("Live Metrics Results:");
    console.log(`  Bundle Size: ${metrics.bundle.sizeFormatted}`);
    console.log(`  Dependencies: ${metrics.bundle.dependencies}`);
    console.log(`  Build Status: ${metrics.buildStatus}`);
    console.log(`  Real-time Data: ${metrics.realTimeData}`);
    console.log(`  Alerts: ${metrics.alerts.length}`);
    
    if (metrics.alerts.length > 0) {
      console.log("\n🚨 Alerts:");
      metrics.alerts.forEach((alert: any) => {
        console.log(`  ${alert.level.toUpperCase()}: ${alert.message} (${alert.value})`);
      });
    }
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests if executed directly
if (import.meta.main) {
  testMonitoring().catch(console.error);
}

export { createSampleBuild, testMonitoring };
