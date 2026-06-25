# 🔐 **Fire22 Enterprise Configuration Guide**

## 📋 **Overview**

This guide demonstrates how to configure the Fire22 Enterprise Security Scanner
using environment variables for enterprise deployments. Environment-based
configuration provides secure, centralized management and supports different
deployment scenarios.

## 🌍 **Environment Variable Configuration**

### **Core Authentication Methods**

#### **API Key Authentication (Recommended)**

```bash
# Primary authentication method
export FIRE22_SECURITY_API_KEY="your-enterprise-api-key"

# Optional: Custom API endpoint
export FIRE22_SECURITY_API_URL="https://security.yourcompany.com/api/v1"

# Optional: Request timeout and retries
export FIRE22_SECURITY_TIMEOUT="45000"
export FIRE22_SECURITY_RETRIES="5"
```

#### **Bearer Token Authentication**

```bash
# Token-based authentication
export FIRE22_SECURITY_TOKEN="your-enterprise-bearer-token"
export FIRE22_SECURITY_API_URL="https://security.yourcompany.com/api/v1"
```

#### **Username/Password Authentication**

```bash
# Traditional authentication
export FIRE22_SECURITY_USERNAME="your-service-account"
export FIRE22_SECURITY_PASSWORD="your-secure-password"
export FIRE22_SECURITY_API_URL="https://security.yourcompany.com/api/v1"
```

#### **OAuth2 Client Credentials**

```bash
# Enterprise OAuth2 setup
export FIRE22_SECURITY_CLIENT_ID="your-oauth2-client-id"
export FIRE22_SECURITY_CLIENT_SECRET="your-oauth2-client-secret"
export FIRE22_SECURITY_API_URL="https://security.yourcompany.com/oauth2/token"
```

## 🏢 **Organization & Environment Settings**

### **Basic Organization Configuration**

```bash
# Organization identification
export FIRE22_ORGANIZATION="your-company-name"
export FIRE22_ENVIRONMENT="production"
export FIRE22_COMPLIANCE_LEVEL="enterprise"
```

### **Advanced Organization Settings**

```bash
# Detailed organization configuration
export FIRE22_ORGANIZATION="Acme Corporation"
export FIRE22_ENVIRONMENT="production"
export FIRE22_COMPLIANCE_LEVEL="maximum"

# Sub-organization or team identification
export FIRE22_TEAM="security"
export FIRE22_PROJECT="fire22-dashboard"
```

## ⚡ **Performance & Scaling Configuration**

### **Basic Performance Settings**

```bash
# Concurrent processing limits
export FIRE22_MAX_CONCURRENT_SCANS="25"
export FIRE22_SCAN_TIMEOUT="120000"
export FIRE22_BATCH_SIZE="100"
```

### **Advanced Performance Tuning**

```bash
# Detailed performance configuration
export FIRE22_MAX_CONCURRENT_SCANS="50"
export FIRE22_SCAN_TIMEOUT="180000"
export FIRE22_BATCH_SIZE="200"
export FIRE22_CACHE_ENABLED="true"
export FIRE22_THREAT_DB_UPDATE_INTERVAL="1800000"  # 30 minutes
export FIRE22_THREAT_DB_CACHE_TIMEOUT="43200000"   # 12 hours
```

## 📊 **Monitoring & Alerting**

### **Audit Logging Configuration**

```bash
# Enable comprehensive audit logging
export FIRE22_AUDIT_LOG_ENABLED="true"
export FIRE22_AUDIT_MODE="true"
```

### **Slack Integration**

```bash
# Slack webhook for security alerts
export FIRE22_SLACK_WEBHOOK="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

### **Email Alerting**

```bash
# Email alerts for security events
export FIRE22_EMAIL_ALERTS="security@yourcompany.com"

