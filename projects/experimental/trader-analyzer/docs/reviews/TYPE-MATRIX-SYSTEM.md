# 🎯 Type Matrix System

## Overview

Comprehensive type/property matrix system with categorization, sorting, filtering, and display utilities using Bun's native APIs.

---

## 📊 Features

### ✅ Property Categorization
- **10 Categories**: financial, temporal, identifier, metadata, analytics, correlation, arbitrage, risk, performance, system
- **Automatic Categorization**: Based on property ID, description, and tags
- **Manual Override**: Can be customized per property

### ✅ Sorting & Filtering
- **Sort Fields**: id, namespace, version, type, category, usageCount, name
- **Sort Orders**: ascending, descending
- **Filters**: category, namespace, type, usage range
- **Pagination**: limit and offset support

### ✅ Display Formats
- **Table**: Formatted table with colors and alignment
- **JSON**: Structured JSON output
- **CSV**: Comma-separated values
- **Markdown**: Markdown table format
- **Inspect**: Bun's native inspect with custom options

### ✅ Type Matrices
- **Per Data Source Type**: sportsbook, exchange, market, file
- **Pattern Detection**: Required, optional, derived properties
- **Statistics**: Category distribution, usage patterns

---

## 🚀 Usage

### Basic Usage

```typescript
import { PropertyMatrixManager } from "./utils/type-matrix";

const manager = new PropertyMatrixManager();

// Add properties
manager.addProperty(propertyDefinition);

// Display properties
manager.displayProperties({
  format: "table",
  sortBy: "usageCount",
  sortOrder: "desc",
  filterCategory: "financial",
  color: true,
});
```

### CLI Usage

```bash
# List all properties
bun run type-matrix list

# List with filters
bun run type-matrix list --category financial --type number --sort usageCount --order desc

# Show type matrix
bun run type-matrix type sportsbook --format table

# Search properties
bun run type-matrix search price

# Inspect property
bun run type-matrix inspect price --format inspect

# Show statistics
bun run type-matrix stats

# Filter properties
bun run type-matrix filter --category financial --namespace "@nexus/providers"
```

---

## 📋 Property Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **financial** | Price, cost, fees, volume, odds | `price`, `cost`, `fee`, `volume`, `odds` |
| **temporal** | Time, date, timestamp, duration | `timestamp`, `date`, `time`, `duration` |
| **identifier** | IDs, UUIDs, keys | `id`, `uuid`, `key`, `identifier` |
| **metadata** | Source, namespace, tags | `source`, `namespace`, `tags` |
| **analytics** | Statistics, metrics, scores | `stats`, `metrics`, `score`, `analytics` |
| **correlation** | Cross-source correlations | `correlation`, `correlate` |
| **arbitrage** | Arbitrage opportunities | `arbitrage`, `opportunity` |
| **risk** | Risk metrics, volatility | `risk`, `volatility`, `tension` |
| **performance** | Performance metrics | `latency`, `throughput`, `performance` |
| **system** | System-level properties | `system`, `source`, `namespace` |

---

## 🎨 Display Options

### Table Format
```typescript
manager.displayProperties({
  format: "table",
  color: true,
  compact: false,
  showRowNumbers: true,
  align: "left",
});
```

**Output:**
```
================================================================================
PROPERTY MATRIX (42 properties)
================================================================================
#  ID      Category    Type     Namespace                    Usage  Description
1  price   financial   number   @nexus/providers             1250   Market price
2  volume  financial   number   @nexus/providers             890    Trading volume
...
```

### JSON Format
```typescript
manager.displayProperties({
  format: "json",
});
```

**Output:**
```json
[
  {
    "id": "price",
    "category": "financial",
    "type": "number",
    "namespace": "@nexus/providers",
    "usage": { "count": 1250, "lastUsed": 1234567890 },
    "performance": { "avgAccessTime": 0.5, "cacheHitRate": 0.95 }
  }
]
```

### CSV Format
```typescript
manager.displayProperties({
  format: "csv",
});
```

**Output:**
```csv
id,category,type,namespace,version,usage_count,description
price,financial,number,@nexus/providers,1.0.0,1250,Market price
volume,financial,number,@nexus/providers,1.0.0,890,Trading volume
```

### Markdown Format
```typescript
manager.displayProperties({
  format: "markdown",
});
```

**Output:**
```markdown
| ID | Category | Type | Namespace | Usage | Description |
|----|----------|------|-----------|-------|-------------|
| price | financial | number | @nexus/providers | 1250 | Market price |
| volume | financial | number | @nexus/providers | 890 | Trading volume |
```

### Inspect Format
```typescript
manager.displayProperties({
  format: "inspect",
  compact: false,
  color: true,
});
```

**Output:**
```
================================================================================
Property 1: price
================================================================================
{
  property: {
    id: 'price',
    namespace: '@nexus/providers',
    version: '1.0.0',
    type: 'number',
    ...
  },
  category: 'financial',
  usage: { count: 1250, lastUsed: 1234567890 },
  ...
}
```

---

## 🔍 Filtering Examples

### By Category
```typescript
manager.displayProperties({
  filterCategory: "financial",
});
```

### By Multiple Categories
```typescript
manager.displayProperties({
  filterCategory: ["financial", "temporal"],
});
```

### By Namespace
```typescript
manager.displayProperties({
  filterNamespace: "@nexus/providers",
});
```

### By Type
```typescript
manager.displayProperties({
  filterType: "number",
});
```

### By Usage Range
```typescript
manager.getProperties({
  // Filter internally by usage
  // Then display
});
```

