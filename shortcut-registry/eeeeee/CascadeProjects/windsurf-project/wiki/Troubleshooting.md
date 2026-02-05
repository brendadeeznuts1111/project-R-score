# 🆘 Troubleshooting Guide

## 📋 Overview

This guide helps you diagnose and resolve common issues with the **Sovereign Unit \[01\]** Financial Warming Multiverse. From setup problems to performance issues, we've got you covered with step-by-step solutions.

## 🚨 Quick Diagnostics

### **Health Check Commands**

```bash
# System health check
curl http://localhost:3227/api/health

# Configuration validation
bun run config:validate

# Test suite
bun run test

# Performance check
bun run perf:test

# Security audit
bun run security:check
```

### **Diagnostic Information**

```bash
# System information
bun run system:info

# Environment details
bun run env:info

# Service status
bun run services:status

# Logs analysis
bun run logs:analyze
```

## 🔧 Common Issues

### **1. Installation & Setup**

#### **Issue: Bun installation fails**
```bash
# Symptom: Command not found: bun
# Solution: Install Bun properly
curl -fsSL https://bun.sh/install | bash
# Or using npm
npm install -g bun

# Verify installation
bun --version
```

#### **Issue: Dependencies won't install**
```bash
# Symptom: npm install errors
# Solution: Clean install
rm -rf node_modules bun.lockb
bun install

# If still failing, clear cache
bun pm cache rm
bun install
```

#### **Issue: Configuration validation fails**
```bash
# Symptom: Configuration errors on startup
# Solution: Check and fix .env file
bun run config:validate --detailed

# Common fixes:
# - Ensure JWT_SECRET is 32+ characters
# - Check port is available (1024-65535)
# - Verify file paths exist
# - Validate boolean values are "true"/"false"
```

### **2. Server Startup Issues**

#### **Issue: Port already in use**
```bash
# Symptom: Error: listen EADDRINUSE :::3227
# Solution 1: Kill existing process
lsof -ti:3227 | xargs kill -9

# Solution 2: Use different port
DUOPLUS_ADMIN_PORT=3228 bun run dev

# Solution 3: Find what's using the port
lsof -i :3227
```

#### **Issue: Database connection fails**
```bash
# Symptom: Database connection timeout
# Solution: Check database configuration
DUOPLUS_DB_PATH=./data/duoplus.db

# Ensure directory exists
mkdir -p ./data

# Check permissions
ls -la ./data/

# Recreate database
rm ./data/duoplus.db
bun run db:migrate
```

#### **Issue: External service timeouts**
```bash
# Symptom: External API timeouts
# Solution: Check network connectivity
curl -I https://api.veriff.com
curl -I https://api.cash.app

# Increase timeout values
DUOPLUS_KYC_TIMEOUT=60000
DUOPLUS_CASHAPP_TIMEOUT=30000

# Use mock services for development
DUOPLUS_ENABLE_MOCK_SERVICES=true
```

### **3. Authentication & Security**

#### **Issue: JWT token invalid**
```bash
# Symptom: 401 Unauthorized errors
# Solution: Check JWT configuration
DUOPLUS_JWT_SECRET=$(openssl rand -base64 32)
DUOPLUS_JWT_EXPIRY=3600

# Regenerate tokens
curl -X POST http://localhost:3227/api/auth/refresh \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

#### **Issue: MFA not working**
```bash
# Symptom: MFA verification fails
# Solution: Check MFA configuration
DUOPLUS_ENABLE_MFA=true
DUOPLUS_MFA_PROVIDERS=totp,webauthn

# Reset MFA for user
curl -X POST http://localhost:3227/api/auth/mfa/reset \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### **Issue: Rate limiting blocking legitimate users**
```bash
# Symptom: 429 Too Many Requests
# Solution: Adjust rate limits
DUOPLUS_RATE_LIMIT_REQUESTS=1000
DUOPLUS_RATE_LIMIT_WINDOW=60000

# Whitelist trusted IPs
DUOPLUS_WHITELIST_IPS=192.168.1.100,10.0.0.50
```

