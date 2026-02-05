# Getting Started - Quick Start Guide

## 🚀 Quick Start

Get up and running with the Enhanced Matrix CLI in minutes.

---

## 📋 Prerequisites

- **Node.js** 16+ or **Bun** latest
- **Git** for version control
- **Terminal/CLI** access

---

## ⚡ Installation

### **Option 1: Clone Repository**
```bash
git clone https://github.com/your-org/bun-toml-secrets-editor.git
cd bun-toml-secrets-editor
bun install
```

### **Option 2: Install Dependencies**
```bash
bun install
```

---

## 🎯 First Steps

### **1. Verify Installation**
```bash
bun run matrix:analytics:dashboard
```

### **2. Create Your First Profile**
```bash
# Create a development profile
bun run matrix:profile:create dev-my-app-web

# Apply the profile
bun run matrix:profile:use dev-my-app-web --validate-rules
```

### **3. Explore Analytics**
```bash
# View analytics dashboard
bun run matrix:analytics:dashboard

# Generate your first report
bun run matrix:analytics:report --output=my-report.json
```

### **4. Test Security**
```bash
# Perform security scan
bun run matrix:security:scan

# Check security status
bun run matrix:security:status
```

### **5. Try Automation**
```bash
# List available workflows
bun run matrix:automation:list

# Execute a workflow
bun run matrix:automation execute --workflow=deployment-pipeline
```

---

## 🔧 Basic Configuration

### **Environment Setup**
```bash
# Copy environment template
cp .env.development .env.local

# Edit configuration
bun run matrix:config:generate --template=basic --output=config.toml
```

### **Profile Structure**
```bash
profiles/
├── dev-my-app-web.json
├── staging-api-service.json
└── production-payment-processor.json
```

### **Profile Example**
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

## 📊 Core Features

### **🔍 Profile Management**
```bash
# List all profiles
bun run matrix:profile:list

# Analyze a profile
bun run matrix:profile:analyze prod-api-service

# Apply with validation
bun run matrix:profile:use prod-api-service --validate-rules

# Force apply (bypass validation)
bun run matrix:profile:use prod-api-service --force
```

### **📈 Analytics & Monitoring**
```bash
# Real-time dashboard
bun run matrix:analytics:dashboard

# Generate reports
bun run matrix:analytics:report --time-range=24h

# Export data
bun run matrix:analytics:export --format=csv --output=analytics.csv

# Performance metrics
bun run matrix:analytics:metrics
```

### **🛡️ Security**
```bash
# Security scan
bun run matrix:security:scan

# Security status
bun run matrix:security:status

# View threats
bun run matrix:security:threats --limit=5

# Security report
bun run matrix:security:report
```

### **🤖 Automation**
```bash
# List workflows
bun run matrix:automation:list

# Create workflow
bun run matrix:automation:create

# Execute workflow
bun run matrix:automation:execute --workflow=deployment-pipeline

# Monitor execution
bun run matrix:automation:status

# View logs
bun run matrix:automation:logs --execution=exec_123
```

---

## 🎯 Common Workflows

### **Development Workflow**
```bash
# 1. Create development profile
bun run matrix:profile:create dev-my-feature

# 2. Apply profile
bun run matrix:profile:use dev-my-feature --validate-rules

# 3. Monitor analytics
bun run matrix:analytics:dashboard

# 4. Security check
bun run matrix:security:scan
```

### **Deployment Workflow**
```bash
# 1. Validate production profile
bun run matrix:profile:analyze prod-api-service

# 2. Execute deployment workflow
bun run matrix matrix:automation:execute --workflow=deployment-pipeline

# 3. Monitor deployment
bun run matrix:automation:status

# 4. Security verification
bun run matrix:security:scan
```

### **Security Audit Workflow**
```bash
# 1. Generate security report
bun run matrix:security:report --output=security-audit.json

# 2. Review threats
bun run matrix:security:threats --limit=20

# 3. Check compliance
bun run matrix:analytics:report --time-range=7d

# 4. Block malicious users if needed
bun run matrix:security block --user=suspicious-user
```

---

## 🔧 Configuration Options

### **Core Settings**
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

## 📚 Learning Resources

### **Documentation**
- [API Reference](./API_REFERENCE.md) - Complete command reference
- [Enterprise Features](./ENTERPRISE_FEATURES.md) - Advanced features guide
- [Setup Guide](./guides/SETUP.md) - Detailed setup instructions
- [Security Guide](./guides/SECURITY.md) - Security features and best practices
- [Automation Guide](./guides/AUTOMATION.md) - Workflow automation guide

### **Examples**
```bash
# Run demo commands
bun run matrix:demo:advanced-validation

# View profile examples
ls profiles/
cat profiles/dev-auth-service.json

# Test automation
bun run matrix:automation:create
```

---

## 🆘 Troubleshooting

### **Common Issues**

#### **Profile Not Found**
```bash
# Check available profiles
bun run matrix:profile:list

# Verify profile exists
ls profiles/
```

#### **Validation Failed**
```bash
# Check validation details
bun run matrix:profile:analyze profile-name

# Force apply if necessary
bun run matrix:profile:use profile-name --force
```

#### **Security Issues**
```bash
# Check security status
bun run matrix:security:status

# Review recent threats
bun run matrix:security:threats
```

#### **Automation Problems**
```bash
# Check workflow status
bun run matrix:automation:status

# View execution logs
bun run matrix:automation:logs --execution=exec_123
```

### **Get Help**
```bash
# Show command help
matrix --help
matrix analytics --help
matrix security --help
matrix automation --help

# Check logs
tail logs/matrix.log

# Reset configuration
rm -rf ~/.matrix/
```

---

## 🚀 Next Steps

### **Advanced Features**
1. **Custom Workflows**: Create your own automation workflows
2. **Security Policies**: Configure custom security patterns
3. **Analytics Integration**: Export data to external systems
4. **API Integration**: Use programmatic APIs

### **Production Deployment**
1. **Security Hardening**: Configure production security settings
2. **Monitoring**: Set up comprehensive monitoring
3. **Backup**: Configure automated backups
4. **Scaling**: Optimize for enterprise workloads

---

## 🎉 You're Ready!

Congratulations! You've successfully set up the Enhanced Matrix CLI with:

- ✅ **Profile Management**: Create and manage configurations
- ✅ **Analytics**: Real-time monitoring and reporting
- ✅ **Security**: Threat detection and response
- ✅ **Automation**: Workflow orchestration

---

**🚀 Start exploring the advanced features and transform your DevOps workflow!**

For more detailed information, check out the [API Reference](./API_REFERENCE.md) and [Enterprise Features](./ENTERPRISE_FEATURES.md) guides.
