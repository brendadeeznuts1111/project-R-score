# 📚 Bun Monitoring & Analysis Examples

A comprehensive suite of monitoring, analysis, and testing examples showcasing Bun's native capabilities for real-time application monitoring and performance optimization.

## 🚀 Quick Start

```bash
# List all available examples
bun index.ts list

# Run the real-time monitoring example
bun index.ts run realtime-monitoring.ts

# Run all examples
bun index.ts run-all
```

## 📋 Example Categories

### 🔍 **Monitoring Examples**

Real-time monitoring and observability tools for production applications.

#### **Real-time Monitoring** (`realtime-monitoring.ts`)
- **Difficulty:** 🟡 Intermediate
- **Features:** Live bundle analysis, build monitoring, dependency tracking
- **Usage:** Complete real-time monitoring server with dashboard
- **Endpoints:** `/metrics`, `/bundle-analysis`, `/build-status`, `/build-history`

```bash
bun run realtime-monitoring.ts
# 📊 Dashboard: http://localhost:3003
```

#### **Standalone Monitoring** (`monitoring-standalone.ts`)
- **Difficulty:** 🟢 Beginner
- **Features:** Enhanced monitoring with real bundle data integration
- **Usage:** Simple standalone monitoring with minimal setup
- **Perfect for:** Quick integration and testing

```bash
bun run monitoring-standalone.ts
# 📊 Dashboard: http://localhost:3003
```

### 📊 **Analysis Examples**

Advanced analysis tools for bundle optimization and performance insights.

#### **Bundle Analyzer** (`bundle-analyzer.ts`)
- **Difficulty:** 🔴 Advanced
- **Features:** Comprehensive bundle analysis, optimization scoring, duplicate detection
- **Outputs:** Detailed reports with recommendations
- **Formats:** Markdown, JSON, HTML reports

```bash
bun run bundle-analyzer.ts --dir=./dist --output=report.md
```

**Key Features:**
- 🔍 Deep dependency analysis
- 📈 Optimization scoring (0-100)
- 🚨 Duplicate content detection
- 💡 Smart recommendations
- 📄 Multiple output formats

#### **Build Comparator** (`build-comparator.ts`)
- **Difficulty:** 🔴 Advanced
- **Features:** Compare builds over time, track changes, size analysis
- **Usage:** CI/CD integration, regression testing
- **Storage:** Persistent build snapshots

```bash
# Capture build snapshot
bun run build-comparator.ts capture --label=feature-branch

# Compare builds
bun run build-comparator.ts compare build1.json build2.json

# Compare latest builds
bun run build-comparator.ts latest
```

**Key Features:**
- 📸 Build snapshot capture
- 🔄 Build comparison and diff
- 📊 Size change tracking
- 📦 Dependency change analysis
- 📈 Trend analysis

### ⚡ **Benchmarking Examples**

Performance testing and optimization tools.

#### **Performance Benchmark** (`performance-benchmark.ts`)
- **Difficulty:** 🟡 Intermediate
- **Features:** Comprehensive performance testing, memory analysis
- **Categories:** Bun APIs, server performance, memory usage
- **Reports:** Detailed performance metrics

```bash
# Run all benchmarks
bun run performance-benchmark.ts

# Run specific category
bun run performance-benchmark.ts --type=bun

# Server benchmarks
bun run performance-benchmark.ts --type=server --port=3000
```

**Benchmark Categories:**
- 🚀 Bun native APIs (hash, password, color)
- 📝 String and array operations
- 🗃️ File system operations
- 🌐 HTTP server performance
- 💾 Memory usage patterns
- ⏱️ Async operations

### 🧪 **Testing Examples**

Testing utilities and sample data generation.

#### **Test Real-time Monitoring** (`test-realtime-monitoring.ts`)
- **Difficulty:** 🟢 Beginner
- **Features:** Sample build generation, monitoring system testing
- **Usage:** Development and testing of monitoring tools
- **Output:** Sample build artifacts

```bash
bun run test-realtime-monitoring.ts
```

**What it creates:**
- 📁 Sample `./dist` directory
- 📄 HTML, CSS, JS files
- 📋 Build manifests
- 📊 Metafiles for analysis

## 🛠️ Installation & Setup

### Prerequisites
- Bun runtime (`curl -fsSL https://bun.sh/install | bash`)
- Node.js compatibility (optional)
- File system access
- Network access (for server examples)

### Quick Setup
```bash
# Clone or navigate to the project
cd /path/to/b-react-hmr-refresh/examples

# Install dependencies (if needed)
bun install

# Verify setup
bun index.ts check-deps
```

## 📖 Usage Guide

### Running Examples

#### Individual Examples
```bash
# Run a specific example
bun index.ts run realtime-monitoring.ts

# Get details about an example
bun index.ts details bundle-analyzer.ts
```

#### Batch Operations
```bash
# List all examples
bun index.ts list

# Run all examples (for testing)
bun index.ts run-all

# Check all dependencies
bun index.ts check-deps
```

### Example Configurations

