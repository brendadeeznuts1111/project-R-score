# 🛡️ Advanced Bun Utils Integration

This document outlines the advanced Bun utility functions integrated into the dev dashboard for security, testing, and developer experience.

## Integrated Advanced Utils

### `Bun.escapeHTML()` - HTML Sanitization

**Location**: `enhanced-dashboard.ts` - HTML rendering

Used to prevent XSS attacks when rendering user data:

```typescript
// Server-side (Bun runtime)
const safeTitle = Bun.escapeHTML(win.title);

// Client-side (fallback)
const safeTitle = win.title.replace(/[&<>"']/g, m => 
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'}[m])
);
```

**Benefits**:
- **Security**: Prevents XSS attacks
- **Performance**: 480 MB/s - 20 GB/s processing speed
- **Automatic**: Handles strings, objects, numbers, booleans

**Escaped Characters**:
- `"` → `&quot;`
- `&` → `&amp;`
- `'` → `&#x27;`
- `<` → `&lt;`
- `>` → `&gt;`

### `Bun.deepEquals()` - Object Comparison

**Location**: `enhanced-dashboard.ts` - Test assertions

Used for deep object comparison in tests:

```typescript
// Verify profile structure
const expectedStructure = { userId: '@test', gateways: ['venmo'] };
const actualStructure = { userId: profile.userId, gateways: profile.gateways };
const matches = Bun.deepEquals(actualStructure, expectedStructure);

// Strict mode (checks undefined, sparse arrays, etc.)
const strictMatch = Bun.deepEquals(obj1, obj2, true);
```

**Benefits**:
- **Accurate**: Recursive deep comparison
- **Fast**: Native implementation
- **Strict Mode**: Catches subtle differences

**Use Cases**:
- Test assertions
- Profile structure validation
- Benchmark result comparison

### `Bun.inspect.table()` - Table Formatting

**Location**: `enhanced-dashboard.ts` - API endpoint `/api/benchmarks/table`

Formats benchmark data as ASCII tables:

```typescript
const tableData = benchmarks.map(b => ({
  name: b.name,
  time: `${b.time.toFixed(3)}ms`,
  target: `${b.target.toFixed(3)}ms`,
  status: b.status,
}));

const tableString = Bun.inspect.table(tableData, ['name', 'time', 'target', 'status'], {
  colors: true, // ANSI colors
});
```

**Output Format**:
```
┌───┬──────────────┬─────────┬─────────┬────────┐
│   │ name         │ time    │ target  │ status │
├───┼──────────────┼─────────┼─────────┼────────┤
│ 0 │ Profile Query│ 0.186ms │ 0.800ms │ pass   │
└───┴──────────────┴─────────┴─────────┴────────┘
```

**Benefits**:
- **Readable**: Clean ASCII table format
- **Terminal-friendly**: Works in terminals/CLI
- **Color support**: ANSI colors for better visibility

### `Bun.openInEditor()` - File Opening

**Location**: `enhanced-dashboard.ts` - API endpoint `/api/open-file`

Opens files in the default editor from the dashboard:

```typescript
// Open file at specific line/column
Bun.openInEditor(filePath, {
  editor: 'vscode', // or 'subl', auto-detected from $EDITOR
  line: 10,
  column: 5,
});
```

**Benefits**:
- **Developer Experience**: Click files to open in editor
- **Auto-detection**: Uses `$VISUAL` or `$EDITOR`
- **Configurable**: Override via `bunfig.toml`

**Usage**:
- Click file names in Quick Wins to open in editor
- Opens at line 1 by default
- Configurable via `bunfig.toml`:

```toml
[debug]
editor = "code"  # or "vscode", "subl", etc.
```

### `Bun.stringWidth()` - Terminal Width

**Location**: Available for future CLI features

Measures string width in terminal (useful for formatting):

```typescript
Bun.stringWidth("hello"); // => 5
Bun.stringWidth("\u001b[31mhello\u001b[0m"); // => 5 (ignores ANSI)
Bun.stringWidth("hello", { countAnsiEscapeCodes: true }); // => 12
```

**Performance**: ~6,756x faster than `string-width` npm package

**Use Cases**:
- Terminal output formatting
- Column alignment
- ANSI code detection

## Security Features

### HTML Escaping

All user-generated content is escaped before rendering:

- ✅ Quick win titles and impacts
- ✅ Benchmark notes and messages
- ✅ Test messages
- ✅ File names (in click handlers)

### XSS Prevention

Using `Bun.escapeHTML()` (or fallback) prevents:
- Script injection
- HTML injection
- Attribute injection

## Developer Experience

### File Opening

- Click file names in Quick Wins
- Opens in default editor
- Configurable via environment or `bunfig.toml`

### Table View

- View benchmarks as formatted table
- Click "View as Table" button
- Opens in new tab for easy sharing

### Test Assertions

- Uses `Bun.deepEquals()` for accurate comparisons
- Strict mode available for precise checks
- Better test reliability

## API Endpoints

### `/api/benchmarks/table`

Returns benchmark data as formatted ASCII table:

```bash
curl http://localhost:3008/api/benchmarks/table
```

**Response**: Plain text ASCII table with ANSI colors

### `/api/open-file` (POST)

Opens a file in the editor:

```bash
curl -X POST http://localhost:3008/api/open-file \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/file.ts", "line": 10, "column": 5}'
```

**Response**: `{ "success": true, "message": "Opened file.ts in editor" }`

## Performance Notes

### `Bun.escapeHTML()`
- **480 MB/s - 20 GB/s** processing speed
- Optimized for large inputs
- Handles non-ASCII text efficiently

### `Bun.stringWidth()`
- **~6,756x faster** than `string-width` npm package
- SIMD-optimized implementation
- Supports emoji and wide characters

### `Bun.deepEquals()`
- Native recursive comparison
- Used internally by `bun:test`
- Fast and accurate

## References

- [Bun Utils Documentation](https://bun.com/docs/runtime/utils)
- [Bun.escapeHTML](https://bun.com/docs/runtime/utils#bun-escapehtml)
- [Bun.deepEquals](https://bun.com/docs/runtime/utils#bun-deepequals)
- [Bun.inspect.table](https://bun.com/docs/runtime/utils#bun-inspect-table)
- [Bun.openInEditor](https://bun.com/docs/runtime/utils#bun-openineditor)
