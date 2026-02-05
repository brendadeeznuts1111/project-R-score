# Examples

This directory contains example files demonstrating various features of the ShortcutRegistry system, particularly Bun macros.

## Examples

### `macro-example.ts`

Comprehensive example demonstrating all available Bun macros:

- `getDefaultShortcuts` - Embed shortcuts at build-time
- `getGitCommitHash` - Extract Git commit information
- `getBuildInfo` - Collect build metadata
- `validateShortcuts` - Validate configuration at build-time

**Usage:**
```bash
# Run directly
bun run examples/macro-example.ts

# Build to see inlined results
bun run build:example
```

### `meta-tags-example.ts`

Demonstrates the HTMLRewriter pattern from Bun's documentation for extracting meta tags from web pages at build-time.

**Usage:**
```bash
# Run directly
bun run examples/meta-tags-example.ts

# Build to see inlined meta tags
bun build examples/meta-tags-example.ts --outdir dist
```

**Features:**
- Fetches HTML from a URL at build-time
- Extracts meta tags using HTMLRewriter
- Extracts Open Graph tags
- Extracts structured data (JSON-LD)

### `cli-demo.sh`

Shell script demonstrating the CLI tool with various commands.

**Usage:**
```bash
# Run the demo
bun run cli:demo

# Or directly
bash examples/cli-demo.sh
```

## Building Examples

All examples can be built to see how macros inline their results:

```bash
# Build macro example
bun run build:example

# Build meta tags example
bun build examples/meta-tags-example.ts --outdir dist

# View built output
cat dist/macro-example.js
cat dist/meta-tags-example.js
```

## What You'll See

When you build these examples, you'll notice:

1. **Macro functions are removed** - The source code of macro functions doesn't appear in the bundle
2. **Results are inlined** - Return values are directly embedded in the bundle
3. **Git commit hash is embedded** - No git command needed at runtime
4. **Shortcuts are embedded** - No file I/O needed at runtime
5. **Build info is computed once** - At build-time, not runtime

## Try It Yourself

```bash
# 1. Run the CLI demo
bun run cli:demo

# 2. Try different CLI commands
bun run cli info
bun run cli shortcuts
bun run cli search save

# 3. Build an example and inspect the output
bun run build:example
cat dist/macro-example.js | head -50

# 4. Compare source vs built output
diff <(cat examples/macro-example.ts) <(cat dist/macro-example.js)
```

## Learn More

- [Macros Documentation](../src/macros/README.md)
- [CLI Documentation](../src/cli/README.md)
- [Bun Macros Docs](https://bun.sh/docs/bundler/macros)
