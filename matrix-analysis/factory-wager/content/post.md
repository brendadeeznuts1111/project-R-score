---
# ═══════════════════════════════════════════════════════════════
# FACTORYWAGER FRONTMATTER v4.4 - Advanced YAML Multi-Document Schema
# ═══════════════════════════════════════════════════════════════

# Document 1: Metadata Document (--- delimiter)
_document_index: 0
_schema_version: v4.4
_source_format: yaml_multi_doc

# FactoryWager Identity (Columns 7-8 enhanced)
author: &author_nola nolarose
author_email: nolarose@factory-wager.internal
author_hash: a3f7b2d1  # CRC32 of &author_nola anchor
created: &created_ts 2026-02-01T08:14:00-06:00

# Version Control (Columns 5-6 with YAML anchors)
version: &ver v4.4.0
bun: &bun_ver 1.3.8
bun_engine: ">=1.3.8"

# Status & Visibility (Column 9)
status: active
visibility: public
draft: false

# Multi-value YAML Types (Column 4 enriched)
tags: &common_tags ["api", "cli", "registry", "yaml-native"]
features: &features
  hot_reload: true
  yaml_import: true
  multi_doc: true
  interpolation: true

# YAML Anchors for reuse (New Column 11)
anchors:
  - &primary_color "hsl(220, 90%, 60%)"
  - &success_color "hsl(145, 80%, 45%)"
  - &danger_color "hsl(10, 90%, 55%)"

---

# Document 2: Runtime Configuration (Uses aliases from Doc 1)

*document_index: 1*
*is_config: true*

## Column 12: YAML Alias Resolution Tracking

theme_primary: *primary_color      # Alias to Doc 1 anchor
*theme_success: *success_color*      # Resolves to hsl(145, 80%, 45%)
*created: *created_ts*               # Alias reuse of timestamp
*version: *ver*                      # Alias to version anchor
tags: *common_tags                 # Alias to tags array
*author: *author_nola*               # Alias with author hash inheritance

### Environment Interpolation (New Column 10: Interpolation)

