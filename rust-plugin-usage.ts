// TypeScript usage example for the Rust Native Plugin
// This shows how to integrate the Rust plugin with Bun.build

import myRustPlugin from "./rust-plugin-example.node";

// Build configuration using the Rust native plugin
const buildResult = await Bun.build({
  entrypoints: ["./src/app.tsx", "./src/utils.ts"],
  outdir: "./dist",
  target: "browser",
  plugins: [
    {
      name: "rust-transformer-plugin",
      setup(build) {
        console.log("🔧 Setting up Rust native plugin...");
        
        // Example 1: Replace 'foo' with 'bar' in all TSX files
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.tsx",
          },
          {
            napiModule: myRustPlugin,
            symbol: "replace_foo_with_bar",
          },
        );
        
        // Example 2: Add strict mode to all TypeScript files
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.ts",
          },
          {
            napiModule: myRustPlugin,
            symbol: "add_strict_mode",
          },
        );
        
        // Example 3: Optimize imports in all JS/TS files
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.{ts,js,tsx,jsx}",
          },
          {
            napiModule: myRustPlugin,
            symbol: "optimize_imports",
          },
        );
        
        // Example 4: Optimize console.log for production
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.{ts,js}",
          },
          {
            napiModule: myRustPlugin,
            symbol: "optimize_console_logs",
          },
        );
        
        // Example 5: Add performance metadata
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.ts",
          },
          {
            napiModule: myRustPlugin,
            symbol: "add_performance_metadata",
          },
        );
        
        console.log("✅ Rust native plugin configured successfully");
      },
    },
  ],
});

console.log("🚀 Build completed with Rust optimizations!");
console.log(`📦 Output: ${buildResult.outputs.length} files`);
console.log(`⚡ Processing time: ${buildResult.outputs.length} files optimized by Rust plugin`);

// Example of what the transformed files might look like:
/*
Original file:
```typescript
import { foo } from './bar';
import { foo } from './bar'; // Duplicate
console.log('Hello world');
```

After Rust plugin optimization:
```typescript
// Optimized by Rust Native Plugin
// Processing time: 1640995200123456789ns
// Thread-safe: ✅
// Zero UTF-8 conversion: ✅
// Multi-threading: ✅

"use strict";

import { foo } from './bar';

process.env.NODE_ENV !== 'production' && console.log('Hello world');
```
*/

export default buildResult;
