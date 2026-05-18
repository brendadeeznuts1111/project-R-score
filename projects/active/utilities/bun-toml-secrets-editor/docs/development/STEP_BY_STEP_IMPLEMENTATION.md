# Step-by-Step Implementation Guide

This guide provides the exact workflow to implement and test C_INCLUDE_PATH/LIBRARY_PATH support in bun:ffi.

## Step 1: Make Your Changes

Enter the Nix dev shell and edit the FFI code:

```bash
# After nix develop, you should be in the bun repo
cd bun

# Edit the FFI Zig code
$EDITOR src/bun.js/api/ffi.zig
```

### Add to `src/bun.js/api/ffi.zig`:

```zig
// Around line 150-200 (in the CC function or compile section)

const std = @import("std");
const env = std.process;

// Add this function to read environment variables
fn getEnvPaths(allocator: std.mem.Allocator, env_var: []const u8) ![][]const u8 {
    const paths_str = env.getEnvVarOwned(allocator, env_var) catch |err| switch (err) {
        error.EnvironmentVariableNotFound => return &[_][]const u8{},
        else => return err,
    };
    
    var paths = std.ArrayList([]const u8).init(allocator);
    var it = std.mem.split(u8, paths_str, ":");
    
    while (it.next()) |path| {
        if (path.len == 0) continue;
        try paths.append(try allocator.dupe(u8, path));
    }
    
    return paths.toOwnedSlice();
}

// In the compile function, after creating TCC state:
pub fn compile(args: CompileArgs) !CompiledFFI {
    // ... existing setup code ...
    
    // Get environment paths
    const include_paths = try getEnvPaths(args.allocator, "C_INCLUDE_PATH");
    const library_paths = try getEnvPaths(args.allocator, "LIBRARY_PATH");
    
    // Add to TinyCC
    for (include_paths) |path| {
        _ = tcc.tcc_add_include_path(s, path.ptr);
    }
    
    for (library_paths) |path| {
        _ = tcc.tcc_add_library_path(s, path.ptr);
    }
    
    // ... rest of compilation ...
}
```

## Step 2: Build Bun

```bash
# From inside nix develop shell
export CMAKE_SYSTEM_PROCESSOR=$(uname -m)

# Build debug version (faster for development)
bun bd

# Or build release version (slower but optimized)
bun run build:release
```

**Watch for these build outputs:**
```text
[ 95%] Building CXX object CMakeFiles/bun.dir/src/bun.js/api/ffi.zig.o
[100%] Linking CXX executable bun
```

## Step 3: Test Your Changes

Create `test_ffi_env.ts`:

```typescript
import { cc } from "bun:ffi";

console.log("C_INCLUDE_PATH:", process.env.C_INCLUDE_PATH);
console.log("LIBRARY_PATH:", process.env.LIBRARY_PATH);

// Test 1: Simple header
const { symbols: test1 } = cc({
  source: `
    #include <stdio.h>
    int hello() { return 42; }
  `,
  symbols: {
    hello: { returns: "int", args: [] }
  }
});

console.log("Test 1 (basic):", test1.hello() === 42 ? "PASS ✅" : "FAIL ❌");

// Test 2: With env vars set
const testDir = "/tmp/bun_ffi_test_$$";
await Bun.$`mkdir -p ${testDir}/include`;
await Bun.write(`${testDir}/include/myheader.h`, "#define MAGIC 123\n");

const originalInclude = process.env.C_INCLUDE_PATH;
process.env.C_INCLUDE_PATH = `${testDir}/include`;

const { symbols: test2 } = cc({
  source: `
    #include "myheader.h"
    int get_magic() { return MAGIC; }
  `,
  symbols: {
    get_magic: { returns: "int", args: [] }
  }
});

console.log("Test 2 (env path):", test2.get_magic() === 123 ? "PASS ✅" : "FAIL ❌");

// Restore
process.env.C_INCLUDE_PATH = originalInclude;
await Bun.$`rm -rf ${testDir}`;

console.log("\nAll FFI env tests complete!");
```

Run it:
```bash
./build/bun run test_ffi_env.ts
```

## Step 4: Run Official Tests

```bash
# Test just the FFI module
./build/bun test test/js/bun/ffi

# Test with your new test file
./build/bun test test/js/bun/ffi/env-paths.test.ts
```

## Step 5: Verify Security (No Path Traversal)

Create `test_security.ts`:

```typescript
import { cc } from "bun:ffi";

console.log("Testing security constraints...");

// Should fail gracefully (not crash or expose files)
process.env.C_INCLUDE_PATH = "/etc:/secret:/../../../etc/shadow";

try {
  cc({
    source: `
      #include <stdio.h>
      int test() { return 0; }
    `,
    symbols: { test: { returns: "int", args: [] } }
  });
  console.log("Security: Should have validated paths ❌");
} catch (e) {
  console.log("Security: Invalid paths rejected ✅");
}
```

## Quick Debug Commands

```bash
# Check if your changes were built
./build/bun --version

# See if env vars are being read (add debug print in Zig)
C_INCLUDE_PATH=/tmp/test ./build/bun -e "console.log('C_INCLUDE_PATH:', process.env.C_INCLUDE_PATH)"

# Strace to see what files are being opened (Linux)
strace -f -e openat ./build/bun run test_ffi_env.ts 2>&1 | grep -E "(C_INCLUDE_PATH|include|\\.h)"

# On macOS use dtrace
sudo dtruss -f ./build/bun run test_ffi_env.ts 2>&1 | grep open
```

## Commit & Push

```bash
# Stage your changes
git add src/bun.js/api/ffi.zig
git add test/js/bun/ffi/env-paths.test.ts

# Commit with conventional commit format
git commit -m "feat(ffi): support C_INCLUDE_PATH and LIBRARY_PATH environment variables

This enables FFI compilation on NixOS and other systems with
non-standard filesystem layouts (FHS).

- Reads C_INCLUDE_PATH for additional header search paths
- Reads LIBRARY_PATH for additional library search paths
- Maintains backward compatibility (no breakage when unset)

Fixes compilation issues on NixOS where libraries are in /nix/store
instead of /usr/lib or /usr/include."

# Push to your fork
git push origin feat/ffi-env-paths
```

## Expected Output

```text
C_INCLUDE_PATH: /nix/store/...-libxml2-2.12.0-dev/include/libxml2:...
LIBRARY_PATH: /nix/store/...-libxml2-2.12.0/lib:...

Test 1 (basic): PASS ✅
Test 2 (env path): PASS ✅

All FFI env tests complete!
```

## Troubleshooting

### Build Errors
- Check LLVM version compatibility
- Verify Zig syntax
- Ensure proper memory management

### Runtime Errors
- Check environment variable format
- Verify path existence
- Test with absolute paths

### Security Issues
- Add path validation
- Reject relative paths
- Block dangerous characters

This workflow ensures your implementation is properly tested and ready for contribution to Bun core!
