## **CATALOGS IMPLEMENTATION: Odds Protocol Monorepo**

**Perfect!** Catalogs are exactly what we need for dependency consistency across our odds protocol monorepo. Here's the implementation:

## **Root package.json with Catalogs**

```json
{
  "name": "odds-protocol-monorepo",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "workspaces": {
    "packages": [
      "packages/*",
      "property-tests/*", 
      "apps/*"
    ],
    "catalog": {
      // Runtime dependencies
      "typescript": "^5.4.5",
      "@types/bun": "latest",
      "fast-check": "^3.13.0",
      "@js-temporal/polyfill": "^0.4.4"
    },
    "catalogs": {
      "websocket": {
        "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.40.0",
        "ws": "^8.14.2"
      },
      "ml": {
        "tensorflow": "^4.20.0",
        "@tensorflow/tfjs-node": "^4.20.0",
        "onnxruntime-node": "^1.17.0"
      },
      "data": {
        "apache-arrow": "^15.0.0",
        "parquet-wasm": "^0.8.0",
        "snappy": "^7.2.2"
      },
      "testing": {
        "vitest": "^1.3.1",
        "@vitest/coverage-v8": "^1.3.1",
        "happy-dom": "^12.10.2"
      },
      "cloudflare": {
        "wrangler": "^3.21.0",
        "@cloudflare/workers-types": "^4.20240529.0"
      },
      "crypto": {
        "crypto-js": "^4.2.0",
        "node-forge": "^1.3.1"
      }
    }
  },
  "scripts": {
    "build": "bun run --filter=* build",
    "test": "bun run --filter=* test",
    "test:property": "bun run --filter=property-tests test",
    "test:ci": "bun run --filter=* test --coverage --reporter junit",
    "dev": "bun run --filter=* dev",
    "clean": "bun run --filter=* clean",
    "deploy:workers": "bun run --filter=api-gateway deploy"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

## **Package-Specific Configurations**

### **packages/odds-core/package.json**
```json
{
  "name": "odds-core",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "apache-arrow": "catalog:data",
    "parquet-wasm": "catalog:data",
    "crypto-js": "catalog:crypto"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "tsc --watch"
  }
}
```

### **packages/odds-websocket/package.json**
```json
{
  "name": "odds-websocket", 
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "uWebSockets.js": "catalog:websocket",
    "ws": "catalog:websocket",
    "odds-core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  }
}
```

### **packages/odds-arbitrage/package.json**
```json
{
  "name": "odds-arbitrage",
  "version": "1.0.0", 
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "odds-core": "workspace:*",
    "odds-validation": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  }
}
```

### **packages/odds-ml/package.json**
```json
{
  "name": "odds-ml",
  "version": "1.0.0",
  "type": "module", 
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "tensorflow": "catalog:ml",
    "@tensorflow/tfjs-node": "catalog:ml",
    "onnxruntime-node": "catalog:ml",
    "odds-core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing", 
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "train": "bun run src/train.ts",
    "dev": "tsc --watch"
  }
}
```

### **packages/odds-temporal/package.json**
```json
{
  "name": "odds-temporal",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:", 
    "@js-temporal/polyfill": "catalog:",
    "odds-core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  }
}
```

### **packages/odds-validation/package.json**
```json
{
  "name": "odds-validation",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "zod": "^3.22.4",
    "odds-core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc", 
    "test": "vitest run",
    "dev": "tsc --watch"
  }
}
```

## **Property Tests Workspace**

### **property-tests/package.json**
```json
{
  "name": "property-tests",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "fast-check": "catalog:",
    "@js-temporal/polyfill": "catalog:",
    "odds-core": "workspace:*",
    "odds-arbitrage": "workspace:*", 
    "odds-websocket": "workspace:*",
    "odds-ml": "workspace:*",
    "odds-temporal": "workspace:*",
    "odds-validation": "workspace:*"
  },
  "scripts": {
    "test": "bun test --pattern '\\.property\\.test\\.ts$'",
    "test:all": "bun test --pattern '\\.property\\.test\\.ts$' --coverage",
    "test:ci": "bun test --pattern '\\.property\\.test\\.ts$' --coverage --reporter junit",
    "test:arbitrage": "bun test arbitrage/ --pattern '\\.property\\.test\\.ts$'",
    "test:websocket": "bun test websocket/ --pattern '\\.property\\.test\\.ts$'", 
    "test:sharp-detection": "bun test sharp-detection/ --pattern '\\.property\\.test\\.ts$'",
    "test:temporal": "bun test temporal/ --pattern '\\.property\\.test\\.ts$'",
    "test:tick-validation": "bun test tick-validation/ --pattern '\\.property\\.test\\.ts$'",
    "test:stress": "bun test --pattern '\\.property\\.test\\.ts$' --timeout 120000",
    "test:debug": "bun test --pattern '\\.property\\.test\\.ts$' --verbose --seed 0xDEADBEEF",
    "test:watch": "bun test --pattern '\\.property\\.test\\.ts$' --watch",
    "test:coverage": "bun test --pattern '\\.property\\.test\\.ts$' --coverage --coverage-reporter=html"
  }
}
```

## **Apps Workspace Configurations**

### **apps/dashboard/package.json**
```json
{
  "name": "odds-dashboard",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "odds-core": "workspace:*",
    "odds-websocket": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vitest": "catalog:testing",
    "happy-dom": "catalog:testing"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

### **apps/api-gateway/package.json**
```json
{
  "name": "api-gateway",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "odds-core": "workspace:*",
    "odds-websocket": "workspace:*",
    "odds-arbitrage": "workspace:*"
  },
  "devDependencies": {
    "wrangler": "catalog:cloudflare",
    "@cloudflare/workers-types": "catalog:cloudflare",
    "vitest": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  }
}
```

### **apps/stream-processor/package.json**
```json
{
  "name": "stream-processor", 
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "typescript": "catalog:",
    "@types/bun": "catalog:",
    "uWebSockets.js": "catalog:websocket",
    "odds-core": "workspace:*",
    "odds-ml": "workspace:*",
    "odds-temporal": "workspace:*"
  },
  "devDependencies": {
    "vitest": "catalog:testing",
    "@vitest/coverage-v8": "catalog:testing"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch",
    "start": "bun run dist/index.js"
  }
}
```

## **Shared TypeScript Configuration**

### **tsconfig.json (Root)**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "odds-core": ["./packages/odds-core/src"],
      "odds-websocket": ["./packages/odds-websocket/src"],
      "odds-arbitrage": ["./packages/odds-arbitrage/src"],
      "odds-ml": ["./packages/odds-ml/src"],
      "odds-temporal": ["./packages/odds-temporal/src"],
      "odds-validation": ["./packages/odds-validation/src"]
    }
  }
}
```

## **Catalog Management Commands**

```bash
# Install all dependencies with catalog resolution
bun install

