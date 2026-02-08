# 📚 Bun Docs - Complete Documentation Management CLI

## 🎯 Overview

Bun Docs is a comprehensive documentation management CLI that provides advanced publishing, RSS monitoring, R2 storage, and analytics capabilities. Built on the proven FactoryWager CLI infrastructure, it offers enterprise-grade documentation management with a focus on simplicity and power.

## ✅ Key Features

### 📚 **Documentation Publishing**
- **R2 Integration**: Direct upload to Cloudflare R2 storage
- **Automatic RSS**: Generate RSS feeds for documentation updates
- **Sitemap Generation**: Automatic sitemap creation for SEO
- **Compression**: Optional asset compression for faster loading
- **Dry-run Mode**: Preview operations before execution

### 📡 **RSS Feed Management**
- **Multi-feed Support**: Monitor multiple RSS feeds simultaneously
- **Smart Parsing**: Intelligent content extraction and categorization
- **Auto-fetching**: Configurable automatic feed updates
- **Feed Management**: Add, remove, and list RSS feeds
- **Cache System**: Local caching for offline access

### 🗄️ **R2 Storage Management**
- **Complete CRUD**: Create, read, update, delete operations
- **Bulk Operations**: Upload entire documentation trees
- **Statistics**: Storage usage and file tracking
- **Public URLs**: Automatic public URL generation
- **Security**: Secure credential management

### 🐚 **Interactive Shell**
- **Command Completion**: Intelligent command suggestions
- **Real-time Feedback**: Immediate response to commands
- **Session Management**: Persistent configuration across sessions
- **Help System**: Context-aware help and documentation
- **History Tracking**: Command history and recall

### 🩺 **System Diagnostics**
- **Health Checks**: Comprehensive system validation
- **Performance Monitoring**: Real-time performance metrics
- **Configuration Validation**: Verify all settings and credentials
- **Network Testing**: Connectivity and service availability
- **Resource Monitoring**: Memory, disk, and CPU usage

### 📊 **Analytics & Reporting**
- **Usage Statistics**: Track documentation views and downloads
- **Performance Metrics**: Monitor system performance over time
- **Comprehensive Reports**: Detailed analysis and recommendations
- **Export Capabilities**: Multiple output formats (JSON, CSV, Markdown)
- **Trend Analysis**: Historical data and trend identification

## 🚀 Quick Start

### Installation
```bash
# Make the CLI executable
chmod +x bun-docs.cjs

# Or install globally
npm install -g ./bun-docs.cjs
```

### Initialize Project
```bash
# Initialize new documentation project
bun-docs init

# Configure your R2 credentials
Bun.secrets.set("R2_ACCOUNT_ID", "your-account-id");
Bun.secrets.set("R2_ACCESS_KEY_ID", "your-access-key");
Bun.secrets.set("R2_SECRET_ACCESS_KEY", "your-secret-access-key");
```

### Publish Documentation
```bash
# Publish documentation
bun-docs publish ./docs

# Preview before publishing
bun-docs publish ./docs --dryrun
```

## 📋 Command Reference

### Publishing Commands

#### `bun-docs publish [source]`
Publish documentation to R2 storage
```bash
# Publish from default docs directory
bun-docs publish

# Publish from custom directory
bun-docs publish ./documentation

# Preview publishing operation
bun-docs publish ./docs --dryrun
```

**Features:**
- Automatic documentation processing
- R2 upload with progress tracking
- RSS feed generation
- Sitemap creation
- Compression support

#### `bun-docs init`
Initialize new documentation project
```bash
bun-docs init
```

**Creates:**
- `bun-docs.config.json` configuration file
- `./docs/` documentation directory
- `./assets/` assets directory
- `./templates/` templates directory
- Sample documentation files

### RSS Management Commands

#### `bun-docs rss fetch`
Fetch updates from all configured RSS feeds
```bash
# Fetch all feeds
bun-docs rss fetch

# Results saved to bun-docs-rss-cache.json
```

**Features:**
- Multi-feed concurrent fetching
- Intelligent content parsing
- Error handling and retry logic
- Local caching for offline access

#### `bun-docs rss add <url>`
Add new RSS feed to monitoring
```bash
bun-docs rss add https://bun.com/rss.xml
bun-docs rss add https://github.com/user/repo/releases.atom
```

#### `bun-docs rss list`
List all configured RSS feeds
```bash
bun-docs rss list
```

