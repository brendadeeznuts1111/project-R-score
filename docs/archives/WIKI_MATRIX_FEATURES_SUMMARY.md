# 🎯 FactoryWager Wiki Matrix - Complete Bun Integration

This document summarizes how the FactoryWager Wiki Matrix system leverages Bun's advanced features for a powerful, flexible wiki template management system.

## 🚀 Bun Features Utilized

### 1. **`bun run -` - stdin Pipe Support**
```bash
# Execute JSON commands via stdin
echo '{"action": "matrix"}' | bun run scripts/wiki-matrix-pipe.ts

# Programmatic usage with TypeScript
echo '{"action": "details", "params": {"index": 2}}' | bun run scripts/wiki-matrix-pipe.ts
```

**Implementation**: `scripts/wiki-matrix-pipe.ts` reads JSON commands from stdin and executes them without temporary files.

### 2. **`--filter` Pattern Matching**
```bash
# Pattern matching like Bun's workspace filter
bun run scripts/wiki-matrix-filter.ts --pattern "Conf*"    # Start with "Conf"
bun run scripts/wiki-matrix-filter.ts --pattern "*nfl*"    # Contain "nfl"
bun run scripts/wiki-matrix-filter.ts --pattern "*API"     # End with "API"
```

**Implementation**: Custom pattern matching system that mimics Bun's `--filter` behavior with glob patterns.

### 3. **TypeScript & JSX Support**
All files are TypeScript with full type safety:
- `scripts/wiki-matrix-cli.ts` - Interactive CLI with async/await
- `scripts/wiki-matrix-pipe.ts` - Pipe-based processing
- `scripts/wiki-matrix-filter.ts` - Advanced filtering
- `examples/wiki-pipe-programmatic.ts` - Programmatic API

### 4. **Fast Runtime Performance**
- Uses Bun's JavaScriptCore engine for 4x faster startup
- Native transpilation for TypeScript files
- Optimized string width calculations with `Bun.stringWidth`

### 5. **Package.json Scripts**
```json
{
  "wiki:matrix": "bun run scripts/wiki-matrix-cli.ts",
  "wiki:interactive": "bun run scripts/wiki-matrix-cli.ts interactive",
  "wiki:pipe": "bun run scripts/wiki-matrix-pipe.ts",
  "wiki:filter": "bun run scripts/wiki-matrix-filter.ts"
}
```

## 🎯 Complete Feature Matrix

### **Core CLI Commands**

| Command | Purpose | Bun Feature |
|---------|---------|-------------|
| `bun run wiki:matrix` | Display template matrix | TypeScript runtime |
| `bun run wiki:interactive` | Interactive console mode | Async/await, readline |
| `bun run wiki:pipe` | stdin pipe processing | `bun run -` |
| `bun run wiki:filter` | Pattern filtering | `--filter` style |

### **Advanced Features**

#### **1. Interactive Console Mode**
```bash
bun run wiki:interactive
wiki-matrix> matrix
wiki-matrix> details 2
wiki-matrix> compare
wiki-matrix> exit
```

#### **2. Pipe-Based Processing**
```bash
# JSON output for programmatic use
echo '{"action": "matrix", "format": "json"}' | bun run wiki:pipe

# CSV export for spreadsheets
echo '{"action": "stats", "format": "csv"}' | bun run wiki:pipe

# Pipeline with other tools
echo '{"action": "templates"}' | bun run wiki:pipe | jq '.[].name'
```

#### **3. Advanced Filtering**
```bash
# Pattern matching (like bun --filter)
bun run wiki:filter --pattern "Conf*"
bun run wiki:filter --pattern "*nfl*"

# Multi-criteria filtering
bun run wiki:filter --format markdown --has-examples true --sort-by name

# Complex combinations
bun run wiki:filter --use-case "*Enterprise*" --limit 3
```

#### **4. Custom Table Formatting**
- Uses `Bun.stringWidth` for proper column sizing
- Unicode box-drawing characters for beautiful tables
- Color-coded complexity and format indicators
- Responsive column width calculation

#### **5. Export Capabilities**
```bash
# Export to different formats
echo '{"action": "matrix", "format": "json"}' | bun run wiki:pipe > matrix.json
echo '{"action": "matrix", "format": "csv"}' | bun run wiki:pipe > matrix.csv
```

## 📊 Template Analysis Features

### **Template Properties Tracked**
- **Name & Description** - Full text search capability
- **Format** - markdown, html, json
- **Complexity** - Simple, Medium, Advanced
- **Use Case** - Enterprise Wiki, Team Collaboration, etc.
- **Examples** - Boolean flag for code examples
- **Custom Sections** - Count of additional sections
- **Integration** - Direct Import, API Integration, etc.

### **Analysis Capabilities**
- **Statistics** - Distribution charts and counts
- **Comparison Matrix** - Feature comparison across templates
- **Detailed Views** - Individual template deep-dive
- **Search & Filter** - Pattern matching across all properties

## 🔧 Technical Implementation

