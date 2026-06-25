# Bun Bundler API Reference

> Source: Official Bun documentation (bun.sh/docs/bundler)

Bun's fast native bundler can be used via the `bun build` CLI command or the `Bun.build()` JavaScript API.

## At a Glance

- JS API: `await Bun.build({ entrypoints, outdir })`
- CLI: `bun build <entry> --outdir ./out`
- Watch: `--watch` for incremental rebuilds
- Targets: `--target browser|bun|node`
- Formats: `--format esm|cjs|iife` (experimental for cjs/iife)

## Basic Usage

```typescript
await Bun.build({
  entrypoints: ["./index.tsx"],
  outdir: "./build",
});
```

```bash
bun build ./index.tsx --outdir ./build
```

## API Options

### entrypoints (Required)

Array of paths to entrypoints. One bundle per entrypoint.

```typescript
const result = await Bun.build({
  entrypoints: ["./index.ts"],
});
// => { success: boolean, outputs: BuildArtifact[], logs: BuildMessage[] }
```

### files

Map of file paths to contents for in-memory bundling. Supports `string`, `Blob`, `TypedArray`, or `ArrayBuffer`.

```typescript
// Bundle entirely from memory
const result = await Bun.build({
  entrypoints: ["/app/index.ts"],
  files: {
    "/app/index.ts": `import { greet } from "./greet.ts"; console.log(greet("World"));`,
    "/app/greet.ts": `export function greet(name: string) { return "Hello, " + name + "!"; }`,
  },
});

// Override files on disk (in-memory takes priority)
await Bun.build({
  entrypoints: ["./src/index.ts"],
  files: { "./src/config.ts": `export const API_URL = "https://api.production.com";` },
  outdir: "./dist",
});
```

### outdir

Output directory. If omitted from JS API, bundled code is not written to disk — returned as `BuildArtifact[]` instead.

### target

Execution environment: `"browser"` (default), `"bun"`, or `"node"`.

| Target | Behavior |
|--------|----------|
| `browser` | Default. Prioritizes `"browser"` export condition. |
| `bun` | For Bun runtime. Adds `// @bun` pragma. Bytecode support. |
| `node` | For Node.js. Prioritizes `"node"` export condition. Outputs `.mjs`. |

### format

Module format: `"esm"` (default), `"cjs"` (experimental), `"iife"` (experimental).

### jsx

Configure JSX transform: `runtime`, `importSource`, `factory`, `fragment`.

```typescript
await Bun.build({
  entrypoints: ["./app.tsx"],
  outdir: "./out",
  jsx: { factory: "h", fragment: "Fragment", runtime: "classic" },
});
```

### splitting

Enable code splitting (default `false`). Shared code extracted into chunk files.

### plugins

Array of bundler plugins. Universal system for runtime and bundler.

### env

Controls environment variable handling:
- `"inline"` — replace `process.env.FOO` with literal values
- `"PUBLIC_*"` (prefix) — inline only matching vars
- `"disable"` — no injection

### sourcemap

`"none"` (default), `"linked"`, `"external"`, `"inline"`.

### minify

`true` for all, or granular: `{ whitespace, identifiers, syntax }`.

### external

Import paths to exclude from bundle. Use `["*"]` to externalize all.

### packages

`"bundle"` (default) or `"external"` — controls package dependency inclusion.

### naming

Template for output filenames. Tokens: `[name]`, `[ext]`, `[hash]`, `[dir]`.

```typescript
naming: {
  entry: "[dir]/[name].[ext]",
  chunk: "[name]-[hash].[ext]",
  asset: "[name]-[hash].[ext]",
}
```

### root

Project root directory. Defaults to first common ancestor of entrypoints.

### publicPath

Prefix for import paths in output (e.g., `"https://cdn.example.com/"`).

### define

Global identifier replacements: `{ STRING: JSON.stringify("value") }`.

### loader

Map file extensions to loaders: `{ ".png": "dataurl", ".txt": "file" }`.

### banner / footer

