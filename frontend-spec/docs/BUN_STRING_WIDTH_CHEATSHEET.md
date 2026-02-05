# 🔤 Bun.stringWidth() - Quick Reference Cheat Sheet

## **🚀 QUICK SYNTAX**

```javascript
Bun.stringWidth(string) // Returns display width as number
```

## **📊 BASIC EXAMPLES**

```javascript
Bun.stringWidth('Hello')        // 5
Bun.stringWidth('café')         // 4 (accented characters)
Bun.stringWidth('🚀')           // 2 (emoji)
Bun.stringWidth('東京')         // 4 (CJK characters)
Bun.stringWidth('👨‍💻')         // 2 (ZWJ sequence)
```

## **🌍 UNICODE SUPPORT**

| Character Type | Example | Length | Width | Notes |
|----------------|---------|--------|-------|-------|
| ASCII | `Hello` | 5 | 5 | Same |
| Accented | `café` | 4 | 4 | Same |
| CJK | `東京` | 2 | 4 | Double-width |
| Emoji | `🚀` | 2 | 2 | Same |
| Flags | `🇺🇸` | 4 | 2 | Compressed |
| ZWJ | `👨‍💻` | 5 | 2 | Compressed |

## **🛠️ PRACTICAL FUNCTIONS**

### **Text Padding**
```javascript
function padUnicode(str, width, align = 'left') {
  const strWidth = Bun.stringWidth(str);
  const padding = width - strWidth;
  
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  }
  return align === 'right' 
    ? ' '.repeat(padding) + str
    : str + ' '.repeat(padding);
}
```

### **Table Formatting**
```javascript
function createTable(data) {
  const widths = data[0].map((_, i) => 
    Math.max(...data.map(row => Bun.stringWidth(row[i])))
  );
  
  return data.map(row => 
    row.map((cell, i) => padUnicode(cell, widths[i])).join(' │ ')
  ).join('\n');
}
```

### **Progress Bars**
```javascript
function progressBar(progress, width = 20) {
  const filled = Math.floor(progress * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${Math.floor(progress * 100)}%`;
}
```

## **📈 PERFORMANCE**

| Operation | Speed | Notes |
|-----------|-------|-------|
| Simple ASCII | ~200M ops/sec | Fastest |
| Unicode | ~35M ops/sec | Very fast |
| Emoji | ~18M ops/sec | Fast |
| Complex | ~7M ops/sec | Good |

## **🧪 EDGE CASES**

```javascript
Bun.stringWidth('')              // 0 (empty)
Bun.stringWidth(' ')             // 1 (space)
Bun.stringWidth('\t')            // 0 (tab)
Bun.stringWidth('\n')            // 0 (newline)
Bun.stringWidth('\u200B')        // 0 (zero-width space)
Bun.stringWidth('a\u0301')       // 1 (combining)
```

## **🎨 REAL-WORLD USAGE**

### **CLI Menu**
```javascript
const menu = [
  ['1', 'Start Engine ⚙️', 'Initialize system'],
  ['2', 'Load Data 📊', 'Load quantum data'],
  ['3', '東京スタート 🇯🇵', 'Start Tokyo mode']
];

const widths = [3, 20, 20];
menu.forEach(row => {
  console.log(row.map((cell, i) => padUnicode(cell, widths[i])).join(' │ '));
});
```

### **Status Dashboard**
```javascript
function statusRow(name, status, url) {
  const nameWidth = 20;
  const statusWidth = 15;
  const urlWidth = 30;
  
  return [
    padUnicode(name, nameWidth),
    padUnicode(status, statusWidth),
    padUnicode(url, urlWidth)
  ].join(' │ ');
}
```

## **⚡ OPTIMIZATION TIPS**

1. **Cache Widths**: Calculate once for repeated use
2. **Batch Operations**: Process arrays together
3. **Pre-calculate**: For static layouts, compute widths upfront
4. **Use for Layout**: Essential for terminal UI, ignore for counting

## **🔧 COMMON PATTERNS**

### **Dynamic Column Width**
```javascript
const maxWidth = Math.max(...items.map(item => Bun.stringWidth(item.label)));
```

### **Responsive Text**
```javascript
function truncate(text, maxWidth) {
  if (Bun.stringWidth(text) <= maxWidth) return text;
  
  let truncated = '';
  for (const char of text) {
    if (Bun.stringWidth(truncated + char) > maxWidth) break;
    truncated += char;
  }
  return truncated + '...';
}
```

### **Centered Headers**
```javascript
function centerHeader(text, width) {
  return padUnicode(text, width, 'center');
}
```

## **🎯 WHEN TO USE**

✅ **Use Bun.stringWidth() for:**
- Terminal table formatting
- CLI menu alignment
- Progress bars with Unicode
- Text layout in console
- Dashboard displays
- Any visual text alignment

❌ **Use string.length for:**
- Character counting
- Array indexing
- String manipulation
- Non-visual operations

## **📚 QUICK REFERENCE**

```javascript
// Basic usage
const width = Bun.stringWidth('Hello 🌍'); // 8

// Padding
const padded = 'Hello'.padEnd(20 - Bun.stringWidth('Hello 🌍') + 'Hello 🌍'.length);

// Tables
const tableWidths = data[0].map((_, i) => 
  Math.max(...data.map(row => Bun.stringWidth(row[i])))
);

// Progress
const bar = '█'.repeat(Math.floor(progress * width)) + '░'.repeat(width - Math.floor(progress * width));
```

---

**💡 Remember**: Bun.stringWidth() calculates visual display width, not character count. Essential for professional CLI applications! 🎉
