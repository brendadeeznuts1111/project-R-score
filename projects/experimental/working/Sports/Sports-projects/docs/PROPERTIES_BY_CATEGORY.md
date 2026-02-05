---
title: "Frontmatter Properties by Category"
type: "reference"
status: "active"
version: "1.0.0"
created: "2025-11-15"
tags: [reference, properties, frontmatter, categories]
---

# 📋 Frontmatter Properties by Category

**Complete reference of all 88 authorized frontmatter properties organized by category**

---

## 🎯 Quick Stats

- **Total Properties**: 88 (96 including standardized time variants)
- **Categories**: 15
- **Types**: 6 (string, number, boolean, array, date, object)
- **Meta Tags**: 8 classifications
- **Required Properties**: 6 (for dashboard type)
- **Standardized Time Properties**: 8 (forge_date, forge_time, system_time variants)

---

## 📋 Properties by Category

### 🏠 Dashboard Properties (9)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `id` | string | [META: DOMAIN] | ✅ | [[3A86FF]] | Unique dashboard identifier |
| `path` | string | [META: DYNAMIC] | ✅ | [[00FFFF]] | Dynamic URL path with env var substitution |
| `template` | string | [META: RELATIVE] | ❌ | [[FB5607]] | Template file path with relative resolution |
| `status` | string | [META: ACTIVE] | ✅ | [[FF00FF]] | Dashboard status (active, inactive, deprecated) |
| `category` | string | [META: CATEGORY] | ✅ | [[8338EC]] | Dashboard category classification |
| `version` | string | [META: VERSION] | ✅ | [[06FFA5]] | Version number (semantic versioning) |
| `name` | string | [META: DOMAIN] | ✅ | [[3A86FF]] | Dashboard display name |
| `description` | string | [META: DESCRIPTION] | ❌ | [[FFBE0B]] | Dashboard description |
| `tags` | array | [META: TAGS] | ❌ | [[FF006E]] | Tags for categorization |

---

### 📄 Common Properties (15)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `title` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Document title |
| `type` | string | [META: CATEGORY] | ❌ | [[8338EC]] | Document type classification |
| `created` | date | [META: VERSION] | ❌ | [[06FFA5]] | Creation date |
| `created_forge_date` | date | [META: VERSION] | ❌ | [[06FFA5]] | Forge creation date |
| `created_forge_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | Forge creation timestamp |
| `created_system_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | System creation timestamp |
| `updated` | date | [META: VERSION] | ❌ | [[06FFA5]] | Last update date |
| `updated_forge_date` | date | [META: VERSION] | ❌ | [[06FFA5]] | Forge update date |
| `updated_forge_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | Forge update timestamp |
| `updated_system_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | System update timestamp |
| `modified` | date | [META: VERSION] | ❌ | [[06FFA5]] | Last modification date |
| `modified_forge_date` | date | [META: VERSION] | ❌ | [[06FFA5]] | Forge modification date |
| `modified_forge_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | Forge modification timestamp |
| `modified_system_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | System modification timestamp |
| `author` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Document author |
| `deprecated` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Deprecation flag |
| `usage` | string | [META: DESCRIPTION] | ❌ | [[FFBE0B]] | Usage instructions |
| `replaces` | string | [META: VERSION] | ❌ | [[06FFA5]] | Replaced document reference |

---

### 📊 Project Management Properties (9)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `priority` | string | [META: ACTIVE] | ❌ | [[FF00FF]] | Priority level (low, medium, high, critical) |
| `assignee` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Assigned team member |
| `due_date` | date | [META: VERSION] | ❌ | [[06FFA5]] | Due date |
| `due_date_forge_date` | date | [META: VERSION] | ❌ | [[06FFA5]] | Forge due date |
| `due_date_forge_time` | string | [META: VERSION] | ❌ | [[06FFA5]] | Forge due timestamp |
| `estimated_hours` | number | [META: VERSION] | ❌ | [[06FFA5]] | Estimated hours to complete |
| `progress` | number | [META: VERSION] | ❌ | [[06FFA5]] | Progress percentage (0-100) |
| `related_projects` | array | [META: TAGS] | ❌ | [[FF006E]] | Related project references |
| `project` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Project identifier |

---

### 💻 Development Properties (1)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `feature` | string | [META: DESCRIPTION] | ❌ | [[FFBE0B]] | Feature identifier or name |

---

### 🔬 Research Properties (2)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `topic` | string | [META: DESCRIPTION] | ❌ | [[FFBE0B]] | Research topic |
| `research_completed` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Research completion flag |

---

### 🐛 Bug Properties (1)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `severity` | string | [META: ACTIVE] | ❌ | [[FF00FF]] | Bug severity (low, medium, high, critical) |

---

### 🤝 Meeting Properties (1)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `attendees` | array | [META: TAGS] | ❌ | [[FF006E]] | Meeting attendees list |

---

### 🏗️ Architecture Properties (3)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `source_component_ref` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Source component reference |
| `proposed_component_id` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Proposed component identifier |
| `component_id` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Component identifier |

---

### 🔗 Integration Properties (3)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `feed_integration` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Feed integration enabled flag |
| `canvas` | array | [META: TAGS] | ❌ | [[FF006E]] | Canvas file references |
| `VIZ-06` | array | [META: TAGS] | ❌ | [[FF006E]] | Visualization references |

---

### ⚙️ Configuration Properties (1)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `config_type` | string | [META: CATEGORY] | ❌ | [[8338EC]] | Configuration type classification |