Strings prepended/appended to output (e.g., `'"use client";'`).

### drop

Remove function calls: `["console", "debugger"]`.

### features

Compile-time feature flags for dead-code elimination via `import { feature } from "bun:bundle"`.

```typescript
await Bun.build({
  entrypoints: ["./app.ts"],
  outdir: "./out",
  features: ["PREMIUM"], // PREMIUM=true, others=false
});
```

### metafile

Generate build metadata. Accepts `true`, a file path string, or `{ json, markdown }` object.

CLI: `--metafile ./meta.json` and/or `--metafile-md ./meta.md`.

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  metafile: {
    json: "./dist/meta.json",
    markdown: "./dist/meta.md",
  },
});
```

### bytecode

Generate bytecode for faster startup. Requires `target: "bun"`. Adds `.jsc` files.

```typescript
await Bun.build({
  entrypoints: ["./index.tsx"],
  outdir: "./out",
  bytecode: true,
});
```

## Outputs

```typescript
interface BuildOutput {
  outputs: BuildArtifact[];
  success: boolean;
  logs: Array<BuildMessage | ResolveMessage>;
  metafile?: BuildMetafile;
}

interface BuildArtifact extends Blob {
  kind: "entry-point" | "chunk" | "asset" | "sourcemap" | "bytecode";
  path: string;
  loader: Loader;
  hash: string | null;
  sourcemap: BuildArtifact | null;
}
```

BuildArtifacts are Blobs — use `arrayBuffer()`, `text()`, `stream()`, or pass to `new Response()`.

## Content Types (Built-in Loaders)

| Extensions | Behavior |
|------------|----------|
| `.js` `.jsx` `.ts` `.tsx` `.cjs` `.mjs` `.mts` `.cts` | Transpile TS/JSX, tree-shake, dead-code eliminate |
| `.json` `.jsonc` | Parse and inline as JS object |
| `.toml` `.yaml` `.yml` | Parse and inline as JS object |
| `.txt` | Inline as string |
| `.html` | Process and bundle referenced assets |
| `.css` | Bundle into single CSS file |
| `.node` `.wasm` | Treated as assets during bundling |

Unrecognized extensions → copied as-is to `outdir` (asset loader).

## Executables

```bash
bun build ./cli.tsx --outfile mycli --compile
./mycli
```

## Error Handling

On failure, `Bun.build` rejects with `AggregateError`. Each error is a `BuildMessage` or `ResolveMessage`.

```typescript
try {
  const result = await Bun.build({ entrypoints: ["./index.tsx"], outdir: "./out" });
} catch (e) {
  const error = e as AggregateError;
  console.error(error);
}
```

## Full TypeScript Reference

```typescript
interface BuildConfig {
  entrypoints: string[];
  outdir?: string;
  target?: "browser" | "bun" | "node";
  format?: "esm" | "cjs" | "iife";
  jsx?: { runtime?: "automatic" | "classic"; importSource?: string; factory?: string; fragment?: string; sideEffects?: boolean; development?: boolean };
  naming?: string | { chunk?: string; entry?: string; asset?: string };
  root?: string;
  splitting?: boolean;
  plugins?: BunPlugin[];
  external?: string[];
  packages?: "bundle" | "external";
  publicPath?: string;
  define?: Record<string, string>;
  loader?: Record<string, Loader>;
  sourcemap?: "none" | "linked" | "inline" | "external" | boolean;
  conditions?: Array<string> | string;
  env?: "inline" | "disable" | `${string}*`;
  minify?: boolean | { whitespace?: boolean; syntax?: boolean; identifiers?: boolean };
  ignoreDCEAnnotations?: boolean;
  emitDCEAnnotations?: boolean;
  bytecode?: boolean;
  banner?: string;
  footer?: string;
  drop?: string[];
  throw?: boolean;
  tsconfig?: string;
  metafile?: boolean | string | { json?: string; markdown?: string };
  files?: Record<string, string | Blob | TypedArray | ArrayBuffer>;
  features?: string[];
}
```
