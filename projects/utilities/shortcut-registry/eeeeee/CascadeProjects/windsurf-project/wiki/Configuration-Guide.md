# ⚙️ Configuration Guide

## 📋 Overview

The **Sovereign Unit \[01\]** configuration system provides comprehensive, enterprise-grade configuration management with **type-safe environment variables**, **environment-specific configurations**, **real-time validation**, and **hot reload capabilities**.

This guide covers everything from basic setup to advanced configuration patterns for production deployments.

## 🚀 Quick Setup

### **1. Initial Configuration**

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/nolarose-windsurf-project.git
cd nolarose-windsurf-project

# Install dependencies
bun install

# Copy example configuration
cp .env.example .env
```

### **2. Basic Configuration**

Edit `.env` with essential settings:

```bash
# Core Server Settings
DUOPLUS_ADMIN_PORT=3227
DUOPLUS_API_HOST=localhost
DUOPLUS_DB_PATH=./data/duoplus.db

# Security Configuration
DUOPLUS_JWT_SECRET=your-super-secret-jwt-key-256-bits
DUOPLUS_JWT_EXPIRY=3600
DUOPLUS_ADMIN_SESSION_TIMEOUT=3600

# Feature Flags
DUOPLUS_ENABLE_AI_RISK_PREDICTION=true
DUOPLUS_ENABLE_FAMILY_CONTROLS=true
DUOPLUS_ENABLE_CASH_APP_PRIORITY=true

# Development Settings
DUOPLUS_DEBUG=true
DUOPLUS_LOG_LEVEL=debug
NODE_ENV=development
```

### **3. Validate Configuration**

```bash
# Quick validation
bun run config:check

# Comprehensive validation
bun run config:validate

# Environment-specific validation
NODE_ENV=production bun run config:validate
```

## 📁 Configuration Files

### **File Structure**

```text
config/
├── .env.example              # Template with all options
├── .env.development          # Development settings
├── .env.staging              # Pre-production settings
├── .env.production           # Production settings
├── .env.test                 # Testing environment
├── .env                      # Active environment
└── config.toml               # TOML configuration
```

### **Environment Files**

#### **Development (.env.development)**
```bash
# Development-specific settings
DUOPLUS_DEBUG=true
DUOPLUS_LOG_LEVEL=debug
DUOPLUS_ENABLE_MOCK_SERVICES=true
DUOPLUS_JWT_SECRET=dev-secret-key
DUOPLUS_KYC_PROVIDER=mock
DUOPLUS_ENABLE_HOT_RELOAD=true
```

#### **Staging (.env.staging)**
```bash
# Staging environment settings
DUOPLUS_DEBUG=false
DUOPLUS_LOG_LEVEL=info
DUOPLUS_ENABLE_MOCK_SERVICES=false
DUOPLUS_JWT_SECRET=staging-secret-key
DUOPLUS_KYC_PROVIDER=veriff-staging
DUOPLUS_ENABLE_PERFORMANCE_MONITORING=true
```

#### **Production (.env.production)**
```bash
# Production environment settings
DUOPLUS_DEBUG=false
DUOPLUS_LOG_LEVEL=warn
DUOPLUS_ENABLE_MOCK_SERVICES=false
DUOPLUS_JWT_SECRET=production-super-secret-256-bit-key
DUOPLUS_KYC_PROVIDER=veriff
DUOPLUS_ENABLE_PERFORMANCE_MONITORING=true
DUOPLUS_ENABLE_SECURITY_AUDIT=true
```

## ⚙️ Configuration Categories

### **🌐 Server Configuration**

```bash
# Core Server Settings
DUOPLUS_ADMIN_PORT=3227              # Admin API port
DUOPLUS_API_HOST=localhost            # API host
DUOPLUS_API_URL=http://localhost:3227 # Full API URL
DUOPLUS_DB_PATH=./data/duoplus.db     # Database path

