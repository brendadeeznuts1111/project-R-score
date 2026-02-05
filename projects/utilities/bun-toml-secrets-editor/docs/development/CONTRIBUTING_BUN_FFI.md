# Contributing Guide: C_INCLUDE_PATH and LIBRARY_PATH Support for bun:ffi

This guide explains how to implement environment variable support for bun:ffi to enable compilation on NixOS and other non-FHS systems.

## 🏗️ Development Setup

### Prerequisites

```bash
# Install dependencies (macOS)
brew install automake ccache cmake coreutils gnu-sed go icu4c libiconv libtool ninja pkg-config rust ruby

# Install LLVM 19
brew install llvm@19

# Add LLVM to PATH
export PATH="$(brew --prefix llvm@19)/bin:$PATH"

# Install Bun
curl -fsSL https://bun.com/install | bash
```

### Alternative: Using Nix

```bash
nix develop  # or nix develop .#pure for pure shell
export CMAKE_SYSTEM_PROCESSOR=$(uname -m)
bun bd
```

## 📁 Project Structure

### Key Files for bun:ffi

```
src/js/bun/ffi/           # bun:ffi JavaScript implementation
src/bun.js/ffi/           # FFI-related JavaScript code
src/zig/bun_ffi.zig       # Zig implementation of FFI
src/cpp/                  # C++ bindings for FFI
src/codegen/              # Code generation scripts
```

### Module Bundling

The `bun:ffi` module is bundled using:
- `./src/codegen/bundle-modules.ts` - Bundles builtin modules including bun:ffi
- Changes to `src/js/bun/ffi/` can be hot-reloaded with `bun run build`

## 🔧 Implementation Steps

### 1. Locate the C Compiler Interface

The bun:ffi module uses TinyCC for C compilation. Look for:

```zig
// In src/zig/bun_ffi.zig or related files
const tcc = @import("tinycc");
```

### 2. Add Environment Variable Reading

Add environment variable parsing in the compilation setup:

```zig
// Read environment variables
const c_include_path = std.process.getEnvVarOwned(allocator, "C_INCLUDE_PATH") catch null;
const library_path = std.process.getEnvVarOwned(allocator, "LIBRARY_PATH") catch null;

// Parse colon-separated paths
var include_paths = std.mem.split(u8, c_include_path orelse "", ":");
var lib_paths = std.mem.split(u8, library_path orelse "", ":");
```

### 3. Modify Compiler Flags

Update the TinyCC compilation flags:

```zig
// Add include paths
while (include_paths.next()) |path| {
    if (path.len > 0) {
        try compiler.addIncludePath(path);
    }
}

// Add library paths  
while (lib_paths.next()) |path| {
    if (path.len > 0) {
        try compiler.addLibraryPath(path);
    }
}
```

### 4. Update JavaScript Interface

Modify the `cc()` function in `src/js/bun/ffi/` to pass environment variables:

```typescript
// In src/js/bun/ffi/index.ts or similar
export function cc(options: CCOptions) {
  // Pass environment variables to Zig layer
  return zigCC({
    ...options,
    cIncludePath: process.env.C_INCLUDE_PATH,
    libraryPath: process.env.LIBRARY_PATH,
  });
}
```

## 🧪 Testing

### Add Test Cases

Create tests in `src/js/bun/ffi/test/`:

```typescript
// test/env-vars.test.ts
import { test, expect } from "bun:test";
import { cc } from "bun:ffi";

test("C_INCLUDE_PATH is respected", async () => {
  process.env.C_INCLUDE_PATH = "/test/include";
  
  const { symbols } = cc({
    source: "#include <test.h>\nint test() { return 42; }",
    symbols: { test: { returns: "int" } }
  });
  
  expect(symbols.test()).toBe(42);
});
```

### Run Tests

```bash
# Build debug version
bun run build

# Run tests with debug build
bun bd test src/js/bun/ffi/test/env-vars.test.ts

# Run all FFI tests
bun bd test src/js/bun/ffi/test/
```

## 🐛 Debugging

### Enable Debug Logging

```bash
# Enable FFI debug logs
BUN_DEBUG_FFI=1 bun bd test src/js/bun/ffi/test/env-vars.test.ts

# Save debug logs to file
BUN_DEBUG=ffi-debug.log bun bd test src/js/bun/ffi/test/env-vars.test.ts
```

### Use VSCode Debugger

1. Install CodeLLDB extension
2. Set breakpoints in Zig code
3. Use "Run and Debug" panel
4. Launch with "Debug Bun" configuration

## 🏗️ Build Process

### Debug Build

```bash
# Build debug version
bun run build

# Use debug build
./build/debug/bun-debug --version
```

### Release Build

```bash
# Build release version
bun run build:release

# Use release build
./build/release/bun --version
```

## 📝 Code Generation

If you modify the FFI interface:

```bash
# Regenerate bindings
bun run src/codegen/generate-classes.ts
bun run src/codegen/bundle-modules.ts

# Rebuild
bun run build
```

## 🔄 Development Workflow

1. **Make Changes**: Edit Zig/TypeScript files
2. **Build**: `bun run build` (for TypeScript changes)
3. **Test**: `bun bd test src/js/bun/ffi/test/`
4. **Debug**: Use `BUN_DEBUG_FFI=1` if needed
5. **Iterate**: Repeat until tests pass

## 📋 Pull Request Checklist

- [ ] Tests pass for all scenarios
- [ ] NixOS compatibility verified
- [ ] Documentation updated
- [ ] No regressions in existing functionality
- [ ] Debug logging works correctly
- [ ] Error handling is robust

## 🎯 Success Criteria

The implementation should:

1. ✅ Read `C_INCLUDE_PATH` and `LIBRARY_PATH` environment variables
2. ✅ Support colon-separated paths on Unix systems
3. ✅ Fall back to default paths when env vars are unset
4. ✅ Work with existing bun:ffi API without breaking changes
5. ✅ Enable compilation on NixOS and non-FHS systems
6. ✅ Maintain performance for existing use cases

## 🐛 Common Issues

### TinyCC Integration

- Ensure TinyCC flags are properly escaped
- Handle path separators correctly (Unix vs Windows)
- Validate paths exist before adding to compiler

### Memory Management

- Use proper Zig allocator patterns
- Free environment variable strings after use
- Handle allocation failures gracefully

### Cross-Platform

- Windows uses semicolon path separators
- Handle empty path components correctly
- Test on target platforms (Linux, macOS, Windows)

## 📚 Additional Resources

- [Bun Architecture](https://bun.com/docs/project/architecture)
- [Zig Language Reference](https://ziglang.org/documentation/)
- [TinyCC Documentation](https://bellard.org/tcc/)
- [JavaScriptCore API](https://webkit.org/documentation/javascriptcore/)

## 🤝 Getting Help

- Join [Bun Discord](https://bun.com/discord)
- Create [GitHub Issue](https://github.com/oven-sh/bun/issues)
- Review existing [FFI PRs](https://github.com/oven-sh/bun/pulls?q=is%3Apr+ffi)