### **4. Performance Issues**

#### **Issue: Slow API responses**
```bash
# Symptom: API calls taking >1 second
# Solution: Enable performance monitoring
DUOPLUS_ENABLE_PERFORMANCE_MONITORING=true

# Check metrics
curl http://localhost:3227/api/metrics/performance

# Common optimizations:
# - Enable caching
DUOPLUS_ENABLE_CONFIG_CACHE=true
# - Increase worker threads
DUOPLUS_WORKER_THREADS=8
# - Enable compression
DUOPLUS_ENABLE_COMPRESSION=true
```

#### **Issue: High memory usage**
```bash
# Symptom: Memory usage > 1GB
# Solution: Optimize memory settings
DUOPLUS_MAX_MEMORY_USAGE=512
DUOPLUS_GC_THRESHOLD=0.7

# Enable memory monitoring
DUOPLUS_ENABLE_MEMORY_MONITORING=true

# Check memory usage
curl http://localhost:3227/api/metrics/memory
```

#### **Issue: Database slow queries**
```bash
# Symptom: Database queries taking >100ms
# Solution: Optimize database settings
DUOPLUS_DB_ENABLE_WAL=true
DUOPLUS_DB_CACHE_SIZE=128
DUOPLUS_DB_POOL_SIZE=20

# Analyze slow queries
bun run db:analyze-slow-queries
```

### **5. AI & Machine Learning**

#### **Issue: AI model loading fails**
```bash
# Symptom: AI engine initialization error
# Solution: Check model configuration
DUOPLUS_AI_MODEL_PATH=./models/risk-model.onnx
DUOPLUS_AI_MODEL_VERSION=2.1.0

# Verify model file exists
ls -la ./models/

# Download model if missing
bun run models:download
```

#### **Issue: Risk prediction errors**
```bash
# Symptom: Risk scoring returns errors
# Solution: Check feature validation
curl -X POST http://localhost:3227/api/risk/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test",
    "features": {
      "vpn_active": 0,
      "thermal_spike": 12.5,
      "biometric_fail": 0
    }
  }'

# Common fixes:
# - Ensure all required features are provided
# - Check feature value ranges
# - Verify feature data types
```

### **6. Guardian Networks**

#### **Issue: Guardian network not initializing**
```bash
# Symptom: Network initialization fails
# Solution: Check network configuration
DUOPLUS_GUARDIAN_MAX_NETWORK_SIZE=50
DUOPLUS_GUARDIAN_MAX_CROSS_LINKS=10

# Verify VPC endpoint
curl -I https://vpc.api.com

# Test network creation
curl -X POST http://localhost:3227/api/family/network/initialize \
  -H "Content-Type: application/json" \
  -d '{"teenId": "test-teen", "guardians": []}'
```

#### **Issue: Cross-family links failing**
```bash
# Symptom: Cross-family link creation fails
# Solution: Check relationship validation
DUOPLUS_GUARDIAN_ENABLE_RELATIONSHIP_VALIDATION=true

# Verify guardian permissions
curl http://localhost:3227/api/family/guardian/guardian-001/permissions

# Test link creation
curl -X POST http://localhost:3227/api/family/cross-link \
  -H "Content-Type: application/json" \
  -d '{
    "sourceNetworkId": "network-001",
    "targetNetworkId": "network-002",
    "linkType": "CROSS_HOUSEHOLD"
  }'
```

### **7. Cash App Priority**

#### **Issue: QR code generation fails**
```bash
# Symptom: QR code endpoint returns error
# Solution: Check Cash App configuration
DUOPLUS_CASHAPP_CLIENT_ID=your-client-id
DUOPLUS_CASHAPP_CLIENT_SECRET=your-secret

# Test QR generation
curl -X POST http://localhost:3227/api/cashapp/qr \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "USD",
    "recipient": "cashapp-$cashtag"
  }'
```