#### `bun-docs rss remove <url>`
Remove RSS feed from monitoring
```bash
bun-docs rss remove https://example.com/rss.xml
```

### R2 Storage Commands

#### `bun-docs r2 list`
List all packages in R2 storage
```bash
bun-docs r2 list
```

**Output:**
```
📦 Found 7 packages in bucket "bun-docs":

📄 docs/index.html
   Size: 15.4 KB
   Modified: 2/7/2026, 3:30:00 PM

📄 docs/api/reference.html
   Size: 28.9 KB
   Modified: 2/7/2026, 3:30:00 PM

📊 Total storage: 78.9 KB
```

#### `bun-docs r2 upload <file>`
Upload file to R2 storage
```bash
bun-docs r2 upload ./docs.zip
bun-docs r2 upload ./documentation.pdf
```

#### `bun-docs r2 download <key>`
Download file from R2 storage
```bash
bun-docs r2 download docs/index.html
bun-docs r2 download assets/css/main.css
```

#### `bun-docs r2 delete <key>`
Delete file from R2 storage
```bash
bun-docs r2 delete docs/old-page.html
```

#### `bun-docs r2 stats`
Show R2 storage statistics
```bash
bun-docs r2 stats
```

### Interactive Shell

#### `bun-docs shell`
Enter interactive documentation shell
```bash
bun-docs shell
```

**Shell Commands:**
```bash
bun-docs> help                    # Show available commands
bun-docs> publish ./docs          # Publish documentation
bun-docs> rss fetch               # Fetch RSS feeds
bun-docs> r2 list                 # List R2 packages
bun-docs> stats                   # Show statistics
bun-docs> doctor                  # Run diagnostics
bun-docs> exit                    # Exit shell
```

**Features:**
- Command history with arrow keys
- Tab completion (where supported)
- Persistent configuration
- Real-time feedback
- Context-aware help

### Diagnostics Commands

#### `bun-docs doctor [--verbose]`
Run comprehensive system diagnostics
```bash
# Basic diagnostics
bun-docs doctor

# Verbose output with detailed information
bun-docs doctor --verbose
```

**Diagnostic Checks:**
- Configuration file validation
- Secrets and credentials verification
- Network connectivity testing
- Disk space availability
- Performance metrics
- Service availability

**Sample Output:**
```
🩺 Running System Diagnostics...

🔧 Checking configuration...
✅ Configuration file exists

🔐 Checking secrets...
✅ All required secrets configured

🌐 Checking network connectivity...
✅ Network connectivity OK

💾 Checking disk space...
✅ Disk access OK (Available space available)

⚡ Checking performance...
✅ Performance OK (45.2MB used)

📊 Diagnostic Summary
=====================
✅ Passed checks: 5
❌ Issues found: 0

🎉 All systems operational!
```

#### `bun-docs analyze [--report] [--output <file>]`
Generate comprehensive analysis report
```bash
# Basic analysis
bun-docs analyze

# Generate detailed report
bun-docs analyze --report

# Save report to custom file
bun-docs analyze --report --output my-analysis.json
```

**Analysis Includes:**
- System information
- Configuration status
- Security assessment
- Performance metrics
- Recommendations
- Historical trends

## 🔧 Configuration

### Configuration File: `bun-docs.config.json`
```json
{
  "r2": {
    "bucket": "bun-docs",
    "endpoint": "https://your-account.r2.cloudflarestorage.com",
    "publicUrl": "https://pub-your-account.r2.dev"
  },
  "rss": {
    "feeds": [
      "https://bun.com/rss.xml",
      "https://github.com/brendadeeznuts1111/project-R-score/releases.atom"
    ],
    "updateInterval": 300000
  },
  "analytics": {
    "enabled": true,
    "trackViews": true,
    "trackDownloads": true
  },
  "publishing": {
    "autoGenerateRSS": true,
    "compressAssets": true,
    "generateSitemap": true
  }
}
```

### Secrets Management
```bash
# Set up R2 credentials
Bun.secrets.set("R2_ACCOUNT_ID", "your-account-id");
Bun.secrets.set("R2_ACCESS_KEY_ID", "your-access-key");
Bun.secrets.set("R2_SECRET_ACCESS_KEY", "your-secret-access-key");

# Set up additional tokens
Bun.secrets.set("CLOUDFLARE_API_TOKEN", "your-cloudflare-token");
Bun.secrets.set("GITHUB_TOKEN", "your-github-token");
```