#### Real-time Monitoring
```typescript
// Custom configuration
const server = new RealtimeMonitor({
  buildDir: "./build",
  port: 3003,
  updateInterval: 5000,
  enableWebSocket: true
});
```

#### Bundle Analysis
```bash
# Custom analysis options
bun run bundle-analyzer.ts \
  --dir=./dist \
  --output=analysis.md \
  --format=json \
  --threshold=5MB
```

#### Performance Testing
```bash
# Custom benchmark options
bun run performance-benchmark.ts \
  --type=all \
  --iterations=10000 \
  --output=results.json \
  --port=3000
```

## 📊 Integration Examples

### CI/CD Integration

#### GitHub Actions
```yaml
name: Bundle Analysis
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run examples/build-comparator.ts capture --label=${{ github.sha }}
      - run: bun run examples/bundle-analyzer.ts --output=report.md
      - uses: actions/upload-artifact@v3
        with:
          name: bundle-report
          path: report.md
```

#### Performance Regression Testing
```bash
#!/bin/bash
# performance-check.sh

# Baseline performance
bun run examples/performance-benchmark.ts --type=bun > baseline.json

# Current performance
bun run examples/performance-benchmark.ts --type=bun > current.json

# Compare (implement comparison logic)
node compare-performance.js baseline.json current.json
```

### Development Workflow

#### Local Development
```bash
# 1. Start monitoring server
bun run examples/realtime-monitoring.ts

# 2. In another terminal, make changes
bun run build

# 3. Watch real-time updates at http://localhost:3003
```

#### Bundle Optimization
```bash
# 1. Analyze current bundle
bun run examples/bundle-analyzer.ts

# 2. Make optimizations
# (your optimization changes)

# 3. Compare with baseline
bun run examples/build-comparator.ts capture --label=before-optimization
bun run build
bun run examples/build-comparator.ts capture --label=after-optimization
bun run examples/build-comparator.ts compare before-optimization.json after-optimization.json
```

## 🔧 Advanced Configuration

### Custom Build Directories
```typescript
// Configure for different build systems
const analyzer = new BundleAnalyzer("./build"); // Custom build dir
const monitor = new RealtimeMonitor("./dist");  // Default
```

### Performance Thresholds
```typescript
// Set custom performance thresholds
const benchmark = new PerformanceBenchmark();
benchmark.setThresholds({
  bundleSize: "5MB",
  buildTime: 30000, // 30 seconds
  memoryUsage: "512MB"
});
```

### Export Formats
```bash
# Generate reports in different formats
bun run bundle-analyzer.ts --format=json > analysis.json
bun run bundle-analyzer.ts --format=markdown > analysis.md
bun run bundle-analyzer.ts --format=html > analysis.html
```

## 📈 Metrics & Monitoring

### Key Metrics Tracked
- **Bundle Size**: Total, by type, changes over time
- **Dependencies**: Count, size, usage, duplicates
- **Performance**: Build time, runtime performance, memory usage
- **Assets**: Images, CSS, fonts, optimization status
- **Build Health**: Success rate, error tracking, recommendations

### Alerting Examples
```typescript
// Custom alerts
const monitor = new RealtimeMonitor();
monitor.addAlert({
  type: "bundle-size",
  threshold: "5MB",
  action: "notify"
});

monitor.addAlert({
  type: "build-time",
  threshold: 30000,
  action: "fail-build"
});
```

## 🚨 Troubleshooting

### Common Issues

#### Build Directory Not Found
```bash
# Create sample build for testing
bun run examples/test-realtime-monitoring.ts
```

#### Permission Errors
```bash
# Ensure proper permissions
chmod +x examples/*.ts
```

#### Port Already in Use
```bash
# Use different port
BUN_PORT=3004 bun run examples/realtime-monitoring.ts
```

#### Memory Issues
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" bun run examples/performance-benchmark.ts
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=true bun run examples/realtime-monitoring.ts

# Verbose output
bun run examples/bundle-analyzer.ts --verbose
```

## 🤝 Contributing

### Adding New Examples
1. Create new `.ts` file in `examples/`
2. Follow the existing pattern and documentation
3. Add to `examples/index.ts`
4. Update this README
5. Test with `bun index.ts run-all`

### Example Structure
```typescript
#!/usr/bin/env bun

/**
 * Brief description of the example
 * Detailed explanation of what it does
 */

import { /* dependencies */ } from "modules";

// Main implementation
class ExampleRunner {
  async run() {
    // Implementation
  }
}

// CLI interface
if (import.meta.main) {
  // Handle command line arguments
}
```

## 📚 Additional Resources

### Documentation
- [Real-time Monitoring Guide](./README-Realtime-Monitoring.md)
- [Bun Documentation](https://bun.sh/docs)
- [Performance Best Practices](https://bun.sh/docs/performance)

### Related Projects
- [Bun](https://github.com/oven-sh/bun) - JavaScript runtime
- [Vite](https://vitejs.dev/) - Build tool
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

### Community
- [Bun Discord](https://discord.bun.sh)
- [GitHub Discussions](https://github.com/oven-sh/bun/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bun)

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Bun's native APIs**