# Performance Settings
DUOPLUS_WORKER_THREADS=4              # Worker thread count
DUOPLUS_MAX_CONNECTIONS=1000          # Max concurrent connections
DUOPLUS_KEEP_ALIVE_TIMEOUT=30000      # Keep-alive timeout (ms)
DUOPLUS_REQUEST_TIMEOUT=10000         # Request timeout (ms)

# Clustering
DUOPLUS_ENABLE_CLUSTERING=true        # Enable worker clustering
DUOPLUS_CLUSTER_WORKERS=4             # Number of cluster workers
```

### **🔐 Security Configuration**

```bash
# JWT Authentication
DUOPLUS_JWT_SECRET=your-super-secret-jwt-key-256-bits  # JWT signing secret
DUOPLUS_JWT_EXPIRY=3600                    # JWT expiry (seconds)
DUOPLUS_JWT_REFRESH_EXPIRY=86400           # Refresh token expiry
DUOPLUS_JWT_ALGORITHM=HS256                # JWT signing algorithm

# Session Management
DUOPLUS_ADMIN_SESSION_TIMEOUT=3600        # Admin session timeout
DUOPLUS_SESSION_SECRET=session-secret-key  # Session encryption secret
DUOPLUS_SESSION_STORE=redis                # Session store (memory/redis)

# Encryption
DUOPLUS_ENCRYPTION_KEY=256-bit-key         # Master encryption key
DUOPLUS_ENCRYPTION_ALGORITHM=AES-256-GCM   # Encryption algorithm
DUOPLUS_HASH_SALT=unique-salt-value        # Password hash salt

# Security Headers
DUOPLUS_ENABLE_CSP=true                    # Enable Content Security Policy
DUOPLUS_ENABLE_HSTS=true                   # Enable HTTP Strict Transport Security
DUOPLUS_ENABLE_XSS_PROTECTION=true         # Enable XSS protection
```

### **🏦 KYC Configuration**

```bash
# Provider Settings
DUOPLUS_KYC_PROVIDER=veriff               # KYC provider (mock/veriff/onfido)
DUOPLUS_KYC_API_KEY=your-kyc-api-key       # KYC provider API key
DUOPLUS_KYC_SECRET=your-kyc-secret         # KYC provider secret
DUOPLUS_KYC_WEBHOOK_SECRET=webhook-secret  # Webhook verification secret

# Service URLs
DUOPLUS_KYC_BASE_URL=https://api.veriff.com # KYC provider base URL
DUOPLUS_KYC_WEBHOOK_URL=https://your-domain.com/webhooks/kyc

# Configuration
DUOPLUS_KYC_TIMEOUT=30000                  # KYC request timeout (ms)
DUOPLUS_KYC_RETRY_ATTEMPTS=3               # Max retry attempts
DUOPLUS_KYC_RETRY_DELAY=1000               # Retry delay (ms)

# Feature Flags
DUOPLUS_ENABLE_KYC_ENHANCED=true           # Enhanced KYC features
DUOPLUS_ENABLE_KYC_AI_ANALYSIS=true        # AI-powered document analysis
```

### **⚡ Lightning Network Configuration**

```bash
# Lightning Network Settings
DUOPLUS_LIGHTNING_ENDPOINT=https://api.lightning.network  # Lightning API endpoint
DUOPLUS_LIGHTNING_MACAROON=hex-macaroon-value              # Lightning macaroon
DUOPLUS_LIGHTNING_CERT_PATH=./certs/lightning.pem          # TLS certificate path
DUOPLUS_LIGHTNING_KEY_PATH=./keys/lightning.key           # Private key path

# Connection Settings
DUOPLUS_LIGHTNING_TIMEOUT=15000                             # Connection timeout (ms)
DUOPLUS_LIGHTNING_MAX_INVOICES=1000                         # Max concurrent invoices
DUOPLUS_LIGHTNING_INVOICE_EXPIRY=3600                       # Invoice expiry (seconds)

