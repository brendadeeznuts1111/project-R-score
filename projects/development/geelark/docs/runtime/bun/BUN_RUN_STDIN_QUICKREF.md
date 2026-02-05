# `bun run -` Quick Reference

## Syntax

```bash
# Pipe from echo
echo "code" | bun run -

# Heredoc (multi-line)
bun run - << 'EOF'
// your code here
EOF

# Redirect from file
bun run - < script.ts

# Here-string
bun run - <<< "console.log('test')"
```

## Common Examples

### Basic Output
```bash
echo "console.log('Hello')" | bun run -
```

### TypeScript
```bash
echo "const x: string = 'TS'; console.log(x)" | bun run -
```

### JSON Processing
```bash
bun run - << 'EOF'
const data = { name: "Test", value: 42 };
console.log(JSON.stringify(data, null, 2));
EOF
```

### Database
```bash
bun run - << 'EOF'
import { Database } from "bun:sqlite";
const db = new Database(":memory:");
console.log("✅ DB ready");
EOF
```

### File Operations
```bash
bun run - << 'EOF'
await Bun.write("output.txt", "Hello!");
console.log("✅ File written");
EOF
```

### HTTP Request
```bash
bun run - << 'EOF'
const res = await fetch("https://httpbin.org/json");
console.log("Status:", res.status);
EOF
```

### Server
```bash
bun run - << 'EOF'
Bun.serve({
  port: 3000,
  fetch: () => new Response("OK")
});
console.log("✅ Server running");
EOF
```

## CLI Flags

```bash
# With feature flags (may have limitations)
bun run - --feature=FEAT_NAME <<< "code"

# Memory-constrained
bun --smol run - <<< "code"

# Watch mode
bun --watch run - <<< "code"

# Debugging
bun --inspect run - <<< "code"
```

## Use Cases

✅ **Quick testing** - Try code snippets without files
✅ **Pipelines** - Process data from other commands
✅ **One-liners** - Execute simple scripts
✅ **Learning** - Experiment with Bun APIs
✅ **Data processing** - Transform JSON/CSV on the fly

❌ **Complex apps** - Use files for maintainability
❌ **Debugging** - Hard to set breakpoints
❌ **Production** - Not suitable for deployment

## Performance

| Operation | Bun | Node.js |
|-----------|-----|---------|
| Startup | ~5ms | ~25ms |
| Execution | ~4x faster | baseline |

## Key Features

- ✅ Automatic TypeScript support
- ✅ JSX/TSX enabled
- ✅ Full import support
- ✅ Bun APIs available
- ⚠️ Feature flags limited (use env vars instead)
- ⚠️ Debugging tricky (use files for complex code)

## Comparison: `bun run -` vs `bun -e`

| Feature | `bun run -` | `bun -e` |
|---------|-------------|----------|
| **Stdin pipe** | ✅ Yes | ❌ No |
| **Heredoc** | ✅ Yes | ⚠️ Possible |
| **File redirect** | ✅ Yes | ❌ No |
| **CLI flags** | ⚠️ Limited | ✅ Full |
| **String escaping** | ✅ Not needed | ❌ Required |
| **Multi-line** | ✅ Easy | ⚠️ Complex |

## Real-World Example: Upload Test

```bash
bun run - << 'EOF'
const testUpload = async () => {
  const file = Bun.file("package.json");
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("http://localhost:3000/upload", {
    method: "POST",
    body: form
  });

  console.log("Upload status:", res.status);
};
testUpload();
EOF
```

## Environment Variables

```bash
# Set environment for stdin script
API_KEY=test bun run - << 'EOF'
console.log("API Key:", process.env.API_KEY);
EOF
```

## Error Handling

```bash
bun run - << 'EOF'
try {
  const data = JSON.parse(await Bun.stdin.text());
  console.log("✅ Valid JSON");
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
EOF
```

## Tips

1. **Use single quotes in heredoc** (`<< 'EOF'`) to prevent shell expansion
2. **Test complex code in files first** for easier debugging
3. **Use `--smol` for memory-constrained** environments
4. **Prefer environment variables** over feature flags for stdin
5. **Keep scripts short** - under 50 lines for maintainability

## See Also

- [Full Documentation](./BUN_RUN_STDIN.md)
- [Bun Runtime Docs](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin)
- [Feature Flags Guide](./ENV_CHEATSHEET.md#-feature-flags)
