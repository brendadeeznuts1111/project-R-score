# CPU Profiling with Bun

## Overview

CPU profiling is a performance analysis technique that helps identify bottlenecks, optimize code, and understand where your application spends its execution time. Bun provides built-in CPU profiling capabilities that generate `.cpuprofile` files compatible with Chrome DevTools and VS Code.

### What is CPU Profiling?

CPU profiling records a timeline of function calls and their execution times, creating a detailed view of your application's performance characteristics. This data helps you:

- Identify slow functions and bottlenecks
- Understand call hierarchies and execution flow
- Optimize hot paths in your code
- Detect performance regressions

### When to Use CPU Profiling

Use CPU profiling when:

- Your application is slower than expected
- You need to optimize specific operations
- You want to understand performance characteristics before optimization
- You're investigating performance regressions
- You need data-driven optimization decisions

### Benefits

- **Data-driven optimization**: Make informed decisions based on actual performance data
- **Bottleneck identification**: Quickly find the slowest parts of your code
- **Visual analysis**: Use flame graphs and call trees to understand execution flow
- **Regression detection**: Compare profiles before and after changes

---

## Basic Usage

### Simple Profiling Command

The simplest way to profile a script is to use the `--cpu-prof` flag:

```bash
bun --cpu-prof script.ts
```

This will:
- Run your script with CPU profiling enabled
- Generate a `.cpuprofile` file in the current directory
- Use a default filename based on the script name and timestamp

### Output File Location

By default, Bun generates CPU profile files in the current working directory with names like:
- `script.cpuprofile`
- `script-1234567890.cpuprofile` (with timestamp)

### Default Behavior

When using `--cpu-prof`:
- Profiling starts immediately when the script runs
- Profiling continues until the script exits
- The profile file is written automatically on exit
- No additional configuration is required

---

## Advanced Usage

### Custom Output Directory

Use `--cpu-prof-dir` to specify where profile files should be saved:

```bash
bun --cpu-prof --cpu-prof-dir=./profiles script.ts
```

This creates the `profiles` directory if it doesn't exist and saves the profile file there.

### Custom Filename

Use `--cpu-prof-name` to specify a custom filename:

```bash
bun --cpu-prof --cpu-prof-name=my-profile.cpuprofile script.ts
```

Combine both options for full control:

```bash
bun --cpu-prof \
  --cpu-prof-dir=./profiles \
  --cpu-prof-name=optimization-run-1.cpuprofile \
  script.ts
```

### Profiling Tests

Profile your test suite to identify slow tests:

```bash
bun test --cpu-prof test.ts
```

Profile specific tests using name patterns:

```bash
bun test --cpu-prof --test-name-pattern="performance" test.ts
```

This profiles only tests matching the pattern "performance".

### Profiling with Filters

You can combine profiling with other Bun flags:

```bash
# Profile with verbose output
bun --cpu-prof --verbose script.ts

# Profile with hot reload disabled
bun --cpu-prof --no-hot script.ts
```

---

## Analyzing Profiles

### Opening in Chrome DevTools

1. **Open Chrome DevTools**:
   - Navigate to `chrome://inspect` in Chrome
   - Click "Open dedicated DevTools for Node"

2. **Load the Profile**:
   - Go to the **Performance** tab
   - Click the **"Load profile"** button (or press `Ctrl+L` / `Cmd+L`)
   - Select your `.cpuprofile` file

3. **Analyze the Results**:
   - **Flame Graph**: Visual representation of call stacks and execution time
   - **Call Tree**: Hierarchical view of function calls
   - **Bottom-Up**: Functions sorted by self-time
   - **Event Log**: Timeline of events

### Opening in VS Code

1. **Install the CPU Profiler Extension**:
   - Search for "CPU Profiler" in VS Code extensions
   - Install the official extension

2. **Open the Profile**:
   - Right-click on a `.cpuprofile` file
   - Select "Open with CPU Profiler"
   - Or use Command Palette: "CPU Profiler: Open Profile"

3. **View Analysis**:
   - Flame graph visualization
   - Function call hierarchy
   - Time spent in each function

### Reading the Profile Data

**Key Metrics to Look For**:
- **Self Time**: Time spent in the function itself (excluding children)
- **Total Time**: Time including all called functions
- **Call Count**: How many times a function was called
- **Percentage**: What portion of total execution time

