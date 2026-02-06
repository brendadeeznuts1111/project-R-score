# [METADATA.DOCUMENTATION.MAPPING.RG] Metadata & Documentation Mapping

## 1. Overview

Mapping between code metadata tags (`[[TECH]]`, `[DOMAIN]`, `#REF:`) and documentation headers (`[DOMAIN.CATEGORY.KEYWORD.RG]`) for consistent cross-referencing.

**Related Documentation**:
- [`HEADERS-ETAGS-PROPERTIES-TYPES.md`](./HEADERS-ETAGS-PROPERTIES-TYPES.md) - Headers, ETags, Properties & Types by Class, Function & Group

---

## 2. Metadata Systems

### 2.1. [METADATA.CODE_TAGS.RG] Code Metadata Tags

#### 2.1.1. [TAG.FORMAT.RG] Format
```text
[[TECH][MODULE][INSTANCE][META:{blueprint=BP-XXX@v;instance-id=ID;version=v}][PROPERTIES:{key={value:"val";@root:"ROOT";@chain:["BP-X","BP-Y"];@version:"v"}}][CLASS:ClassName][#REF:v-0.1.0.BP.XXX.1.0.A.1.1.ORCA.1.1]]
```

#### 2.1.2. [TAG.COMPONENTS.RG] Components
- `[[TECH]]` - Technical domain marker
- `[MODULE]` - Module identifier
- `[INSTANCE]` - Instance identifier
- `[META:{...}]` - Metadata object with blueprint, instance-id, version
- `[PROPERTIES:{...}]` - Properties with @root, @chain, @version
- `[CLASS:...]` - Class name
- `[#REF:...]` - Reference identifier

### 2.2. [METADATA.API_TAGS.RG] API Documentation Tags

#### 2.2.1. [TAG.API_FORMAT.RG] Format
```text
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
```

#### 2.2.2. [TAG.API_COMPONENTS.RG] Components
- `[DOMAIN]` - Domain (CORE, SPORTS, PREDICTION, TRADING, DEV)
- `[SCOPE]` - Scope (SYSTEM, DATA, COMPUTE, EXTERNAL, REALTIME, PERSIST)
- `[TYPE]` - Type (STATUS, IMPORT, QUERY, STATS, WEBSOCKET, etc.)
- `[META:{PROPERTY}]` - Metadata properties
- `[CLASS]` - Class name (optional)
- `[#REF:*]` - Reference to code location

### 2.3. [METADATA.DOC_HEADERS.RG] Documentation Headers

#### 2.3.1. [TAG.DOC_FORMAT.RG] Format
```text
[DOMAIN.CATEGORY.KEYWORD.RG]
```

#### 2.3.2. [TAG.DOC_COMPONENTS.RG] Components
- `DOMAIN` - High-level domain (ORCA, PIPELINE, RBAC, API, STORAGE)
- `CATEGORY` - Category within domain (ARBITRAGE, INTEGRATION, STORAGE, SECURITY)
- `KEYWORD` - Specific keyword for ripgrep (INTEGRATION, REVIEW, VALIDATION)
- `RG` - Ripgrep marker

---

## 3. Mapping Rules

### 3.1. [MAPPING.DOMAIN.RG] Domain Mapping

| Code Domain | API Domain | Doc Domain | Description |
|-------------|------------|------------|-------------|
| `[CORE]` | `CORE` | `PIPELINE` | Core system functionality |
| `[SPORTS]` | `SPORTS` | `ORCA` | Sports betting (ORCA) |
| `[PREDICTION]` | `PREDICTION` | `ARBITRAGE` | Prediction markets |
| `[TRADING]` | `TRADING` | `ARBITRAGE` | Trading/arbitrage |
| `[DEV]` | `DEV` | `DEVELOPMENT` | Development tools |
| `[[TECH]]` | - | `TECHNICAL` | Technical metadata |

### 3.2. [MAPPING.CATEGORY.RG] Category Mapping

| API Scope | Doc Category | Description |
|-----------|---------------|------------|
| `[SYSTEM]` | `SYSTEM` | System-level operations |
| `[DATA]` | `STORAGE` | Data storage/retrieval |
| `[COMPUTE]` | `ANALYTICS` | Computation/analytics |
| `[EXTERNAL]` | `INTEGRATION` | External integrations |
| `[REALTIME]` | `STREAMING` | Real-time streaming |
| `[PERSIST]` | `STORAGE` | Persistent storage |
| `[NORMALIZE]` | `NORMALIZATION` | Data normalization |

