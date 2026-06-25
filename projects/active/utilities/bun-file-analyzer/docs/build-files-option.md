# Bun.build files Option - Complete Guide

## Overview

The `files` option in `Bun.build` allows you to bundle virtual files that don't exist on disk, or override the contents of existing files. This is incredibly useful for code generation, environment-specific builds, testing, and more.

## Basic Syntax

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "virtual-file.ts": "export const value = 'virtual';",
    "./override.ts": "export const config = 'overridden';",
  },
  outdir: "./dist",
});
```

## Key Features

### 1. Virtual Files
Create files that exist only in memory during build:

```typescript
await Bun.build({
  entrypoints: ["/app/index.ts"],
  files: {
    "/app/index.ts": `
      import { greet } from "./greet.ts";
      console.log(greet("World"));
    `,
    "/app/greet.ts": `
      export function greet(name: string) {
        return "Hello, " + name + "!";
      }
    `,
  },
});
```

### 2. File Overrides
Override existing files with virtual content:

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/config.ts": `
      export const API_URL = "https://api.production.com";
      export const DEBUG = false;
    `,
  },
});
```

### 3. Code Generation
Inject build-time constants and generated code:

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/generated.ts": `
      export const BUILD_ID = "${crypto.randomUUID()}";
      export const BUILD_TIME = ${Date.now()};
    `,
  },
});
```

## Content Types

The `files` option accepts multiple content types:

### String Content
```typescript
files: {
  "config.ts": "export const value = 'string';",
}
```

### Blob Content
```typescript
files: {
  "blob.ts": new Blob(["export const value = 'blob';"], { type: "application/typescript" }),
}
```

### TypedArray Content
```typescript
files: {
  "array.ts": new TextEncoder().encode("export const value = 'array';"),
}
```

### ArrayBuffer Content
```typescript
files: {
  "buffer.ts": new TextEncoder().encode("export const value = 'buffer';").buffer,
}
```

## Practical Examples

### 1. Environment-Specific Builds

```typescript
const environments = ["development", "staging", "production"];

for (const env of environments) {
  await Bun.build({
    entrypoints: ["./src/index.ts"],
    files: {
      "./src/environment.ts": `
        export const ENVIRONMENT = "${env}";
        export const API_URL = "${getConfig(env).API_URL}";
        export const DEBUG = ${env !== "production"};
      `,
    },
    outdir: `./dist/${env}`,
  });
}
```

### 2. Mock Data for Testing

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/mocks/api.ts": `
      export const mockApi = {
        async getData() {
          return { success: true, data: [1, 2, 3] };
        }
      };
    `,
    "./src/test-config.ts": `
      export const TEST_MODE = true;
      export const MOCK_APIS = true;
    `,
  },
});
```

### 3. Feature Flag Generation

```typescript
const features = ["new-ui", "analytics", "beta-feature"];

await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/features.ts": `
      export const FEATURES = {
        ${features.map(f => `${f}: true`).join(",\n        ")}
      };
      
      export const ENABLED_FEATURES = Object.entries(FEATURES)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name);
    `,
  },
});
```

### 4. Type Generation

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/types/generated.ts": `
      export interface ApiResponse<T = any> {
        success: boolean;
        data?: T;
        error?: string;
        timestamp: number;
      }
      
      export interface Config {
        api: string;
        debug: boolean;
        version: string;
      }
    `,
  },
});
```

### 5. Internationalization

```typescript
const locales = ["en", "es", "fr"];

for (const locale of locales) {
  await Bun.build({
    entrypoints: ["./src/index.ts"],
    files: {
      "./src/i18n/index.ts": `
        export const locale = "${locale}";
        export const messages = ${JSON.stringify(getMessages(locale))};
      `,
    },
    outdir: `./dist/${locale}`,
  });
}
```

## Advanced Patterns

### 1. Conditional File Generation

```typescript
const isProduction = process.env.NODE_ENV === "production";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/config.ts": isProduction ? `
      export const API_URL = "https://api.prod.com";
      export const SENTRY_DSN = "https://sentry.prod.com/123";
    ` : `
      export const API_URL = "http://localhost:3000";
      export const SENTRY_DSN = null;
    `,
    
    ...(isProduction ? {
      "./src/analytics.ts": `
        export const ANALYTICS_ENABLED = true;
        export const TRACKING_ID = "GA-PROD-123";
      `,
    } : {}),
  },
});
```

