---
title: Source File Header Implementation Guide
type:
  - documentation
  - implementation-guide
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: documentation
description: Implementation guide for Atomic Source File Header Standard
acceptEncoding: ""
acceptLanguage: ""
author: bun-platform
browser: ""
cacheControl: ""
canvas: []
component_id: DATA/STORAGE/SUB_A/SERVICE_v1.0.0", [#META:SECTION=intro,OWNER_TEAM=bun-platform,AUDIENCE=operators]
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
feed_integration: false
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags:
  - source-headers
  - implementation
  - bun-platform
  - code-governance
usage: Reference for implementing header generation and validation in bun-platform tooling
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 🔧 Source File Header Implementation Guide

> **Atomic Code Governance**  
> *Self-Describing • Validated • Traceable*

---

## 📋 Overview

This guide provides detailed implementation instructions for the Atomic Source File Header Standard, including header generation, validation, and CI/CD integration.

---

## 🎯 Implementation Phases

### Phase 1: Header Generation Utility

**File**: `packages/bun-platform/src/utils/source-header-generator.ts`

**Purpose**: Generate standardized source file headers from component metadata.

**Interface**:
```typescript
interface HeaderOptions {
  componentId: string;           // Full component ID from architecture.json
  ref: string;                    // REF GUID
  ch: string;                     // Channel color tag
  meta: Record<string, string>;  // Meta tags
  description: string;            // File description
  owner?: string;                 // Owner team (from META:OWNER or default)
  status?: string;                // Status (from META:STATUS or 'ACTIVE')
  apiVersion?: string;            // Optional API version
  dependencies?: string[];        // Optional dependency REFs
}

function generateSourceHeader(options: HeaderOptions): string {
  // Implementation
}
```

**Implementation Steps**:
1. Parse `componentId` to extract domain, path, component name, type, version
2. Format full ID string with REF, CH, and META tags
3. Extract `OWNER` from `meta.OWNER` or default to `PLATFORM_TEAM`
4. Extract `STATUS` from `meta.STATUS` or default to `ACTIVE`
5. Generate ISO date for `CREATED` (current date)
6. Generate ISO date for `LAST_MODIFIED` (current date)
7. Format header with all fields
8. Return complete header string

---

### Phase 2: Update `scaffold-service` Command

**File**: `packages/bun-platform/src/commands/scaffold-service.ts`

**Changes Required**:

1. **Import header generator**:
   ```typescript
   import { generateSourceHeader } from '../utils/source-header-generator';
   ```

2. **Modify `generateServiceMain` function**:
   ```typescript
   function generateServiceMain(serviceId: string, config: ServiceConfig): string {
     const parsed = parseComponentId(serviceId);
     
     // Query architecture.json for component details
     const archEntry = await getArchitectureEntry(serviceId);
     
     // Generate header
     const header = generateSourceHeader({
       componentId: serviceId,
       ref: archEntry.ref,
       ch: archEntry.ch,
       meta: parseMetaTags(archEntry.meta),
       description: `Service implementation for ${parsed.name}`,
       owner: extractOwner(archEntry.meta),
       status: extractStatus(archEntry.meta),
     });
     
     // Prepend header to service code
     return `${header}\n\n${generateServiceCode(parsed, config)}`;
   }
   ```

3. **Add helper functions**:
   - `getArchitectureEntry(componentId)`: Load and query `architecture.json`
   - `parseMetaTags(metaString)`: Parse `META:KEY=VALUE` format
   - `extractOwner(meta)`: Extract `OWNER` from meta tags
   - `extractStatus(meta)`: Extract `STATUS` from meta tags

---

### Phase 3: Header Validation Command

**File**: `packages/bun-platform/src/commands/validate-headers.ts`

**Purpose**: Validate source file headers across entire codebase.

**Interface**:
```typescript
interface ValidateHeadersOptions {
  codebasePath?: string;      // Root of codebase (default: process.cwd())
  architecturePath?: string;  // Path to architecture.json
  strict?: boolean;          // Fail on warnings (default: false)
  extensions?: string[];     // File extensions to check (default: ['.ts', '.tsx', '.js'])
}

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateHeaders(options: ValidateHeadersOptions): Promise<ValidationResult[]>
```

**Validation Logic**:

1. **Scan Files**:
   - Recursively scan codebase for files matching extensions
   - Exclude `node_modules`, `dist`, `build`, `.git` directories
   - Exclude generated files (`*.d.ts`, build outputs)

2. **Presence Check**:
   - Verify `@KIMI2-ARCH-COMPONENT-START` marker exists
   - Verify `@KIMI2-ARCH-COMPONENT-END` marker exists
   - Error if markers missing

3. **Header Parsing**:
   - Extract header content between markers
   - Parse each field (`ID`, `DESCRIPTION`, `OWNER`, etc.)
   - Error if required fields missing

4. **ID Validation**:
   - Extract component ID from `ID:` field
   - Parse REF, CH, META tags from ID string
   - Query `architecture.json` for component entry
   - Error if component not found in `architecture.json`
   - Warning if REF doesn't match `architecture.json` `ref` field
   - Warning if version doesn't match (optional check)

5. **Metadata Consistency**:
   - Compare `OWNER` against `#META:OWNER` in `architecture.json`
   - Compare `STATUS` against `#META:STATUS` in `architecture.json`
   - Warning if mismatches found

