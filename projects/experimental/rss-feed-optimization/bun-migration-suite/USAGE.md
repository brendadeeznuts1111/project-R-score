# Usage Guide

## Quick Start

```bash
# Navigate to the suite directory
cd bun-migration-suite

# Run API exploration
bun run explore

# Analyze your project
bun run migrate:analyze [project-path]

# Run benchmarks
bun run benchmark

# Generate comprehensive report
bun run generate:report [project-path]
```

## Commands

### API Exploration

```bash
# Discover all Bun APIs
bun run explore

# Detailed analysis with HTML output
bun run explore:detailed
```

**Output**: JSON file with all discovered APIs, categories, and migration opportunities.

### Migration Analysis

```bash
# Analyze current project
bun run migrate:analyze

# Analyze specific directory
bun run migrate:analyze ./src

# Generate migration plan
bun run migrate:plan
```

**Output**: 
- List of npm packages that can be replaced
- Files that need changes
- Risk scores and priorities
- Estimated speedups

### Benchmarking

```bash
# Run adaptive benchmarks
bun run benchmark

# Compare specific APIs
bun run benchmark:compare
```

**Output**: Performance comparison data with speedup estimates.

### Comprehensive Reports

```bash
# Generate full report
bun run generate:report

# Generate report for specific project
bun run generate:report ./my-project
```

**Output**: Complete JSON report with:
- API exploration results
- Migration analysis
- Benchmark data
- Recommendations
- Estimated impact

## Example Workflow

1. **Explore APIs**:
   ```bash
   bun run explore
   ```
   This discovers all available Bun APIs.

2. **Analyze Project**:
   ```bash
   bun run migrate:analyze
   ```
   This finds migration opportunities in your codebase.

3. **Review Opportunities**:
   Check the output for high-priority migrations.

4. **Generate Plan**:
   ```bash
   bun run migrate:plan
   ```
   Get a phased migration plan.

5. **Benchmark**:
   ```bash
   bun run benchmark
   ```
   See performance improvements.

6. **Full Report**:
   ```bash
   bun run generate:report
   ```
   Get comprehensive analysis.

## Output Files

- `bun-api-exploration-*.json` - API discovery results
- `benchmark-results-*.json` - Performance benchmark data
- `comprehensive-migration-report-*.json` - Full analysis report

## Tips

1. **Start Small**: Begin with low-risk, high-priority migrations
2. **Test Thoroughly**: Always test after migrations
3. **Use Reports**: Review comprehensive reports for full context
4. **Benchmark First**: Understand performance gains before migrating
5. **Phased Approach**: Use migration plans to migrate incrementally

## Troubleshooting

### "No files found"
- Check that you're in the correct directory
- Ensure files aren't in ignored directories (node_modules, dist, etc.)

### "API not found"
- Some APIs may not be available in your Bun version
- Check Bun version: `bun --version`
- Requires Bun 1.2+ for full feature set

### Performance Issues
- Large projects may take time to analyze
- Use specific directories instead of full project
- Check available memory
