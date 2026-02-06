# Bun v1.3.7 FFI Quick Reference

## 🎯 4 Golden Rules

### 1. File Path Only
```typescript
cc({ source: "./file.c" })  // ✅
cc({ source: "inline code" })  // ❌
```

### 2. Environment Variables Auto-Read
```bash
export C_INCLUDE_PATH="/path/to/headers"
export LIBRARY_PATH="/path/to/libs"
bun run script.ts  # Bun reads them automatically
```

### 3. Nix Integration
```nix
shellHook = ''
  export C_INCLUDE_PATH="${pkgs.libxml2.dev}/include"
  export LIBRARY_PATH="${pkgs.libxml2}/lib"
''
```

### 4. Null-Terminated Strings
```typescript
const str = Buffer.from("hello\0")  // ✅
const str = Buffer.from("hello")    // ❌
```

## 🚀 30-Second Setup

```bash
# 1. Install libraries
brew install libxml2 zlib

# 2. Set environment
export C_INCLUDE_PATH="/opt/homebrew/include"
export LIBRARY_PATH="/opt/homebrew/lib"

# 3. Create C file
echo "int add(int a, int b) { return a + b; }" > test.c

# 4. Use in TypeScript
bun -e "
import { cc } from 'bun:ffi';
const { symbols } = cc({
  source: 'test.c',
  symbols: { add: { returns: 'int', args: ['int', 'int'] } }
});
console.log('2+3=', symbols.add(2, 3));
"
```

## 🔍 Debug Checklist

- [ ] Using file path (not inline code)?
- [ ] Environment variables set?
- [ ] Strings null-terminated?
- [ ] Library paths include .lib directories?
- [ ] Header paths include .include directories?

## 📁 File Structure
```text
src/
├── parsers/
│   ├── rss-parser.c      # C code
│   └── rss-native.ts     # TypeScript wrapper
├── server.ts             # Main server
shell.nix                 # Nix environment
FFI_V1.3.7_GUIDE.md      # Full guide
```

**That's it! You're ready for native FFI performance! 🚀**