---

## 📈 Type Matrices

### Get Type Matrix
```typescript
const matrix = manager.getTypeMatrix("sportsbook");
// or build it
const matrix = manager.buildTypeMatrix("sportsbook");
```

### Display Type Matrix
```typescript
manager.displayTypeMatrix("sportsbook", {
  format: "table",
  color: true,
});
```

**Output:**
```
================================================================================
TYPE MATRIX: SPORTSBOOK
================================================================================
Total Properties: 15
Categories:
  financial: 5
  temporal: 3
  identifier: 2
  metadata: 2
  analytics: 3

Required Properties: eventId, marketId, odds
Optional Properties: 12
Derived Properties: 3
```

---

## 📊 Statistics

### Get Statistics
```typescript
const stats = manager.getStats();
console.log(`Total Properties: ${stats.totalProperties}`);
console.log(`Most Used: ${stats.mostUsed.map(e => e.property.id)}`);
```

### Display Statistics
```bash
bun run type-matrix stats
```

**Output:**
```
================================================================================
MATRIX STATISTICS
================================================================================
Total Properties: 42
Total Namespaces: 5
Total Categories: 10

Most Used Properties:
  1. price (1250 uses)
  2. volume (890 uses)
  3. timestamp (756 uses)
  ...

Least Used Properties:
  1. correlation_score (5 uses)
  2. tension_indicator (3 uses)
  ...
```

---

## 🎯 Integration with Pipeline

### Add Properties from Registry
```typescript
import { PropertyRegistry } from "../properties";
import { PropertyMatrixManager } from "../utils/type-matrix";

const registry = new PropertyRegistry();
const matrix = new PropertyMatrixManager();

// Query properties
const properties = registry.query({ namespace: "@nexus/providers" });

// Add to matrix
for (const property of properties) {
  matrix.addProperty(property, {
    count: 0, // Would come from usage tracking
    endpoints: [],
    users: [],
  });
}

// Display
matrix.displayProperties({
  format: "table",
  sortBy: "usageCount",
  sortOrder: "desc",
});
```

---

## 🔧 Advanced Usage

### Custom Categorization
```typescript
// Override categorization logic
class CustomMatrixManager extends PropertyMatrixManager {
  categorizeProperty(property: PropertyDefinition): PropertyCategory {
    // Custom logic
    if (property.id === "custom_property") {
      return "financial";
    }
    return super.categorizeProperty(property);
  }
}
```

### Custom Display Format
```typescript
class CustomMatrixManager extends PropertyMatrixManager {
  displayProperties(options: TableDisplayOptions = {}): void {
    // Custom display logic
    if (options.format === "custom") {
      this.displayCustom(entries, options);
    } else {
      super.displayProperties(options);
    }
  }
}
```

---

## 📦 Bun Native APIs Used

### Console Formatting
- ANSI color codes for colored output
- Custom table formatting
- Structured logging

### JSON Handling
- `JSON.stringify()` with formatting
- Native JSON parsing

### File System
- File reading/writing for CSV/JSON export
- Log file management

### Process APIs
- Command-line argument parsing
- Process exit codes
- Signal handling

---

## 🎨 Color Coding

| Category | Color | Usage |
|----------|-------|-------|
| financial | Green | Price, cost, volume |
| temporal | Blue | Time, date, duration |
| identifier | Yellow | IDs, UUIDs |
| analytics | Magenta | Stats, metrics |
| risk | Red | Risk, volatility |
| performance | Yellow | Performance metrics |
| system | Gray | System properties |

---

## 📝 Examples

### Example 1: List Financial Properties
```bash
bun run type-matrix list --category financial --format table --sort usageCount --order desc
```

### Example 2: Export to CSV
```bash
bun run type-matrix list --format csv > properties.csv
```

### Example 3: Inspect Property
```bash
bun run type-matrix inspect price --format inspect
```

### Example 4: Type Matrix for Sportsbook
```bash
bun run type-matrix type sportsbook --format table --color
```

### Example 5: Search Properties
```bash
bun run type-matrix search "price" --format json
```

---

## 🚀 Performance

- **Fast Lookups**: Map-based indexing for O(1) access
- **Efficient Sorting**: Native JavaScript sort with custom comparators
- **Memory Efficient**: Only stores references, not full copies
- **Lazy Loading**: Type matrices built on-demand

---

## 📚 API Reference

### PropertyMatrixManager

#### Methods
- `addProperty()` - Add property to matrix
- `getProperties()` - Get filtered/sorted properties
- `displayProperties()` - Display with formatting
- `getStats()` - Get matrix statistics
- `getTypeMatrix()` - Get type matrix
- `buildTypeMatrix()` - Build type matrix
- `displayTypeMatrix()` - Display type matrix
- `categorizeProperty()` - Categorize property
- `sortProperties()` - Sort properties
- `filterProperties()` - Filter properties

#### Properties
- `matrix` - Complete matrix system
- `categories` - Available categories

---

## ✅ Status

**Status**: ✅ Complete and ready for use

**Features**:
- ✅ Property categorization
- ✅ Sorting and filtering
- ✅ Multiple display formats
- ✅ Type matrices
- ✅ Statistics
- ✅ CLI interface
- ✅ Bun native APIs
- ✅ Color coding
- ✅ Performance optimized

---

**Next Steps**:
1. Integrate with PropertyRegistry
2. Add usage tracking
3. Add performance metrics
4. Add export/import functionality
5. Add web dashboard integration
