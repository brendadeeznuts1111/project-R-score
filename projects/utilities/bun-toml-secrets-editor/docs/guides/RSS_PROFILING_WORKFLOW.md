# RSS Profiling Workflow Guide

## 🎯 Overview

The RSS Profiling Workflow provides comprehensive performance analysis for RSS feeds with shareable markdown reports, automated analysis, and CLI integration.

---

## 📋 Workflow Steps

### **1. Profile RSS Feed Performance**
```bash
# Profile any RSS feed
bun run rss:profile:markdown https://example.com/feed.xml

# Quick profiling of popular feeds
bun run rss:profile:markdown:hacker    # Hacker News
bun run rss:profile:markdown:bbc       # BBC News
bun run rss:profile:markdown:cnn       # CNN News
```

### **2. Analyze Generated Report**
```bash
# View the latest profile
cat profiles/rss-profile-[ID].md

# List all generated profiles
ls -la profiles/rss-profile-*.md

# View profile summary
grep -A 10 "## Summary" profiles/rss-profile-*.md
```

### **3. Performance Optimization**
- Review **Hot Functions** section for bottlenecks
- Check **File Breakdown** for optimization targets
- Follow **RSS Optimization Recommendations**
- Compare performance across different feeds

### **4. Share & Document**
- Attach markdown reports to GitHub issues
- Share with team for performance reviews
- Use LLM analysis for optimization suggestions
- Archive for historical performance tracking

---

## 🚀 CLI Integration

### **Direct CLI Commands**
```bash
# Matrix CLI integration
matrix rss profile <feed-url> [--output-dir=<path>] [--sampling=<microseconds>]

# Quick commands
matrix rss hacker    # Profile Hacker News
matrix rss bbc       # Profile BBC News
matrix rss cnn       # Profile CNN News

# Advanced options
matrix rss profile <url> --verbose --export-json --compare-baseline
```

### **Workflow Automation**
```bash
# Automated performance monitoring
matrix rss monitor --feeds=feeds.txt --interval=3600 --output-dir=daily-profiles

# Batch profiling
matrix rss batch --feed-list=popular-feeds.txt --parallel=4

# Performance regression testing
matrix rss regression --baseline=baseline.md --current=current.md
```

---

## 📊 Report Analysis

### **Key Metrics**
- **Duration**: Total fetch time in milliseconds
- **Feed Items**: Number of items parsed
- **Cache Status**: Fetch source (cache/network)
- **Samples**: CPU profiling samples collected

### **Performance Insights**
- **Hot Functions**: Top CPU consumers with percentages
- **File Breakdown**: Time distribution by source files
- **Call Tree**: Hierarchical execution flow
- **Optimization Recommendations**: Actionable suggestions

### **Optimization Targets**
1. **RegExp Operations**: High `[Symbol.match]` usage
2. **Network I/O**: `fetch` operation timing
3. **XML Parsing**: Item counting performance
4. **Memory Usage**: Buffer and string operations

---

## 🔧 Configuration

### **Default Settings**
```javascript
// RSS Profiler Configuration
{
  samplingInterval: 50,    // microseconds
  outputDir: './profiles',
  timeout: 30000,          // milliseconds
  maxRetries: 3
}
```

### **Custom Configuration**
```bash
# Set custom sampling interval
RSS_SAMPLING_INTERVAL=100 bun run rss:profile:markdown <url>

# Custom output directory
RSS_OUTPUT_DIR=./custom-profiles bun run rss:profile:markdown <url>

# Extended timeout
RSS_TIMEOUT=60000 bun run rss:profile:markdown <url>
```

---

## 📈 Use Cases

### **Development Teams**
- **Performance Regression Testing**: Catch slowdowns early
- **Feed Optimization**: Identify parsing bottlenecks
- **Architecture Decisions**: Data-driven performance choices

### **DevOps Engineers**
- **SLA Monitoring**: Ensure feed performance targets
- **Capacity Planning**: Resource usage analysis
- **Incident Response**: Performance issue diagnosis

### **Security Teams**
- **Anomaly Detection**: Unusual performance patterns
- **Resource Monitoring**: CPU and memory usage tracking
- **Compliance Reporting**: Performance documentation

---

## 🔄 Automated Workflows

### **Daily Performance Monitoring**
```bash
#!/bin/bash
# daily-rss-monitor.sh

FEEDS=(
  "https://news.ycombinator.com/rss"
  "https://feeds.bbci.co.uk/news/rss.xml"
  "https://rss.cnn.com/rss/edition.rss"
)

DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="./profiles/daily/$DATE"

mkdir -p "$OUTPUT_DIR"

for feed in "${FEEDS[@]}"; do
  echo "Profiling $feed..."
  bun run rss:profile:markdown "$feed" > "$OUTPUT_DIR/$(basename $feed).log" 2>&1
done

echo "Daily profiling complete: $OUTPUT_DIR"
```