6. **Timestamp Check**:
   - Get file's actual `lastModified` timestamp
   - Compare against `LAST_MODIFIED` in header
   - Warning if header timestamp is significantly older (> 1 day difference)

7. **Format Validation**:
   - Validate ISO date format for `CREATED` and `LAST_MODIFIED`
   - Validate `STATUS` is one of allowed values
   - Error if format invalid

**CLI Integration**:
```typescript
program
  .command('validate-headers')
  .description('Validate source file headers across codebase')
  .option('--codebase-path <path>', 'Root path of codebase', process.cwd())
  .option('--architecture <path>', 'Path to architecture.json', 'architecture.json')
  .option('--strict', 'Fail on warnings', false)
  .action(async (options) => {
    const results = await validateHeaders(options);
    // Report results
    // Exit with error code if failures found
  });
```

---

### Phase 4: CI/CD Integration

**File**: `packages/bun-platform/src/commands/build.ts` (or create new)

**Changes Required**:

1. **Pre-Build Validation**:
   ```typescript
   async function build(options: BuildOptions): Promise<void> {
     // Run header validation before build
     console.log('🔍 Validating source file headers...');
     const headerResults = await validateHeaders({
       codebasePath: options.codebasePath,
       architecturePath: options.architecturePath,
     });
     
     const errors = headerResults.filter(r => !r.valid);
     if (errors.length > 0) {
       console.error('❌ Header validation failed:');
       errors.forEach(err => {
         console.error(`   ${err.file}:`);
         err.errors.forEach(e => console.error(`     - ${e}`));
       });
       process.exit(1);
     }
     
     // Continue with build...
   }
   ```

2. **GitHub Actions Integration**:
   ```yaml
   # .github/workflows/validate-headers.yml
   name: Validate Source Headers
   
   on: [push, pull_request]
   
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: oven-sh/setup-bun@v1
         - run: bun install
         - run: bun run packages/bun-platform/src/index.ts validate-headers --strict
   ```

---

### Phase 5: Header Update Utility

**File**: `packages/bun-platform/src/commands/add-header.ts`

**Purpose**: Add header to existing source file (migration tool).

**Interface**:
```typescript
interface AddHeaderOptions {
  file: string;              // Path to source file
  componentId: string;       // Component ID (required if not in architecture.json)
  description: string;       // File description
  force?: boolean;           // Overwrite existing header
}

async function addHeader(options: AddHeaderOptions): Promise<void>
```

**Process**:
1. Check if file already has header (if not `--force`)
2. Query `architecture.json` for component details
3. Generate header using `generateSourceHeader`
4. Prepend header to file (or replace existing header if `--force`)

**CLI Integration**:
```typescript
program
  .command('add-header')
  .description('Add source file header to existing file')
  .requiredOption('--file <path>', 'Path to source file')
  .option('--component-id <id>', 'Component ID (if not in architecture.json)')
  .requiredOption('--description <desc>', 'File description')
  .option('--force', 'Overwrite existing header', false)
  .action(async (options) => {
    await addHeader(options);
  });
```

---

## 📊 Example Implementation

### Example Header Generation

**Input**:
```typescript
{
  componentId: "DATA/STORAGE/SUB_A/SERVICE_v1.0.0", [#META:SECTION=intro,OWNER_TEAM=bun-platform,AUDIENCE=operators]
  ref: "SUB_A_SVC_01",
  ch: "[CH:'HSL(20,100%,70%)']",
  meta: { RUNTIME: "BUN", LATENCY_P99: "20ms", OWNER: "DATA_TEAM" },
  description: "Handles high-load data operations for the COREDB persistence layer"
}
```

**Output**:
```typescript
// @KIMI2-ARCH-COMPONENT-START
// ID: [DATA/STORAGE/SUB_A/SERVICE_v1.0.0][#REF:SUB_A_SVC_01][CH:'HSL(20,100%,70%)'][#META:RUNTIME=BUN,LATENCY_P99=20ms]
// DESCRIPTION: Handles high-load data operations for the COREDB persistence layer
// OWNER: DATA_TEAM
// CREATED: 2025-11-13
// LAST_MODIFIED: 2025-11-13
// STATUS: ACTIVE
// @KIMI2-ARCH-COMPONENT-END
```

---

## ✅ Testing Strategy

### Unit Tests

1. **Header Generation**:
   - Test all required fields generated
   - Test optional fields (API_VERSION, DEPENDENCIES)
   - Test owner extraction from meta tags
   - Test status extraction from meta tags

2. **Header Parsing**:
   - Test extraction of all fields
   - Test handling of missing fields
   - Test handling of malformed headers

3. **Validation**:
   - Test presence checks
   - Test ID matching against architecture.json
   - Test metadata consistency checks
   - Test timestamp validation

### Integration Tests

1. **Scaffold Service**:
   - Verify header is generated for new services
   - Verify header matches architecture.json entry
   - Verify all required fields present

2. **Validation Command**:
   - Test validation across sample codebase
   - Test error reporting
   - Test warning reporting

---

## 🔗 Related Documentation

- **[[GOLDEN_FILE_STANDARD|Golden File Standard]]** - Section 9: Atomic Source File Header Standard
- **[[VERSIONING_GUIDE|Versioning Guide]]** - Version numbering system
- **[[MICRO_ENHANCEMENT_TICKET_GUIDE|Micro-Enhancement Ticket Guide]]** - Ticket structure guide

---

**Last Updated**: 2025-01-XX  
**Guide Version**: 1.0.0

