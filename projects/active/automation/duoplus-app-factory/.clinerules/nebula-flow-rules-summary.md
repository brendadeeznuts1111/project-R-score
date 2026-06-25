# Nebula Flow Configuration Management Rules Summary (v3.8.0)

## Quick Reference

### Files
- **Configuration**: `projects.json` (VSCode global storage)
- **Manager**: `scripts/nebula-flow.ts` (Bun-native)
- **Rules**: `.clinerules/nebula-flow-configuration.md` (comprehensive)

### Commands
```bash
# Validate configuration
bun run nebula-flow:validate

# Generate tags index
bun run nebula-flow:index

# Search (using ripgrep)
rg -f ~/.nebula-tags.index "pattern"
```

### Project Structure
```typescript
{
  name: "🌌 Nebula-Flow™ Core (Primary)",
  readableTag: "[NEBULA][CORE][PROD][NEB-CORE-001][v1.4][ACTIVE]",
  grepTag: "nebula-core-prod-neb-core-001-v1.4-active",
  rootPath: "/Users/nolarose/d-network",
  tags: ["production", "core", "security"],
  group: "Production Systems",
  profile: "nebula-production",
  ui: {
    severity: "critical-infrastructure",
    statusColor: {
      hsl: "hsl(135, 85%, 52%)",
      hex: "#2ecc71"
    }
  }
}
```

### Severity Levels
| Severity Level | Color | Purpose |
|----------------|-------|---------|
| critical-infrastructure | Green (#2ecc71) | Core fraud detection |
| high-compliance | Yellow (#f1c40f) | Security/GDPR |
| financial-critical | Yellow (#f1c40f) | Financial optimization |
| devops-critical | Cyan (#1abc9c) | Build/deployment |
| frontend-production | Gray (#95a5a6) | Web dashboard |
| tooling-development | Purple (#9b59b6) | CLI tools |
| testing-quality | Purple (#9b59b6) | Testing |
| research-experimental | Blue (#3498db) | AI/ML |
| demo-educational | Purple (#9b59b6) | Examples |
| information-reference | Gray (#95a5a6) | Documentation |

### Performance Metrics
- **Validation Time**: ~20ms for 10 projects
- **Index Generation**: ~45ms for 10 projects
- **Search Time**: Sub-second with ripgrep
- **File Size**: < 50KB for 10 projects

## Validation Checklist

When modifying or adding projects:
1. ✅ Required fields: name, readableTag, grepTag, rootPath, tags, group, profile
2. ✅ Root path exists and is accessible
3. ✅ Tags follow valid format
4. ✅ Severity level is valid
5. ✅ Profile is in valid list
6. ✅ No duplicate entries
7. ✅ Dynamic patterns follow `${VARIABLE}` syntax

## Quick Validation

```bash
bun run nebula-flow:validate
bun run nebula-flow:index
```

## Search Examples

```bash
# Find all production projects
rg -f ~/.nebula-tags.index "prod"

# Find all AI/ML projects
rg -f ~/.nebula-tags.index "ai"

# Find all compliance-related projects
rg -f ~/.nebula-tags.index "sec|compliance|gdpr"
```
