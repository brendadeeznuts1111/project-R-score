# [API.HEADERS.ETAGS.PROPERTIES.TYPES.RG] Headers, ETags, Properties & Types by Class, Function & Group

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-API-METADATA@0.1.0;instance-id=API-META-001;version=0.1.0}][PROPERTIES:{headers={value:"class-function-group-specific";@root:"ROOT-API";@chain:["BP-API","BP-METADATA"];@version:"0.1.0"}}][CLASS:APIMetadataSystem][#REF:v-0.1.0.BP.API.METADATA.1.0.A.1.1.API.1.1]]`

## 1. Overview

This document defines how **Headers**, **ETags**, **Properties**, and **Types** are organized and documented for **Classes**, **Functions**, and **Groups** in the NEXUS API.

**Code Reference**: `#REF:v-0.1.0.BP.API.METADATA.1.0.A.1.1.API.1.1`  
**Related**: See [`METADATA-DOCUMENTATION-MAPPING.md`](./METADATA-DOCUMENTATION-MAPPING.md) for metadata system integration

---

## 2. [STRUCTURE.CLASSES.RG] Class-Specific Elements

### 2.1. [CLASS.HEADERS.RG] Class Headers

Each class defines its own HTTP headers for requests/responses.

**Format**: `[CLASS:ClassName][HEADERS:{header1,header2}]`

**Example**:
```typescript
/**
 * [CORE][SYSTEM][STATUS]{uptime,version}[HealthController][HEADERS:{ETag,X-API-Version,X-Git-Commit}][#REF:routes.ts:15]
 */
export class HealthController {
  // Class-specific headers
  static readonly HEADERS = {
    'ETag': 'W/"health-checksum"',
    'X-API-Version': '1.0.0',
    'X-Git-Commit': process.env.GIT_COMMIT || 'unknown',
  };
}
```

### 2.2. [CLASS.ETAGS.RG] Class ETags

Each class generates ETags specific to its operations.

**Format**: `[CLASS:ClassName][ETAG:{strategy,ttl}]`

**Example**:
```typescript
/**
 * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[OrcaNormalizer][ETAG:{strategy="content-hash",ttl=3600}][#REF:orca/normalizer.ts:50]
 */
export class OrcaNormalizer {
  // Class-specific ETag generation
  private generateETag(data: any): string {
    const hash = Bun.CryptoHasher.hash('sha256', JSON.stringify(data));
    return `W/"${hash.substring(0, 16)}"`;
  }
  
  static readonly ETAG_CONFIG = {
    strategy: 'content-hash',
    ttl: 3600, // 1 hour
    weak: true,
  };
}
```

### 2.3. [CLASS.PROPERTIES.RG] Class Properties

Each class defines its own properties schema.

**Format**: `[CLASS:ClassName][PROPERTIES:{prop1:type,prop2:type}]`

**Example**:
```typescript
/**
 * [REGISTRY][SYSTEM][UNIFIED]{properties,sources,tools,errors}[RegistryController][PROPERTIES:{id:string,name:string,category:string,tags:string[]}][#REF:api/registry.ts:50]
 */
export class RegistryController {
  // Class-specific properties
  static readonly PROPERTIES = {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    category: { type: 'string', enum: ['data', 'tooling', 'security'] },
    tags: { type: 'array', items: { type: 'string' } },
  };
}
```

### 2.4. [CLASS.TYPES.RG] Class Types

Each class defines its own TypeScript types/interfaces.

**Format**: `[CLASS:ClassName][TYPES:{TypeName,InterfaceName}]`

**Example**:
```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[TradeController][TYPES:{TradeQuery,TradeResponse,TradeFilter}][#REF:routes.ts:150]
 */
export class TradeController {
  // Class-specific types
  export interface TradeQuery {
    limit?: number;
    offset?: number;
    bookmaker?: string;
    startDate?: string;
    endDate?: string;
  }
  
  export interface TradeResponse {
    trades: Trade[];
    total: number;
    limit: number;
    offset: number;
  }
  
  export interface TradeFilter {
    bookmaker?: string;
    marketId?: string;
    minPrice?: number;
    maxPrice?: number;
  }
}
```

---

## 3. [STRUCTURE.FUNCTIONS.RG] Function-Specific Elements

### 3.1. [FUNCTION.HEADERS.RG] Function Headers

Each function defines its own HTTP headers.

**Format**: `[FUNCTION:functionName][HEADERS:{header1,header2}]`

**Example**:
```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[TradeController.getTrades][HEADERS:{ETag,X-Page-Count,X-Total-Count}][#REF:routes.ts:150]
 */
export function getTrades(query: TradeQuery): TradeResponse {
  // Function-specific headers
  const headers = {
    'ETag': `W/"trades-${queryHash}"`,
    'X-Page-Count': Math.ceil(total / query.limit).toString(),
    'X-Total-Count': total.toString(),
  };
  
  return { trades, total, limit: query.limit, offset: query.offset };
}
```

### 3.2. [FUNCTION.ETAGS.RG] Function ETags

Each function generates ETags specific to its return value.

**Format**: `[FUNCTION:functionName][ETAG:{strategy,ttl}]`

**Example**:
```typescript
/**
 * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[OrcaNormalizer.normalize][ETAG:{strategy="uuid-based",ttl=86400}][#REF:orca/normalizer.ts:50]
 */
export function normalize(input: OrcaRawInput): OrcaNormalizedOutput {
  // Function-specific ETag generation
  const eventId = generateEventId(input.sport, input.homeTeam, input.awayTeam, input.startTime);
  const etag = `W/"${eventId}"`; // Use UUID as ETag base
  
  return {
    eventId,
    // ... normalized data
  };
}
```

### 3.3. [FUNCTION.PROPERTIES.RG] Function Properties

Each function defines its own parameter and return properties.

**Format**: `[FUNCTION:functionName][PROPERTIES:{param1:type,return:type}]`

**Example**:
```typescript
/**
 * [REGISTRY][SYSTEM][UNIFIED]{properties,sources,tools,errors}[RegistryController.getRegistry][PROPERTIES:{category:string,limit:number,offset:number}][#REF:api/registry.ts:50]
 */
export function getRegistry(
  category?: string,
  limit: number = 20,
  offset: number = 0
): RegistryResponse {
  // Function-specific properties
  // Input: category (string, optional), limit (number, default 20), offset (number, default 0)
  // Output: RegistryResponse with items array and pagination metadata
}
```

### 3.4. [FUNCTION.TYPES.RG] Function Types

Each function defines its own parameter and return types.

**Format**: `[FUNCTION:functionName][TYPES:{ParamType,ReturnType}]`

**Example**:
```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[TradeController.getTrades][TYPES:{TradeQuery,TradeResponse}][#REF:routes.ts:150]
 */
export function getTrades(query: TradeQuery): TradeResponse {
  // Function-specific types
  // Input: TradeQuery
  // Output: TradeResponse
}
```

---

## 4. [STRUCTURE.GROUPS.RG] Group-Specific Elements

### 4.1. [GROUP.HEADERS.RG] Group Headers

Groups (endpoint collections) define shared headers.

**Format**: `[GROUP:groupName][HEADERS:{header1,header2}]`

**Example**:
```typescript
/**
 * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[GROUP:ORCA][HEADERS:{ETag,X-ORCA-Version,X-ORCA-Namespace}][#REF:orca/normalizer.ts:50]
 */
// ORCA Group - All ORCA endpoints share these headers
export const ORCA_GROUP_HEADERS = {
  'ETag': 'W/"orca-group"',
  'X-ORCA-Version': '1.0.0',
  'X-ORCA-Namespace': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
};

// Applied to all ORCA endpoints:
// - POST /orca/normalize
// - POST /orca/normalize/batch
// - GET /orca/lookup/team
// - GET /orca/bookmakers
```

### 4.2. [GROUP.ETAGS.RG] Group ETags

Groups define shared ETag strategies.

**Format**: `[GROUP:groupName][ETAG:{strategy,ttl}]`

**Example**:
```typescript
/**
 * [REGISTRY][SYSTEM][UNIFIED]{properties,sources,tools,errors}[GROUP:REGISTRY][ETAG:{strategy="group-hash",ttl=300}][#REF:api/registry.ts:50]
 */
// REGISTRY Group - All registry endpoints share ETag strategy
export const REGISTRY_GROUP_ETAG = {
  strategy: 'group-hash',
  ttl: 300, // 5 minutes
  weak: true,
  generate: (endpoint: string, data: any) => {
    const hash = Bun.CryptoHasher.hash('sha256', `${endpoint}-${JSON.stringify(data)}`);
    return `W/"registry-${hash.substring(0, 16)}"`;
  },
};
```

### 4.3. [GROUP.PROPERTIES.RG] Group Properties

Groups define shared property schemas.

**Format**: `[GROUP:groupName][PROPERTIES:{prop1:type,prop2:type}]`

**Example**:
```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[GROUP:TRADES][PROPERTIES:{limit:number,offset:number,bookmaker:string}][#REF:routes.ts:150]
 */
// TRADES Group - All trade endpoints share pagination properties
export const TRADES_GROUP_PROPERTIES = {
  limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
  offset: { type: 'number', minimum: 0, default: 0 },
  bookmaker: { type: 'string', enum: ['draftkings', 'fanduel', 'betmgm'] },
};

// Applied to all TRADES endpoints:
// - GET /api/trades
// - GET /api/trades/:id
// - GET /api/trades/stats
```

### 4.4. [GROUP.TYPES.RG] Group Types

Groups define shared TypeScript types/interfaces.

**Format**: `[GROUP:groupName][TYPES:{TypeName,InterfaceName}]`

**Example**:
```typescript
/**
 * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[GROUP:ORCA][TYPES:{OrcaRawInput,OrcaNormalizedOutput,OrcaEventId}][#REF:orca/normalizer.ts:50]
 */
// ORCA Group - All ORCA endpoints share these types
export namespace ORCA_GROUP_TYPES {
  export interface OrcaRawInput {
    bookmaker: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    marketType: string;
    line?: number;
    selection: string;
  }
  
  export interface OrcaNormalizedOutput {
    eventId: string;
    marketId: string;
    selectionId: string;
    bookmaker: string;
    // ... normalized fields
  }
  
  export type OrcaEventId = string; // UUIDv5
}
```

---

## 5. [INTEGRATION.API_DOCS.RG] Integration with API Documentation

### 5.1. [INTEGRATION.OPENAPI.RG] OpenAPI Specification

Headers, ETags, Properties, and Types are documented in OpenAPI specs:

```typescript
// In src/api/docs.ts
"/orca/normalize": {
  post: {
    operationId: "orcaNormalize",
    tags: ["ORCA"],
    summary: "Normalize market input to canonical format",
    description: `
**[SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[OrcaNormalizer.normalize][HEADERS:{ETag,X-ORCA-Version}][ETAG:{strategy="uuid-based",ttl=86400}][PROPERTIES:{bookmaker:string,sport:string,homeTeam:string}][TYPES:{OrcaRawInput,OrcaNormalizedOutput}][#REF:orca/normalizer.ts:50]**
    `.trim(),
    responses: {
      200: {
        description: "Normalized market data",
        headers: {
          ETag: {
            description: "Weak ETag based on event UUID",
            schema: { type: "string", example: 'W/"6ba7b810-9dad-11d1-80b4-00c04fd430c8"' }
          },
          "X-ORCA-Version": {
            description: "ORCA group version",
            schema: { type: "string", example: "1.0.0" }
          }
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OrcaNormalizedOutput" }
          }
        }
      }
    }
  }
}
```

### 5.2. [INTEGRATION.CODE.RG] Code Implementation

Classes, Functions, and Groups implement these elements:

```typescript
// Class-specific
export class OrcaNormalizer {
  static readonly HEADERS = ORCA_GROUP_HEADERS;
  static readonly ETAG_CONFIG = ORCA_GROUP_ETAG;
  static readonly PROPERTIES = ORCA_GROUP_PROPERTIES;
  
  normalize(input: ORCA_GROUP_TYPES.OrcaRawInput): ORCA_GROUP_TYPES.OrcaNormalizedOutput {
    // Function-specific implementation
    const etag = this.generateETag(input);
    // ...
  }
}

// Function-specific
export function getTrades(query: TRADES_GROUP_TYPES.TradeQuery): TRADES_GROUP_TYPES.TradeResponse {
  const headers = {
    ...TRADES_GROUP_HEADERS,
    'X-Page-Count': Math.ceil(total / query.limit).toString(),
  };
  // ...
}
```

---

## 6. [SEARCH.PATTERNS.RG] Search Patterns

### 6.1. [SEARCH.CLASS.RG] Search by Class

```bash
# Find all headers for a class
rg "\[CLASS:OrcaNormalizer\].*\[HEADERS:" src/

# Find all ETags for a class
rg "\[CLASS:TradeController\].*\[ETAG:" src/

# Find all properties for a class
rg "\[CLASS:RegistryController\].*\[PROPERTIES:" src/

# Find all types for a class
rg "\[CLASS:HealthController\].*\[TYPES:" src/
```

### 6.2. [SEARCH.FUNCTION.RG] Search by Function

```bash
# Find all headers for a function
rg "\[FUNCTION:normalize\].*\[HEADERS:" src/

# Find all ETags for a function
rg "\[FUNCTION:getTrades\].*\[ETAG:" src/

# Find all properties for a function
rg "\[FUNCTION:getRegistry\].*\[PROPERTIES:" src/

# Find all types for a function
rg "\[FUNCTION:getTrades\].*\[TYPES:" src/
```

### 6.3. [SEARCH.GROUP.RG] Search by Group

```bash
# Find all headers for a group
rg "\[GROUP:ORCA\].*\[HEADERS:" src/

# Find all ETags for a group
rg "\[GROUP:REGISTRY\].*\[ETAG:" src/

# Find all properties for a group
rg "\[GROUP:TRADES\].*\[PROPERTIES:" src/

# Find all types for a group
rg "\[GROUP:ORCA\].*\[TYPES:" src/
```

---

## 7. [EXAMPLES.COMPLETE.RG] Complete Examples

### 7.1. [EXAMPLE.ORCA_CLASS.RG] ORCA Normalizer Class

```typescript
/**
 * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[CLASS:OrcaNormalizer][HEADERS:{ETag,X-ORCA-Version,X-ORCA-Namespace}][ETAG:{strategy="uuid-based",ttl=86400}][PROPERTIES:{bookmaker:string,sport:string,homeTeam:string,awayTeam:string}][TYPES:{OrcaRawInput,OrcaNormalizedOutput,OrcaEventId}][#REF:orca/normalizer.ts:50]
 */
export class OrcaNormalizer {
  // Class headers
  static readonly HEADERS = {
    'ETag': 'W/"orca-normalizer"',
    'X-ORCA-Version': '1.0.0',
    'X-ORCA-Namespace': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  };
  
  // Class ETag config
  static readonly ETAG_CONFIG = {
    strategy: 'uuid-based',
    ttl: 86400, // 24 hours
    weak: true,
  };
  
  // Class properties
  static readonly PROPERTIES = {
    bookmaker: { type: 'string', required: true },
    sport: { type: 'string', required: true },
    homeTeam: { type: 'string', required: true },
    awayTeam: { type: 'string', required: true },
  };
  
  // Class types
  export interface OrcaRawInput {
    bookmaker: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    marketType: string;
    line?: number;
    selection: string;
  }
  
  export interface OrcaNormalizedOutput {
    eventId: string;
    marketId: string;
    selectionId: string;
    bookmaker: string;
  }
  
  export type OrcaEventId = string;
  
  /**
   * [SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[FUNCTION:normalize][HEADERS:{ETag}][ETAG:{strategy="uuid-based",ttl=86400}][PROPERTIES:{input:OrcaRawInput,return:OrcaNormalizedOutput}][TYPES:{OrcaRawInput,OrcaNormalizedOutput}][#REF:orca/normalizer.ts:50]
   */
  normalize(input: OrcaRawInput): OrcaNormalizedOutput {
    const eventId = this.generateEventId(input);
    const etag = `W/"${eventId}"`;
    
    return {
      eventId,
      marketId: this.generateMarketId(input),
      selectionId: this.generateSelectionId(input),
      bookmaker: input.bookmaker,
    };
  }
}
```

### 7.2. [EXAMPLE.TRADES_GROUP.RG] Trades Group

```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[GROUP:TRADES][HEADERS:{ETag,X-Page-Count,X-Total-Count}][ETAG:{strategy="content-hash",ttl=60}][PROPERTIES:{limit:number,offset:number,bookmaker:string}][TYPES:{TradeQuery,TradeResponse,TradeFilter}][#REF:routes.ts:150]
 */
export namespace TRADES_GROUP {
  // Group headers
  export const HEADERS = {
    'ETag': 'W/"trades-group"',
    'X-Page-Count': '0',
    'X-Total-Count': '0',
  };
  
  // Group ETag config
  export const ETAG_CONFIG = {
    strategy: 'content-hash',
    ttl: 60, // 1 minute
    weak: true,
  };
  
  // Group properties
  export const PROPERTIES = {
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'number', minimum: 0, default: 0 },
    bookmaker: { type: 'string', enum: ['draftkings', 'fanduel', 'betmgm'] },
  };
  
  // Group types
  export interface TradeQuery {
    limit?: number;
    offset?: number;
    bookmaker?: string;
    startDate?: string;
    endDate?: string;
  }
  
  export interface TradeResponse {
    trades: Trade[];
    total: number;
    limit: number;
    offset: number;
  }
  
  export interface TradeFilter {
    bookmaker?: string;
    marketId?: string;
    minPrice?: number;
    maxPrice?: number;
  }
}
```

---

## 8. [CONSISTENCY.RULES.RG] Consistency Rules

### 8.1. [RULES.HEADERS.RG] Headers Rules
- Always include `ETag` header for cacheable responses
- Include group-specific headers (e.g., `X-ORCA-Version`)
- Include function-specific headers (e.g., `X-Page-Count`)
- Document headers in OpenAPI spec

### 8.2. [RULES.ETAGS.RG] ETags Rules
- Use weak ETags (`W/"..."`) for better cache performance
- Document ETag strategy and TTL
- Generate ETags consistently within class/function/group
- Support `If-None-Match` header for 304 responses

### 8.3. [RULES.PROPERTIES.RG] Properties Rules
- Define properties schema for all inputs/outputs
- Use consistent property names across group
- Document property types, required status, and constraints
- Include properties in OpenAPI schemas

### 8.4. [RULES.TYPES.RG] Types Rules
- Define TypeScript types for all classes/functions/groups
- Use consistent naming conventions
- Export types from group namespaces
- Document types in JSDoc comments

---

**Related Patterns**: See [`STRUCTURE-BENEATH-CHAOS.md`](../patterns/STRUCTURE-BENEATH-CHAOS.md) for the mathematical insight: `1³ + 2³ + ... + n³ = (1 + 2 + ... + n)²` - Complexity emerges from underlying structure.

**Quick Links**: [Main Dashboard](../../dashboard/index.html) | [API Documentation](./MCP-SERVER.md) | [Metadata Mapping](./METADATA-DOCUMENTATION-MAPPING.md) | [Structure Patterns](../patterns/STRUCTURE-BENEATH-CHAOS.md)

**Author**: NEXUS Team  
**Last Updated**: 2025-01-27