#### **Issue: Payment verification fails**
```bash
# Symptom: Payment status always pending
# Solution: Check webhook configuration
DUOPLUS_CASHAPP_WEBHOOK_SECRET=your-webhook-secret

# Test payment verification
curl http://localhost:3227/api/cashapp/sessions/session-123

# Manual verification (development)
DUOPLUS_ENABLE_MOCK_PAYMENTS=true
```

## 🔍 Debug Mode

### **Enable Debug Logging**

```bash
# Enable comprehensive debug mode
DUOPLUS_DEBUG=true \
DUOPLUS_LOG_LEVEL=debug \
DUOPLUS_CONFIG_DEBUG=true \
bun run dev

# Enable specific debug modules
DUOPLUS_DEBUG_MODULES=auth,ai,guardian \
bun run dev
```

### **Debug Commands**

```bash
# Debug configuration
bun run config:debug

# Debug authentication
bun run auth:debug

# Debug AI engine
bun run ai:debug

# Debug guardian networks
bun run guardian:debug

# Debug cash app integration
bun run cashapp:debug
```

### **Log Analysis**

```bash
# View recent logs
bun run logs:recent --lines=100

# Filter logs by level
bun run logs:filter --level=error

# Search logs for patterns
bun run logs:search --pattern="authentication"

# Analyze log statistics
bun run logs:stats
```

## 🛠️ Advanced Troubleshooting

### **System Diagnostics**

```bash
# Full system diagnostic
bun run diagnostic:full

# Performance diagnostic
bun run diagnostic:performance

# Security diagnostic
bun run diagnostic:security

# Network diagnostic
bun run diagnostic:network
```

### **Database Diagnostics**

```bash
# Database health check
bun run db:health

# Database performance analysis
bun run db:performance

# Database integrity check
bun run db:integrity

# Database optimization
bun run db:optimize
```

### **API Diagnostics**

```bash
# API health check
bun run api:health

# API performance test
bun run api:performance

# API security scan
bun run api:security

# API documentation test
bun run api:docs:test
```

## 📊 Performance Monitoring

### **Real-time Monitoring**

```bash
# Start monitoring
bun run monitor:start

# View metrics dashboard
curl http://localhost:3227/api/metrics/dashboard

# Export metrics
curl http://localhost:3227/api/metrics/export
```

### **Performance Metrics**

```bash
# Response time analysis
bun run perf:response-time

# Throughput analysis
bun run perf:throughput

# Error rate analysis
bun run perf:error-rate

# Resource usage analysis
bun run perf:resources
```

## 🔒 Security Issues

### **Security Audit**

```bash
# Run security audit
bun run security:audit

# Check for vulnerabilities
bun run security:vulnerabilities

# Validate security configuration
bun run security:validate

# Generate security report
bun run security:report
```

### **Common Security Issues**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Weak JWT secret** | Authentication warnings | Use 256-bit secret |
| **Missing HTTPS** | Browser warnings | Enable TLS |
| **CORS errors** | Cross-origin blocked | Configure CORS |
| **Rate limiting** | 429 errors | Adjust limits |
| **Input validation** | Injection risks | Validate inputs |

## 🌐 Network Issues

### **Connectivity Problems**

```bash
# Test external connectivity
bun run network:test-external

# Test internal connectivity
bun run network:test-internal

# DNS resolution test
bun run network:dns-test

# Latency test
bun run network:latency-test
```

### **Firewall Issues**

```bash
# Check firewall status
bun run network:firewall-status

# Test port accessibility
bun run network:port-test --port=3227

# Configure firewall rules
bun run network:configure-firewall
```

## 📱 Mobile Issues

### **Mobile App Problems**

```bash
# Test mobile API endpoints
bun run mobile:test-api

# Check mobile configuration
bun run mobile:config-check

# Validate mobile security
bun run mobile:security-check
```

### **Responsive Design Issues**

```bash
# Test responsive design
bun run ui:responsive-test

# Check mobile performance
bun run ui:mobile-performance

# Validate mobile accessibility
bun run ui:mobile-accessibility
```

## 🔄 Recovery Procedures

### **Data Recovery**

