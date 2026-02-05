# Bookmark Manager ↔ Package Registry Integration

## Overview

The **BookmarkIntegrationRegistry** is a centralized system that manages all integrations and cross-references for the bookmark manager.

## What is the Registry?

The `BookmarkIntegrationRegistry` is a **centralized integration hub** that:

1. **Tracks Integrations**: Manages all external system integrations
2. **Cross-References**: Links bookmarks with external data sources
3. **Unified API**: Provides a single interface for all integrations

## Current Integrations

### 1. Scanner Integration (`scanner`)
- **Purpose**: Security scanning of bookmark URLs
- **Class**: `BookmarkSecurityIntegration`
- **Features**:
  - Scan bookmark URLs for security issues
  - Correlate visits with security risks
  - Generate security reports

### 2. Package Registry Integration (`registry`)
- **Purpose**: Cross-reference bookmarks with npm/GitHub packages
- **Class**: `BookmarkRegistryIntegration`
- **Features**:
  - Detect if bookmark points to npm package
  - Fetch package metadata from registries
  - Organize bookmarks by registry type

## Usage

### Basic Setup

```typescript
import { setupBookmarkIntegrations } from "./bookmark-integrations.ts";
import { ChromeSpecBookmarkManager } from "./chrome-bookmark-manager.ts";
import { EnterpriseScanner } from "./enterprise-scanner.ts";

const bookmarkManager = new ChromeSpecBookmarkManager();
const scanner = new EnterpriseScanner({ mode: "audit" });
await scanner.initialize();

// Setup with all integrations
const registry = await setupBookmarkIntegrations(bookmarkManager, {
  scanner: scanner,
  registry: true  // Enable package registry integration
});
```

### Get Cross-References

```typescript
// Get all cross-references for a bookmark
const crossRefs = await registry.getCrossReferences(bookmarkId);

console.log(crossRefs);
// {
//   bookmark: {...},
//   scanner: { issues: 3, riskLevel: "high", traceId: "..." },
//   registry: { 
//     packageName: "express",
//     registry: "npm",
//     version: "4.18.0",
//     description: "Fast, unopinionated web framework"
//   },
//   visits: 42,
//   lastVisit: Date,
//   folderPath: ["Work", "Tools"],
//   tags: ["development", "security"]
// }
```

### Package Registry Integration

```typescript
import { BookmarkRegistryIntegration } from "./bookmark-registry-integration.ts";

const registryIntegration = new BookmarkRegistryIntegration(bookmarkManager);

// Detect if bookmark is a package URL
const correlation = await registryIntegration.detectPackageFromBookmark(bookmark);
if (correlation.isPackageUrl) {
  console.log(`Package: ${correlation.packageName} from ${correlation.registry}`);
  console.log(`Info:`, correlation.packageInfo);
}

// Find all package bookmarks
const packageBookmarks = await registryIntegration.findPackageBookmarks();
console.log(`Found ${packageBookmarks.length} package bookmarks`);

// Organize by registry
const byRegistry = await registryIntegration.getBookmarksByRegistry();
console.log(`NPM: ${byRegistry.npm.length}`);
console.log(`GitHub: ${byRegistry.github.length}`);
console.log(`Other: ${byRegistry.other.length}`);
```

## Supported Registries

### 1. NPM Registry (`npm`)
- **URL Pattern**: `https://www.npmjs.com/package/package-name`
- **Scoped**: `https://www.npmjs.com/package/@scope/package-name`
- **API**: `https://registry.npmjs.org/package-name`

### 2. GitHub Packages (`github`)
- **URL Pattern**: `https://github.com/owner/repo`
- **Detection**: Extracts owner/repo from URL

### 3. Custom Registries (`custom`)
- **Extensible**: Can detect custom package registries
- **Future**: Support for private registries, Artifactory, etc.

## Cross-Reference Data Structure

```typescript
interface CrossReference {
  bookmark: Bookmark;
  scanner?: {
    issues: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    traceId?: string;
  };
  registry?: {
    packageName: string;
    registry: "npm" | "github" | "custom";
    version?: string;
    description?: string;
  };
  visits: number;
  lastVisit?: Date;
  folderPath: string[];
  tags: string[];
}
```

## Integration Methods

### Register Integrations

```typescript
// Register scanner
const scannerIntegration = registry.registerScanner(scanner);

// Register registry
const registryIntegration = registry.registerRegistry();
```

### Get All Integrations

```typescript
const integrations = registry.getIntegrations();
// ["scanner", "registry"]
```

### Get Cross-References

```typescript
const crossRefs = await registry.getCrossReferences(bookmarkId);
// Returns unified cross-reference data from all integrations
```

## Use Cases

### 1. Security Audit with Package Context
```typescript
const crossRefs = await registry.getCrossReferences(bookmarkId);
if (crossRefs.scanner?.riskLevel === "high" && crossRefs.registry) {
  console.log(`⚠️  High-risk package: ${crossRefs.registry.packageName}`);
  console.log(`   Version: ${crossRefs.registry.version}`);
  console.log(`   Issues: ${crossRefs.scanner.issues}`);
}
```

### 2. Package Discovery
```typescript
const registryIntegration = registry.registerRegistry();
const packageBookmarks = await registryIntegration.findPackageBookmarks();
const npmPackages = packageBookmarks.filter(c => c.registry === "npm");
console.log(`Found ${npmPackages.length} npm package bookmarks`);
```

### 3. Registry Organization
```typescript
const byRegistry = await registryIntegration.getBookmarksByRegistry();
// Organize bookmarks by registry type for better management
```

## Benefits

1. **Unified Interface**: Single API for all integrations
2. **Extensible**: Easy to add new integrations
3. **Cached**: Registry data is cached for performance
4. **Type-Safe**: Full TypeScript support
5. **Cross-Reference**: Links multiple data sources together

## Future Integrations

Potential future integrations:
- **DNS Prefetch**: Prefetch DNS for bookmark domains
- **Analytics**: Correlate with usage analytics
- **CI/CD**: Integration with CI/CD systems
- **Compliance**: Track compliance-related bookmarks