### 3.3. [MAPPING.REFERENCE.RG] Reference Mapping

#### 3.3.1. [REF.CODE_TO_DOC.RG] Code → Documentation
- Code `#REF:v-0.1.0.BP.SHARP.BOOKS.1.0.A.1.1.ORCA.1.1`
- Maps to: `[ORCA.SHARP_BOOKS.REGISTRY.RG]` in docs

#### 3.3.2. [REF.API_TO_DOC.RG] API → Documentation
- API `[#REF:routes.ts:15]`
- Maps to: `[API.HEALTH.STATUS.RG]` in docs

#### 3.3.3. [REF.DOC_TO_CODE.RG] Documentation → Code
- Doc `[ORCA.ARBITRAGE.STORAGE.RG]`
- Maps to: `src/orca/arbitrage/storage.ts` with `#REF:orca/arbitrage/storage.ts`

---

## 4. Cross-Reference Examples

### 4.1. [EXAMPLE.ORCA_ARBITRAGE.RG] ORCA Arbitrage Storage

#### 4.1.1. [EXAMPLE.CODE_METADATA.RG] Code Metadata
```typescript
/**
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ORCA-ARBITRAGE@0.1.0;instance-id=ORCA-ARB-001;version=0.1.0}]
 * [PROPERTIES:{storage={value:"orca-arbitrage";@root:"ROOT-ORCA";@chain:["BP-ARBITRAGE","BP-STORAGE"];@version:"0.1.0"}}]
 * [CLASS:OrcaArbitrageStorage]
 * [#REF:v-0.1.0.BP.ORCA.ARBITRAGE.1.0.A.1.1.ORCA.1.1]]
 */
export class OrcaArbitrageStorage {
```

#### 4.1.2. [EXAMPLE.DOC_HEADER.RG] Documentation Header
```markdown
### 2.1. [ORCA.ARBITRAGE.STORAGE.RG] Storage System
**Reference**: `#REF:v-0.1.0.BP.ORCA.ARBITRAGE.1.0.A.1.1.ORCA.1.1`  
**File**: `src/orca/arbitrage/storage.ts`  
**Class**: `OrcaArbitrageStorage`
```

### 4.2. [EXAMPLE.API_ENDPOINT.RG] API Endpoint

#### 4.2.1. [EXAMPLE.API_TAG.RG] API Tag
```typescript
/**
 * [CORE][DATA][QUERY]{pagination,filter}[TradeController][#REF:routes.ts:150]
 */
api.get("/trades", ...)
```

#### 4.2.2. [EXAMPLE.DOC_HEADER.RG] Documentation Header
```markdown
### 4.2. [API.QUERY_TRADES.RG] Query Trades
**Reference**: `#REF:routes.ts:150`  
**Tag**: `[CORE][DATA][QUERY]`  
**Endpoint**: `GET /trades`
```

---

## 5. Metadata Registry

### 5.1. [REGISTRY.DOMAINS.RG] Domain Registry

| Domain | Code Tag | API Tag | Doc Header | Root |
|--------|----------|---------|------------|------|
| Core System | `[[TECH]]` | `[CORE]` | `[PIPELINE.*.RG]` | `ROOT-CORE` |
| ORCA Sports | `[[TECH]]` | `[SPORTS]` | `[ORCA.*.RG]` | `ROOT-ORCA` |
| Arbitrage | `[[TECH]]` | `[TRADING]` | `[ARBITRAGE.*.RG]` | `ROOT-ARBITRAGE` |
| Prediction Markets | `[[TECH]]` | `[PREDICTION]` | `[PREDICTION.*.RG]` | `ROOT-PREDICTION` |
| Research | `[[TECH]]` | - | `[RESEARCH.*.RG]` | `ROOT-RESEARCH` |
| Development | `[[TECH]]` | `[DEV]` | `[DEVELOPMENT.*.RG]` | `ROOT-DEV` |

### 5.2. [REGISTRY.BLUEPRINTS.RG] Blueprint Registry

| Blueprint | Version | Instance ID | Doc Reference |
|-----------|---------|------------|----------------|
| `BP-SHARP-BOOKS` | `0.1.0` | `ORCA-SHARP-001` | `[ORCA.SHARP_BOOKS.REGISTRY.RG]` |
| `BP-ORCA-ARBITRAGE` | `0.1.0` | `ORCA-ARB-001` | `[ORCA.ARBITRAGE.STORAGE.RG]` |
| `BP-PIPELINE` | `0.1.0` | `NEXUS-PIPELINE-001` | `[PIPELINE.ORCHESTRATOR.RG]` |
| `BP-RBAC` | `0.1.0` | `NEXUS-RBAC-001` | `[RBAC.MANAGER.RG]` |
| `BP-PROPERTIES` | `0.1.0` | `NEXUS-PROP-001` | `[PROPERTIES.REGISTRY.RG]` |

---

## 6. Integration Points

### 6.1. [INTEGRATION.CODE_COMMENTS.RG] Code Comments
Code files use metadata tags in JSDoc comments:
```typescript
/**
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-XXX@v}]
 * [PROPERTIES:{...}][CLASS:ClassName][#REF:...]]
 */