### 2. Dynamic Import Generation

```typescript
const components = ["Header", "Footer", "Sidebar"];

await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/components/index.ts": `
      ${components.map(comp => `
        export { default as ${comp} } from './${comp}.tsx';
      `).join("")}
      
      export const components = {
        ${components.map(comp => `${comp}: () => import('./${comp}.tsx')`).join(",\n        ")}
      };
    `,
  },
});
```

### 3. Plugin System Simulation

```typescript
const plugins = ["analytics", "auth", "cache"];

await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: {
    "./src/plugins/index.ts": `
      ${plugins.map(plugin => `
        import * as ${plugin} from './${plugin}';
      `).join("")}
      
      export const plugins = {
        ${plugins.map(plugin => `${plugin}`).join(",\n        ")}
      };
      
      export const initializePlugins = () => {
        ${plugins.map(plugin => `${plugin}.initialize?.();`).join("\n        ")}
      };
    `,
  },
});
```

## Real-World Use Cases

### 1. Build-Time Configuration
- Environment-specific API endpoints
- Feature flags
- Debug/production modes
- Analytics and tracking IDs

### 2. Code Generation
- GraphQL query types
- API client generation
- Schema types
- Mock data

### 3. Testing
- Mock implementations
- Test fixtures
- Spy/stub functions
- Test utilities

### 4. Internationalization
- Locale-specific messages
- Date/time formats
- Currency formats
- RTL/LTR configurations

### 5. Performance Optimization
- Tree-shaking unused code
- Bundle splitting
- Critical CSS injection
- Service worker generation

## Best Practices

### 1. Organization
```typescript
// Good: Organize virtual files in logical structure
files: {
  "./src/config/environment.ts": envConfig,
  "./src/generated/types.ts": generatedTypes,
  "./src/mocks/api.ts": mockApi,
}
```

### 2. Type Safety
```typescript
// Generate TypeScript types alongside implementations
files: {
  "./src/generated/config.ts": configImplementation,
  "./src/generated/config.types.ts": configTypes,
}
```

### 3. Build Caching
```typescript
// Use build IDs for cache busting
files: {
  "./src/build-info.ts": `
    export const BUILD_ID = "${crypto.randomUUID()}";
    export const BUILD_TIME = ${Date.now()};
  `,
}
```

### 4. Error Handling
```typescript
try {
  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    files: virtualFiles,
  });
  
  console.log(`✅ Build completed: ${result.outputs.length} files`);
} catch (error) {
  console.error("❌ Build failed:", error);
}
```

## Performance Considerations

- **Memory Usage**: Virtual files exist only during build
- **Build Speed**: No disk I/O for virtual files
- **Bundle Size**: Only includes what's actually used
- **Cache Efficiency**: Build-time constants are inlined

## Limitations

1. **Runtime Access**: Virtual files only exist during build
2. **File System**: Can't access virtual files at runtime
3. **Watch Mode**: Changes to virtual files require rebuild
4. **Source Maps**: Generated for virtual content when enabled

## Integration with Other Features

### With React Fast Refresh
```typescript
await Bun.build({
  entrypoints: ["./src/index.tsx"],
  reactFastRefresh: true,
  files: {
    "./src/generated/components.tsx": generatedComponents,
  },
});
```

### With Minification
```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  minify: true,
  files: {
    "./src/config.ts": productionConfig,
  },
});
```

### With External Dependencies
```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  external: ["react", "react-dom"],
  files: {
    "./src/app.ts": appImplementation,
  },
});
```

## Conclusion

The `files` option in `Bun.build` provides powerful capabilities for:

- ✅ **Zero-config code generation**
- ✅ **Environment-specific builds**
- ✅ **Testing and mocking**
- ✅ **Performance optimization**
- ✅ **Type safety and validation**

This feature makes Bun an excellent choice for complex build scenarios where you need fine-grained control over the build process without sacrificing performance or developer experience.
