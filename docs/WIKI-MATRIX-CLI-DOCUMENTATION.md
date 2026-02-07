# 📋 **Wiki Matrix CLI - Complete Documentation**

> **Enterprise-Grade CLI Tool**: Comprehensive wiki template matrix analysis with proper Bun API integration and enterprise-grade error handling

---

## 🎯 **Overview**

The Wiki Matrix CLI is a powerful command-line tool for analyzing and displaying wiki templates in a formatted matrix. It leverages Bun's native `inspect.table` API for professional table formatting and includes comprehensive error handling, input validation, and interactive features.

### **Key Features**
- **🔍 Native Bun Integration**: Uses `Bun.inspect.table` for professional formatting
- **📊 Comprehensive Analysis**: Template statistics, comparisons, and detailed views
- **🎮 Interactive Mode**: Full interactive console experience
- **🛡️ Enterprise-Grade**: Input validation, error handling, and resource management
- **🎨 Beautiful Output**: Color-coded tables with Unicode borders
- **⚡ Performance Optimized**: Efficient rendering and memory management

---

## 🚀 **Installation & Usage**

### **Basic Usage**
```bash
# Display complete template matrix
bun run scripts/wiki-matrix-cli.ts

# Show detailed view of template #2
bun run scripts/wiki-matrix-cli.ts details 2

# Show feature comparison matrix
bun run scripts/wiki-matrix-cli.ts compare

# Display statistics only
bun run scripts/wiki-matrix-cli.ts stats

# Start interactive mode
bun run scripts/wiki-matrix-cli.ts interactive

# Show help
bun run scripts/wiki-matrix-cli.ts help
```

### **Standalone Version (No Dependencies)**
```bash
# Use the standalone version with mock data
bun run scripts/wiki-matrix-cli-standalone.ts matrix
```

---

## 📊 **Command Reference**

### **matrix**
Displays the complete template matrix with both native Bun table formatting and enhanced custom tables.

```bash
bun run scripts/wiki-matrix-cli.ts matrix
```

**Output:**
- Native `Bun.inspect.table` formatting
- Enhanced custom table with color coding
- Comprehensive statistics and charts

### **details <index>**
Shows detailed information about a specific template.

```bash
bun run scripts/wiki-matrix-cli.ts details 2
```

**Parameters:**
- `index`: Template number (1-based, validated)

**Features:**
- Input validation with clear error messages
- Complete template information display
- Usage examples and integration tips

### **compare**
Displays a feature comparison matrix across all templates.

```bash
bun run scripts/wiki-matrix-cli.ts compare
```

**Features:**
- Feature availability comparison
- Checkmark indicators (✅/❌)
- Native table formatting

### **stats**
Shows statistical analysis only.

```bash
bun run scripts/wiki-matrix-cli.ts stats
```

**Includes:**
- Template count and distribution
- Format and complexity breakdowns
- Visual charts with progress bars

### **interactive**
Starts interactive console mode.

```bash
bun run scripts/wiki-matrix-cli.ts interactive
```

**Commands in interactive mode:**
- `matrix` - Show template matrix
- `details N` - Show template details
- `compare` - Show feature comparison
- `stats` - Show statistics
- `clear` - Clear screen
- `help` - Show interactive help
- `exit` - Exit interactive mode

---

## 🛠️ **Technical Implementation**

### **Architecture Overview**
```typescript
class WikiMatrixCLI {
  private templates: TemplateMatrix[] = [];
  private isRunning = false;
  private cleanupHandlers: (() => void)[] = [];
  
  // Async factory pattern for proper initialization
  static async create(): Promise<WikiMatrixCLI>
  
  // Core display methods
  displayMatrix(): void
  displayDetailedView(index: number): void
  displayComparisonMatrix(): void
  displayStatistics(): void
  
  // Interactive mode
  private async runInteractiveMode(): Promise<void>
}
```

### **Key Interfaces**
```typescript
interface TemplateMatrix {
  name: string;
  description: string;
  baseUrl: string;
  workspace: string;
  format: string;
  examples: boolean;
  sections: number;
  useCase: string;
  complexity: 'Simple' | 'Medium' | 'Advanced';
  integration: string;
}
```