### **Bun.stringWidth Usage**
```typescript
// Proper column width calculation for Unicode characters
colWidths[i] = Math.min(maxWidth + 2, 25);

// Custom table formatting with accurate spacing
const paddedValue = value.padEnd(colWidths[colIndex]);
```

### **Async Console Iteration**
```typescript
// Interactive mode with proper async handling
const readline = await import('node:readline/promises');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

while (this.isRunning) {
  const command = await rl.question(styled('wiki-matrix> ', 'primary'));
  await this.executeInteractiveCommand(command);
}
```

### **Exit Handling & Cleanup**
```typescript
// Proper signal handling for graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', errorHandler);
process.on('unhandledRejection', errorHandler);
```

### **Pattern Matching Engine**
```typescript
// Glob-style pattern matching like Bun's --filter
private matchesPattern(text: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(regexPattern, 'i');
  return regex.test(text);
}
```

## 🎨 Visual Features

### **Color Coding**
- 🟢 **Green** - Success, Simple complexity, Markdown format
- 🟡 **Yellow** - Warning, Medium complexity, HTML format  
- 🔴 **Red** - Error, Advanced complexity, JSON format
- 🔵 **Blue** - Primary information, template names
- 🟣 **Purple** - Accent colors, integration types

### **Unicode Tables**
```text
┌──────────────────────┬─────────┬─────────────┬──────────────────┐
│ Template Name        │ Format  │ Complexity  │ Use Case         │
├──────────────────────┼─────────┼─────────────┼──────────────────┤
│ Confluence Integration│ MARKDOWN│ Simple      │ Enterprise Wiki  │
│ Notion API           │ JSON    │ Medium      │ Team Collaboration│
└──────────────────────┴─────────┴─────────────┴──────────────────┘
```

### **Progress Bars & Charts**
```text
🎯 Complexity Distribution:
   Simple: ██████████ 4 (80%)
   Medium: ██         1 (20%)
   Advanced:          0 (0%)
```

## 📚 Usage Examples

### **Basic Operations**
```bash
# Show all templates
bun run wiki:matrix

# Interactive mode
bun run wiki:interactive

# Get help
bun run wiki:matrix help
```

### **Advanced Filtering**
```bash
# Pattern matching like bun --filter
bun run wiki:filter --pattern "Conf*"

# Multi-criteria filtering
bun run wiki:filter --format markdown --has-examples true --sort-by name

# Complex search
bun run wiki:filter --use-case "*Enterprise*" --complexity "Simple*" --limit 3
```

### **Pipe Operations**
```bash
# JSON output for APIs
echo '{"action": "matrix", "format": "json"}' | bun run wiki:pipe

# CSV for spreadsheets
echo '{"action": "stats", "format": "csv"}' | bun run wiki:pipe

# Pipeline with jq
echo '{"action": "templates"}' | bun run wiki:pipe | jq '.[] | select(.format == "markdown")'
```

### **Programmatic Usage**
```typescript
import { WikiMatrixClient } from './examples/wiki-pipe-programmatic.ts';

const client = new WikiMatrixClient();
const matrix = await client.getMatrix('json');
const details = await client.getTemplateDetails(1);
const search = await client.searchTemplates('Confluence');
```

## 🚀 Performance Benefits

### **Bun Optimizations**
- **4x faster startup** than Node.js
- **Native TypeScript** transpilation
- **JavaScriptCore engine** optimization
- **Efficient string operations** with Bun.stringWidth

### **Memory Management**
- **Proper cleanup** on exit
- **Stream processing** for large datasets
- **Efficient table rendering** without memory leaks

## 🎯 Integration with FactoryWager MCP

### **MCP Bridge Integration**
- Claude Desktop can generate wikis via MCP tools
- Master token authentication for security
- R2 storage for wiki content persistence

### **Dashboard Integration**
- Real-time wiki generation monitoring
- Template usage analytics
- System health tracking

## 📈 Extensibility

### **Adding New Templates**
```typescript
// Templates are automatically loaded from MCPWikiGenerator
const templates = MCPWikiGenerator.getWikiTemplates();
```

### **Custom Filters**
```typescript
// Extend filtering with new criteria
private customFilter(template: TemplateInfo): boolean {
  // Your custom logic here
}
```

### **Export Formats**
```typescript
// Add new export formats (XML, YAML, etc.)
case 'xml':
  return this.generateXML(data);
```

## 🎉 Summary

The FactoryWager Wiki Matrix system demonstrates advanced Bun usage:

✅ **`bun run -`** for stdin pipe processing  
✅ **`--filter` style** pattern matching  
✅ **TypeScript** with full type safety  
✅ **Async/await** for console interaction  
✅ **Bun.stringWidth** for proper formatting  
✅ **Fast runtime** performance optimization  
✅ **Package.json** script integration  
✅ **Proper exit handling** and cleanup  
✅ **Unicode table** formatting  
✅ **Color-coded** visual output  

This creates a powerful, flexible wiki template management system that showcases the best of Bun's capabilities while providing practical value for the FactoryWager MCP ecosystem.
