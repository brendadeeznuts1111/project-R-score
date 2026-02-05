# 🚀 Empire Pro CLI v4.0 - Quick Start Guide

## ⚡ 5-Minute Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/empirepro/windsurf-project.git
cd windsurf-project

# Install dependencies
bun install

# Make CLI executable
chmod +x cli/bin/ep-cli

# Test installation
bun run ep-cli --version
```

### 2. Basic Usage

```bash
# Phone intelligence analysis
bun run ep-cli phone +15551234567 --audit --risk-breakdown

# Email verification
bun run ep-cli email user@company.com --email-intel --breach-check

# Address analysis
bun run ep-cli address "123 Main St, NYC" --address-intel --property-value

# Social media mapping
bun run ep-cli social "@username" --social-map --influence-score
```

### 3. Batch Processing

```bash
# Create sample data files
echo "+15551234567" > phones.txt
echo "+15551234568" >> phones.txt
echo "user@company.com" > emails.txt
echo "123 Main St, NYC" > addresses.txt

# Process in parallel
bun run ep-cli batch phones.txt --type=phones --parallel=4 --export=json
bun run ep-cli email emails.txt --batch-emails --parallel=2 --export=slack
```

## 🎯 Demo Commands

### Phone Intelligence Demo

```bash
# Complete phone audit
bun run ep-cli phone +15551234567 --audit --correlate=email:address:social --risk-breakdown

# Expected output:
# ✅ Phone Audit Complete
# 📊 Consistency: 82% ✅
# 📧 Email: john@company.com
# 🏠 Address: 123 Main St
# 👤 Social: linkedin.com/in/john
# ⚠️ SyntheticRisk: 12% | FraudRisk: 8% | TakeoverRisk: 3%
# 🧠 ML_Confidence: 0.94
```

### Email Intelligence Demo

```bash
# Email enrichment
bun run ep-cli email ceo@fortune500.com --enrich-linkedin --company-intel

# Expected output:
# ✅ LinkedIn Enrichment Complete
# 👔 LinkedIn: VP Engineering
# 🏢 Company: Fortune 500
# 👥 Employees: 10k+
# 💰 Revenue: $5B
```

### Social Intelligence Demo

```bash
# Cross-platform mapping
bun run ep-cli social "@john_doe" --social-map --platforms=twitter,linkedin,github --influence-score

# Expected output:
# ✅ Cross-Platform Mapping Complete
# 📱 Platforms: 3
# 🌟 Influence: Medium
# ✅ Twitter: @john_doe
# ✅ LinkedIn: linkedin.com/in/john
# ❌ GitHub: Not found
# 📊 GraphScore: 78
```

## 🔧 Configuration

### Environment Setup

```bash
# Create .env file
cat > .env << EOF
CASH_APP_API_KEY=your_api_key_here
CASH_APP_API_SECRET=your_api_secret_here
REDIS_URL=redis://localhost:6379
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook
EOF

# Load environment variables
source .env
```

### Configuration File

```bash
# Create config file
bun run ep-cli config init --interactive

# Or create manually
cat > empire-pro-config.json << EOF
{
  "api": {
    "timeout": 30000,
    "retries": 3
  },
  "cache": {
    "ttl": 3600,
    "maxSize": 1000
  },
  "parallel": {
    "default": 32,
    "max": 64
  },
  "export": {
    "format": "json",
    "compression": true
  }
}
EOF
```

## 📊 Sample Workflows

### Risk Assessment Pipeline

```bash
#!/bin/bash
# risk-assessment-pipeline.sh

echo "🔍 Starting Risk Assessment Pipeline..."

# Step 1: Phone analysis
echo "📱 Analyzing phone numbers..."
bun run ep-cli phone +15551234567 --audit --risk-breakdown --export=json > phone-results.json

# Step 2: Email verification
echo "📧 Verifying emails..."
bun run ep-cli email user@company.com --email-intel --breach-check --export=json > email-results.json

# Step 3: Social mapping
echo "👤 Mapping social profiles..."
bun run ep-cli social "@username" --social-map --influence-score --export=json > social-results.json

# Step 4: Generate combined report
echo "📊 Generating combined report..."
jq -s 'add' phone-results.json email-results.json social-results.json > combined-risk-report.json

echo "✅ Risk assessment complete! Results saved to combined-risk-report.json"
```

### Compliance Check Workflow

```bash
#!/bin/bash
# compliance-check.sh

echo "⚖️ Starting Compliance Check..."

# GDPR compliance
echo "🇪🇺 Checking GDPR compliance..."
bun run ep-cli compliance audit-logs.json --regulations=gdpr --export=pdf

# PCI compliance
echo "💳 Checking PCI compliance..."
bun run ep-cli compliance audit-logs.json --regulations=pci --export=pdf

