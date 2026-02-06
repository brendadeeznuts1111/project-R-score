# 🚀 Performance Analysis & Optimization Toolkit

A comprehensive, organized performance monitoring, profiling, and optimization toolkit for JavaScript/TypeScript projects using Bun.

## 📁 Project Structure

```text
2048/
├── src/
│   └── performance/              # Core performance tools
│       ├── profile-analyzer.ts          # CPU profile analysis
│       ├── optimization-recommender.ts   # Code pattern analysis
│       ├── performance-tester.ts        # Automated testing
│       ├── network-process-monitor.ts   # System monitoring
│       └── performance-dashboard.ts     # Web dashboard
│
├── tools/
│   └── performance-cli.ts        # Unified CLI interface
│
├── scripts/
│   └── performance-ci.sh         # CI/CD integration script
│
├── .github/
│   └── workflows/
│       └── performance.yml       # GitHub Actions workflow
│
├── profiles/                     # CPU profiles
├── performance-results/          # Test results & baselines
├── performance-reports/          # CI/CD reports
├── PERFORMANCE_ANALYSIS_README.md # Detailed documentation
└── PERFORMANCE_TOOLKIT_README.md  # This file
```

## 🎯 Quick Start

### Installation
```bash
# Clone or download the project
cd 2048

# Install dependencies (if any)
bun install
```

### Usage

#### 1. Unified CLI (Recommended)
```bash
# Show all commands
bun run perf help

# Run full analysis pipeline
bun run perf full-analysis

# Analyze CPU profiles
bun run perf analyze-profiles

# Scan codebase for optimizations
bun run perf analyze-code ./src

# Run performance tests
bun run perf test

# Start dashboard
bun run perf dashboard 3001

# Continuous monitoring
bun run perf monitor 60

# Generate comprehensive report
bun run perf report
```

#### 2. Individual Tools
```bash
# CPU Profile Analysis
bun run perf:analyze

# Code Analysis
bun run perf:scan

# Performance Tests
bun run perf:test

# Dashboard
bun run perf:dashboard

# CI/CD Pipeline
bun run perf:ci
```

## 🛠️ Package.json Scripts

### Performance Scripts
```json
{
  "perf": "bun run tools/performance-cli.ts",
  "perf:analyze": "bun run src/performance/profile-analyzer.ts",
  "perf:scan": "bun run src/performance/optimization-recommender.ts",
  "perf:test": "bun run src/performance/performance-tester.ts run",
  "perf:dashboard": "bun run src/performance/performance-dashboard.ts",
  "perf:monitor": "bun run src/performance/performance-tester.ts monitor",
  "perf:full": "bun run tools/performance-cli.ts full-analysis",
  "perf:report": "bun run tools/performance-cli.ts report",
  "perf:ci": "bash scripts/performance-ci.sh",
  "perf:build": "bun build src/performance/*.ts --outdir=dist/performance --target=browser"
}
```

## 📊 Component Overview

### 1. CPU Profile Analyzer (`src/performance/profile-analyzer.ts`)
- Parses Chrome DevTools CPU profiles
- Identifies bottlenecks with severity levels
- Detects optimization opportunities
- **Usage**: `bun run perf:analyze`

### 2. Optimization Recommender (`src/performance/optimization-recommender.ts`)
- Scans codebase for performance anti-patterns
- Categorizes issues (Performance, Memory, Algorithm, Bundle Size, React)
- Severity-based prioritization
- **Usage**: `bun run perf:scan`

### 3. Performance Tester (`src/performance/performance-tester.ts`)
- 6 comprehensive performance tests
- Baseline tracking with regression detection
- Memory usage monitoring
- **Usage**: `bun run perf:test`

### 4. Network & Process Monitor (`src/performance/network-process-monitor.ts`)
- Real-time system monitoring
- Clean table formatting
- Process, memory, CPU, network metrics
- **Usage**: `bun run perf:monitor`