## 🎯 Use Cases

### **1. Documentation Publishing**
```bash
# Quick publish
bun-docs publish

# Publish with preview
bun-docs publish ./docs --dryrun

# Publish custom documentation
bun-docs publish ./user-guide --compress
```

### **2. RSS Monitoring**
```bash
# Monitor Bun updates
bun-docs rss add https://bun.com/rss.xml
bun-docs rss fetch

# Monitor GitHub releases
bun-docs rss add https://github.com/user/repo/releases.atom
bun-docs rss list
```

### **3. Storage Management**
```bash
# Check storage usage
bun-docs r2 stats

# Upload large files
bun-docs r2 upload ./documentation.zip

# Download specific files
bun-docs r2 download docs/api/reference.html
```

### **4. System Monitoring**
```bash
# Health check
bun-docs doctor

# Performance analysis
bun-docs analyze --report --output performance.json

# Interactive monitoring
bun-docs shell
```

## 📊 Advanced Features

### **Dry-run Mode**
Preview operations without executing them:
```bash
bun-docs publish --dryrun
bun-docs r2 upload ./large-file.zip --dryrun
```

### **Batch Operations**
```bash
# Publish multiple directories
bun-docs publish ./docs ./guides ./api

# Fetch multiple RSS feeds
bun-docs rss fetch && bun-docs rss list
```

### **Automation Integration**
```bash
# CI/CD pipeline
#!/bin/bash
bun-docs doctor || exit 1
bun-docs publish ./docs --dryrun
bun-docs publish ./docs
bun-docs rss fetch
```

### **Custom Workflows**
```bash
# Documentation update workflow
bun-docs shell << EOF
publish ./docs
rss fetch
r2 stats
exit
EOF
```

## 🔍 Troubleshooting

### **Common Issues**

#### **R2 Configuration Error**
```bash
❌ R2 configuration missing. Run "bun-docs init" to setup.
```
**Solution:**
```bash
bun-docs init
# Configure R2 credentials
Bun.secrets.set("R2_ACCOUNT_ID", "your-account-id");
```

#### **Network Connectivity Issues**
```bash
❌ Network connectivity failed
```
**Solution:**
```bash
# Check network
bun-docs doctor --verbose

# Test connectivity manually
curl -I https://httpbin.org/status/200
```

#### **Permission Denied**
```bash
❌ Permission denied accessing files
```
**Solution:**
```bash
# Check file permissions
ls -la ./docs

# Fix permissions
chmod -R 755 ./docs
```

### **Debug Mode**
```bash
# Enable verbose output
bun-docs --verbose publish ./docs

# Check configuration
bun-docs config

# Run full diagnostics
bun-docs doctor --verbose
```

## 🚀 Performance Tips

### **1. Optimize Publishing**
- Use `--dryrun` to preview before publishing
- Enable compression for large assets
- Use appropriate cache settings

### **2. RSS Management**
- Limit number of RSS feeds for better performance
- Use appropriate fetch intervals
- Clear cache periodically

### **3. Storage Optimization**
- Regular cleanup of old files
- Use compression for text files
- Monitor storage usage with `bun-docs r2 stats`

## 🎉 Best Practices

### **1. Security**
- Never commit secrets to version control
- Use Bun.secrets for runtime security
- Regularly rotate access keys
- Use least-privilege access

### **2. Organization**
- Use consistent directory structure
- Maintain clear documentation hierarchy
- Use descriptive file names
- Keep configuration in version control

### **3. Monitoring**
- Regular health checks with `bun-docs doctor`
- Monitor storage usage
- Track RSS feed updates
- Generate periodic analysis reports

### **4. Automation**
- Use CI/CD integration
- Schedule regular RSS fetching
- Automate backup processes
- Use shell scripts for complex workflows

## 📚 Additional Resources

- **FactoryWager CLI**: Advanced infrastructure management
- **Secrets Management**: Secure credential handling
- **Performance Optimization**: Caching and monitoring
- **Dry-run Mode**: Safe operation preview

## 🤝 Contributing

Bun Docs is built on the proven FactoryWager CLI infrastructure and welcomes contributions. Please ensure all changes include appropriate tests and documentation.

---

**Bun Docs** - Enterprise-grade documentation management made simple! 🚀
