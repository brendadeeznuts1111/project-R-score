# Setup Guide - Installation & Configuration

## 🚀 Installation

### **Prerequisites**
- **Node.js** 16+ or **Bun** latest
- **Git** for version control
- **Terminal/CLI** access

### **Quick Install**
```bash
# Clone repository
git clone https://github.com/your-org/bun-toml-secrets-editor.git
cd bun-toml-secrets-editor

# Install dependencies
bun install

# Verify installation
bun run matrix:analytics:dashboard
```

---

## ⚙️ Configuration

### **Core Configuration**
```toml
# config.toml
[database]
type = "sqlite"
path = "profiles.db"

[security]
enable_validation = true
compliance_threshold = 80
audit_trail = true

[analytics]
enabled = true
retention_days = 30
export_format = "json"

[automation]
max_concurrent_workflows = 10
default_timeout = 30000
retry_attempts = 3
```

### **Environment Variables**
```bash
# .env.local
MATRIX_CONFIG_PATH="./config.toml"
MATRIX_PROFILE_DIR="./profiles"
MATRIX_LOG_LEVEL="info"
MATRIX_SECURITY_ENABLED="true"
MATRIX_ANALYTICS_ENABLED="true"
```

---

## 🔧 Profile Setup

### **Create Development Profile**
```bash
# Create profile
bun run matrix:profile:create dev-my-app-web

# Apply with validation
bun run matrix:profile:use dev-my-app-web --validate-rules

# Verify configuration
bun run matrix:profile:analyze dev-my-app-web
```

### **Profile Structure**
```json
{
  "name": "dev-my-app-web",
  "environment": "development",
  "config": {
    "API_URL": "http://localhost:3000",
    "DEBUG": "true",
    "LOG_LEVEL": "debug"
  },
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2026-01-27T14:30:25Z",
    "author": "developer",
    "tags": ["web", "development"],
    "description": "Development web application profile"
  }
}
```

---

## 🛡️ Security Configuration

### **Enable Security Features**
```bash
# Perform initial security scan
bun run matrix:security:scan

# Configure security settings
bun run matrix:security:status

# Set up user management
bun run matrix:security block --user=test-user
```

### **Security Settings**
```toml
[security]
enable_validation = true
compliance_threshold = 80
audit_trail = true
threat_detection = true
auto_block = true
max_failed_attempts = 3
```

---

## 📊 Analytics Setup

### **Enable Analytics**
```bash
# Start analytics dashboard
bun run matrix:analytics:dashboard

# Generate first report
bun run matrix:analytics:report --output=initial-report.json

# Configure data retention
bun run matrix:analytics:export --format=csv
```

### **Analytics Configuration**
```toml
[analytics]
enabled = true
retention_days = 30
export_format = "json"
real_time_updates = true
performance_tracking = true
```

---

## 🤖 Automation Setup

### **Create Workflows**
```bash
# List built-in workflows
bun run matrix:automation:list

# Create custom workflow
bun run matrix:automation:create

# Execute workflow
bun run matrix:automation:execute --workflow=deployment-pipeline
```

### **Workflow Configuration**
```toml
[automation]
max_concurrent_workflows = 10
default_timeout = 30000
retry_attempts = 3
retry_delay = 1000
enable_logging = true
```

---

## 🌐 Production Setup

### **Production Configuration**
```bash
# Create production profile
bun run matrix:profile:create prod-api-service

# Apply with strict validation
bun run matrix:profile:use prod-api-service --validate-rules

# Security verification
bun run matrix:security:scan

# Performance monitoring
bun run matrix:analytics:dashboard
```

### **Production Settings**
```toml
[production]
environment = "production"
compliance_threshold = 90
security_level = "high"
audit_retention_days = 365
backup_enabled = true
monitoring_enabled = true
```

---

## 🔍 Validation

### **Verify Setup**
```bash
# Test all components
bun run matrix:analytics:dashboard
bun run matrix:security:scan
bun run matrix:automation:status
bun run matrix:profile:list

# Generate diagnostic report
bun run matrix:diagnostic --output=setup-validation.json
```

### **Health Check**
```bash
# System health
bun run matrix:health

# Configuration validation
bun run matrix:config:validate

# Performance test
bun run matrix:performance:test
```

---

## 📱 Monitoring

### **Set Up Monitoring**
```bash
# Enable continuous monitoring
bun run matrix:monitor:setup

# Configure alerts
bun run matrix:alerts:configure --email=admin@company.com

# Health checks
bun run matrix:health --continuous
```

---

## 🎯 Next Steps

1. **[Getting Started](../GETTING_STARTED.md)** - Quick start guide
2. **[Enterprise Features](../ENTERPRISE_FEATURES.md)** - Advanced features
3. **[API Reference](../API_REFERENCE.md)** - Complete command reference
4. **[Security Guide](./SECURITY.md)** - Security configuration
5. **[Automation Guide](./AUTOMATION.md)** - Workflow setup

---

## 🆘 Troubleshooting

### **Common Issues**
- **Installation fails**: Check Node.js/Bun version
- **Configuration errors**: Validate TOML syntax
- **Permission issues**: Run with appropriate permissions
- **Network issues**: Check firewall and connectivity

### **Get Help**
```bash
# Check logs
tail logs/matrix.log

# Diagnostic information
bun run matrix:diagnostic

# Reset configuration
rm -rf ~/.matrix/
bun run matrix:analytics:dashboard
```

---

**🚀 Your Enhanced Matrix CLI is now set up and ready for enterprise use!**