### 5. Performance Dashboard (`src/performance/performance-dashboard.ts`)
- Web-based dashboard with 5 tabs
- Live data visualization with Chart.js
- Auto-refresh every 30 seconds
- **Usage**: `bun run perf:dashboard`

### 6. Unified CLI (`tools/performance-cli.ts`)
- Single command interface for all tools
- 7 commands: analyze-profiles, analyze-code, test, dashboard, full-analysis, monitor, report
- **Usage**: `bun run perf <command>`

## 🚀 CI/CD Integration

### GitHub Actions
The `.github/workflows/performance.yml` workflow provides:

1. **Performance Tests** (on push/PR)
   - Runs on main/develop branches
   - Uploads reports as artifacts
   - Comments on PRs with results
   - Warns on regressions

2. **Benchmark Suite** (on push/PR)
   - Runs benchmark tests
   - Uploads results for comparison

3. **Continuous Monitoring** (daily at 2 AM)
   - Scheduled performance monitoring
   - Slack notifications on failure
   - Long-term trend analysis

### CI/CD Script (`scripts/performance-ci.sh`)
Standalone script for any CI environment:

```bash
# Run in CI pipeline
bash scripts/performance-ci.sh

# Configuration
PERFORMANCE_THRESHOLD=100  # Max test duration (ms)
REGRESSION_THRESHOLD=10    # Max regression percentage
```

## 📈 Performance Metrics

### Key Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Duration | Test execution time | < 100ms |
| Operations/sec | Throughput | > 1M ops/sec |
| Memory Usage | Heap allocation | < 50MB |
| Regressions | Performance degradation | 0 |
| Bottlenecks | High-impact functions | < 5 |

### Baseline Tracking
The system maintains running averages for each test:

```json
{
  "fibonacci-recursive": {
    "avgTime": 33.10,
    "maxTime": 36.41,
    "avgMemory": 0,
    "minOps": 30,
    "tolerance": 10
  }
}
```

Regressions are detected when performance degrades by more than 10% from baseline.

## 🎯 Optimization Categories

### 1. Performance
- Inefficient loops
- Console logging in production
- Slow array operations
- Expensive string concatenation

### 2. Memory
- Unmanaged intervals
- Event listener leaks
- Object creation overhead

### 3. Algorithm
- Recursive functions without memoization
- Inefficient sorting
- Exponential time complexity

### 4. Bundle Size
- Full library imports
- Deprecated dependencies
- Large dependencies

### 5. React (if applicable)
- Missing dependency arrays
- Inline styles
- Unnecessary re-renders

## 📊 Dashboard Features

### 5 Interactive Tabs
1. **Overview** - System status, test summary, trends
2. **CPU Profiles** - Detailed bottleneck analysis
3. **Recommendations** - Optimization suggestions
4. **Test Results** - Individual test performance
5. **Trends** - Historical performance data

### Visualizations
- Line charts for trends
- Bar charts for historical data
- Color-coded severity (🔴🟡🟢)
- Real-time metrics updates

## 🔧 Advanced Usage

### Custom Performance Tests
Add custom tests to `src/performance/performance-tester.ts`:

```typescript
this.addTest({
  name: 'my-custom-test',
  description: 'Custom performance test',
  run: async () => {
    const start = performance.now();
    // Your test logic here
    const end = performance.now();
    
    return {
      name: 'my-custom-test',
      duration: end - start,
      operationsPerSecond: 1000 / ((end - start) / 1000)
    };
  },
  threshold: { maxTime: 50, minOps: 10000 }
});
```

### Custom Code Patterns
Add custom patterns to `src/performance/optimization-recommender.ts`:

```typescript
{
  pattern: /your-regex-pattern/g,
  issue: 'Your issue description',
  recommendation: 'Your recommendation',
  severity: 'high' | 'medium' | 'low',
  category: 'Your Category'
}
```

### Integration with Other CI Systems

