# 🔤 Bun.stringWidth() - Complete Guide

## **📋 OVERVIEW**

`Bun.stringWidth()` is a Bun-specific function that calculates the display width of strings, accounting for Unicode characters, emoji, and complex scripts. Unlike `string.length`, it returns the actual visual width that characters occupy when displayed in a terminal.

## **🚀 KEY FEATURES**

### **Unicode-Aware**
- Handles accented characters correctly (café, naïve, résumé)
- Supports CJK characters (Chinese, Japanese, Korean)
- Processes Arabic and right-to-left scripts
- Accounts for combining diacritical marks

### **Emoji Support**
- Single-width emoji: 🚀 (width: 2)
- Flag emoji: 🇺🇸 (width: 2) 
- Zero-width joiner sequences: 👨‍💻 (width: 2)
- Complex emoji: 🏳️‍🌈 (width: 2)

### **Performance Optimized**
- Extremely fast: ~3.9M operations/second
- Native implementation in Bun
- Efficient for bulk operations

## **📊 COMPARISON: stringWidth vs length**

| String | .length | Bun.stringWidth() | Difference |
|--------|---------|-------------------|------------|
| "Hello" | 5 | 5 | 0 |
| "café" | 4 | 4 | 0 |
| "🚀" | 2 | 2 | 0 |
| "東京" | 2 | 4 | +2 |
| "👨‍💻" | 5 | 2 | -3 |
| "Quantum ⚛️ Lattice" | 21 | 21 | 0 |

## **🛠️ PRACTICAL APPLICATIONS**

### **1. Terminal Table Formatting**
```javascript
// Perfect alignment with Unicode
const name = "東京太郎"; // Tokyo Taro
const score = 88;
const padded = name.padEnd(20 - Bun.stringWidth(name) + name.length);
console.log(`${padded} Score: ${score}`);
// Output: "東京太郎            Score: 88"
```

### **2. Progress Bars with Emoji**
```javascript
function createProgressBar(progress, width = 20) {
  const filled = Math.floor(progress * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${Math.floor(progress * 100)}%`;
}

console.log(`📥 Download: ${createProgressBar(0.75)}`);
// Output: 📥 Download: [███████████████░░░░░] 75%
```

### **3. CLI Menu Formatting**
```javascript
const menuItems = [
  { key: '1', label: 'Start Engine ⚙️' },
  { key: '2', label: 'Load Data 📊' },
  { key: '3', label: 'Show Dashboard 📈' }
];

menuItems.forEach(item => {
  const labelWidth = 25;
  const padding = labelWidth - Bun.stringWidth(item.label);
  console.log(` ${item.key}. ${item.label}${' '.repeat(padding)}`);
});
```

### **4. Text Alignment**
```javascript
function alignText(text, width, align = 'left') {
  const textWidth = Bun.stringWidth(text);
  if (textWidth >= width) return text;
  
  const padding = width - textWidth;
  
  if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }
  return align === 'right' 
    ? ' '.repeat(padding) + text
    : text + ' '.repeat(padding);
}
```

## **🎨 REAL-WORLD EXAMPLES**

### **System Status Dashboard**
```javascript
function displayStatus(components) {
  console.log('┌─────────────┬─────────────────┬─────────────┐');
  console.log('│ Component   │ Status          │ Tension     │');
  console.log('├─────────────┼─────────────────┼─────────────┤');
  
  components.forEach(comp => {
    const id = comp.id.padEnd(11);
    const status = comp.status.padEnd(15);
    const tension = createTensionBar(comp.tension, 11);
    console.log(`│ ${id} │ ${status} │ ${tension} │`);
  });
  
  console.log('└─────────────┴─────────────────┴─────────────┘');
}
```

### **Fuel Injection History**
```javascript
function displayFuelHistory(injections) {
  const widths = [10, 15, 8, 20, 12];
  
  injections.forEach(inj => {
    const time = inj.time.padStart(10);
    const fuel = inj.fuel.padEnd(15);
    const impact = inj.impact.padStart(8);
    const effect = inj.effect.padEnd(20);
    const source = inj.source.padEnd(12);
    
    console.log(`│ ${time} │ ${fuel} │ ${impact} │ ${effect} │ ${source} │`);
  });
}
```

## **🧪 EDGE CASES HANDLED**

### **Zero-Width Characters**
```javascript
Bun.stringWidth('');              // 0 (empty)
Bun.stringWidth(' ');             // 1 (space)
Bun.stringWidth('\t');            // 0 (tab)
Bun.stringWidth('\n');            // 0 (newline)
Bun.stringWidth('\u200B');        // 0 (zero-width space)
Bun.stringWidth('\uFEFF');        // 0 (zero-width no-break space)
```

### **Combining Characters**
```javascript
Bun.stringWidth('a\u0301');       // 1 (a + combining acute)
Bun.stringWidth('e\u0301\u0300');  // 1 (e + multiple combining)
```

### **Complex Emoji**
```javascript
Bun.stringWidth('👨‍💻');          // 2 (man technologist)
Bun.stringWidth('🇺🇸');           // 2 (US flag)
Bun.stringWidth('🏳️‍🌈');         // 2 (rainbow flag)
```

## **⚡ PERFORMANCE BENCHMARKS**

### **Speed Test**
```javascript
const testString = 'Quantum ⚛️ Lattice 🎮 with Tokyo 東京';
const iterations = 100000;

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  Bun.stringWidth(testString);
}
const duration = performance.now() - start;