```

### 6.2. [INTEGRATION.API_DOCS.RG] API Documentation
API docs use tag format:
```typescript
/**
 * [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
 */
```

### 6.3. [INTEGRATION.MARKDOWN.RG] Markdown Documentation
Markdown docs use hierarchical headers:
```markdown
### 2.1. [DOMAIN.CATEGORY.KEYWORD.RG] Section Title
**Reference**: `#REF:...`  
**File**: `src/...`  
**Class**: `ClassName`
```

---

## 7. Search Patterns

### 7.1. [SEARCH.CODE_METADATA.RG] Search Code Metadata
```bash
# Find all ORCA modules
rg "\[\[TECH\].*ORCA" src/

# Find all blueprints
rg "blueprint=BP-" src/

# Find all references
rg "#REF:" src/
```

### 7.2. [SEARCH.API_TAGS.RG] Search API Tags
```bash
# Find all CORE endpoints
rg "\[CORE\]" src/api/

# Find all SPORTS endpoints
rg "\[SPORTS\]" src/api/

# Find all references
rg "#REF:" src/api/
```

### 7.3. [SEARCH.DOC_HEADERS.RG] Search Documentation Headers
```bash
# Find all ORCA sections
rg "\[ORCA\." *.md

# Find all API sections
rg "\[API\." *.md

# Find all storage sections
rg "\[.*STORAGE.*\.RG\]" *.md
```

---

## 8. Consistency Rules

### 8.1. [RULES.DOMAIN_CONSISTENCY.RG] Domain Consistency
- Use same domain name across code, API, and docs
- Map `[CORE]` → `PIPELINE` in docs
- Map `[SPORTS]` → `ORCA` in docs

### 8.2. [RULES.REFERENCE_CONSISTENCY.RG] Reference Consistency
- Always include `#REF:` in code comments
- Always include `#REF:` in API tags
- Always include reference in doc headers

### 8.3. [RULES.VERSION_CONSISTENCY.RG] Version Consistency
- Use semantic versioning (`0.1.0`)
- Include version in blueprint metadata
- Include version in doc headers where applicable

---

## 9. Examples

### 9.1. [EXAMPLE.COMPLETE.RG] Complete Example

#### 9.1.1. [EXAMPLE.CODE.RG] Code
```typescript
/**
 * ORCA Arbitrage Storage
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ORCA-ARBITRAGE@0.1.0;instance-id=ORCA-ARB-001;version=0.1.0}]
 * [PROPERTIES:{storage={value:"orca-arbitrage";@root:"ROOT-ORCA";@chain:["BP-ARBITRAGE","BP-STORAGE"];@version:"0.1.0"}}]
 * [CLASS:OrcaArbitrageStorage]
 * [#REF:v-0.1.0.BP.ORCA.ARBITRAGE.1.0.A.1.1.ORCA.1.1]]
 */
export class OrcaArbitrageStorage {
```

#### 9.1.2. [EXAMPLE.API.RG] API
```typescript
/**
 * [SPORTS][PERSIST][STORAGE]{arbitrage,opportunities}[OrcaArbitrageStorage][#REF:orca/arbitrage/storage.ts]
 */
api.post("/orca/arbitrage/store", ...)
```

#### 9.1.3. [EXAMPLE.DOC.RG] Documentation
```markdown
### 2.1. [ORCA.ARBITRAGE.STORAGE.RG] Storage System
**Reference**: `#REF:v-0.1.0.BP.ORCA.ARBITRAGE.1.0.A.1.1.ORCA.1.1`  
**File**: `src/orca/arbitrage/storage.ts`  
**Class**: `OrcaArbitrageStorage`  
**API Tag**: `[SPORTS][PERSIST][STORAGE]`
```

---

## 10. Status

**Status**: ✅ Mapping established, ready for cross-referencing

**Code Metadata**: 64 instances found  
**API Tags**: 127 instances found  
**Doc Headers**: 153 instances found