#### GitLab CI
```yaml
performance:
  stage: test
  script:
    - bun install
    - bun run perf:ci
  artifacts:
    paths:
      - performance-reports/
    expire_in: 30 days
```

#### Jenkins
```groovy
pipeline {
    agent any
    stages {
        stage('Performance Tests') {
            steps {
                sh 'bun install'
                sh 'bun run perf:ci'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'performance-reports/**/*'
        }
    }
}
```

## 📋 Example Workflows

### Complete Analysis Pipeline
```bash
# 1. Generate CPU profiles for your application
bun --cpu-prof --cpu-prof-name app-profile.cpuprofile --cpu-prof-dir ./profiles run app.ts

# 2. Run comprehensive analysis
bun run perf full-analysis

# 3. Review recommendations
bun run perf analyze-code ./src

# 4. Start monitoring dashboard
bun run perf dashboard
# Open http://localhost:3001 in browser

# 5. Implement optimizations based on findings
# 6. Re-run tests to verify improvements
```

### CI/CD Integration
```bash
# In your CI pipeline
bun run perf:ci

# Or use individual commands
bun run perf:test
bun run perf:analyze
bun run perf:scan
bun run perf:report
```

### Development Workflow
```bash
# Before committing changes
bun run perf:test

# After implementing optimizations
bun run perf full-analysis

# Monitor for regressions
bun run perf monitor 60
```

## 🎨 Dashboard Access

### Local Development
```bash
# Start dashboard on port 3001
bun run perf dashboard 3001

# Access at http://localhost:3001
```

### Production Deployment
```bash
# Build for production
bun run perf:build

# Deploy dist/performance/ to your web server
# The dashboard is a static HTML file with embedded JavaScript
```

## 📈 Performance Targets

### Excellent Performance
- Duration: < 10ms
- Operations/sec: > 1M
- Memory: < 10MB
- Regressions: 0

### Good Performance
- Duration: < 50ms
- Operations/sec: > 100K
- Memory: < 50MB
- Regressions: < 2

### Needs Improvement
- Duration: > 100ms
- Operations/sec: < 10K
- Memory: > 100MB
- Regressions: > 5

## 🔍 Troubleshooting

### Common Issues

**1. Profile files not found**
```bash
# Ensure profiles directory exists
mkdir -p profiles

# Generate profiles with correct flags
bun --cpu-prof --cpu-prof-dir ./profiles run script.ts
```

**2. Dashboard not loading**
```bash
# Check if port is available
lsof -i :3001

# Try different port
bun run perf dashboard 3002
```

**3. High memory usage**
- Check for event listener leaks
- Review setInterval/setTimeout usage
- Monitor object creation patterns

**4. Performance regressions**
- Compare with baseline data
- Check for recent code changes
- Review dependency updates

## 📚 Best Practices

### 1. Regular Monitoring
- Run tests before and after changes
- Track trends over time
- Set up automated monitoring

### 2. Prioritize Fixes
- Address high-impact bottlenecks first
- Fix memory leaks immediately
- Optimize critical paths

### 3. Validate Improvements
- Re-profile after optimizations
- Compare metrics with baselines
- Ensure no regressions introduced

### 4. Documentation
- Keep optimization records
- Document performance targets
- Share findings with team

## 🚀 Performance Tips

### 1. CPU Profiles
- Generate profiles with `--cpu-prof` flag
- Use Chrome DevTools for visual analysis
- Focus on functions with > 10% execution time

### 2. Code Analysis
- Address high-priority issues first
- Fix memory leaks immediately
- Optimize critical paths

### 3. Testing
- Run tests before and after changes
- Track baseline performance
- Monitor for regressions

### 4. Dashboard
- Use for real-time monitoring
- Share with team for visibility
- Track trends over time

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review example outputs
3. Verify Bun version compatibility
4. Check file permissions and paths

## 📝 License

This toolkit is provided as-is for performance analysis and optimization purposes.

---

**Built with ❤️ using Bun**  
**Performance monitoring made simple**