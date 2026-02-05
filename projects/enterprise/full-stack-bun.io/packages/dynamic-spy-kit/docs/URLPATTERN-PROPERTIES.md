# URLPattern Properties Reference

## Complete URLPattern Property List

URLPattern supports 8 properties for matching URLs:

### Required Properties

- **`pathname`** (string, required) - Path pattern (e.g., `/odds/:market`)

### Optional Properties

- **`protocol`** (string, optional) - Protocol pattern (e.g., `https:`)
- **`username`** (string, optional) - Username pattern
- **`password`** (string, optional) - Password pattern
- **`hostname`** (string, optional) - Hostname pattern (e.g., `bookie.com`, `*.bookie.com`)
- **`port`** (string, optional) - Port pattern (e.g., `8080`)
- **`search`** (string, optional) - Query string pattern (e.g., `?key=value`)
- **`hash`** (string, optional) - Hash/fragment pattern (e.g., `#section`)

## Usage Examples

### Basic Pattern (pathname only)

```json
{
  "id": "BASIC_PATTERN",
  "pathname": "/odds/:market"
}
```

### Full Pattern (all properties)

```json
{
  "id": "FULL_PATTERN",
  "protocol": "https:",
  "hostname": "bookie.com",
  "port": "443",
  "pathname": "/api/v1/odds/:market",
  "search": "?key=value",
  "hash": "#section"
}
```

### Wildcard Hostname

```json
{
  "id": "WILDCARD_HOST",
  "hostname": "*.bookie.com",
  "pathname": "/odds/:market"
}
```

### Multiple Path Segments

```json
{
  "id": "MULTI_SEGMENT",
  "pathname": "/sports/:sport/:league/:matchId"
}
```

## Validation Rules

1. **`pathname`** is required - must be a string
2. All other properties are optional
3. If provided, properties must be strings
4. Wildcards (`*`) are supported in hostname and pathname
5. Named groups (`:name`) are supported in pathname

## Pattern Priority

Patterns are matched in priority order:
- Higher priority patterns checked first
- First matching pattern wins
- Fallback to generic wildcard if no match

## HMR Validation

The HMR safe pattern loader validates:
- ✅ JSON syntax
- ✅ Required `pathname` property
- ✅ Type validation for all properties
- ✅ Pattern structure validation

Invalid patterns are logged with:
- File location
- Line number (approximate)
- Specific property errors
- Fix suggestions



