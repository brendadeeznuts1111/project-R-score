# 🏗️ Bun Virtual Files Guide

## 📋 Overview

Bun's virtual file system allows you to provide file contents directly in the build configuration without creating files on disk. This is perfect for:
- Build-time code generation
- Environment-specific constants
- Version information injection
- Feature flag management
- Configuration files

## 🚀 Key Benefits

### **1. No Disk Pollution**
- Files exist only during build
- No cleanup required
- Keeps source directory clean

### **2. Build-Time Generation**
- Dynamic content creation
- UUID generation for build IDs
- Timestamp injection
- Environment-specific values

### **3. Type Safety**
- TypeScript support
- Import completion
- Compile-time checking

### **4. Performance**
- No file I/O overhead
- Direct memory access
- Faster build times

## 📁 Virtual File Structure

### **Build Configuration**
```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/generated.ts": `
      export const BUILD_ID = "${crypto.randomUUID()}";
      export const BUILD_TIME = ${Date.now()};
    `,
  },
  outdir: "./dist",
});
```

### **Generated Files**
The virtual files can be imported normally:
```typescript
import { BUILD_ID, BUILD_TIME } from './src/generated.ts';
```

## 🔧 Barbershop Implementation

### **Virtual Files Created**

#### **1. build-meta.ts**
```typescript
// Auto-generated build metadata
export const BUILD_ID = "70e93b28-2af5-4487-aea5-ecc3d9e22cbf";
export const BUILD_TIME = 1770344192533;
export const BUILD_TIMESTAMP = "2026-02-06T02:16:32.533Z";
export const BUILD_VERSION = "1.0.0";
export const BUN_VERSION = "1.3.9";

export const BUILD_CONFIG = {
  target: "bun",
  minify: false,
  sourcemap: "none",
  entrypoints: ["barbershop-dashboard.ts", "barber-server.ts", "barbershop-tickets.ts"],
  outputDir: "./dist"
} as const;
```

#### **2. version.ts**
```typescript
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: "70e93b28",
  full: "1.0.0-70e93b28",
  bun: "1.3.9",
  timestamp: "2026-02-06T02:16:32.533Z"
} as const;

export function getVersionString(): string {
  return VERSION.full;
}

export function getBuildInfo(): string {
  return `Built with Bun ${VERSION.bun} at ${VERSION.timestamp}`;
}
```

#### **3. constants.ts**
```typescript
export const APP_CONSTANTS = {
  BUILD_ID: "70e93b28-2af5-4487-aea5-ecc3d9e22cbf",
  BUILD_TIME: 1770344192533,
  
  APP_NAME: "Barbershop Demo",
  APP_VERSION: "1.0.0",
  APP_DESCRIPTION: "Enterprise-grade barbershop management system",
  
  FEATURES: {
    TELEMETRY: true,
    WEBSOCKETS: true,
    FILE_UPLOADS: true,
    BINARY_ASSETS: true,
    STRUCTURED_LOGGING: true
  },
  
  PERFORMANCE: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    REQUEST_TIMEOUT: 30000, // 30s
    KEEP_ALIVE_TIMEOUT: 5000, // 5s
    LOG_LEVEL: "info"
  }
} as const;
```

## 📊 Usage Examples

### **1. Build Info in API Responses**
```typescript
import { BUILD_ID, BUILD_TIME } from './src/build-meta.ts';

export function addBuildInfoToResponse(responseData: any) {
  return {
    ...responseData,
    buildMeta: {
      id: BUILD_ID,
      timestamp: BUILD_TIME,
      version: getVersionString()
    }
  };
}
```

### **2. Health Check Enhancement**
```typescript
import { BUILD_ID, BUILD_TIME, VERSION } from './src/build-meta.ts';

export function createHealthCheck() {
  const uptime = Date.now() - BUILD_TIME;
  
  return {
    status: 'healthy',
    uptime,
    uptimeHuman: `${Math.floor(uptime / 1000)}s`,
    build: {
      id: BUILD_ID,
      time: BUILD_TIME,
      version: VERSION.full,
      bun: VERSION.bun
    }
  };
}
```

### **3. Error Context**
```typescript
import { BUILD_ID, VERSION } from './src/build-meta.ts';

export function enhanceErrorWithBuildInfo(error: Error) {
  return {
    message: error.message,
    stack: error.stack,
    build: {
      id: BUILD_ID,
      version: VERSION.full,
      bun: VERSION.bun
    },
    timestamp: Date.now()
  };
}
```

### **4. Feature Flags**
```typescript
import { APP_CONSTANTS } from './src/constants.ts';

if (APP_CONSTANTS.FEATURES.TELEMETRY) {
  // Enable telemetry
}

if (APP_CONSTANTS.FEATURES.BINARY_ASSETS) {
  // Enable file uploads
}
```

## 🔄 Build Process

### **Command**
```bash
bun build-virtual.ts
```