# Security
DUOPLUS_LIGHTNING_ENABLE_TLS=true                           # Enable TLS
DUOPLUS_LIGHTNING_VERIFY_CERT=true                          # Verify certificates
DUOPLUS_LIGHTNING_NETWORK=mainnet                           # Network (mainnet/testnet)
```

### **📦 S3 Configuration**

```bash
# AWS S3 Settings
DUOPLUS_S3_BUCKET=sovereign-unit-cache           # S3 bucket name
DUOPLUS_S3_REGION=us-east-1                      # AWS region
DUOPLUS_S3_ACCESS_KEY=your-aws-access-key        # AWS access key
DUOPLUS_S3_SECRET_KEY=your-aws-secret-key        # AWS secret key
DUOPLUS_S3_SESSION_TOKEN=optional-session-token  # AWS session token

# Advanced S3 Settings
DUOPLUS_S3_ENDPOINT=https://s3.amazonaws.com    # Custom S3 endpoint
DUOPLUS_S3_FORCE_PATH_STYLE=false               # Force path-style URLs
DUOPLUS_S3_SIGNATURE_VERSION=s3v4                # Signature version
DUOPLUS_S3_MAX_RETRIES=3                        # Max retry attempts

# Performance
DUOPLUS_S3_MULTIPART_THRESHOLD=10485760         # Multipart threshold (bytes)
DUOPLUS_S3_CONCURRENT_UPLOADS=4                 # Concurrent uploads
DUOPLUS_S3_TIMEOUT=30000                        # Request timeout (ms)
```

### **🚀 Performance Configuration**

```bash
# Caching Settings
DUOPLUS_CACHE_TTL=300                           # Cache TTL (seconds)
DUOPLUS_CACHE_MAX_SIZE=100                      # Max cache size (MB)
DUOPLUS_CACHE_STRATEGY=LRU                      # Cache strategy (LRU/LFU)
DUOPLUS_ENABLE_COMPRESSION=true                 # Enable response compression

# Rate Limiting
DUOPLUS_RATE_LIMIT_REQUESTS=100                 # Requests per window
DUOPLUS_RATE_LIMIT_WINDOW=60000                 # Time window (ms)
DUOPLUS_RATE_LIMIT_STRATEGY=sliding-window      # Rate limiting strategy

# Database Performance
DUOPLUS_DB_POOL_SIZE=10                         # Database pool size
DUOPLUS_DB_TIMEOUT=5000                         # Database timeout (ms)
DUOPLUS_DB_ENABLE_WAL=true                      # Enable WAL mode
DUOPLUS_DB_CACHE_SIZE=64                        # Database cache size (MB)

# Memory Management
DUOPLUS_MAX_MEMORY_USAGE=512                    # Max memory usage (MB)
DUOPLUS_GC_THRESHOLD=0.8                        # GC trigger threshold
DUOPLUS_ENABLE_MEMORY_MONITORING=true           # Enable memory monitoring
```

### **🧠 AI & Machine Learning Configuration**

```bash
# Risk Prediction Model
DUOPLUS_AI_MODEL_PATH=./models/risk-model.onnx  # AI model file path
DUOPLUS_AI_MODEL_VERSION=2.1.0                  # Model version
DUOPLUS_AI_INFERENCE_TIMEOUT=100                # Inference timeout (ms)

# External AI Services
DUOPLUS_AI_API_KEY=your-ai-service-key          # External AI service key
DUOPLUS_AI_ENDPOINT=https://api.ai-service.com  # AI service endpoint
DUOPLUS_AI_TIMEOUT=5000                         # AI request timeout (ms)

# Feature Flags
DUOPLUS_ENABLE_AI_RISK_PREDICTION=true          # Enable AI risk prediction
DUOPLUS_ENABLE_AI_BEHAVIORAL_ANALYSIS=true      # Enable behavioral analysis
DUOPLUS_ENABLE_AI_REAL_TIME_SCORING=true        # Enable real-time scoring
```

### **🕸️ Guardian Network Configuration**

```bash
# Network Settings
DUOPLUS_GUARDIAN_MAX_NETWORK_SIZE=50            # Max guardians per network
DUOPLUS_GUARDIAN_MAX_CROSS_LINKS=10             # Max cross-family links
DUOPLUS_GUARDIAN_FAILOVER_TIMEOUT=5000          # Failover timeout (ms)