# Multiple recipients
export FIRE22_EMAIL_ALERTS="security@yourcompany.com,compliance@yourcompany.com,ciso@yourcompany.com"
```

## 🔧 **Security Policy Configuration**

### **License Compliance Policies**

```bash
# Blocked licenses (comma-separated)
export FIRE22_BLOCKED_LICENSES="GPL-3.0,AGPL-3.0,MS-PL,WTFPL,CC-BY-SA-4.0"

# Allowed licenses (optional whitelist)
export FIRE22_ALLOWED_LICENSES="MIT,Apache-2.0,BSD-3-Clause,ISC"

# Enterprise license mode
export FIRE22_ENTERPRISE_LICENSES_ONLY="true"
```

### **Registry Trust Configuration**

```bash
# Trusted registries (comma-separated)
export FIRE22_TRUSTED_REGISTRIES="https://registry.npmjs.org,https://registry.yarnpkg.com,https://registry.yourcompany.com"

# Blocked registries
export FIRE22_BLOCKED_REGISTRIES="https://malicious-registry.com,https://untrusted-registry.org"

# Require registry verification
export FIRE22_REQUIRE_REGISTRY_VERIFICATION="true"
```

### **Security Feature Toggles**

```bash
# Core security features
export FIRE22_DISABLE_TYPOSQUATTING="false"
export FIRE22_DISABLE_SUPPLY_CHAIN="false"
export FIRE22_ENTERPRISE_MODE="true"
export FIRE22_STRICT_MODE="true"

# Advanced features
export FIRE22_ADVANCED_THREATS="true"
export FIRE22_AI_ANALYSIS="true"
export FIRE22_REAL_TIME_UPDATES="true"
export FIRE22_CUSTOM_RULES="true"
```

## 🚀 **Deployment Environment Examples**

### **Development Environment**

```bash
# ~/.bashrc or ~/.zshrc
export FIRE22_SECURITY_API_KEY="dev-api-key-12345"
export FIRE22_SECURITY_API_URL="https://dev-security.fire22.com/api/v1"
export FIRE22_ORGANIZATION="fire22-dev"
export FIRE22_ENVIRONMENT="development"
export FIRE22_COMPLIANCE_LEVEL="standard"
export FIRE22_MAX_CONCURRENT_SCANS="5"
export FIRE22_AUDIT_LOG_ENABLED="false"
export FIRE22_STRICT_MODE="false"
```

### **Staging Environment**

```bash
# .env.staging
FIRE22_SECURITY_API_KEY=staging-api-key-67890
FIRE22_SECURITY_API_URL=https://staging-security.fire22.com/api/v1
FIRE22_ORGANIZATION=fire22-staging
FIRE22_ENVIRONMENT=staging
FIRE22_COMPLIANCE_LEVEL=enterprise
FIRE22_MAX_CONCURRENT_SCANS=15
FIRE22_AUDIT_LOG_ENABLED=true
FIRE22_SLACK_WEBHOOK=https://hooks.slack.com/services/...
FIRE22_STRICT_MODE=true
FIRE22_ADVANCED_THREATS=true
```

### **Production Environment**

```bash
# .env.production or environment variables
FIRE22_SECURITY_TOKEN=prod-token-abcdef123456
FIRE22_SECURITY_API_URL=https://security.fire22.com/api/v1
FIRE22_ORGANIZATION=fire22
FIRE22_ENVIRONMENT=production
FIRE22_COMPLIANCE_LEVEL=enterprise
FIRE22_MAX_CONCURRENT_SCANS=50
FIRE22_AUDIT_LOG_ENABLED=true
FIRE22_SLACK_WEBHOOK=https://hooks.slack.com/services/...
FIRE22_EMAIL_ALERTS=security@fire22.com,compliance@fire22.com
FIRE22_AI_ANALYSIS=true
FIRE22_ADVANCED_THREATS=true
FIRE22_REAL_TIME_UPDATES=true
FIRE22_CUSTOM_RULES=true
FIRE22_STRICT_MODE=true
FIRE22_AUDIT_MODE=true
```

### **Enterprise Environment**

```bash
# /etc/fire22/security.env
FIRE22_SECURITY_CLIENT_ID=enterprise-client-id
FIRE22_SECURITY_CLIENT_SECRET=enterprise-client-secret
FIRE22_SECURITY_API_URL=https://enterprise-security.fire22.com/api/v1
FIRE22_ORGANIZATION=fire22-enterprise
FIRE22_ENVIRONMENT=production
FIRE22_COMPLIANCE_LEVEL=maximum
FIRE22_MAX_CONCURRENT_SCANS=100
FIRE22_AUDIT_LOG_ENABLED=true
FIRE22_SLACK_WEBHOOK=https://hooks.slack.com/services/...
FIRE22_EMAIL_ALERTS=security@fire22.com,compliance@fire22.com,ciso@fire22.com
FIRE22_AI_ANALYSIS=true
FIRE22_ADVANCED_THREATS=true
FIRE22_REAL_TIME_UPDATES=true
FIRE22_CUSTOM_RULES=true
FIRE22_ENTERPRISE_LICENSES_ONLY=true
FIRE22_STRICT_MODE=true
FIRE22_AUDIT_MODE=true
FIRE22_THREAT_DB_UPDATE_INTERVAL=600000   # 10 minutes
FIRE22_THREAT_DB_CACHE_TIMEOUT=3600000    # 1 hour
```

## 🐳 **Container & Orchestration**

### **Docker Configuration**

```bash
# Dockerfile environment variables
docker run -e FIRE22_SECURITY_API_KEY=container-key \
           -e FIRE22_ENVIRONMENT=container \
           -e FIRE22_MAX_CONCURRENT_SCANS=10 \
           -e FIRE22_AUDIT_LOG_ENABLED=true \
           your-app:latest
