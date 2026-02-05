# Transpilation & Language Features CLI

Comprehensive guide for managing Bun transpilation and language feature configuration through the Geelark CLI.

## Overview

The Transpilation Manager provides a unified interface for configuring Bun's transpilation engine, including:

- TypeScript configuration overrides
- Define substitutions (environment variables, constants)
- Function dropping (tree-shaking)
- Custom file loaders
- JSX configuration
- Macro management
- Dead code elimination (DCE) annotations

## Commands

### show

Display the current transpilation configuration.

```bash
bun transpile show
```

**Output:**
```
Transpilation Configuration:
──────────────────────────────────────
  JSX Import Source: react
  JSX Runtime: automatic
  JSX Side Effects: disabled
  Ignore DCE Annotations: disabled
  No Macros: disabled
```

### configure

Configure transpilation settings. Validates configuration before applying.

```bash
bun transpile configure '{"jsxRuntime": "classic", "noMacros": true}'
```

### apply

Apply and validate transpilation configuration in one command.

```bash
bun transpile apply '{"drop": ["console"], "define": {"NODE_ENV": "production"}}'
```

### validate

Validate transpilation configuration without applying it.

```bash
bun transpile validate '{"jsxRuntime": "automatic"}'
```

**Output:**
```
✅ Configuration is valid
```

### reset

Reset configuration to defaults.

```bash
bun transpile reset
```

### parse-define

Parse and display `--define` flag format (K:V pairs).

```bash
bun transpile parse-define "NODE_ENV:development,API_URL:http://localhost:3000,DEBUG:true"
```

**Output:**
```
Parsed defines:
NODE_ENV=development, API_URL=http://localhost:3000, DEBUG=true
```

### parse-loader

Parse and display `--loader` flag format (.ext:loader pairs).

```bash
bun transpile parse-loader ".ts:tsx,.js:jsx,.json:json"
```

**Output:**
```
Parsed loaders:
.ts:tsx, .js:jsx, .json:json
```

### parse-drop

Parse and display `--drop` flag format (comma-separated functions).

```bash
bun transpile parse-drop "console,debugger,trace"
```

**Output:**
```
Functions to drop:
  - console
  - debugger
  - trace
```

## Flags & Options

### --tsconfig-override

Specify a custom `tsconfig.json` file path for transpilation configuration.

```bash
bun build --tsconfig-override custom/tsconfig.prod.json
```

**Type:** `string`  
**Default:** `$cwd/tsconfig.json`

### --define

Substitute K:V pairs during parsing. Values are parsed as JSON.

```bash
bun build --define process.env.NODE_ENV:"production" --define DEBUG:"false"
```

**Format:** `KEY:VALUE` (comma-separated for multiple)  
**Examples:**
- `NODE_ENV:"production"`
- `API_URL:"http://api.example.com"`
- `BUILD_NUM:"42"`
- `IS_DEV:"false"`

**Alias:** `-d`

### --drop

Remove function calls during bundling/transpilation. Useful for removing debugging calls.

```bash
bun build --drop console --drop debugger
```

**Common Examples:**
- `console` - removes all console.* calls
- `debugger` - removes debugger statements
- `console.log,console.warn` - removes specific console methods
- `trace,debug` - removes custom functions

### --loader

Parse files with specific loaders. Useful for treating files as different types.

```bash
bun build --loader .js:jsx --loader .ts:tsx
```

**Format:** `.ext:loader` (comma-separated for multiple)

**Valid Loaders:**
- `js` - JavaScript
- `jsx` - JSX (React)
- `ts` - TypeScript
- `tsx` - TypeScript JSX
- `json` - JSON
- `toml` - TOML
- `text` - Plain text
- `file` - File reference
- `wasm` - WebAssembly
- `napi` - Node.js N-API module

**Alias:** `-l`

### --no-macros

Disable macros from being executed in the bundler, transpiler, and runtime.

```bash
bun build --no-macros
```

**Type:** `boolean`  
**Default:** `false`

### --jsx-factory

Changes the function called when compiling JSX elements using the classic JSX runtime.

```bash
bun build --jsx-runtime classic --jsx-factory h
```

**Type:** `string`  
**Common Values:**
- `React.createElement` (React - default for automatic)
- `h` (Preact)
- `createElement` (Inferno)

### --jsx-fragment

Changes the function called when compiling JSX fragments.

```bash
bun build --jsx-runtime classic --jsx-factory h --jsx-fragment Fragment
```

**Type:** `string`  
**Common Values:**
- `React.Fragment` (React)
- `Fragment` (Preact)

### --jsx-import-source

Declares the module specifier for importing the JSX factory functions.

```bash
bun build --jsx-import-source preact
```

**Type:** `string`  
**Default:** `react`  
**Used with:** `automatic` JSX runtime

### --jsx-runtime

Selects the JSX runtime (must be `automatic` or `classic`).

```bash
bun build --jsx-runtime automatic
```

**Type:** `string`  
**Default:** `automatic`  
**Valid Values:**
- `automatic` - Uses JSX transform from specified import source
- `classic` - Uses factory function directly

### --jsx-side-effects

Treat JSX elements as having side effects (disables pure annotations).

```bash
bun build --jsx-side-effects
```