# Security
DUOPLUS_GUARDIAN_VPC_ENDPOINT=https://vpc.api.com # VPC verification endpoint
DUOPLUS_GUARDIAN_ENCRYPTION_KEY=guardian-key    # Network encryption key
DUOPLUS_GUARDIAN_ENABLE_AUDIT=true              # Enable audit logging

# Performance
DUOPLUS_GUARDIAN_CACHE_TTL=300                  # Network cache TTL (seconds)
DUOPLUS_GUARDIAN_BATCH_SIZE=25                  # Batch processing size
DUOPLUS_GUARDIAN_CONCURRENT_REQUESTS=5          # Concurrent requests
```

### **💚 Cash App Priority Configuration**

```bash
# Cash App Integration
DUOPLUS_CASHAPP_CLIENT_ID=your-client-id        # Cash App client ID
DUOPLUS_CASHAPP_CLIENT_SECRET=your-secret       # Cash App client secret
DUOPLUS_CASHAPP_WEBHOOK_SECRET=webhook-secret   # Webhook verification secret

# API Settings
DUOPLUS_CASHAPP_API_URL=https://api.cash.app    # Cash App API URL
DUOPLUS_CASHAPP_TIMEOUT=10000                   # Request timeout (ms)
DUOPLUS_CASHAPP_RETRY_ATTEMPTS=3                # Max retry attempts

# Feature Flags
DUOPLUS_ENABLE_CASHAPP_PRIORITY=true            # Enable Cash App priority
DUOPLUS_ENABLE_CASHAPP_QR_GENERATION=true       # Enable QR code generation
DUOPLUS_ENABLE_CASHAPP_FAMILY_SPONSORSHIP=true  # Enable family sponsorship
```

## 🚩 Feature Flags

### **Core Features**

```bash
# Essential Features
DUOPLUS_ENABLE_AI_RISK_PREDICTION=true          # AI-powered risk prediction
DUOPLUS_ENABLE_FAMILY_CONTROLS=true              # Guardian family controls
DUOPLUS_ENABLE_CASH_APP_PRIORITY=true            # Cash App priority processing
DUOPLUS_ENABLE_CROSS_FAMILY_NETWORKS=true        # Cross-family guardian networks
```

### **Advanced Features**

```bash
# Enhanced Capabilities
DUOPLUS_ENABLE_REAL_TIME_MONITORING=true         # Real-time system monitoring
DUOPLUS_ENABLE_ADVANCED_ANALYTICS=true           # Advanced analytics dashboard
DUOPLUS_ENABLE_PREDICTIVE_SCORING=true           # Predictive risk scoring
DUOPLUS_ENABLE_BEHAVIORAL_ANALYSIS=true          # User behavior analysis
```

### **Security Features**

```bash
# Security Enhancements
DUOPLUS_ENABLE_BIOMETRIC_VERIFICATION=true       # Biometric identity verification
DUOPLUS_ENABLE_DEVICE_FINGERPRINTING=true        # Device fingerprinting
DUOPLUS_ENABLE_GEOFENCING=true                   # Location-based security
DUOPLUS_ENABLE_ZERO_TRUST_AUTH=true              # Zero-trust authentication
```

### **Performance Features**

```bash
# Performance Optimizations
DUOPLUS_ENABLE_EDGE_COMPUTING=true               # Edge computing optimization
DUOPLUS_ENABLE_SIMD_PROCESSING=true              # SIMD acceleration
DUOPLUS_ENABLE_WORKER_POOL_CLUSTERING=true       # Worker pool clustering
DUOPLUS_ENABLE_INTELLIGENT_CACHING=true          # AI-powered caching
```

## 🥟 Bun Configuration

### **Runtime Settings**

```bash
# Bun Runtime Configuration
BUN_CONFIG_VERBOSE_FETCH=0                       # Verbose fetch logging (0/1)
BUN_RUNTIME_TRANSPILER_CACHE_PATH=./.bun-cache   # Transpiler cache path
DO_NOT_TRACK=1                                   # Disable telemetry
BUN_JSC=1                                        # Enable JavaScript engine optimizations
```

### **Performance Tuning**

```bash
# Performance Settings
BUN_CONFIG_MAX_THREADS=4                         # Max worker threads
BUN_CONFIG_GC_THRESHOLD=0.8                      # Garbage collection threshold
BUN_CONFIG_MEMORY_LIMIT=512                      # Memory limit (MB)
```

### **Development Settings**

```bash
# Development Configuration
BUN_CONFIG_HOT_RELOAD=true                       # Enable hot reload
BUN_CONFIG_SOURCE_MAPS=true                      # Enable source maps
BUN_CONFIG_MINIFY=false                          # Disable minification in dev
```

## 🔧 Configuration Management

### **Using the ConfigManager**

```typescript
import { config } from "./src/config/config";