### **Bun API Integration**
```typescript
// Native Bun.inspect.table usage
console.log(Bun.inspect.table(matrixData, undefined, { colors: true }));

// Bun.stringWidth for proper column sizing
const width = Bun.stringWidth(value);

// Color support with Bun.color
const coloredText = Bun.color(color, 'ansi') + text + Bun.color('reset', 'ansi');
```

---

## 🔧 **Configuration & Constants**

### **Display Constants**
```typescript
const DEFAULT_MAX_URL_LENGTH = 30;
const DEFAULT_MAX_WORKSPACE_LENGTH = 20;
const DEFAULT_MAX_DESCRIPTION_LENGTH = 40;
const DEFAULT_MAX_COLUMN_WIDTH = 25;
const BASE_SECTION_COUNT = 4;
```

### **Color Coding**
- **🟢 Simple**: Green for low complexity
- **🟡 Medium**: Yellow for moderate complexity  
- **🔴 Advanced**: Red for high complexity
- **✅ Available**: Green checkmarks for available features
- **❌ Unavailable**: Red X for missing features

### **Format Colors**
- **MARKDOWN**: Green (direct import)
- **HTML**: Yellow (embed/iframe)
- **JSON**: Red (API integration)

---

## 🛡️ **Error Handling & Validation**

### **Input Validation**
```typescript
// Index validation
if (!Number.isInteger(index) || index < 1 || index > this.templates.length) {
  console.log(styled(`❌ Invalid template index. Use 1-${maxIndex}`, 'error'));
  return;
}

// String validation
const index = parseInt(indexStr);
if (isNaN(index) || index < 1) {
  console.log(styled('❌ Invalid index. Please provide a valid positive number.', 'error'));
  return;
}
```

### **Error Recovery**
```typescript
// Safe cleanup with error handling
private cleanup(): void {
  this.isRunning = false;
  this.cleanupHandlers.forEach(handler => {
    try {
      handler();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
  this.cleanupHandlers = [];
}
```

### **Resource Management**
- **Memory Leak Prevention**: Proper cleanup handlers
- **Signal Handling**: SIGINT, SIGTERM, SIGHUP
- **Exception Handling**: Uncaught exceptions and promise rejections
- **Graceful Shutdown**: Proper resource cleanup

---

## 📊 **Output Examples**

### **Matrix Display**
```
🎯 Wiki Template Matrix Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comprehensive template overview with Bun inspect formatting

┌───┬────────────────────────┬──────────┬────────────────────┬────────────┬──────────┬──────────┬─────────────────┬─────────────────────────┬──────────────────────┐
│   │ Template               │ Format   │ Use Case           │ Complexity │ Examples │ Sections │ Integration     │ Base URL               │ Workspace            │
├───┼────────────────────────┼──────────┼────────────────────┼────────────┼──────────┼──────────┼─────────────────┼─────────────────────────┼──────────────────────┤
│ 1 │ Confluence Integration │ MARKDOWN │ Enterprise Wiki    🟢 Simple    │ ✅        │ 6        │ Direct Import     │ yourcompany.atlassian... │ engineering/bun-u... │
│ 2 │ Notion Workspace       │ HTML     │ Team Collaboration 🟢 Simple    │ ✅        │ 6        │ Embed/IFrame      │ notion.so/your-worksp... │ product/documenta... │
└───┴────────────────────────┴──────────┴────────────────────┴────────────┴──────────┴──────────┴─────────────────┴─────────────────────────┴──────────────────────┘
```

### **Statistics Display**
```
📊 Template Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────────────┬────────┬──────────┐
│ Metric                 │ Value   │ Type     │
├──────────────────────┼────────┼──────────┤
│ Total Templates        │ 6       │ Count    │
│ With Examples          │ 4/6     │ Ratio    │
│ Avg Sections           │ 6       │ Average  │
│ Markdown Format        │ 3       │ Format   │
│ HTML Format            │ 2       │ Format   │
│ JSON Format            │ 1       │ Format   │
└──────────────────────┴────────┴──────────┘

🎯 Complexity Distribution:
   Simple: ██████████ 6 (100%)

📄 Format Distribution:
   MARKDOWN: █████ 3 (50%)
   HTML: ███ 2 (33%)
   JSON: ██ 1 (17%)
```

