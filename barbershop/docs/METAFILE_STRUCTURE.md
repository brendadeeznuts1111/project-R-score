# 📋 Bun Build Metafile Structure Reference

## 🏗️ Metafile Overview

Bun's metafile provides detailed build analysis with two main sections:
- **`inputs`** - Source file analysis and dependency mapping
- **`outputs`** - Generated bundle analysis and composition

## 📁 Inputs Structure

### **Schema Definition**
```typescript
interface MetafileInputs {
  [filePath: string]: {
    bytes: number;                    // Source file size in bytes
    imports: Array<{                  // All imports from this file
      path: string;                   // Import path
      kind: "import-statement" | "dynamic-import" | "require-call" | "require-resolve";
      external?: boolean;             // True for node_modules/bun APIs
      original?: string;              // Original path if resolved
      with?: Record<string, string>;  // Import attributes (e.g., { type: "toml" })
      type?: "blob" | "file" | "arraybuffer"; // Binary file types (v1.3.6+)
    }>;
    moduleFormat?: "esm" | "cjs" | null;
    assets?: {                       // Binary assets (v1.3.6+)
      [assetPath: string]: {
        type: "blob" | "file" | "arraybuffer";
        bytes?: number;               // Asset size if known
        dynamic?: boolean;            // True for runtime-generated assets
      };
    };
  };
}
```

### **Real Example from Barbershop Dashboard**
```json
{
  "barbershop-dashboard.ts": {
    "bytes": 75361,
    "imports": [
      {
        "path": "bun",
        "kind": "import-statement",
        "external": true
      },
      {
        "path": "./manifest.toml",
        "kind": "import-statement",
        "with": {
          "type": "toml"
        }
      },
      {
        "path": "/Users/nolarose/Projects/barbershop/ui-v2.ts",
        "kind": "import-statement",
        "original": "./ui-v2"
      }
    ]
  }
}
```

### **Import Kinds Explained**
- **`import-statement`** - ES6 `import` statements
- **`dynamic-import`** - `import()` dynamic imports
- **`require-call`** - CommonJS `require()` calls
- **`require-resolve`** - `require.resolve()` calls

### **External vs Internal**
- **External**: `external: true` - Node.js modules, Bun APIs, node_modules
- **Internal**: No `external` flag - Project source files

## 📦 Outputs Structure

### **Schema Definition**
```typescript
interface MetafileOutputs {
  [outputPath: string]: {
    bytes: number;                    // Output bundle size in bytes
    inputs: {                        // Contributing source files
      [inputPath: string]: {
        bytesInOutput: number;        // Bytes from this input in output
      };
    };
    imports: Array<{                  // External imports in bundle
      path: string;
      kind: string;
      external: boolean;
    }>;
    exports: Array<{                  // Exported symbols
      name: string;
      kind: string;
    }>;
    entryPoint: string;               // Main entry point file
    cssBundle?: string;               // Associated CSS bundle path
    assets?: {                       // Binary assets (v1.3.6+)
      [assetName: string]: {
        type: "blob" | "file" | "arraybuffer";
        bytes?: number;               // Asset size
        path?: string;                // Asset file path
        dynamic?: boolean;            // Runtime-generated assets
      };
    };
  };
}
```

### **Real Example from Barbershop Dashboard**
```json
{
  "./barbershop-dashboard.js": {
    "bytes": 98926,
    "inputs": {
      "manifest.toml": {
        "bytesInOutput": 1377
      },
      "fetch-utils.ts": {
        "bytesInOutput": 1902
      },
      "ui-v2.ts": {
        "bytesInOutput": 17976
      },
      "factory-secrets.ts": {
        "bytesInOutput": 2911
      },
      "logger.ts": {
        "bytesInOutput": 3091
      },
      "barbershop-dashboard.ts": {
        "bytesInOutput": 71520
      }
    },
    "imports": [],
    "exports": [],
    "entryPoint": "barbershop-dashboard.ts"
  }
}
```

## 📊 Analysis Examples

### **Binary Asset Analysis (v1.3.6+)**
```bash
# Find binary file usage
jq '.inputs | to_entries | .[] | select(.value.assets) | {file: .key, assets: .value.assets}' meta.json

# Analyze dynamic assets
jq '.outputs | to_entries | .[] | select(.value.assets) | {bundle: .key, assets: .value.assets}' meta.json

# Calculate asset size impact
jq '.outputs | to_entries | .[] | select(.value.assets) | {
  bundle: .key, 
  bundleSize: .value.bytes,
  assetSize: (.value.assets | to_entries | map(.value.bytes) | add),
  assetCount: (.value.assets | length)
}' meta.json
```

### **1. Dependency Impact Analysis**
```bash
# Find largest dependencies
jq '.outputs | to_entries | .[] | {bundle: .key, size: .value.bytes, largestDep: (.value.inputs | to_entries | sort_by(-.value.bytesInOutput) | .[0])}' meta.json

# Calculate external dependency ratio
jq '.inputs | to_entries | map({file: .key, externalCount: (.value.imports | map(select(.external)) | length), totalImports: (.value.imports | length)})' meta.json
```