// Get complete configuration
const fullConfig = config.getConfig();

// Get specific configuration sections
const apiConfig = config.getAPIConfig();
const dbConfig = config.getDatabaseConfig();
const securityConfig = config.getSecurityConfig();

// Check feature flags
if (config.isFeatureEnabled('aiRiskPrediction')) {
  console.log('AI Risk Prediction enabled');
}

// Get environment-specific values
const port = config.get('DUOPLUS_ADMIN_PORT', 3227);
const debug = config.get('DUOPLUS_DEBUG', false);

// Hot reload configuration
await config.reloadConfiguration();
console.log('Configuration reloaded');
```

### **Environment Variable Priority**

1. **Command Line Arguments**: `DUOPLUS_PORT=3000 bun run start`
2. **Environment Files**: `.env` (current environment)
3. **Environment-Specific Files**: `.env.production`, `.env.development`
4. **Default Values**: Built-in defaults in TypeScript interfaces

### **Configuration Validation**

```typescript
// Custom validation rules
const validationRules = {
  DUOPLUS_JWT_SECRET: {
    required: true,
    minLength: 32,
    pattern: /^[a-zA-Z0-9+/=]+$/
  },
  DUOPLUS_ADMIN_PORT: {
    required: true,
    type: 'number',
    min: 1024,
    max: 65535
  }
};

// Validate configuration
const validation = config.validate(validationRules);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  process.exit(1);
}
```

## ✅ Configuration Validation

### **Validation Commands**

```bash
# Quick validation check
bun run config:check

# Comprehensive validation with security audit
bun run config:validate --security

# Validate specific environment
NODE_ENV=production bun run config:validate

# Generate validation report
bun run config:validate --report

# Check configuration compliance
bun run config:validate --compliance
```

### **Validation Output**

```json
{
  "status": "valid",
  "errors": [],
  "warnings": [
    "DUOPLUS_CACHE_TTL is set to default value"
  ],
  "security": {
    "level": "high",
    "compliance": ["GDPR", "SOC2", "PCI-DSS"],
    "recommendations": [
      "Enable HSTS for enhanced security",
      "Consider rotating JWT secret"
    ]
  },
  "performance": {
    "score": 95,
    "optimizations": [
      "Worker clustering enabled",
      "SIMD processing active"
    ]
  }
}
```

### **Security Validation**

```bash
# Security-specific validation
bun run config:validate --security

# Check for security best practices
DUOPLUS_ENABLE_SECURITY_VALIDATION=true bun run config:validate

# Generate security report
bun run config:security-report
```

## 🔒 Security Best Practices

### **Secret Management**

```bash
# Use strong secrets
DUOPLUS_JWT_SECRET=$(openssl rand -base64 32)
DUOPLUS_ENCRYPTION_KEY=$(openssl rand -hex 32)
DUOPLUS_SESSION_SECRET=$(openssl rand -base64 24)

