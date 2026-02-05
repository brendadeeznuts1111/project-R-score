# bun pm pack Demo

This example demonstrates how `bun pm pack` automatically includes binaries declared in `bin` and `directories.bin` fields, even when they're not listed in the `files` array.

## Structure

```
pm-pack-demo/
├── bin/
│   ├── cli.js      # Auto-included via bin field
│   └── scanner.js  # Auto-included via bin field
├── src/
│   └── index.js    # Included via files array
└── package.json
```

## Test Pack Creation

```bash
cd examples/pm-pack-demo
bun pm pack

# Verify binaries are included
tar -tzf pm-pack-demo-1.0.0.tgz | grep bin/
# Should show:
# package/bin/cli.js
# package/bin/scanner.js
```

## Key Points

- ✅ `bin/cli.js` and `bin/scanner.js` are **automatically included** even though `bin/` is not in `files` array
- ✅ Paths are deduplicated if they appear in both `bin`/`directories.bin` and `files`
- ✅ Matches npm pack behavior



