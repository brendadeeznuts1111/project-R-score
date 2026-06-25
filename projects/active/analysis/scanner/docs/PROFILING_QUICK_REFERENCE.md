# Profiling Quick Reference

Quick reference guide for CPU and heap profiling in the scanner project.

## CPU Profiling

### Markdown Only (Fast, grep-friendly)

```bash
bun --cpu-prof-md scripts/profile-example.ts
```

### Both Formats (Chrome DevTools + Markdown)

```bash
bun --cpu-prof --cpu-prof-md scripts/profile-example.ts
```

### Custom Output Location

```bash
bun --cpu-prof-md --cpu-prof-dir .audit --cpu-prof-name my-profile scripts/profile-example.ts
```

### Using Package Scripts

```bash
# CPU profiling (Chrome DevTools format)
bun run profile:cpu

# CPU profiling (Markdown format)
bun run profile:cpu:md

# Example script with both formats
bun run profile:example
```

## Heap Profiling

### Markdown Only

```bash
bun --heap-prof-md scripts/profile-example.ts
```

### Chrome DevTools Format

```bash
bun --heap-prof scripts/profile-example.ts
```

### Both Formats

```bash
bun --heap-prof --heap-prof-md scripts/profile-example.ts
```

### Custom Output Location

```bash
bun --heap-prof-md --heap-prof-dir .audit --heap-prof-name my-heap scripts/profile-example.ts
```

### Using Package Scripts

```bash
# Heap profiling (Chrome DevTools format)
bun run profile:heap

# Heap profiling (Markdown format)
bun run profile:heap:md
```

## Combined Profiling

### Both CPU and Heap (Markdown)

```bash
bun --cpu-prof-md --heap-prof-md scripts/profile-example.ts
```

### Both CPU and Heap (All Formats)

```bash
bun --cpu-prof --cpu-prof-md --heap-prof --heap-prof-md scripts/profile-example.ts
```

## Profiling Scanner Project

### Profile Audit Mode

```bash
# CPU profile of audit scan
bun run profile:cpu:md

# Heap profile of audit scan
bun run profile:heap:md
```

### Profile with Custom Name

```bash
bun --cpu-prof-md --cpu-prof-dir .audit --cpu-prof-name scan-audit scan.ts --audit
```

## Analyzing Markdown Profiles

### CPU Profile Analysis

```bash
# Find hot functions
grep "Self%" profile.md | head -10

# Find functions taking >10% time
grep -E "Self%|^[0-9]{2,}\." profile.md

# Find specific function
grep "functionName" profile.md
```

### Heap Profile Analysis

```bash
# Find large objects
grep 'size=[0-9]\{5,\}' profile.md

# Find specific type
grep 'type=Function' profile.md

# Find GC roots
grep 'gcroot=1' profile.md
```

## Output Locations

- **Default**: Current working directory
- **Custom**: Use `--cpu-prof-dir` or `--heap-prof-dir`
- **Scanner project**: Uses `.audit/` directory

## File Naming

- **Default**: `CPU-<timestamp>.cpuprofile` or `CPU-<timestamp>.md`
- **Custom**: Use `--cpu-prof-name` or `--heap-prof-name`
- **Extension**: Automatically added (.cpuprofile, .md, .heapsnapshot)

## See Also

- [Bun v1.3.7 Features](./BUN_V1.3.7_FEATURES.md) - Detailed feature documentation
- [Code Quality Automation](./CODE_QUALITY_AUTOMATION.md) - Linting and formatting