```bash
# Restore from backup
bun run backup:restore --date=2026-01-20

# Verify data integrity
bun run data:verify-integrity

# Repair corrupted data
bun run data:repair
```

### **Service Recovery**

```bash
# Restart all services
bun run services:restart

# Recover specific service
bun run services:recover --service=ai-engine

# Full system recovery
bun run system:recovery
```

### **Emergency Procedures**

```bash
# Emergency shutdown
bun run emergency:shutdown

# Emergency backup
bun run emergency:backup

# Emergency restore
bun run emergency:restore
```

## 📞 Getting Help

### **When to Ask for Help**

- **Critical Issues**: Security breaches, data loss, system downtime
- **Complex Problems**: Issues not resolved by standard troubleshooting
- **Feature Requests**: New functionality or improvements
- **Documentation**: Unclear or missing documentation

### **Support Channels**

| Channel | Response Time | Best For |
|---------|----------------|----------|
| **GitHub Issues** | 24-48 hours | Bug reports, feature requests |
| **Community Slack** | Real-time | Quick questions, discussions |
| **Email Support** | 4-8 hours | Private issues, enterprise support |
| **Emergency Hotline** | Immediate | Critical production issues |

### **Creating Good Support Requests**

```markdown
## Issue Description
Clear description of the problem

## Environment
- OS: macOS 12.0
- Bun version: 1.3.6
- Node version: N/A (using Bun)
- Browser: Chrome 108.0

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected vs Actual
What should happen vs what actually happens

## Error Messages
Include full error messages and stack traces

## Troubleshooting Tried
What you've already tried to fix the issue

## Additional Context
Any other relevant information
```

### **Emergency Contacts**

🚨 **Production Emergency**: [emergency@sovereign-unit-01.com](mailto:emergency@sovereign-unit-01.com)  
🔒 **Security Issues**: [security@sovereign-unit-01.com](mailto:security@sovereign-unit-01.com)  
📞 **24/7 Hotline**: +1-555-SOVEREIGN (767-3748)

## 📚 Additional Resources

### **Documentation**
- **[Getting Started](Getting-Started)**: Basic setup and configuration
- **[API Documentation](API-Documentation)**: Complete API reference
- **[Configuration Guide](Configuration-Guide)**: Detailed configuration options
- **[Security Guide](Security-Guide)**: Security best practices

### **Tools & Utilities**
- **[Diagnostic Tools](https://github.com/sovereign-unit/diagnostics)**: Advanced diagnostic utilities
- **[Performance Monitor](https://monitor.sovereign-unit-01.com)**: Real-time performance monitoring
- **[Security Scanner](https://security.sovereign-unit-01.com)**: Automated security scanning

### **Community Resources**
- **[Community Forum](https://community.sovereign-unit-01.com)**: User discussions and solutions
- **[Knowledge Base](https://kb.sovereign-unit-01.com)**: Articles and tutorials
- **[Video Tutorials](https://tutorials.sovereign-unit-01.com)**: Step-by-step video guides

---

## 🎯 Quick Reference

### **Most Common Issues**

1. **Port in use**: `lsof -ti:3227 | xargs kill -9`
2. **Config errors**: `bun run config:validate`
3. **Slow performance**: `DUOPLUS_ENABLE_PERFORMANCE_MONITORING=true`
4. **Auth failures**: Check JWT secret and expiry
5. **Database issues**: `rm ./data/duoplus.db && bun run db:migrate`

### **Essential Commands**

```bash
# Health check
curl http://localhost:3227/api/health

# Validate config
bun run config:validate

# Run tests
bun run test

# Debug mode
DUOPLUS_DEBUG=true bun run dev

# View logs
bun run logs:recent
```

---

## 🆘 Still Stuck?

If you've tried everything and still need help:

🎯 **[Create an Issue](https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues/new)**  
💬 **[Join Slack](https://slack.sovereign-unit-01.com)**  
📞 **[Call Hotline](tel:+1-555-767-3748)**

---

**We're here to help you succeed!**

*© 2026 Sovereign Unit \[01\] - All Rights Reserved*