# SOC2 compliance
echo "🏢 Checking SOC2 compliance..."
bun run ep-cli compliance audit-logs.json --regulations=soc2 --export=pdf

echo "✅ Compliance checks complete!"
```

## 🎨 Customization Examples

### Custom Export Formats

```bash
# Export to CSV with custom fields
bun run ep-cli batch phones.txt --export=csv --format=table --fields=phone,riskScore,carrier,type

# Export to Parquet for analytics
bun run ep-cli batch emails.txt --export=parquet --compression=snappy

# Export with custom naming
bun run ep-cli phone +15551234567 --audit --export=json --output-prefix=risk-analysis-$(date +%Y%m%d)
```

### Custom Alerting

```bash
# Slack integration
bun run ep-cli batch high-risk-list.txt --parallel=16 --export=slack --webhook=https://hooks.slack.com/...

# PagerDuty alerts
bun run ep-cli stream live-data.json --monitor --alerts --webhooks=pagerduty:slack

# Email notifications
bun run ep-cli batch results.json --export=email --recipients=security@company.com,compliance@company.com
```

## 🚀 Performance Tips

### Optimization

```bash
# Increase parallel processing for large datasets
bun run ep-cli batch large-dataset.txt --parallel=64 --batch-size=1000

# Use streaming for real-time processing
bun run ep-cli stream live-stream.json --real-time --buffer-size=10000

# Enable caching for repeated queries
bun run ep-cli --config cache-config.json phone +15551234567 --audit
```

### Memory Management

```bash
# Process in chunks for memory efficiency
bun run ep-cli batch huge-dataset.txt --parallel=16 --chunk-size=10000

# Use streaming export for large results
bun run ep-cli batch data.txt --export=stream --output=results.jsonl

# Clear cache periodically
bun run ep-cli cache clear --older-than=24h
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**

   ```bash
   chmod +x cli/bin/ep-cli
   ```

2. **Redis Connection Failed**

   ```bash
   # Start Redis locally
   docker run -d -p 6379:6379 redis:alpine
   
   # Or use in-memory cache (no action needed)
   ```

3. **Rate Limiting**

   ```bash
   # Reduce parallel requests
   bun run ep-cli batch data.txt --parallel=4 --delay=1000
   ```

### Debug Mode

```bash
# Enable verbose logging
bun run ep-cli --debug --verbose phone +15551234567 --audit

# Check configuration
bun run ep-cli config show

# Test connectivity
bun run ep-cli health-check --test-api --test-cache --test-ml
```

## 📚 Next Steps

### Advanced Features to Explore

1. **Real-time Stream Processing**

   ```bash
   bun run ep-cli stream data.json --kafka-produce=risk-topic --avro-schema
   ```

2. **3D Visualizations**

   ```bash
   bun run ep-cli graph data.json --visualize=3d --vr-ready --export=glb
   ```

3. **ML Model Training**

   ```bash
   bun run ep-cli ml training-data.json --train-model=synthetic-v4 --epochs=200
   ```

4. **Security Auditing**

   ```bash
   bun run ep-cli security audit --scope=full --include-pentest --export=nessus
   ```

### Integration Examples

1. **Docker Integration**

   ```dockerfile
   FROM node:18-alpine
   COPY . /app
   WORKDIR /app
   RUN bun install
   ENTRYPOINT ["bun", "run", "ep-cli"]
   ```

2. **Kubernetes Deployment**

   ```yaml
   apiVersion: batch/v1
   kind: Job
   metadata:
     name: ep-cli-batch-job
   spec:
     template:
       spec:
         containers:
         - name: ep-cli
           image: empirepro/cli:latest
           command: ["bun", "run", "ep-cli", "batch", "data.txt"]
   ```

3. **GitHub Actions**

   ```yaml
   - name: Run Security Analysis
     run: |
       bun run ep-cli security audit --export=json
       bun run ep-cli compliance check --regulations=gdpr,pci
   ```

## 🎓 Learning Resources

### Documentation

- [Full Documentation](./ENHANCED_CLI_DOCUMENTATION.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)

### Examples

- [Example Scripts](./examples/)
- [Sample Data](./test-data/)
- [Integration Templates](./templates/)

### Community

- [Discord Server](https://discord.gg/empirepro)
- [GitHub Discussions](https://github.com/empirepro/cli/discussions)
- [YouTube Tutorials](https://youtube.com/@empirepro)

---

## 🚀 Ready to Go

You're all set to use Empire Pro CLI v4.0! Here are some commands to get you started:

```bash
# Quick demo
bun run ep-cli demo

# Test phone intelligence
bun run ep-cli phone +15551234567 --audit

# Check system health
bun run ep-cli health-check

# View all commands
bun run ep-cli --help
```

Happy analyzing! 🎯

---

*Empire Pro CLI v4.0 - The Future of Identity Intelligence*