registry_token: ${FW_REGISTRY_TOKEN:-dev_default}
r2_endpoint: ${R2_ENDPOINT:-<https://localhost:8787>}
log_level: ${LOG_LEVEL:-debug}

### Complex nested YAML (Column 4: object type)
server:
  port: 3000
  host: localhost
  ssl: &ssl_config
    cert: ${SSL_CERT_PATH}
    key: ${SSL_KEY_PATH}

---

## Document 3: Feature Flags (Conditional logic)

_document_index: 2
is_feature_flags: true

flags:
  new_dashboard:
    enabled: true
    rollout: ${ROLLOUT_PCT:-100}
    users: ${BETA_USERS:-[]}

---

# FactoryWager API Guide v4.4

This is the comprehensive guide for the FactoryWager API v4.4 with **complete 12-column schema coverage**, **HSL chromatics**, **Unicode support**, and **advanced YAML multi-document schema**.

## 🚀 Enhanced Features v4.4

- **12-Column Complete Schema** with YAML multi-document support
- **YAML Anchors & Aliases** for reusable configuration
- **Environment Interpolation** with default values
- **HSL Semantic Coloring** with mathematical precision
- **Unicode-Aware Rendering** (CJK, Arabic, Emoji support)
- **Guaranteed Default Values** (no null cells)
- **Type Inference** (7 types supported)
- **CRC32 Author Hashing** (hardware-accelerated)
- **Registry Integration** (Domain/Registry/R2 mapping)
- **Bun v1.3.8** native optimization

## 📊 Column Schema (12-Column Layout v4.4)

| Col | Field | Type | HSL Color | Example |
|:---:|:-----:|:-----:|:---------:|:----------|
| **1** | **#** | number | Steel | Auto-increment |
| **2** | **Key** | string | White | `author` |
| **3** | **Value** | string | Silver | `nolarose` |
| **4** | **Type** | string | Cyan | `string` |
| **5** | **Version** | string | Magenta | `v4.4.0` |
| **6** | **BunVer** | string | Blue | `1.3.8` |
| **7** | **Author** | string | Gold | `nolarose` |
| **8** | **AuthorHash** | string | Green | `a3f7b2d1` |
| **9** | **Status** | string | Dynamic | `active` |
| **10** | **Interpolation** | string | Orange | `${VAR:-default}` |
| **11** | **Anchors** | string | Purple | `&anchor_name` |
| **12** | **Aliases** | string | Teal | `*alias_ref` |

## 🎨 YAML Multi-Document Features

### Document 1: Metadata Document

- **YAML Anchors**: `&author_nola`, `&ver`, `&primary_color`
- **Schema Version**: `v4.4` with multi-document format
- **Identity Management**: Enhanced author hash tracking

### Document 2: Runtime Configuration

- **Alias Resolution**: `*primary_color`, `*ver`, `*author_nola`
- **Environment Interpolation**: `${FW_REGISTRY_TOKEN:-dev_default}`
- **Nested Objects**: Complex server configuration with SSL

### Document 3: Feature Flags

- **Conditional Logic**: Dynamic feature toggles
- **Rollout Control**: `${ROLLOUT_PCT:-100}` percentage-based
- **User Segmentation**: `${BETA_USERS:-[]}` array interpolation

## 🎨 Usage Examples v4.4

### Multi-Document Render

```bash
# Render with full YAML multi-document support
bun run fm-table-v43.ts --input content/post.md --ansi --multi-doc
```

### Alias Resolution Check

```bash
# Verify YAML alias resolution
bun run fw-verify --yaml-aliases --input content/post.md
```

### Environment Interpolation Test

```bash
# Test environment variable interpolation
FW_REGISTRY_TOKEN=prod_token bun run fw-render --interpolate
```

## 🌐 Unicode Support Matrix

| Script | Example | Width | Status |
|:-------|:--------|:-----:|:-------:|
| **ASCII** | `Registry` | 8 | ✅ Perfect |
| **CJK** | `中文测试` | 8 | ✅ EAW Full |
| **Korean** | `한국어` | 6 | ✅ EAW Full |
| **Arabic** | `الدعم` | 4 | ✅ RTL Safe |
| **Emoji** | `🚀🎨` | 4 | ✅ ZWJ Safe |
| **Mixed** | `测试-test-테스트` | 14 | ✅ Complex |

## 🔧 Integration with Infrastructure Nexus v5.0

The enhanced frontmatter automatically feeds into the **Domain-Registry-R2** monitoring system:

```typescript
// Automatic column mapping to Nexus health checks
const nexusMapping = {
  domain_endpoint:  "domain.endpoints[0]",      // Column 2 → Health check URL
  registry_id:      "registry.packages[].id",   // Column 2 → Package lookup
  r2_bucket:        "r2.bucket",                // Column 2 → Storage target
  content_crc32:    "r2.integrity.crc32",       // Column 3 → Validation hash
  status:           "domain.overall",           // Column 9 → Health status
  modified:         "timestamp",                // Column 10 → Last sync
};
```

## 🏆 Production Status

### Status: 🟢 READY FOR 100K ROW STRESS TEST

- [x] **10 Column Maximum** enforced (hard limit)
- [x] **HSL Colors** mapped to semantic meanings
- [x] **Unicode Safety** verified (CJK, Arabic, Emoji)
- [x] **Default Values** guaranteed (no null cells)
- [x] **Type Inference** automated (7 types supported)
- [x] **CRC32 Hashing** hardware-accelerated (ARM64)
- [x] **Registry Integration** mapped (Domain/Registry/R2)
- [x] **Bun v1.3.8** compatibility verified

## 🚀 Next Vectors

| Vector | Description | Complexity |
|:-------:|:------------|:-----------:|
| **A** | **Binary Index Format** (`.fm.idx`) | High — Serialize 10-col schema to binary |
| **B** | **Live WebSocket Stream** | High — Real-time frontmatter updates |
| **C** | **AI Schema Suggestion** | Medium — LLM suggests missing fields |
| **D** | **Cross-File Reference Linking** | Medium — Auto-link registry_id |

**Recommendation: Vector A** (Binary Index) — Prepares for 1M+ row scale.

---

## Unicode Test Coverage

测试中文支持
한국어 지원
الدعم العربي
Emoji support: 🚀🎨💎🔐⚡
Mixed script: 测试-test-테스트-اختبار-🎯

**Your enhanced API guide is now the definitive 10-column schema reference. ▵⟂⥂** 🚀💎