### **2. Bundle Efficiency Metrics**
```bash
# Code duplication analysis
jq '.outputs as $outputs | .inputs | to_entries | map({file: .key, bundledIn: ($outputs | to_entries | map(select(.value.inputs | has(.key))) | map(.key))})' meta.json

# Bundle size distribution
jq '.outputs | to_entries | map({bundle: .key, sizeKB: (.value.bytes / 1024 | round), sizePercent: (.value.bytes / (. | map(.value.bytes) | add) * 100)})' meta.json
```

### **3. Import Pattern Analysis**
```bash
# Import kind distribution
jq '.inputs | to_entries | .[] | .value.imports | group_by(.kind) | map({kind: .[0].kind, count: length})' meta.json

# External vs internal ratio
jq '{
  externalImports: (.inputs | to_entries | .[] | .value.imports | map(select(.external)) | length),
  totalImports: (.inputs | to_entries | .[] | .value.imports | length)
}' meta.json
```

## 🔍 Advanced Metafile Features

### **Binary File Support (v1.3.6+)**
Bun's metafile now tracks binary assets including:

- **`Blob`** - Binary large objects for file uploads
- **`File`** - File objects with metadata
- **`ArrayBuffer`** - Raw binary data buffers

#### **Real Example - Profile Picture Upload**
```typescript
// From barbershop-dashboard.ts
'/action': async (req) => {
  const formdata = await req.formData();
  const profilePicture = formdata.get('profilePicture');
  
  if (!(profilePicture instanceof Blob)) {
    throw new HttpError(400, 'MISSING_PROFILE_PICTURE');
  }
  
  await Bun.write(path, profilePicture);
}
```

#### **Metafile Impact**
```json
{
  "inputs": {
    "barbershop-dashboard.ts": {
      "bytes": 75361,
      "imports": [
        {
          "path": "./uploads/profile.png",
          "kind": "dynamic-import",
          "type": "blob"
        }
      ]
    }
  },
  "outputs": {
    "./barbershop-dashboard.js": {
      "bytes": 98926,
      "assets": {
        "profile-uploads": {
          "type": "blob",
          "count": "dynamic"
        }
      }
    }
  }
}
```

### **CSS Bundle Association**
```json
{
  "./app.js": {
    "cssBundle": "./app.css"
  }
}
```

### **With Clause Support**
```json
{
  "imports": [
    {
      "path": "./config.json",
      "kind": "import-statement",
      "with": {
        "type": "json"
      }
    }
  ]
}
```

### **Module Format Detection**
```json
{
  "inputs": {
    "script.cjs": {
      "moduleFormat": "cjs"
    },
    "module.mjs": {
      "moduleFormat": "esm"
    }
  }
}
```

## 📈 Performance Metrics

### **Barbershop Project Statistics**

#### **Inputs Summary:**
- **Total Files**: 8 source files
- **Total Source Size**: ~180KB
- **Import Types**: 75% import-statement, 25% external
- **Module Formats**: ESM (TypeScript)

#### **Outputs Summary:**
- **Total Bundles**: 3 output files
- **Total Bundle Size**: 151,693 bytes
- **Compression Ratio**: 84% (source → bundle)
- **Entry Points**: 3 independent applications

#### **Dependency Analysis:**
```json
{
  "largestInput": "barbershop-dashboard.ts (75KB)",
  "largestOutput": "./barbershop-dashboard.js (98KB)",
  "mostImported": "ui-v2.ts (used by dashboard)",
  "externalDeps": ["bun", "bun:sqlite", "node:fs", "node:dns/promises", "node:crypto"]
}
```

## 🛠️ Metafile Utilities

### **Size Analysis Script**
```typescript
import { readFileSync } from 'fs';

interface Metafile { inputs: any; outputs: any; }

function analyzeMetafile(metaPath: string) {
  const meta: Metafile = JSON.parse(readFileSync(metaPath, 'utf8'));
  
  const totalInputSize = Object.values(meta.inputs)
    .reduce((sum: number, input: any) => sum + input.bytes, 0);
    
  const totalOutputSize = Object.values(meta.outputs)
    .reduce((sum: number, output: any) => sum + output.bytes, 0);
    
  return {
    inputFiles: Object.keys(meta.inputs).length,
    outputBundles: Object.keys(meta.outputs).length,
    totalInputSize,
    totalOutputSize,
    compressionRatio: (totalOutputSize / totalInputSize * 100).toFixed(1)
  };
}
```

### **Dependency Graph Generator**
```typescript
function generateDependencyGraph(meta: Metafile) {
  const graph: Record<string, string[]> = {};
  
  Object.entries(meta.inputs).forEach(([file, input]) => {
    graph[file] = input.imports
      .filter(imp => !imp.external)
      .map(imp => imp.original || imp.path);
  });
    
  return graph;
}
```

## 🎯 Best Practices

### **1. Metafile Analysis**
- **Monitor bundle sizes** for performance impact
- **Track external dependencies** for security updates
- **Identify code duplication** across bundles
- **Optimize import patterns** for better tree-shaking

### **2. Build Optimization**
- **Enable minification** for production builds
- **Use source maps** for debugging
- **Leverage code splitting** for large applications
- **Monitor compression ratios** for efficiency

### **3. Dependency Management**
- **Prefer external imports** for large libraries
- **Use dynamic imports** for conditional loading
- **Minimize circular dependencies**
- **Track dependency versions** for updates

---

*Metafile structure reference for Bun v1.3.6+ based on real-world barbershop project analysis*
