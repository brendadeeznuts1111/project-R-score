# Unicode Analytics: Two-Stage Lookup Tables

This document describes the architecture and usage of the optimized Unicode lookup tables used in the T3-Lattice analytics engine. These tables are designed for high-performance codepoint property validation, supporting both scalar and SIMD-accelerated workflows.

## Table Architecture

The system uses a **Two-Stage Lookup** strategy to minimize memory usage while maintaining O(1) lookup time.

### 1. Stage 1: Block Indexing
The `stage1` table is an array of `u16` values. It maps the high byte of a Unicode codepoint (`cp >> 8`) to a starting index in the `stage2` table.
- **Block Size**: 256 codepoints.
- **Deduplication**: If multiple 256-character blocks have identical property patterns, they point to the same index in `stage2`.

### 2. Stage 2: Bit-Packed Properties
The `stage2` table contains the actual property data, bit-packed into `u64` values.
- **Packing**: Each `u64` stores properties for 64 codepoints.
- **Access**: A block of 256 codepoints occupies 4 consecutive `u64` values (256 / 64 = 4).

## Usage Examples

### SIMD Scan-and-Escape (Bun Pattern)
The following example demonstrates how to use the generated tables to implement a high-performance "scan-and-escape" logic, similar to Bun's `escapeHTML`.

```zig
pub fn escapeWithTable(allocator: std.mem.Allocator, input: []const u8) ![]u8 {
    var remaining = input;
    const vector_size = 16;
    
    while (remaining.len >= vector_size) {
        const vec: @Vector(vector_size, u8) = remaining[0..vector_size].*;
        // Use the generated vector lookup to check all 16 characters at once
        const needs_escape = isPropertyVector(@as(@Vector(vector_size, u21), vec));
        
        if (@reduce(.Or, needs_escape)) {
            // Fallback to scalar processing for the block that needs escaping
            // or use specialized SIMD instructions for replacement.
            // ... (Bun's lazy allocation and copying logic) ...
        }
        remaining = remaining[vector_size..];
    }
    // ... (Handle remaining bytes) ...
}
```

### Scalar Lookup
For validating a single codepoint:
```zig
pub fn isProperty(cp: u21) bool {
    if (cp > 0x10FFFF) return false;
    const high = cp >> 8;
    const low = cp & 0xFF;
    const stage2_idx = table.stage1[high];
    const bit_pos = @as(usize, stage2_idx) + low;
    return (table.stage2[bit_pos >> 6] & (@as(u64, 1) << @as(u6, @intCast(bit_pos & 63)))) != 0;
}
```

### SIMD Vector Lookup
For validating 16 codepoints simultaneously (Bun-style):
```zig
pub fn isPropertyVector(cps: @Vector(16, u21)) @Vector(16, bool) {
    var mask: u16 = 0;
    const cps_array: [16]u21 = cps;
    inline for (cps_array, 0..16) |cp, i| {
        if (isProperty(cp)) {
            mask |= (@as(u16, 1) << @as(u4, @intCast(i)));
        }
    }
    // ... convert mask to boolean vector ...
}
```

## Generated Property Examples

### ID_Start (ESNext)
Validates characters that can start a JavaScript identifier (A-Z, a-z, and other Unicode ID_Start characters).
- **Pattern**: `0x7fffffe07fffffe` (Bitmask for A-Z and a-z).

### ID_Continue (ESNext)
Validates characters that can appear after the first character (includes digits and underscores).
- **Pattern**: `0x3ff000000000000` (Digits 0-9) | `0x7fffffe87fffffe` (A-Z, a-z, _).

### Whitespace
Validates Unicode whitespace characters (Space, Tab, Line Feed, etc.).
- **Pattern**: `0x100003e00` (ASCII whitespace) | `0x100000000` (Non-breaking space).

### Emoji
Validates codepoints within common emoji ranges.
- **Pattern**: `0xffffffffffffffff` (Full blocks of emoji codepoints).

### Currency Symbols
Validates Unicode currency symbols (Category `Sc`).
- **Pattern**: `0x20c0` (Includes $, £, €, ¥, and newer symbols like the Bitcoin sign).
- **Analytics Use Case**: Extracting financial figures from multi-currency sports betting feeds.

### Math Symbols
Validates Unicode mathematical symbols (Category `Sm`).
- **Pattern**: `0x22ff` (Includes operators, relations, and geometric symbols).
- **Analytics Use Case**: Parsing statistical formulas or custom metrics in sports data.

## Generation Process
>>>>>>>------- SEARCH
### SIMD Vector Lookup
For validating 16 codepoints simultaneously (Bun-style):
```zig
pub fn isPropertyVector(cps: @Vector(16, u21)) @Vector(16, bool) {
    var mask: u16 = 0;
    const cps_array: [16]u21 = cps;
    inline for (cps_array, 0..16) |cp, i| {
        if (isProperty(cp)) {
            mask |= (@as(u16, 1) << @as(u4, @intCast(i)));
        }
    }
    // ... convert mask to boolean vector ...
}
```
### SIMD Vector Lookup
For validating 16 codepoints simultaneously (Bun-style):
```zig
pub fn isPropertyVector(cps: @Vector(16, u21)) @Vector(16, bool) {
    var mask: u16 = 0;
    const cps_array: [16]u21 = cps;
    inline for (cps_array, 0..16) |cp, i| {
        if (isProperty(cp)) {
            mask |= (@as(u16, 1) << @as(u4, @intCast(i)));
        }
    }
    
    var results: [16]bool = undefined;
    inline for (0..16) |i| {
        results[i] = (mask & (@as(u16, 1) << @as(u4, @intCast(i)))) != 0;
    }
    return results;
}
```

### Advanced SIMD: Bitmask Extraction
In production, Bun often extracts a bitmask from a comparison to quickly skip valid segments:

```zig
const input: @Vector(16, u8) = ...;
const target: @Vector(16, u8) = @splat(' ');
const mask = @reduce(.Or, input == target);
if (mask) {
    // Handle whitespace
}
```
The tables are generated using `generate-unicode.ts`, which:
1. Collects codepoint sets from Unicode data packages.
2. Uses `unicode-generator.ts` to perform block-level deduplication.
3. Emits optimized Zig source code with hex-encoded bitmasks.

## Reference: Bun's SIMD Implementation
The patterns used here are inspired by Bun's `src/string/immutable` implementation, specifically `escapeHTMLForLatin1Input`. Bun uses SIMD vectors to scan for characters like `"`, `&`, `'`, `<`, and `>` by comparing the input vector against splatted character vectors:

```zig
const vec_chars = "\"&'<>";
const vecs: [vec_chars.len]AsciiVector = comptime brk: {
    var _vecs: [vec_chars.len]AsciiVector = undefined;
    for (vec_chars, 0..) |c, i| {
        _vecs[i] = @splat(c);
    }
    break :brk _vecs;
};
// ... scan logic ...
if (@reduce(.Max, @as(AsciiVectorU1, @bitCast((vec == vecs[0]))) | ... )) == 1) {
    // Found character that needs escaping
}
```
Our table-based approach generalizes this by allowing any Unicode property (not just a fixed set of ASCII characters) to be used as the scan criteria while maintaining similar performance characteristics.