### **Performance Regression Testing**
```bash
#!/bin/bash
# performance-regression.sh

BASELINE="./profiles/baseline.md"
CURRENT="./profiles/current.md"
THRESHOLD=20  # 20% degradation threshold

# Generate current profile
bun run rss:profile:markdown https://news.ycombinator.com/rss

# Extract duration from reports
BASELINE_DURATION=$(grep -A1 "Duration" "$BASELINE" | tail -1 | grep -o '[0-9.]*')
CURRENT_DURATION=$(grep -A1 "Duration" "$CURRENT" | tail -1 | grep -o '[0-9.]*')

# Calculate percentage change
CHANGE=$(echo "scale=2; (($CURRENT_DURATION - $BASELINE_DURATION) / $BASELINE_DURATION) * 100" | bc)

if (( $(echo "$CHANGE > $THRESHOLD" | bc -l) )); then
  echo "🚨 PERFORMANCE REGRESSION: ${CHANGE}% degradation detected"
  exit 1
else
  echo "✅ Performance within acceptable range: ${CHANGE}% change"
  exit 0
fi
```

---

## 📚 Integration Examples

### **GitHub Actions Workflow**
```yaml
name: RSS Performance Check
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  rss-performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Profile RSS Performance
        run: |
          bun install
          bun run rss:profile:markdown:hacker
          
      - name: Upload Performance Report
        uses: actions/upload-artifact@v3
        with:
          name: rss-performance-report
          path: profiles/rss-profile-*.md
```

### **Slack Integration**
```bash
#!/bin/bash
# slack-performance-alert.sh

WEBHOOK_URL="$SLACK_WEBHOOK_URL"
PROFILE_PATH="./profiles/latest.md"

# Extract key metrics
DURATION=$(grep -A1 "Duration" "$PROFILE_PATH" | tail -1 | grep -o '[0-9.]*')
ITEMS=$(grep -A1 "Feed Items" "$PROFILE_PATH" | tail -1 | grep -o '[0-9]*')

# Send to Slack
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"📊 RSS Performance Report\\nDuration: ${DURATION}ms\\nItems: ${ITEMS}\\nReport: $(cat $PROFILE_PATH | head -20)\"}" \
  "$WEBHOOK_URL"
```

---

## 🛠️ Troubleshooting

### **Common Issues**

#### **Profiling Fails**
```bash
# Check network connectivity
curl -I https://news.ycombinator.com/rss

# Verify feed format
curl -s https://news.ycombinator.com/rss | head -20

# Check permissions
ls -la profiles/
```

#### **Empty Reports**
```bash
# Increase sampling interval
RSS_SAMPLING_INTERVAL=100 bun run rss:profile:markdown <url>

# Extend timeout
RSS_TIMEOUT=60000 bun run rss:profile:markdown <url>

# Enable verbose logging
DEBUG=1 bun run rss:profile:markdown <url>
```

#### **Performance Issues**
```bash
# Check system resources
top -p $(pgrep bun)

# Monitor disk space
df -h profiles/

# Profile the profiler itself
bun --cpu-prof-md src/cli/generate-profile.js <url>
```

---

## 📋 Best Practices

### **Performance Monitoring**
1. **Establish Baselines**: Profile feeds during normal operations
2. **Regular Monitoring**: Schedule automated profiling runs
3. **Alert Thresholds**: Set alerts for performance degradation
4. **Historical Tracking**: Archive profiles for trend analysis

### **Report Analysis**
1. **Focus on Hotspots**: Prioritize high-impact optimizations
2. **Compare Feeds**: Identify performance patterns
3. **Track Changes**: Monitor performance over time
4. **Share Insights**: Collaborate on optimization strategies

### **Workflow Integration**
1. **CI/CD Pipeline**: Add profiling to deployment workflows
2. **Documentation**: Include reports in performance docs
3. **Team Training**: Educate team on report interpretation
4. **Tool Integration**: Connect with monitoring systems

---

## 🎯 Next Steps

1. **Set up automated monitoring** for critical RSS feeds
2. **Create performance baselines** for your feed ecosystem
3. **Integrate with existing workflows** (CI/CD, monitoring, alerting)
4. **Establish team processes** for performance optimization
5. **Monitor trends** and identify optimization opportunities

---

**🚀 Transform your RSS performance monitoring with comprehensive profiling, automated analysis, and actionable insights!**

*Last updated: January 2026*