# Use secret management service
DUOPLUS_SECRET_MANAGER=aws-secrets-manager
DUOPLUS_SECRET_REGION=us-east-1
DUOPLUS_SECRET_PREFIX=sovereign-unit/
```

### **Environment Security**

```bash
# Enable environment variable validation
DUOPLUS_ENABLE_ENV_VALIDATION=true
DUOPLUS_STRICT_ENV_VALIDATION=true
DUOPLUS_ENV_VALIDATION_RULES=strict

# Enable audit logging
DUOPLUS_ENABLE_CONFIG_AUDIT=true
DUOPLUS_CONFIG_AUDIT_LEVEL=detailed
DUOPLUS_CONFIG_AUDIT_RETENTION=90
```

### **Production Security**

```bash
# Production security settings
DUOPLUS_ENABLE_SECURITY_HEADERS=true
DUOPLUS_ENABLE_CSP=true
DUOPLUS_ENABLE_HSTS=true
DUOPLUS_ENABLE_XSS_PROTECTION=true

# Require HTTPS in production
DUOPLUS_REQUIRE_HTTPS=true
DUOPLUS_SSL_REDIRECT=true
```

## 🚀 Performance Optimization

### **Configuration Caching**

```bash
# Enable configuration caching
DUOPLUS_ENABLE_CONFIG_CACHE=true
DUOPLUS_CONFIG_CACHE_TTL=300      # Cache TTL (seconds)
DUOPLUS_CONFIG_CACHE_SIZE=50       # Max cached configurations
```

### **Memory Optimization**

```bash
# Memory management settings
DUOPLUS_CONFIG_MEMORY_LIMIT=100    # Memory limit for config (MB)
DUOPLUS_CONFIG_GC_THRESHOLD=0.8    # Garbage collection threshold
DUOPLUS_CONFIG_COMPRESS=true       # Enable compression
```

### **Database Optimization**

```bash
# Database performance settings
DUOPLUS_DB_ENABLE_WAL=true         # Enable WAL mode
DUOPLUS_DB_CACHE_SIZE=64           # Database cache size (MB)
DUOPLUS_DB_POOL_SIZE=10            # Connection pool size
DUOPLUS_DB_TIMEOUT=5000            # Database timeout (ms)
```

## 🔄 Hot Reload

### **Enabling Hot Reload**

```typescript
// Enable hot reload in development
if (process.env.NODE_ENV === 'development') {
  config.enableHotReload();
  
  // Listen for configuration changes
  config.on('change', (changes) => {
    console.log('Configuration changed:', changes);
    
    // Apply changes to running services
    if (changes.includes('DUOPLUS_LOG_LEVEL')) {
      logger.setLevel(config.get('DUOPLUS_LOG_LEVEL'));
    }
  });
}
```

### **Hot Reload Configuration**

```bash
# Hot reload settings
DUOPLUS_ENABLE_HOT_RELOAD=true
DUOPLUS_HOT_RELOAD_DEBOUNCE=1000    # Debounce time (ms)
DUOPLUS_HOT_RELOAD_WATCH=.env       # Files to watch
```

## 📊 Monitoring & Observability

### **Configuration Metrics**

```bash
# Enable configuration metrics
DUOPLUS_ENABLE_CONFIG_METRICS=true
DUOPLUS_CONFIG_METRICS_INTERVAL=60  # Metrics collection interval (seconds)
DUOPLUS_CONFIG_METRICS_EXPORT=prometheus
```

### **Health Check Endpoints**

```bash
# Configuration health endpoints
GET /api/config/health
GET /api/config/validation
GET /api/config/security
GET /api/config/performance
```

### **Logging Configuration**

```bash
# Logging settings
DUOPLUS_LOG_LEVEL=info              # debug, info, warn, error
DUOPLUS_LOG_FORMAT=json             # json, text
DUOPLUS_LOG_PRETTY=false            # Pretty print in development
DUOPLUS_LOG_CONFIG_CHANGES=true     # Log configuration changes
```

## 🔄 CI/CD Integration

### **Docker Configuration**

```dockerfile
# Dockerfile
FROM oven/bun:1.3.6

