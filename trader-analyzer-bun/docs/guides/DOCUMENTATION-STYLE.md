# [DOCUMENTATION.STYLE.GUIDE.RG] Documentation Style Guide

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-DOC-STYLE@0.1.0;instance-id=DOC-STYLE-001;version=0.1.0}][PROPERTIES:{style={value:"documentation-style";@root:"ROOT-DOC";@chain:["BP-MARKDOWN","BP-RIPGREP"];@version:"0.1.0"}}][CLASS:DocumentationStyleGuide][#REF:v-0.1.0.BP.DOC.STYLE.1.0.A.1.1.DOC.1.1]]`

## 1. Overview

This guide defines the hierarchical documentation style used across all NEXUS documentation files.

**Code Reference**: `#REF:v-0.1.0.BP.DOC.STYLE.1.0.A.1.1.DOC.1.1`  
**Related**: See [`METADATA-DOCUMENTATION-MAPPING.md`](../api/METADATA-DOCUMENTATION-MAPPING.md) for metadata system integration

---

## 2. Format Standards

### 2.1. [FORMAT.HIERARCHICAL_NUMBERING.RG] Hierarchical Numbering
All sections use hierarchical numbering: `1.x.x.x.x`

**Example**:
```markdown
## 1. Main Section
### 1.1. Subsection
#### 1.1.1. Sub-subsection
##### 1.1.1.1. Sub-sub-subsection
```

### 2.2. [FORMAT.RIPGREP_HEADERS.RG] Ripgrep-Friendly Headers
All section headers include `[DOMAIN.CATEGORY.KEYWORD.RG]` tags for easy searching.

**Format**: `[DOMAIN.CATEGORY.KEYWORD.RG] Section Title`

**Example**:
```markdown
### 2.1. [FORMAT.HIERARCHICAL_NUMBERING.RG] Hierarchical Numbering
```

### 2.3. [FORMAT.HEADER_COMPONENTS.RG] Header Components
- **DOMAIN**: High-level domain (e.g., `ORCA`, `PIPELINE`, `RBAC`, `API`)
- **CATEGORY**: Category within domain (e.g., `ARBITRAGE`, `STORAGE`, `SECURITY`)
- **KEYWORD**: Specific keyword for ripgrep (e.g., `INTEGRATION`, `REVIEW`, `VALIDATION`)
- **RG**: Ripgrep marker (always `.RG`)

---

## 3. Usage Examples

### 3.1. [EXAMPLE.BASIC.RG] Basic Section
```markdown
## 1. Overview
Brief description of the document.
```

### 3.2. [EXAMPLE.WITH_HEADER.RG] Section with Header Tag
```markdown
### 2.1. [API.STORE_OPPORTUNITY.RG] Store Opportunity
Detailed explanation of storing opportunities.
```

### 3.3. [EXAMPLE.NESTED.RG] Nested Sections
```markdown
## 3. Implementation Details
### 3.1. [IMPLEMENTATION.STORAGE.RG] Storage System
#### 3.1.1. [STORAGE.DATABASE.RG] Database Schema
##### 3.1.1.1. [SCHEMA.TABLES.RG] Tables
```

---

## 4. Ripgrep Usage

### 4.1. [RIPGREP.BASIC.RG] Basic Search
```bash
# Find all sections about API
rg "\[API\." *.md

# Find all storage-related sections
rg "\[.*STORAGE.*\.RG\]" *.md

# Find all review sections
rg "\[.*REVIEW.*\.RG\]" *.md
```

### 4.2. [RIPGREP.ADVANCED.RG] Advanced Search
```bash
# Find all critical fixes
rg "\[FIX\..*\.RG\]" *.md

# Find all performance sections
rg "\[.*PERFORMANCE.*\.RG\]" *.md

# Find all security sections
rg "\[.*SECURITY.*\.RG\]" *.md
```

### 4.3. [RIPGREP.WHY.RG] Why Ripgrep?
- **Performance**: 10-100x faster than grep for large codebases
- **Better defaults**: Recursive, respects .gitignore
- **Unicode support**: Handles special characters better
- **Context**: Easy to add context lines (`-C` flag)

---

## 5. Domain Categories

### 5.1. [DOMAINS.COMMON.RG] Common Domains
- `ORCA` - ORCA sports betting system
- `PIPELINE` - Enterprise data pipeline
- `RBAC` - Role-based access control
- `API` - API endpoints
- `STORAGE` - Storage systems
- `SECURITY` - Security features
- `PERFORMANCE` - Performance metrics
- `TESTING` - Testing documentation
- `REVIEW` - Code reviews
- `FIX` - Bug fixes
- `IMPROVEMENT` - Improvements

### 5.2. [DOMAINS.CATEGORIES.RG] Common Categories
- `ARBITRAGE` - Arbitrage detection
- `INTEGRATION` - System integration
- `VALIDATION` - Input validation
- `STORAGE` - Data storage
- `QUERY` - Query operations
- `STATUS` - Status tracking
- `METRICS` - Performance metrics

---

## 6. Best Practices

### 6.1. [PRACTICES.CONSISTENCY.RG] Consistency
- Use consistent domain names across documents
- Use consistent category names
- Use descriptive keywords

### 6.2. [PRACTICES.HIERARCHY.RG] Hierarchy
- Start with `## 1.` for main sections
- Use `### 1.1.` for subsections
- Use `#### 1.1.1.` for sub-subsections
- Don't skip levels

### 6.3. [PRACTICES.HEADERS.RG] Headers
- Always include `[DOMAIN.CATEGORY.KEYWORD.RG]` tag
- Use uppercase for domain and category
- Use descriptive keywords
- Keep tags concise but clear

### 6.4. [PRACTICES.SEARCHABILITY.RG] Searchability
- Use keywords that developers would search for
- Include domain context in tags
- Make tags grep-friendly (no spaces, use dots)

---

## 7. Examples from Codebase

### 7.1. [EXAMPLE.ORCA_INTEGRATION.RG] ORCA Integration
```markdown
## 1. Overview
### 1.1. [ORCA.ARBITRAGE.INTEGRATION.RG] Integration Status
#### 1.1.1. [INTEGRATION.STORAGE.RG] Storage System
```

### 7.2. [EXAMPLE.API_ENDPOINTS.RG] API Endpoints
```markdown
## 4. API Usage Examples
### 4.1. [API.STORE_OPPORTUNITY.RG] Store Opportunity
### 4.2. [API.QUERY_OPPORTUNITIES.RG] Query Opportunities
```

### 7.3. [EXAMPLE.REVIEW.RG] Code Review
```markdown
## 3. Issues & Improvements
### 3.1. [ISSUES.CRITICAL.RG] Critical Issues
#### 3.1.1. [ISSUE.BOOK_PAIR_STATS.RG] Book Pair Stats Logic Bug
```

---

## 8. Migration Checklist

### 8.1. [MIGRATION.STEPS.RG] Steps
1. ✅ Add hierarchical numbering (1.x.x.x.x)
2. ✅ Add ripgrep headers ([DOMAIN.CATEGORY.KEYWORD.RG])
3. ✅ Ensure consistent domain names
4. ✅ Verify ripgrep searches work
5. ✅ Update cross-references

### 8.2. [MIGRATION.COMPLETED.RG] Completed Files
- ✅ `ORCA-ARBITRAGE-INTEGRATION.md`
- ✅ `ORCA-ARBITRAGE-REVIEW.md`
- ✅ `REVIEW-SUMMARY.md`
- ✅ `CODE-POLISH-SUMMARY.md`
- ✅ `POLISH-COMPLETE.md`

---

## 9. Status

**Status**: ✅ Style guide established, documentation updated

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX
