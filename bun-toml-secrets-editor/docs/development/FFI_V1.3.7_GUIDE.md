# Bun v1.3.7 FFI Integration Guide

## 🎯 Key Principles

### 1. **Source Must Be a File Path**
```typescript
// ❌ WRONG - Inline code doesn't work
const { symbols } = cc({
  source: `int add(int a, int b) { return a + b; }`,
  symbols: { add: { returns: "int", args: ["int", "int"] } }
});

// ✅ CORRECT - Use file path
const { symbols } = cc({
  source: "./src/parsers/math.c",  // File path, not inline code
  symbols: { add: { returns: "int", args: ["int", "int"] } }
});
```

### 2. **v1.3.7 Automatically Reads Environment Variables**
```bash
# Set environment variables (Bun reads them automatically)
export C_INCLUDE_PATH="/opt/homebrew/include"
export LIBRARY_PATH="/opt/homebrew/lib"

# Bun automatically uses these paths
bun run src/server.ts
```

### 3. **Nix Provides Paths via shell.nix**
```nix
# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.bun pkgs.libxml2 pkgs.zlib ];
  shellHook = ''
    export C_INCLUDE_PATH="${pkgs.libxml2.dev}/include/libxml2"
    export LIBRARY_PATH="${pkgs.libxml2}/lib"
  '';
}
```

### 4. **Buffer Strings Must Be Null-Terminated**
```typescript
// ❌ WRONG - Missing null terminator
const str = Buffer.from("hello");
const result = cFunction(str);  // C reads past buffer

// ✅ CORRECT - Null-terminated for C
const str = Buffer.from("hello\0");  // Add \0
const result = cFunction(str);  // C knows where string ends
```

## 🚀 Complete Working Example

### Step 1: Create C File
```c
// src/parsers/rss-parser.c
#include <string.h>
#include <stdlib.h>

// Simple RSS detection (null-terminated strings)
int is_rss_feed(const char* content) {
  if (!content) return 0;
  
  // Look for RSS markers
  if (strstr(content, "<rss") || strstr(content, "<RSS")) {
    return 1;
  }
  
  if (strstr(content, "<feed") || strstr(content, "<FEED")) {
    return 2;  // Atom feed
  }
  
  return 0;  // Not recognized
}

// Count XML tags (demonstrates string processing)
int count_xml_tags(const char* content) {
  if (!content) return 0;
  
  int count = 0;
  const char* ptr = content;
  
  while ((ptr = strchr(ptr, '<')) != NULL) {
    count++;
    ptr++;  // Move past '<'
  }
  
  return count;
}
```

### Step 2: TypeScript Integration
```typescript
// src/parsers/rss-native.ts
import { cc } from "bun:ffi";

// Initialize native RSS parser
const { symbols } = cc({
  source: "./src/parsers/rss-parser.c",  // File path!
  symbols: {
    is_rss_feed: { 
      returns: "int", 
      args: ["ptr"] 
    },
    count_xml_tags: { 
      returns: "int", 
      args: ["ptr"] 
    }
  }
});

export function detectFeedType(xmlContent: string): 'rss' | 'atom' | 'unknown' {
  // Convert to null-terminated buffer for C
  const buffer = Buffer.from(xmlContent + "\0");
  
  const result = symbols.is_rss_feed(buffer);
  
  switch (result) {
    case 1: return 'rss';
    case 2: return 'atom';
    default: return 'unknown';
  }
}

export function countTags(xmlContent: string): number {
  const buffer = Buffer.from(xmlContent + "\0");
  return symbols.count_xml_tags(buffer);
}
```

### Step 3: Environment Setup
```bash
# Option A: Homebrew (macOS)
export C_INCLUDE_PATH="/opt/homebrew/include"
export LIBRARY_PATH="/opt/homebrew/lib"

# Option B: Nix (recommended for production)
nix-shell  # Uses your existing shell.nix

# Option C: Manual paths
export C_INCLUDE_PATH="$(brew --prefix libxml2)/include"
export LIBRARY_PATH="$(brew --prefix libxml2)/lib"
```

### Step 4: Usage in Server
```typescript
// src/server.ts
import { detectFeedType, countTags } from "./parsers/rss-native.js";

// In your RSS processing endpoint
async function handleRSSParse(req: Request): Promise<Response> {
  const rssContent = await req.text();
  
  try {
    // Use native FFI for fast detection
    const feedType = detectFeedType(rssContent);
    const tagCount = countTags(rssContent);
    
    return Response.json({
      success: true,
      parser: "native_ffi",
      feed_type: feedType,
      tag_count: tagCount,
      environment: process.env.C_INCLUDE_PATH ? "nix" : "standard"
    });
    
  } catch (error) {
    // Fallback to JavaScript if FFI fails
    return Response.json({
      success: true,
      parser: "javascript_fallback",
      feed_type: "unknown"
    });
  }
}
```

## 🔧 Testing Your Setup

### Basic FFI Test
```typescript
// test-ffi-basic.ts
import { cc } from "bun:ffi";
import { writeFile } from "fs/promises";

async function testFFI() {
  // Create test C file
  await writeFile("test.c", `
    int multiply(int a, int b) {
      return a * b;
    }
  `);
  
  // Compile with file path
  const { symbols } = cc({
    source: "test.c",  // File path!
    symbols: {
      multiply: { returns: "int", args: ["int", "int"] }
    }
  });
  
  console.log("5 × 7 =", symbols.multiply(5, 7));  // 35
}

testFFI();
```

### Environment Verification
```bash
# Check if environment variables are set
echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
echo "LIBRARY_PATH: $LIBRARY_PATH"

# Run test
bun run test-ffi-basic.ts
```

## ⚠️ Common Pitfalls

### 1. **Inline Code Error**
```typescript
// ❌ This fails
cc({ source: "int x() { return 1; }", ... });

// ✅ This works
cc({ source: "./file.c", ... });
```

### 2. **Missing Null Terminator**
```typescript
// ❌ C reads past buffer
const bad = Buffer.from("hello");

// ✅ C knows where string ends
const good = Buffer.from("hello\0");
```

### 3. **Environment Not Set**
```bash
# ❌ Bun can't find headers
bun run server.ts

# ✅ Bun finds headers automatically
export C_INCLUDE_PATH="/path/to/headers"
bun run server.ts
```

### 4. **Library Linking Issues**
```typescript
// Headers found but library not linked
// Solution: Ensure LIBRARY_PATH includes library directories
export LIBRARY_PATH="/path/to/libs"
```

## 🎯 Best Practices

1. **Always use file paths** for C source code
2. **Null-terminate strings** passed to C functions
3. **Set environment variables** before running Bun
4. **Test with simple functions** first
5. **Provide JavaScript fallbacks** for robustness
6. **Use Nix for reproducible builds** in production

## 🚀 Your RSS Optimizer

With these principles, your RSS optimizer can:

- ✅ Use native C for XML parsing performance
- ✅ Fall back to JavaScript when needed
- ✅ Work in both Nix and Homebrew environments
- ✅ Leverage v1.3.7's automatic environment variable support

**Ready for high-performance RSS processing!** 🎉
