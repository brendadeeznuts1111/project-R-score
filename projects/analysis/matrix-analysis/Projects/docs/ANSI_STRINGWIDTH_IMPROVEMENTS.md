# ANSI StringWidth Improvements

Bun's `stringWidth()` function has been significantly improved to properly handle all ANSI escape sequences.

## Improvements

### 1. CSI Sequences (Control Sequence Introducer)

**Before:** Only handled CSI sequences ending with `m` (SGR - Select Graphic Rendition)

**After:** Now properly handles **all CSI final bytes (0x40-0x7E)**:

- **Cursor Movement**: `A` (up), `B` (down), `C` (forward), `D` (back), `H` (position), etc.
- **Erase**: `J` (screen), `K` (line)
- **Scroll**: `S` (up), `T` (down)
- **Colors**: `m` (SGR - already supported)
- **And more**: All final bytes from `@` (0x40) to `~` (0x7E)

**Example:**
```typescript
import { stringWidth } from "bun";

// Cursor movement sequences are now excluded
const text = "Hello\x1b[2AWorld"; // Move cursor up 2 lines
stringWidth(text); // Returns 10 ("HelloWorld"), not counting cursor movement

// Erase sequences are excluded
const erased = "Text\x1b[2KMore"; // Erase line
stringWidth(erased); // Returns 8 ("TextMore")
```

### 2. OSC Sequences (Operating System Command)

**Before:** OSC sequences were not properly handled

**After:** Full support for OSC sequences, including:

- **OSC 8 Hyperlinks**: With both BEL (`\x07`) and ST (`\x1b\\`) terminators
- **OSC 0**: Window title
- **OSC 4**: Color palette
- **OSC 10-19**: Font settings
- **And more**: All OSC sequences properly excluded

**Example:**
```typescript
import { stringWidth } from "bun";

// OSC 8 hyperlink with BEL terminator
const link1 = "\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07";
stringWidth(link1); // Returns 3 ("Bun"), hyperlink sequence excluded

// OSC 8 hyperlink with ST terminator
const link2 = "\x1b]8;;https://github.com\x1b\\GitHub\x1b]8;;\x1b\\";
stringWidth(link2); // Returns 6 ("GitHub")
```

### 3. ESC ESC State Machine Fix

**Before:** Double ESC sequences (`\x1b\x1b`) caused incorrect state handling

**After:** State machine correctly resets on double ESC

**Example:**
```typescript
import { stringWidth } from "bun";

// Double ESC now handled correctly
const doubleESC = "\x1b\x1b[31mText\x1b[0m";
stringWidth(doubleESC); // Returns 4 ("Text"), state correctly reset

// Triple ESC also works
const tripleESC = "\x1b\x1b\x1b[32mText\x1b[0m";
stringWidth(tripleESC); // Returns 4 ("Text")
```

## Real-World Impact

### Before (Incorrect Widths)

```typescript
// These would incorrectly include escape sequences in width calculation
const status = "\x1b[2K\r\x1b[33m⚠\x1b[0m Warning";
stringWidth(status); // Would be wrong (included escape sequences)
```

### After (Correct Widths)

```typescript
// Now correctly excludes all escape sequences
const status = "\x1b[2K\r\x1b[33m⚠\x1b[0m Warning";
stringWidth(status); // Returns 9 ("⚠ Warning") ✅

// Works with hyperlinks
const link = "\x1b]8;;https://bun.sh\x1b\\Bun\x1b]8;;\x1b\\";
stringWidth(link); // Returns 3 ("Bun") ✅

// Works with complex mixed sequences
const complex = "\x1b[1mBold\x1b[0m \x1b]8;;https://example.com\x07Link\x1b]8;;\x07";
stringWidth(complex); // Returns 9 ("Bold Link") ✅
```

## Benefits

1. **Accurate Text Alignment**: Tables and formatted output align correctly
2. **Hyperlink Support**: OSC 8 hyperlinks don't break width calculations
3. **Terminal Compatibility**: Works with all terminal control sequences
4. **Robust State Machine**: Handles edge cases like double ESC correctly

## Testing

Run the demo to see all improvements:

```bash
bun ansi-stringwidth-demo.ts
```

## Use Cases

### Currency Exchange Table
```typescript
// Now works perfectly with emojis and formatting
const flag = "🇺🇸";
const formatted = `\x1b[32m${flag}\x1b[0m`;
const width = stringWidth(formatted); // Correctly returns 2 (emoji width)
```

### Bookmark Manager
```typescript
// Bookmark titles with colors and formatting
const title = "\x1b[36mReact Docs\x1b[0m \x1b[90m(5 visits)\x1b[0m";
const width = stringWidth(title); // Correctly returns 21
```

### Status Lines
```typescript
// Status updates with cursor movement
const status = "\x1b[2K\r\x1b[33m⚠\x1b[0m Port 3000 in use";
const width = stringWidth(status); // Correctly excludes all escape sequences
```

## Technical Details

### CSI Sequence Format
```text
ESC [ <parameters> <final-byte>
```
- Final byte range: `@` (0x40) to `~` (0x7E)
- All are now properly excluded from width calculation

### OSC Sequence Format
```text
ESC ] <command> ; <data> <terminator>
```
- Terminators: BEL (`\x07`) or ST (`\x1b\\`)
- OSC 8 hyperlinks: `ESC ] 8 ; ; <url> <terminator> <text> ESC ] 8 ; ; <terminator>`
- All OSC sequences now properly excluded

### State Machine
- Correctly handles ESC ESC sequences
- Properly resets state on double ESC
- Handles ESC within sequences correctly

## Migration

No code changes needed! Existing code using `Bun.stringWidth()` automatically benefits from these improvements.

## See Also

- [Bun.stringWidth() Documentation](https://bun.sh/docs/api/utils#stringwidth)
- [ANSI Escape Codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [OSC 8 Hyperlinks](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5f69a)