**Identifying Bottlenecks**:
1. Look for functions with high **Total Time**
2. Check functions with high **Self Time** (may indicate inefficient algorithms)
3. Identify functions called many times with low individual time (optimization opportunity)
4. Find unexpected function calls (may indicate bugs or inefficiencies)

### Identifying Bottlenecks

**Common Bottleneck Patterns**:

1. **Hot Functions**: Functions that consume a large percentage of CPU time
   - Look for functions > 10% of total time
   - Consider optimization or caching

2. **Deep Call Stacks**: Long chains of function calls
   - May indicate unnecessary indirection
   - Consider flattening or inlining

3. **Frequent Small Calls**: Many calls to small functions
   - May benefit from batching or caching
   - Consider reducing function call overhead

4. **Unexpected Calls**: Functions called more than expected
   - May indicate bugs or inefficient algorithms
   - Review the call sites

---

## Real-World Examples

### TagParser Optimization (186x Speedup)

**Before Optimization**:
- 2000 tag validations: **282ms**
- Profile showed exception handling overhead was the bottleneck
- Exception throwing/catching was expensive

**After Optimization**:
- 2000 tag validations: **1.51ms**
- **Speedup: 186x**
- Replaced exception-based validation with return-value validation

**Key Insight**: The CPU profile revealed that exception handling, not the parsing logic itself, was consuming most of the time. By switching to a return-value approach, we eliminated the exception overhead.

### WebSocket Performance Profiling

Profile WebSocket operations to optimize real-time communication:

```bash
bun --cpu-prof --cpu-prof-name=websocket-profile.cpuprofile src/orca/streaming/server.ts
```

**What to Look For**:
- Message serialization/deserialization overhead
- Subscription management performance
- Broadcast operations
- Connection handling

### API Endpoint Profiling

Profile specific API endpoints to optimize request handling:

```bash
# Start server with profiling
bun --cpu-prof --cpu-prof-name=api-profile.cpuprofile src/api/routes.ts

# Make requests to your API
curl http://localhost:3000/api/endpoint
```

**Analysis Focus**:
- Request parsing time
- Database query performance
- Response serialization
- Middleware overhead

### Test Performance Profiling

Identify slow tests and optimize them:

```bash
bun test --cpu-prof --test-name-pattern="performance" test/
```

**Optimization Opportunities**:
- Slow setup/teardown code
- Inefficient test data generation
- Unnecessary async operations
- Memory allocation patterns

---

## Best Practices

### When to Profile

**Profile During Development**:
- When optimizing specific features
- Before and after major refactoring
- When investigating performance issues
- As part of performance regression testing

**Profile in Production** (if possible):
- Use sampling profilers for production
- Profile representative workloads
- Compare profiles over time

### Sampling Duration

**Short Profiles** (< 10 seconds):
- Good for quick optimization checks
- Focused on specific operations
- Less overhead

**Long Profiles** (> 30 seconds):
- Better for understanding overall performance
- Captures more representative data
- May have more overhead

**Recommendation**: Start with 10-30 second profiles for most use cases.

### Interpreting Results

**Focus Areas**:
1. **Top Time Consumers**: Functions using > 5% of total time
2. **Call Frequency**: Functions called thousands of times
3. **Unexpected Patterns**: Surprising call stacks or frequencies
4. **Optimization Opportunities**: Low-hanging fruit (easy wins)

**Common Pitfalls**:
- **Premature Optimization**: Don't optimize without profiling data
- **Micro-optimizations**: Focus on high-impact changes first
- **Ignoring Context**: Consider the bigger picture, not just individual functions
- **One-Time Profiles**: Profile multiple times to ensure consistency

### Common Pitfalls

**1. Profiling Overhead**:
- Profiling adds overhead (typically 5-10%)
- Results are relative, not absolute
- Don't expect exact timing matches

**2. Sampling Frequency**:
- Low-frequency sampling may miss short functions
- High-frequency sampling adds more overhead
- Balance based on your needs

**3. Profile Size**:
- Long profiles generate large files
- May be slow to load in DevTools
- Consider profiling specific operations

**4. Environment Differences**:
- Development profiles may differ from production
- System load affects results
- Profile multiple times for consistency

---