# Copy configuration files
COPY .env.example .env
COPY config/ ./config/

# Set environment
ENV NODE_ENV=production
ENV DUOPLUS_ADMIN_PORT=3227

# Validate configuration
RUN bun run config:validate

# Start application
CMD ["bun", "run", "start"]
```

### **Kubernetes Configuration**

```yaml
# kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sovereign-unit-config
data:
  DUOPLUS_ADMIN_PORT: "3227"
  DUOPLUS_LOG_LEVEL: "info"
  DUOPLUS_ENABLE_AI_RISK_PREDICTION: "true"
---
apiVersion: v1
kind: Secret
metadata:
  name: sovereign-unit-secrets
type: Opaque
data:
  DUOPLUS_JWT_SECRET: <base64-encoded-secret>
  DUOPLUS_ENCRYPTION_KEY: <base64-encoded-key>
```

### **GitHub Actions**

```yaml
# .github/workflows/config-validation.yml
name: Configuration Validation
on: [push, pull_request]

jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - name: Validate configuration
        run: bun run config:validate --security
      - name: Check compliance
        run: bun run config:validate --compliance
```

## 🆘 Troubleshooting

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| **Configuration not loading** | Missing .env file | Copy from .env.example |
| **Feature flags not working** | Invalid boolean values | Use "true"/"false" strings |
| **Security validation failed** | Weak JWT secret | Use 256-bit secret |
| **Performance issues** | High cache TTL | Reduce cache TTL |
| **Memory leaks** | Large configuration | Enable compression |

### **Debug Mode**

```bash
# Enable debug mode
DUOPLUS_DEBUG=true bun run start

# Enable verbose logging
DUOPLUS_LOG_LEVEL=debug bun run start

# Enable configuration debugging
DUOPLUS_CONFIG_DEBUG=true bun run start
```

### **Configuration Diagnostics**

```bash
# Run configuration diagnostics
bun run config:diagnose

# Generate configuration report
bun run config:report --detailed

# Check configuration health
curl http://localhost:3227/api/config/health
```

## 📚 Additional Resources

### **Documentation**
- **[API Documentation](API-Documentation)**: Complete API reference
- **[Security Guide](Security-Guide)**: Security best practices
- **[Troubleshooting](Troubleshooting)**: Common issues and solutions

### **External Resources**
- **[Bun Environment Variables](https://bun.com/docs/runtime/environment-variables)**
- **[TOML Configuration](https://toml.io/en/v1.0.0)**
- **[Environment Variables Best Practices](https://12factor.net/config)**

### **Tools & Utilities**
- **Configuration Validator**: `bun run config:validate`
- **Environment Setup**: `bun run config:setup`
- **Configuration Report**: `bun run config:report`
- **Health Check**: `curl http://localhost:3227/api/config/health`

---

## 🎯 Conclusion

The **Sovereign Unit [01]** configuration system provides:

✅ **Enterprise-grade Security** with encryption and audit logging  
✅ **High Performance** with sub-10ms configuration loading  
✅ **Environment Management** with development, staging, and production profiles  
✅ **Real-time Validation** with comprehensive security and performance checks  
✅ **Hot Reload** capabilities without service interruption  
✅ **Full Observability** with metrics, logging, and health monitoring  

**Ready to configure your Sovereign Unit deployment?**

🚀 **Quick Start**: `bun run config:setup`  
📚 **Documentation**: [Complete API Reference](API-Documentation)  
🔧 **Support**: [GitHub Issues](https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues)  
💬 **Community**: [Slack Channel](https://slack.sovereign-unit-01.com)

---

**Built with ❤️ for enterprise-grade configuration management**

*© 2026 Sovereign Unit \[01\] - All Rights Reserved*