# Update a catalog version (affects all packages)
# Edit root package.json catalog section, then:
bun install

# Check for catalog inconsistencies
bun install --verify

# Add new package with catalog references
cd packages/new-package
bun add react@catalog: zod@catalog:

# Update specific catalog group
# Edit catalogs.ml in root package.json, then:
bun install

# Check what versions are resolved from catalogs
bun pm ls
```

## **Catalog Version Update Workflow**

```bash
# 1. Update version in root package.json catalogs
# "fast-check": "^3.14.0"  # Updated from ^3.13.0

# 2. Install to update all packages
bun install

# 3. Verify updates
bun run --filter=property-tests pm ls | grep fast-check

# 4. Test everything still works
bun run test:property:all
bun run test:ci
```

## **Benefits for Odds Protocol**

### **✅ Consistency Guarantees**
- **ML models** use identical TensorFlow versions across training/inference
- **WebSocket protocol** shares same uWebSockets.js version everywhere
- **Property tests** use consistent fast-check version for reproducible tests

### **✅ Security & Maintenance**
- **Single update point** for security patches
- **Atomic dependency upgrades** across entire protocol stack
- **Version compatibility** enforced by catalogs

### **✅ Development Experience**
```bash
# New developer setup
git clone repo
bun install  # One command installs everything correctly

# Adding new package
cd packages/new-analytics
bun add tensorflow@catalog:ml  # Automatically gets correct version

# CI reproducibility
bun install --frozen-lockfile  # Exact versions from catalogs
```

### **✅ Deployment Confidence**
```bash
# Pre-deployment validation
bun install --verify  # Ensure catalog consistency
bun run test:ci       # All tests with catalog-resolved versions
bun run build         # Build with consistent dependencies
```

## **Advanced Catalog Patterns**

### **Environment-Specific Catalogs**
```json
{
  "catalogs": {
    "production": {
      "tensorflow": "^4.20.0",
      "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.40.0"
    },
    "development": {
      "tensorflow": "^4.20.0",
      "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.40.0"
    }
  }
}
```

### **Platform-Specific Catalogs**
```json
{
  "catalogs": {
    "node": {
      "@tensorflow/tfjs-node": "^4.20.0"
    },
    "bun": {
      "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.40.0"
    }
  }
}
```

**Catalogs Implementation Complete:** Your odds protocol monorepo now has enterprise-grade dependency management with single-source version control, ensuring consistency across 700k msg/sec WebSocket backbones, ML sharp detection, and property testing infrastructure. 🚀