```

### **Docker Compose**

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: your-app:latest
    environment:
      - FIRE22_SECURITY_API_KEY=${FIRE22_SECURITY_API_KEY}
      - FIRE22_ENVIRONMENT=container
      - FIRE22_MAX_CONCURRENT_SCANS=20
      - FIRE22_AUDIT_LOG_ENABLED=true
      - FIRE22_SLACK_WEBHOOK=${FIRE22_SLACK_WEBHOOK}
```

### **Kubernetes**

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fire22-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: your-app:latest
          env:
            - name: FIRE22_SECURITY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: fire22-security-config
                  key: api-key
            - name: FIRE22_ENVIRONMENT
              value: 'kubernetes'
            - name: FIRE22_MAX_CONCURRENT_SCANS
              value: '30'
            - name: FIRE22_AUDIT_LOG_ENABLED
              value: 'true'
---
apiVersion: v1
kind: Secret
metadata:
  name: fire22-security-config
type: Opaque
data:
  api-key: <base64-encoded-api-key>
  slack-webhook: <base64-encoded-webhook>
```

## 🔄 **Dynamic Configuration Updates**

### **Runtime Configuration Reload**

```bash
# Signal the scanner to reload configuration
kill -HUP $(pgrep -f "fire22-security-scanner")

# Or trigger via API if supported
curl -X POST https://security.fire22.com/api/v1/config/reload \
  -H "Authorization: Bearer ${FIRE22_SECURITY_TOKEN}"
```

### **Configuration Validation**

```bash
# Validate configuration before deployment
bun run security:test

# Check configuration status
curl https://security.fire22.com/api/v1/config/status \
  -H "Authorization: Bearer ${FIRE22_SECURITY_TOKEN}"
```

## 📊 **Configuration Monitoring**

### **Health Checks**

```bash
# Check scanner health
curl https://security.fire22.com/api/v1/health

# Configuration validation
curl https://security.fire22.com/api/v1/config/validate \
  -H "Authorization: Bearer ${FIRE22_SECURITY_TOKEN}"
```

### **Metrics & Monitoring**

```bash
# Security scan metrics
curl https://security.fire22.com/api/v1/metrics/scans