### **Detailed View**
```
🔍 Detailed View: Notion Workspace
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┬───────────────────────────────────────────────┐
│ Property       │ Value                                           │
├──────────────┼───────────────────────────────────────────────┤
│ Name           │ Notion Workspace                                │
│ Description    │ HTML format for Notion workspace integration    │
│ Base URL       │ https://notion.so/your-workspace                │
│ Workspace      │ product/documentation                           │
│ Format         │ HTML                                            │
│ Use Case       │ Team Collaboration                              │
│ Complexity     │ Simple                                          │
│ Examples       │ Yes                                             │
│ Sections       │ 6                                               │
│ Integration    │ Embed/IFrame                                    │
└──────────────┴───────────────────────────────────────────────┘

💡 Usage Example:
   bun run wiki:template "Notion Workspace"
```

---

## 🎮 **Interactive Mode**

### **Features**
- **Real-time Commands**: No need to restart for different operations
- **Input Validation**: All inputs validated with helpful error messages
- **Command History**: Use arrow keys for command history (terminal dependent)
- **Clear Screen**: Built-in clear command
- **Help System**: Context-sensitive help

### **Interactive Commands**
```bash
wiki-matrix> matrix
# Shows the complete template matrix

wiki-matrix> details 2
# Shows details for template #2

wiki-matrix> compare
# Shows feature comparison matrix

wiki-matrix> stats
# Shows statistics only

wiki-matrix> clear
# Clears the screen

wiki-matrix> help
# Shows interactive help

wiki-matrix> exit
# Exits interactive mode
```

---

## 🔧 **Development & Extension**

### **Adding New Templates**
```typescript
// In MCPWikiGenerator.getWikiTemplates()
{
  name: 'New Template',
  description: 'Description of the new template',
  baseUrl: 'https://example.com',
  workspace: 'workspace/name',
  format: 'markdown',
  includeExamples: true,
  customSections: ['## Custom Section', '## Another Section']
}
```

### **Customizing Display Logic**
```typescript
// Modify determineUseCase() for new use case detection
private determineUseCase(name: string): string {
  if (name.includes('Custom')) return 'Custom Use Case';
  // ... existing logic
}

// Modify determineComplexity() for custom complexity scoring
private determineComplexity(template: WikiTemplate): 'Simple' | 'Medium' | 'Advanced' {
  // Custom complexity logic
}
```

### **Adding New Features**
```typescript
// Add new feature to comparison matrix
const features = ['Examples', 'Custom Sections', 'API Ready', 'Easy Import', 'Enterprise Ready', 'New Feature'];

// Add feature detection logic
case 'New Feature':
  hasFeature = template.customField === 'special-value';
  break;
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"No templates available to display"**
- **Cause**: MCPWikiGenerator.getWikiTemplates() returned empty array
- **Solution**: Use standalone version or check template configuration

#### **"Invalid template index"**
- **Cause**: Index out of range or not a number
- **Solution**: Use valid index number (1-based) from matrix display

#### **"Failed to load readline module"**
- **Cause**: Node.js readline module not available
- **Solution**: Ensure running in Node.js-compatible environment

#### **"Failed to initialize CLI"**
- **Cause**: Error during template loading or initialization
- **Solution**: Check template configuration and dependencies

### **Debug Mode**
```bash
# Enable verbose logging
DEBUG=1 bun run scripts/wiki-matrix-cli.ts matrix