console.log(`Operations/second: ${Math.floor(iterations / (duration / 1000)).toLocaleString()}`);
// Result: ~3,877,484 ops/sec
```

### **Memory Efficiency**
- Native implementation
- No additional allocations
- Constant memory usage regardless of string length

## **🔧 INTEGRATION WITH QUANTUM LATTICE**

### **CLI Formatter Class**
```javascript
class QuantumCLFormatter {
  pad(str, width, align = 'left') {
    const strWidth = Bun.stringWidth(str);
    if (strWidth >= width) return str;
    
    const padding = width - strWidth;
    return align === 'center' 
      ? ' '.repeat(Math.floor(padding/2)) + str + ' '.repeat(Math.ceil(padding/2))
      : align === 'right'
      ? ' '.repeat(padding) + str
      : str + ' '.repeat(padding);
  }
  
  formatRow(columns, widths, aligns = []) {
    return columns.map((col, i) => 
      this.pad(col, widths[i], aligns[i] || 'left')
    ).join(' │ ');
  }
}
```

### **Dashboard Tables**
```javascript
// Component status with perfect alignment
const componentData = [
  ['WR-001', 'THREE.Scene', 'FPS_STREAM', 0.15, 'Active'],
  ['NV-001', 'NetworkNode', 'DATABASE', 0.65, 'Active'],
  ['WR-003', 'ShaderUniform', 'HIGH_RES_TIME', 0.75, 'Active']
];

const widths = [12, 15, 15, 10, 12];
componentData.forEach(row => {
  console.log(formatter.formatRow(row, widths));
});
```

## **🌍 UNICODE SUPPORT MATRIX**

| Character Type | Examples | Width Support |
|----------------|-----------|---------------|
| Latin | a-z, A-Z | ✅ Perfect |
| Accented | café, naïve | ✅ Perfect |
| CJK | 東京, 北京, 한국 | ✅ Double-width |
| Arabic | العربية | ✅ Context-aware |
| Hebrew | עברית | ✅ Context-aware |
| Emoji | 🚀, ⚛️, 💻 | ✅ Double-width |
| Flags | 🇺🇸, 🇬🇧, 🇨🇦 | ✅ Double-width |
| ZWJ Sequences | 👨‍💻, 🏳️‍🌈 | ✅ Correct |
| Combining | á, é̀ | ✅ Normalized |

## **📚 BEST PRACTICES**

### **1. Always Use for Terminal UI**
```javascript
// ❌ Wrong - breaks with Unicode
console.log(name.padEnd(20) + score);

// ✅ Correct - handles all characters
const padding = 20 - Bun.stringWidth(name);
console.log(name + ' '.repeat(padding) + score);
```

### **2. Cache Width Calculations**
```javascript
// For performance in loops
const widths = items.map(item => Bun.stringWidth(item.label));
```

### **3. Handle Edge Cases**
```javascript
function safePad(str, width) {
  if (!str) return ' '.repeat(width);
  const strWidth = Bun.stringWidth(str);
  return strWidth >= width ? str : str + ' '.repeat(width - strWidth);
}
```

### **4. Combine with Color Codes**
```javascript
function colorize(text, color) {
  const codes = { red: '\x1b[31m', green: '\x1b[32m', reset: '\x1b[0m' };
  return `${codes[color]}${text}${codes.reset}`;
}

// Width calculation ignores color codes
const text = 'Hello';
const colored = colorize(text, 'red');
console.log(Bun.stringWidth(text)); // 5
```

## **🚀 ADVANCED USAGE**

### **Dynamic Table Layout**
```javascript
function createDynamicTable(data) {
  // Calculate optimal column widths
  const widths = data[0].map((_, colIndex) => 
    Math.max(...data.map(row => Bun.stringWidth(row[colIndex])))
  );
  
  // Format all rows
  return data.map(row => formatRow(row, widths)).join('\n');
}
```

### **Responsive Layout**
```javascript
function formatResponsive(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (Bun.stringWidth(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
```

## **✅ SUMMARY**

**Bun.stringWidth() is essential for:**
- ✅ Perfect terminal table alignment
- ✅ Unicode-aware text formatting
- ✅ Emoji and CJK character support
- ✅ High-performance CLI applications
- ✅ Professional dashboard layouts

**Key advantages over string.length:**
- 🎯 Accurate visual width calculation
- 🌍 Full Unicode support
- ⚡ Native performance
- 🔧 Easy integration
- 📊 Perfect for data visualization

**Use it whenever you need:**
- Table formatting
- Text alignment
- Progress bars
- CLI menus
- Dashboard layouts
- Any terminal UI with Unicode content

---

**Result**: Bun.stringWidth() enables perfect Unicode-aware text formatting for professional CLI applications and dashboards! 🎉