**Type:** `boolean`  
**Default:** `false`  
**Use When:** You need to prevent tree-shaking of JSX elements

### --ignore-dce-annotations

Ignore tree-shaking annotations such as `@PURE`.

```bash
bun build --ignore-dce-annotations
```

**Type:** `boolean`  
**Default:** `false`  
**Note:** Prevents DCE of functions marked with `/** @PURE */`

## Configuration Examples

### Example 1: Production Build with Environment Variables

```bash
bun transpile configure '{
  "define": {
    "NODE_ENV": "production",
    "DEBUG": false,
    "API_URL": "https://api.example.com"
  },
  "drop": ["console"],
  "jsxRuntime": "automatic",
  "jsxImportSource": "react"
}'
```

### Example 2: Preact Development Setup

```bash
bun transpile configure '{
  "jsxRuntime": "automatic",
  "jsxImportSource": "preact",
  "define": {
    "NODE_ENV": "development"
  },
  "jsxSideEffects": true
}'
```

### Example 3: Classic JSX with Custom Factory

```bash
bun transpile configure '{
  "jsxRuntime": "classic",
  "jsxFactory": "h",
  "jsxFragment": "Fragment",
  "jsxImportSource": "preact"
}'
```

### Example 4: Custom Loaders and Dropped Functions

```bash
bun transpile configure '{
  "loaders": {
    ".custom": "text",
    ".data": "json",
    ".module": "ts"
  },
  "drop": ["console.log", "console.warn", "debugger"],
  "define": {
    "BUNDLE_DATE": "2024-01-09T10:51:00Z"
  }
}'
```

### Example 5: TypeScript Override with Custom Config

```bash
bun transpile configure '{
  "tsconfigOverride": "build/tsconfig.prod.json",
  "noMacros": true,
  "ignoreDceAnnotations": false
}'
```

## Validation

The transpilation manager validates all configuration before applying. Common validation errors:

### Invalid jsxRuntime

```
jsxRuntime must be "automatic" or "classic" (default: "automatic")
```

**Fix:** Use only `"automatic"` or `"classic"`

### Invalid Loader

```
Invalid loader "custom". Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi
```

**Fix:** Use only valid loader types

### Missing Extension Dot

```
Invalid extension: "ts". Extensions must start with a dot.
```

**Fix:** Use `.ts` not `ts`

### JSX Factory with Automatic Runtime

```
⚠️  Warnings:
  - jsxFactory is typically used with "classic" jsx runtime, not "automatic"
```

**Note:** This is a warning, not an error. Use `--jsx-runtime classic` if specifying a factory.

## Integration with Build Process

### Using with bun build

```bash
bun build \
  --define NODE_ENV:"production" \
  --define API_URL:"https://api.example.com" \
  --drop console \
  --loader .ts:tsx \
  --jsx-runtime automatic \
  src/index.ts
```

### Programmatic Usage

```typescript
import { 
  parseDefineFlag, 
  parseLoaderFlag,
  validateTranspilationConfig,
  executeTranspilationCommand 
} from "@/src/cli/transpilation-manager";

// Parse flags
const defines = parseDefineFlag("NODE_ENV:production,DEBUG:false");
const loaders = parseLoaderFlag(".ts:tsx,.js:jsx");

// Validate configuration
const config = {
  define: defines,
  loaders,
  jsxRuntime: "automatic"
};

const validation = validateTranspilationConfig(config);
if (!validation.valid) {
  console.error("Invalid config:", validation.errors);
}
```

## Performance Impact

Different transpilation options have varying performance impacts:

| Option | Impact | Notes |
|--------|--------|-------|
| `--define` | Low | Compile-time substitutions |
| `--drop` | Low to Medium | Enables better tree-shaking |
| `--loader` | Medium | Custom parsing adds overhead |
| `--jsx-runtime` | Low | Affects generated code, not parsing |
| `--no-macros` | High | Disables runtime macro execution |

## Best Practices

1. **Use `--define` for constants** - More efficient than runtime values
2. **Drop debug functions in production** - Reduces bundle size
3. **Override tsconfig for specific builds** - Avoid modifying main tsconfig
4. **Validate before applying** - Catch errors early
5. **Use automatic JSX runtime** - More efficient, recommended default
6. **Document custom loaders** - Help team understand custom configurations

## Common Issues & Solutions

### JSX Transform Not Working

**Problem:** JSX code not being transformed correctly

**Solution:** Verify `--jsx-runtime` and `--jsx-import-source`

```bash
bun transpile show
# Check JSX Runtime and JSX Import Source values
```

### Functions Not Being Dropped

**Problem:** `--drop console` not removing console calls

**Solutions:**
- Use correct function name (include namespace: `console.log` not just `log`)
- Check that dead code elimination is enabled
- Verify tree-shaking is not disabled

### Custom Loaders Causing Errors

**Problem:** "Invalid loader" error

**Solution:** Use only valid loaders

```bash
# ❌ Wrong
bun build --loader .ts:typescript

# ✅ Correct
bun build --loader .ts:tsx
```

## See Also

- [Bun Runtime Documentation](../runtime/PROCESS_LIFECYCLE.md)
- [Build Configuration Guide](../architecture/SPECIFICATION.md)
- [CLI Reference](./CLI_REFERENCE.md)