# Configuration change logs
curl https://security.fire22.com/api/v1/audit/config \
  -H "Authorization: Bearer ${FIRE22_SECURITY_TOKEN}"
```

## 🚨 **Emergency Configuration**

### **Fail-Safe Mode**

```bash
# Disable all security checks (emergency only)
export FIRE22_DISABLE_SUPPLY_CHAIN="true"
export FIRE22_DISABLE_TYPOSQUATTING="true"
export FIRE22_STRICT_MODE="false"

# Reduced performance for stability
export FIRE22_MAX_CONCURRENT_SCANS="1"
export FIRE22_SCAN_TIMEOUT="30000"
```

### **Recovery Procedures**

```bash
# Restore normal configuration
unset FIRE22_DISABLE_SUPPLY_CHAIN
unset FIRE22_DISABLE_TYPOSQUATTING
export FIRE22_STRICT_MODE="true"
export FIRE22_MAX_CONCURRENT_SCANS="25"

# Validate restoration
bun run security:test
```

## 🎯 **Best Practices**

### **🔐 Security Best Practices**

1. **Never commit secrets** to version control
2. **Use different keys** for each environment
3. **Rotate credentials** regularly
4. **Monitor access patterns** and usage
5. **Implement least privilege** access

### **⚡ Performance Best Practices**

1. **Tune concurrent scans** based on infrastructure
2. **Configure appropriate timeouts** for your network
3. **Enable caching** for better performance
4. **Monitor resource usage** and adjust accordingly
5. **Use batch processing** for large operations

### **📊 Monitoring Best Practices**

1. **Enable comprehensive logging** in production
2. **Set up alerting** for security events
3. **Monitor performance metrics** regularly
4. **Implement health checks** for all components
5. **Create incident response** procedures

### **🚀 Deployment Best Practices**

1. **Use infrastructure as code** for consistency
2. **Implement configuration validation** before deployment
3. **Test configuration changes** in staging first
4. **Document all environment variables** thoroughly
5. **Implement configuration drift detection**

## 🧪 **Testing Configuration**

### **Configuration Validation**

```bash
# Test configuration loading
bun run enterprise:config-demo

# Validate security scanner
bun run security:test

# Test with different environments
FIRE22_ENVIRONMENT=staging bun run security:test
FIRE22_ENVIRONMENT=production bun run security:test
```

### **Integration Testing**

```bash
# Test with your application
bun install --dry-run

# Test security scanning
bun add lodash --dry-run

# Validate audit logging
tail -f /var/log/fire22/security.log
```

## 🎉 **Configuration Summary**

### **✅ Core Features Configured**

- **Authentication**: API Key, Token, OAuth2, Username/Password
- **API Configuration**: Custom endpoints, timeouts, retries
- **Organization**: Multi-tenant support with environment isolation
- **Performance**: Concurrent processing, caching, batch operations
- **Monitoring**: Audit logging, Slack, Email alerting
- **Security**: License policies, registry trust, feature toggles

### **✅ Deployment Environments**

- **Development**: Relaxed security for productivity
- **Staging**: Enterprise security validation
- **Production**: Maximum security with advanced features
- **Enterprise**: Maximum compliance with custom rules

### **✅ Infrastructure Support**

- **Docker**: Container-based configuration
- **Kubernetes**: Secret management and deployment
- **CI/CD**: Pipeline integration with validation
- **Monitoring**: Health checks and metrics collection

**🚀 Your Fire22 Enterprise Security Scanner is now fully configured for
enterprise deployment with environment-based configuration management!**

---

**🔧 Quick Setup:**

```bash
# Configure for your environment
export FIRE22_SECURITY_API_KEY="your-key"
export FIRE22_ORGANIZATION="your-company"
export FIRE22_ENVIRONMENT="production"

# Test configuration
bun run enterprise:config-demo

# Validate setup
bun run security:test
```