# Use standalone version for dependency isolation
bun run scripts/wiki-matrix-cli-standalone.ts matrix
```

---

## 📈 **Performance Considerations**

### **Memory Usage**
- **Template Storage**: Minimal memory footprint
- **Table Rendering**: Efficient string width calculations
- **Interactive Mode**: Single readline instance
- **Cleanup**: Proper resource management prevents leaks

### **Rendering Performance**
- **Native Tables**: Bun.inspect.table optimized for performance
- **Custom Tables**: Efficient column width calculation
- **Color Output**: Minimal overhead with ANSI colors
- **Large Datasets**: Handles 100+ templates efficiently

### **Optimization Tips**
- Use standalone version for dependency isolation
- Limit template count for very large datasets
- Use stats command for quick overview
- Leverage native table formatting for best performance

---

## 🎯 **Best Practices**

### **Usage Patterns**
```bash
# Quick overview
bun run scripts/wiki-matrix-cli.ts stats

# Detailed analysis
bun run scripts/wiki-matrix-cli.ts matrix

# Specific template investigation
bun run scripts/wiki-matrix-cli.ts details 3

# Feature comparison
bun run scripts/wiki-matrix-cli.ts compare

# Interactive exploration
bun run scripts/wiki-matrix-cli.ts interactive
```

### **Integration Examples**
```bash
# Script integration
for i in {1..6}; do
  bun run scripts/wiki-matrix-cli.ts details $i
done

# Pipe to less for large outputs
bun run scripts/wiki-matrix-cli.ts matrix | less

# Export to file
bun run scripts/wiki-matrix-cli.ts matrix > wiki-matrix.txt
```

### **Error Handling**
```bash
# Always check exit codes
bun run scripts/wiki-matrix-cli.ts details 999 || echo "Invalid index"

# Use conditional execution
bun run scripts/wiki-matrix-cli.ts stats && echo "Stats loaded successfully"
```

---

## 📚 **API Reference**

### **Core Methods**
```typescript
// Main entry point
static async create(): Promise<WikiMatrixCLI>

// Display methods
displayMatrix(): void
displayDetailedView(index: number): void
displayComparisonMatrix(): void
displayStatistics(): void

// Execution
async run(): Promise<void>
```

### **Utility Methods**
```typescript
// Template analysis
private determineUseCase(name: string): string
private determineComplexity(template: WikiTemplate): 'Simple' | 'Medium' | 'Advanced'
private determineIntegration(format: string): string

// Formatting
private formatUrl(url: string): string
private formatWorkspace(workspace: string): string
private formatDescription(description: string): string
```

### **Error Handling**
```typescript
// Resource management
private cleanup(): void
private setupExitHandlers(): void

// Validation
private validateIndex(index: number): boolean
private validateCommand(command: string): boolean
```

---

## ✨ **Conclusion**

The Wiki Matrix CLI provides **enterprise-grade template analysis** with:

- **🔍 Professional Output**: Native Bun table formatting with custom enhancements
- **🛡️ Reliability**: Comprehensive error handling and input validation
- **🎮 Flexibility**: Both command-line and interactive modes
- **⚡ Performance**: Optimized for large datasets and frequent use
- **🎨 Usability**: Color-coded output with clear visual hierarchy
- **🔧 Extensibility**: Clean architecture for easy customization

This tool establishes **a new standard for CLI-based template analysis**, combining the power of Bun's native APIs with enterprise-grade reliability and user experience! 🚀

---

## 📋 **Quick Reference Card**

```bash
# Essential Commands
bun run scripts/wiki-matrix-cli.ts matrix          # Full matrix
bun run scripts/wiki-matrix-cli.ts details 3       # Template details
bun run scripts/wiki-matrix-cli.ts compare         # Feature comparison
bun run scripts/wiki-matrix-cli.ts stats           # Statistics only
bun run scripts/wiki-matrix-cli.ts interactive      # Interactive mode

# Error Handling
bun run scripts/wiki-matrix-cli.ts details invalid # ❌ Clear error message
bun run scripts/wiki-matrix-cli.ts unknown         # ❌ Unknown command

# Standalone (No Dependencies)
bun run scripts/wiki-matrix-cli-standalone.ts matrix
```

**The Wiki Matrix CLI: Professional template analysis made simple!** 📊