---

### 🌐 Network & Web Properties (12)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `cookies` | object | [META: DYNAMIC] | ❌ | [[00FFFF]] | HTTP cookies object |
| `dns` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | DNS information |
| `os` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Operating system |
| `user_agent` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | User agent string |
| `browser` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Browser name |
| `ip` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | IP address |
| `ip4` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | IPv4 address |
| `ip6` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | IPv6 address |
| `ipv4` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | IPv4 address (alternate) |
| `ipv6` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | IPv6 address (alternate) |
| `etag` | string | [META: VERSION] | ❌ | [[06FFA5]] | Entity tag |
| `e_tag` | string | [META: VERSION] | ❌ | [[06FFA5]] | Entity tag (alternate) |

---

### 📡 Network & Request Properties (13)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `xff` | array | [META: DYNAMIC] | ❌ | [[00FFFF]] | X-Forwarded-For headers |
| `xForwardedFor` | array | [META: DYNAMIC] | ❌ | [[00FFFF]] | X-Forwarded-For headers (camelCase) |
| `userAgentRaw` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Raw user agent string |
| `referer` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | HTTP referer |
| `referrer` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | HTTP referrer (alternate) |
| `cookiesRaw` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Raw cookies string |
| `acceptLanguage` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Accept-Language header |
| `acceptEncoding` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Accept-Encoding header |
| `cacheControl` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Cache-Control header |
| `connectionType` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Connection type |
| `requestMethod` | string | [META: ACTIVE] | ❌ | [[FF00FF]] | HTTP request method |
| `requestPath` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Request path |
| `requestId` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Request identifier |

---

### 👤 User-Agent Parsed Properties (9)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `browserName` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Browser name |
| `browserVersion` | string | [META: VERSION] | ❌ | [[06FFA5]] | Browser version |
| `osName` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Operating system name |
| `osVersion` | string | [META: VERSION] | ❌ | [[06FFA5]] | Operating system version |
| `deviceType` | string | [META: CATEGORY] | ❌ | [[8338EC]] | Device type (mobile, desktop, tablet) |
| `deviceBrand` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Device brand |
| `deviceModel` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Device model |
| `isBot` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Bot detection flag |
| `isMobile` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Mobile device flag |

---

### 🌍 Geo-Location Properties (12)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `countryCode` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | ISO country code |
| `countryName` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Country name |
| `regionCode` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Region code |
| `regionName` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Region name |
| `city` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | City name |
| `zipCode` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | ZIP/postal code |
| `latitude` | number | [META: DYNAMIC] | ❌ | [[00FFFF]] | Latitude coordinate |
| `longitude` | number | [META: DYNAMIC] | ❌ | [[00FFFF]] | Longitude coordinate |
| `timezone` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Timezone identifier |
| `asn` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | Autonomous System Number |
| `isp` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Internet Service Provider |
| `isGeoBlocked` | boolean | [META: ACTIVE] | ❌ | [[FF00FF]] | Geographic blocking flag |

---

### 🍪 Cookie & Session Properties (5)

| Property | Type | Meta Tag | Required | Color | Description |
|----------|------|----------|----------|-------|-------------|
| `allCookies` | object | [META: DYNAMIC] | ❌ | [[00FFFF]] | All cookies object |
| `danCookie` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | DAN cookie value |
| `danSessionId` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | DAN session identifier |
| `csrfToken` | string | [META: DYNAMIC] | ❌ | [[00FFFF]] | CSRF token |
| `analyticsId` | string | [META: DOMAIN] | ❌ | [[3A86FF]] | Analytics identifier |

---

## 🏷️ Meta Tag Classifications

All properties are classified into 8 meta tag categories:

1. **[META: DOMAIN]** (25 properties) - Core identifiers, names, titles
2. **[META: DYNAMIC]** (27 properties) - Runtime values, network data
3. **[META: ACTIVE]** (10 properties) - Status flags, active states
4. **[META: CATEGORY]** (4 properties) - Classification, categorization
5. **[META: VERSION]** (20 properties) - Versioning, timestamps
6. **[META: DESCRIPTION]** (4 properties) - Descriptions, documentation
7. **[META: TAGS]** (5 properties) - Tags, arrays, lists
8. **[META: RELATIVE]** (1 property) - Relative paths, references

---

## 📖 Usage Notes

### Required Properties

For `type: dashboard`, these 6 properties are required:
- `id`
- `path`
- `status`
- `category`
- `version`
- `name`

### Enum Values

Some properties have restricted enum values:
- `type`: dashboard, documentation, note, etc.
- `status`: active, inactive, deprecated
- `category`: core, dashboard, project, etc.
- `priority`: low, medium, high, critical
- `severity`: low, medium, high, critical
- `requestMethod`: GET, POST, PUT, DELETE, etc.
- `deviceType`: mobile, desktop, tablet

### Validation

All properties can be validated via:
- API: `/api/frontmatter-properties/validate`
- TypeScript: `FRONTMATTER_PROPERTIES_REGISTRY`

### Color Coding

Each property has an associated hex color for visual identification in dashboards and UI.

---

## 🔗 Related Documentation

- **[[../Home|🏠 Home]]** - Vault homepage with properties overview
- **[[FRONTMATTER_TAG_REGISTRY|📋 Frontmatter Tag Registry]]** - Complete tag registry
- **[[GOLDEN_FILE_STANDARD|✨ Golden File Standard]]** - File standards guide

---

**Last Updated**: 2025-11-15