## Integration with CI/CD

### Automated Profiling

Set up automated profiling in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Profile tests
  run: |
    bun test --cpu-prof --cpu-prof-name=ci-profile.cpuprofile test/
    # Upload profile as artifact
    # Compare with baseline profile
```

### Profile Storage

**Options**:
- Store profiles as CI artifacts
- Upload to cloud storage (S3, GCS)
- Version control (for small profiles)
- Dedicated profiling service

**Recommendation**: Store profiles as CI artifacts and compare against baselines.

### Performance Regression Detection

**Automated Comparison**:
1. Generate profile for current code
2. Compare against baseline profile
3. Alert on significant regressions (> 10% slower)
4. Block merges if critical paths regress

**Example Script**:
```bash
#!/bin/bash
# Compare profiles and detect regressions
bun --cpu-prof --cpu-prof-name=current.cpuprofile test/
# Compare current.cpuprofile with baseline.cpuprofile
# Alert if performance regressed
```

---

## Troubleshooting

### Profile Files Not Generated

**Possible Causes**:
- Script exits before profiling completes
- Insufficient permissions to write files
- Disk space issues
- Profiling not enabled correctly

**Solutions**:
- Ensure script runs long enough (> 1 second)
- Check file permissions and disk space
- Verify `--cpu-prof` flag is present
- Check Bun version (requires Bun 1.3+)

### Profile Too Large

**Symptoms**:
- Profile file > 100MB
- Slow to load in DevTools
- Memory issues when analyzing

**Solutions**:
- Profile shorter time periods
- Use `--cpu-prof-name` to create focused profiles
- Profile specific operations, not entire application
- Consider sampling less frequently

### Inaccurate Results

**Symptoms**:
- Results don't match expectations
- Inconsistent between runs
- Missing function calls

**Possible Causes**:
- Profiling overhead affecting results
- Sampling frequency too low
- System load affecting measurements
- Short execution times

**Solutions**:
- Profile longer time periods
- Run multiple times and average
- Ensure consistent system load
- Focus on relative comparisons, not absolute times

### Performance Overhead

**Expected Overhead**:
- CPU profiling adds 5-10% overhead typically
- More overhead with higher sampling frequency
- File I/O overhead when writing profile

**Mitigation**:
- Profile only when needed
- Use lower sampling frequency if acceptable
- Profile representative workloads
- Consider production sampling profilers for live systems

---

## Quick Reference

### Common Commands

```bash
# Basic profiling
bun --cpu-prof script.ts

# Custom output
bun --cpu-prof --cpu-prof-dir=./profiles --cpu-prof-name=profile.cpuprofile script.ts

# Profile tests
bun test --cpu-prof test.ts

# Profile specific tests
bun test --cpu-prof --test-name-pattern="performance" test.ts
```

### Profile Analysis Workflow

1. **Generate Profile**: `bun --cpu-prof script.ts`
2. **Open in DevTools**: Chrome DevTools → Performance → Load profile
3. **Identify Bottlenecks**: Look for high time percentages
4. **Optimize**: Focus on top time consumers
5. **Re-profile**: Verify improvements
6. **Compare**: Use before/after profiles

### Key Metrics

- **Self Time**: Time in function itself
- **Total Time**: Time including children
- **Call Count**: Number of invocations
- **Percentage**: Portion of total time

---

## Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Chrome DevTools Performance Guide](https://developer.chrome.com/docs/devtools/performance/)
- [VS Code CPU Profiler Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame)
- [Performance Optimization Best Practices](https://web.dev/performance/)

---

## Summary

CPU profiling with Bun is a powerful tool for understanding and optimizing your application's performance. By generating `.cpuprofile` files and analyzing them in Chrome DevTools or VS Code, you can:

- Identify bottlenecks and slow functions
- Make data-driven optimization decisions
- Detect performance regressions
- Understand execution flow and call hierarchies

Remember to profile during development, focus on high-impact optimizations, and use profiles to guide your optimization efforts rather than guessing where performance issues lie.

**Key Takeaways**:
- Use `--cpu-prof` to enable profiling
- Analyze profiles in Chrome DevTools or VS Code
- Focus on functions with high time percentages
- Profile before and after optimizations
- Integrate profiling into your CI/CD pipeline

Happy profiling! 🚀
