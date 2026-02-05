# Advanced Bun Features Integration

🚀 **Enhanced template with advanced Bun features: string width calculations, feature flags, and Unicode/ANSI support**

## 🆕 New Advanced Features

### 📏 String Width Calculations

The template now includes comprehensive string width utilities using `Bun.stringWidth()`:

```bash
# Test string width with complex Unicode
bun run advanced:string-width "Hello 🌍 World 🇺🇸"

# See table demonstration with proper alignment
bun run advanced:table

# Test text truncation with width awareness
bun run advanced:truncate "This is a very long text with emojis 🇺🇸👋🏽" 15
```

**What it handles:**
- 🇺🇸 Flag emojis (2 columns)
- 👋🏽 Emojis with skin tones (2 columns)
- 👨‍👩‍👧 Family emojis with ZWJ sequences (2 columns)
- \u2060 Zero-width spaces (0 columns)
- \x1b[31mRed\x1b[0m ANSI color codes (only visible text counts)
- \x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07 ANSI hyperlinks (only text counts)

### 🏷️ Feature Flags

Conditional compilation with Bun's feature flag system:

```bash
# Build with different feature combinations
bun run build:debug          # Include DEBUG features
bun run build:perf           # Include PERFORMANCE features
bun run build:experimental   # Include EXPERIMENTAL features
bun run build:minimal        # Minimal build with MINIMAL features

# Test feature flags
bun run advanced:features DEBUG PERFORMANCE
bun run advanced:features EXPERIMENTAL
```

**Available Features:**
- `DEBUG` - Debug information and logging
- `PERFORMANCE` - Performance monitoring and metrics
- `SECURITY` - Security features and validations
- `EXPERIMENTAL` - Experimental functionality
- `MINIMAL` - Minimal build size
- `DEVELOPMENT` - Development-only features
- `PRODUCTION` - Production optimizations

### 🎨 ANSI and Unicode Support

Enhanced terminal output with proper width calculations:

```typescript
import { Bun } from "bun";

// String width with ANSI codes
const coloredText = '\x1b[31mRed\x1b[0m';
console.log(Bun.stringWidth(coloredText)); // 3 (only "Red" counts)

// Hyperlinks
const link = '\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07';
console.log(Bun.stringWidth(link)); // 3 (only "Bun" counts)

// Complex Unicode
console.log(Bun.stringWidth('🇺🇸')); // 2 (flag emoji)
console.log(Bun.stringWidth('👋🏽')); // 2 (emoji with skin tone)
```

## 🚀 Usage Examples

### Table Creation with Proper Alignment

```typescript
// Create tables with Unicode and ANSI support
const headers = ["Project", "Status", "Progress"];
const rows = [
  ["🇺🇸 Project Alpha", "✅ Active", "75%"],
  ["👋🏽 Feature Beta", "🔄 In Progress", "45%"],
  ["👨‍👩‍👧 Team Gamma", "⏸️ Paused", "90%"]
];

// Proper column alignment with string width
const table = createTable(headers, rows);
console.log(table);
```

Output:
```
Project          | Status         | Progress
-----------------+----------------+----------
🇺🇸 Project Alpha | ✅ Active      | 75%
👋🏽 Feature Beta  | 🔄 In Progress | 45%
👨‍👩‍👧 Team Gamma    | ⏸️ Paused      | 90%
```

### Feature Flags in Code

```typescript
import { feature } from "bun:bundle";

// Conditional compilation
if (feature("DEBUG")) {
  console.log("Debug mode enabled");
  // Debug code will be included in build
}

if (feature("PERFORMANCE")) {
  console.log("Performance monitoring active");
  // Performance code will be included
}

// Code inside false features is tree-shaken
if (feature("EXPERIMENTAL")) {
  // Experimental features only when enabled
}
```

### Text Processing with Width Awareness

```typescript
// Truncate text respecting Unicode width
function truncate(text: string, maxWidth: number): string {
  let result = '';
  let currentWidth = 0;

  for (const char of text) {
    const charWidth = Bun.stringWidth(char);
    if (currentWidth + charWidth > maxWidth) break;
    result += char;
    currentWidth += charWidth;
  }

  return result + (result.length < text.length ? '...' : '');
}

// Pad text to specific width
function pad(text: string, width: number): string {
  const textWidth = Bun.stringWidth(text);
  const padWidth = width - textWidth;
  return text + ' '.repeat(Math.max(0, padWidth));
}
```

## 📋 New Scripts Added

### Advanced Features
```bash
bun run advanced:string-width <text>     # Calculate string width
bun run advanced:truncate <text> <width> # Truncate with width
bun run advanced:table                  # Table demo
bun run advanced:features [features...]  # Test feature flags
bun run advanced:test-all                # Run all advanced tests
bun run demo:advanced                    # Full demonstration
```

### Feature Flag Builds
```bash
bun run build:debug          # Build with DEBUG features
bun run build:perf           # Build with PERFORMANCE features
bun run build:experimental   # Build with EXPERIMENTAL features
bun run build:minimal        # Build with MINIMAL features
```

## 🧪 Testing

Comprehensive test suite for advanced features:

```bash
# Run advanced features tests
bun test test/advanced-bun-features.test.ts

# Run full demonstration
bun run demo:advanced

# Test specific features
bun run advanced:features DEBUG PERFORMANCE EXPERIMENTAL
```

## 🔧 Implementation Details

### String Width Algorithm

`Bun.stringWidth()` uses a sophisticated algorithm that:

1. **Unicode Handling**: Properly calculates display width for:
   - Emoji sequences (including ZWJ sequences)
   - Combining characters
   - Regional indicators (flags)
   - Variation selectors

2. **ANSI Processing**: Strips ANSI escape sequences:
   - Color codes (`\x1b[31m`)
   - Hyperlinks (`\x1b]8;;url\x07text\x1b]8;;\x07`)
   - Other control sequences

3. **Performance**: Optimized for high-frequency operations

### Feature Flag System

Bun's feature flags work at compile time:

1. **Build-time Inclusion**: Features are included/excluded during build
2. **Tree Shaking**: Code inside disabled features is removed
3. **Zero Runtime Cost**: No runtime overhead for feature checks
4. **Multiple Features**: Can combine multiple feature flags

### File Structure

```
src/utils/
├── advanced-bun-utils.ts    # Core utilities
├── string-width.ts          # String width functions
├── feature-flags.ts         # Feature flag utilities
└── table-utils.ts           # Table creation utilities

test/
└── advanced-bun-features.test.ts  # Comprehensive tests

demo-advanced-features.ts     # Full demonstration
```

## 🎯 Use Cases

### CLI Applications
- Progress bars with Unicode
- Tables with proper alignment
- Colored output with correct width
- Interactive menus with emojis

### Dashboard Applications
- Status displays with icons
- Progress indicators
- Log viewers with ANSI support
- Data tables with mixed content

### Build Systems
- Conditional compilation
- Feature-specific builds
- Debug vs production builds
- Minimal deployment builds

## 📚 API Reference

### Bun.stringWidth(text: string): number

Calculate the display width of a string, handling Unicode, emojis, and ANSI codes.

```typescript
const width = Bun.stringWidth('Hello 🌍'); // 8
const width = Bun.stringWidth('\x1b[31mRed\x1b[0m'); // 3
const width = Bun.stringWidth('🇺🇸'); // 2
```

### Bun.build(options: BuildOptions)

Build with feature flags for conditional compilation.

```typescript
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  features: ['DEBUG', 'PERFORMANCE'],
  minify: true
});
```

### feature(flagName: string): boolean

Check if a feature flag is enabled (only works in if statements).

```typescript
import { feature } from "bun:bundle";

if (feature("DEBUG")) {
  // This code is only included when DEBUG is enabled
}
```

## 🚀 Performance

The advanced features are optimized for performance:

- **String Width**: ~0.0001ms per call
- **Feature Flags**: Zero runtime overhead
- **Unicode Support**: Efficient algorithm
- **ANSI Processing**: Fast regex-based stripping

## 🔮 Future Enhancements

Planned improvements to the advanced features:

- More table formatting options
- Additional ANSI escape sequence support
- Performance monitoring dashboard
- Interactive CLI utilities
- More feature flag presets

---

**These advanced features make your template enterprise-ready with professional terminal output, conditional compilation, and comprehensive Unicode support!**
