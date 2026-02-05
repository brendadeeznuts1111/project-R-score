# Bun Runtime & Process Control Examples

This directory contains examples demonstrating Bun's runtime APIs and process control capabilities.

## Examples

### 1. Basic Runtime Info (`info.ts`)
Displays core information about the current Bun instance.
```bash
bun info.ts
```

### 2. Spawning Processes (`spawn.ts`)
Demonstrates `Bun.spawn` and `Bun.spawnSync` for running external commands.
```bash
bun spawn.ts
```

### 3. Signal Handling (`signals.ts`)
Shows how to handle signals like `SIGINT` (Ctrl+C).
```bash
bun signals.ts
```

### 4. Garbage Collection (`gc.ts`)
Compares `Bun.gc()` with the global `gc()` enabled via CLI.
```bash
bun --expose-gc gc.ts
```

### 5. Memory Management (`memory.ts`)
Tracks memory usage and demonstrates the impact of GC. Try adding `--smol`.
```bash
bun --smol memory.ts
```

### 6. Process Controls (`controls.ts`)
Demonstrates process titles and unhandled rejection behaviors.
```bash
bun --title "CustomTitle" --unhandled-rejections warn controls.ts
```

### 7. Advanced Monitor (`advanced-usage.ts`)
A real-world example of a process monitor that tracks health and manages children.
```bash
bun advanced-usage.ts
```

### 8. Preload Demonstration (`app.ts`)
Shows how to use `--preload` to inject logic before the main application.
```bash
bun --preload ./preload.ts app.ts
```

### 9. Advanced Utilities (`utils-demo.ts`)
Demonstrates Bun's built-in utilities (`Bun.inspect.table`, `Bun.deepEquals`, etc.) and features a random port server (`port: 0`). This script supports hot reloading!
```bash
bun --hot examples/runtime/utils-demo.ts
```

### 10. Dead Code Elimination (`dce-demo.ts`)
Demonstrates tree-shaking annotations like `/* @__PURE__ */`. These affect bundle size during `bun build`.
```bash
bun build ./dce-demo.ts --outdir ./out --analyze
```

### 11. Protocol & Properties (`protocol-demo.ts`)
Demonstrates Bun.serve protocol properties, request headers, and configuration.
```bash
bun examples/runtime/protocol-demo.ts
```

### 12. File I/O & Binary Data (`file-io.ts`)
Demonstrates reading files as ArrayBuffer and using Typed Arrays (Int8Array, Uint8Array).
```bash
bun examples/runtime/file-io.ts
```

### 13. File System Watch (`fs-watch.ts`)
Demonstrates `fs.watch` for listening to file changes, both callback-based and async iterable patterns.
```bash
bun examples/runtime/fs-watch.ts
```

### 14. Advanced API Server (`api-server.ts`)
Demonstrates a fully-typed Bun API server with request logging using `Bun.inspect.table` and typed interfaces.
```bash
bun examples/runtime/api-server.ts
```

## Hot Reloading (--hot)
Bun supports hot reloading out of the box. When you run a script with `--hot`, Bun will automatically restart the process if the script file is modified.

**Example:**
```bash
bun --hot examples/runtime/utils-demo.ts
```
While this command is running, edit `utils-demo.ts` and save it. Bun will detect the change and restart the server automatically.

## Relevant CLI Flags

- `--smol`: Reduces memory footprint. **(Default: Off)**
- `--expose-gc`: Exposes the `gc()` function globally. **(Default: Off)**
- `--title`: Sets the initial process title. **(Default: bun)**
- `--unhandled-rejections`: Controls behavior for unhandled promise rejections. **(Default: warn)**
- `--preload`: Loads a module before the entry point. **(Default: Off)**
- `--watch` / `--hot`: Automatically reloads the process on file changes. **(Default: Off)**
- `--ignore-dce-annotations`: Ignores `/* @__PURE__ */` and `/* @__DEAD__ */` during bundling. **(Default: Off)**

## Tree Shaking & DCE

Bun supports tree-shaking annotations to help the bundler remove unused code:

- `/* @__PURE__ */`: Marks a function call as side-effect-free.
- `/* @__DEAD__ */`: Marks code that is intentionally dead and should be removed.

You can disable this behavior during build using `--ignore-dce-annotations`.

**Example:**
```bash
# Standard build (respects annotations)
bun build ./dce-demo.ts

# Ignore annotations (keeps all code)
bun build ./dce-demo.ts --ignore-dce-annotations
```

### Baseline (No Flags)

If you run these scripts without any special flags, you get the standard Bun behavior:

```bash
bun examples/runtime/app.ts
# Output: "WARNING: No config found. Run with --preload to initialize."
```