### **Output**
```text
🏗️ Building with virtual files...
📋 Build ID: 70e93b28-2af5-4487-aea5-ecc3d9e22cbf
⏰ Build Time: 2026-02-06T02:16:32.533Z
✅ Build completed successfully!
📊 inputs=8 outputs=3 totalBytes=151693
📁 wrote /Users/nolarose/Projects/barbershop/dist/meta.json
📋 wrote /Users/nolarose/Projects/barbershop/dist/build-report.json
🔗 Virtual files included: 3
```

### **Generated Files**
- `dist/meta.json` - Build metadata
- `dist/build-report.json` - Build summary
- `dist/barbershop-dashboard.js` - Dashboard bundle
- `dist/barber-server.js` - Server bundle
- `dist/barbershop-tickets.js` - Tickets bundle

## 📈 Build Report

```json
{
  "buildId": "70e93b28-2af5-4487-aea5-ecc3d9e22cbf",
  "buildTime": 1770344192533,
  "buildTimestamp": "2026-02-06T02:16:32.533Z",
  "bunVersion": "1.3.9",
  "inputs": 8,
  "outputs": 3,
  "totalBytes": 151693,
  "entrypoints": [
    "barbershop-dashboard.ts",
    "barber-server.ts",
    "barbershop-tickets.ts"
  ],
  "virtualFiles": [
    "./src/build-meta.ts",
    "./src/version.ts",
    "./src/constants.ts"
  ],
  "success": true
}
```

## 🎯 Advanced Use Cases

### **1. Environment-Specific Configuration**
```typescript
const isProduction = process.env.NODE_ENV === 'production';

files: {
  "./src/config.ts": `
    export const CONFIG = {
      API_URL: "${isProduction ? 'https://api.barbershop.com' : 'http://localhost:3000'}",
      DEBUG: ${!isProduction},
      LOG_LEVEL: "${isProduction ? 'warn' : 'debug'}"
    };
  `
}
```

### **2. Feature Flag Management**
```typescript
const features = {
  NEW_UI: process.env.ENABLE_NEW_UI === 'true',
  BETA_FEATURES: process.env.BETA === 'true'
};

files: {
  "./src/features.ts": `
    export const FEATURES = ${JSON.stringify(features)};
  `
}
```

### **3. Asset Injection**
```typescript
const manifest = {
  icons: ['/icon-192.png', '/icon-512.png'],
  theme: '#3b82f6'
};

files: {
  "./src/manifest.ts": `
    export const MANIFEST = ${JSON.stringify(manifest)};
  `
}
```

### **4. Database Configuration**
```typescript
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production'
};

files: {
  "./src/database.ts": `
    export const DB_CONFIG = ${JSON.stringify(dbConfig)};
  `
}
```

## 🔍 Debugging Virtual Files

### **1. Check Metafile**
```bash
cat dist/meta.json | jq '.inputs | keys'
```

### **2. Verify Virtual Files**
```bash
cat dist/build-report.json | jq '.virtualFiles'
```

### **3. Build Output Analysis**
```bash
bun build-virtual.ts --verbose
```

## 🛠️ Best Practices

### **1. File Naming**
- Use descriptive names: `build-meta.ts`, `version.ts`, `config.ts`
- Keep virtual files in `./src/` directory structure
- Follow TypeScript naming conventions

### **2. Content Generation**
- Use template literals for dynamic content
- Generate unique IDs with `crypto.randomUUID()`
- Include timestamps for build tracking

### **3. Type Safety**
- Export proper TypeScript types
- Use `as const` for immutable objects
- Provide utility functions for common operations

### **4. Performance**
- Keep virtual files small and focused
- Avoid complex computations in virtual files
- Use virtual files for constants, not complex logic

### **5. Maintainability**
- Document virtual file purposes
- Group related constants together
- Use consistent formatting and structure

## 🚀 Integration with Existing Builds

### **Replace Static Files**
```typescript
// Before: static version.ts
// After: virtual version.ts with dynamic content
```

### **Enhance Metafile Tracking**
```typescript
// Virtual files appear in build metafile
// Track their usage and impact
```

### **Combine with Other Features**
```typescript
// Virtual files + metafile analysis
// Virtual files + binary assets
// Virtual files + Response.json() optimization
```

## 📋 Comparison: Virtual vs Traditional

| Aspect | Virtual Files | Traditional Files |
|--------|---------------|-------------------|
| **Disk Usage** | None | Required |
| **Cleanup** | Automatic | Manual |
| **Build Speed** | Faster | Slower |
| **Dynamic Content** | Excellent | Limited |
| **Type Safety** | Full | Full |
| **Debugging** | Harder | Easier |
| **Version Control** | Not needed | Required |

## 🎉 Conclusion

Bun's virtual file system provides a powerful way to generate build-time content without polluting the source directory. The barbershop demo demonstrates:

- **Build metadata generation** with unique IDs and timestamps
- **Version management** with dynamic version strings
- **Feature flag configuration** for conditional functionality
- **Performance constants** for runtime optimization
- **Integration patterns** for seamless usage

This approach keeps the codebase clean while providing rich build-time information that enhances debugging, monitoring, and deployment capabilities.

---

*Virtual files are a Bun v1.3.6+ feature that revolutionizes build-time code generation.*
