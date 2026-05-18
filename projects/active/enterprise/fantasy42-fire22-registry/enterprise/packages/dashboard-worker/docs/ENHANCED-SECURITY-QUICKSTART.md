# 🚀 Enhanced Security Quick Start Guide

Get up and running with Fire22 Enhanced Security in 5 minutes!

## ⚡ Quick Start Commands

```bash
# 1. Setup enhanced security (interactive wizard)
bun run enhanced:setup

# 2. Verify configuration
bun run enhanced:audit

# 3. Run security scan
bun run enhanced:scan

# 4. Deploy with security
bun run deploy:secure
```

## 🔐 Step-by-Step Setup

### Step 1: Enhanced Security Setup

Run the interactive setup wizard:

```bash
bun run enhanced:setup
```

The wizard will guide you through:

- 🤖 **Telegram Bot Security**: Configure bot tokens securely
- 🔑 **Dashboard Authentication**: Set up admin credentials
- 🛡️ **API Security**: Configure Fire22 API tokens
- 🗄️ **Database Security**: Secure database connections
- 🔗 **External Services**: Stripe, SendGrid, Cloudflare
- 📊 **Security Monitoring**: Webhooks and audit endpoints

### Step 2: Verify Configuration

Check your security configuration:

```bash
# Full security audit
bun run enhanced:audit

# Generate configuration report
bun run enhanced:report
```

### Step 3: Test Security Scanner

Run the enhanced security scanner:

```bash
# Basic security scan
bun run enhanced:scan

# Integration with existing Fire22 security
bun run enhanced:scan integrate
```

### Step 4: Deploy with Security

Deploy your dashboard with enhanced security:

```bash
# Deploy to staging (default)
bun run deploy:secure

# Deploy to production
bun run deploy:secure:production

# Deploy with custom parameters
bun run deploy:secure:production 2.0.0 secure-rolling strict
```

## 🎯 Common Use Cases

### New Project Setup

```bash
# 1. Initial security configuration
bun run enhanced:setup

# 2. Verify setup
bun run enhanced:audit

# 3. First deployment
bun run deploy:secure:staging
```

### Existing Project Migration

```bash
# 1. Migrate existing credentials
bun run enhanced:migrate

# 2. Verify migration
bun run enhanced:audit

# 3. Test enhanced deployment
bun run deploy:secure:staging
```

### Production Deployment

```bash
# 1. Security audit
bun run enhanced:audit

# 2. Security scan
bun run enhanced:scan

# 3. Deploy with strict security
bun run deploy:secure:production 2.0.0 secure-rolling strict
```

### Daily Security Operations

```bash
# Morning security check
bun run enhanced:scan

# Before deployment
bun run enhanced:audit

# Deploy with security
bun run deploy:secure

# Post-deployment validation
bun run enhanced:report
```

## 🔧 Configuration Examples

### Basic Telegram Bot Security

```bash
bun run enhanced:setup
# Select: Telegram Bot Security = Yes
# Enter: BOT_TOKEN, CASHIER_BOT_TOKEN
```

### Full Security Configuration

```bash
bun run enhanced:setup
# Select: All security features = Yes
# Configure all credentials interactively
```

### Custom Security Level

```bash
# Deploy with standard security
bun run deploy:secure:staging --security-level=standard

# Deploy with strict security
bun run deploy:secure:production --security-level=strict
```

## 📊 Security Monitoring

### Check Security Status

```bash
# Current security configuration
bun run enhanced:report

# Security audit results
bun run enhanced:audit

# Security scan results
bun run enhanced:scan
```

### Security Metrics

The enhanced security system provides:

- **Security Score**: 0-100 rating
- **Credential Coverage**: Percentage of configured credentials
- **Policy Compliance**: Fire22 security policy adherence
- **Vulnerability Status**: Package vulnerability summary
- **Recommendations**: Actionable security improvements

## 🚨 Troubleshooting

### Quick Fixes

```bash
# Credential issues
bun run enhanced:audit

# Security scan problems
bun run enhanced:scan help

# Configuration problems
bun run enhanced:report
```

### Common Issues

| Issue                     | Solution                                  |
| ------------------------- | ----------------------------------------- |
| Bun.secrets not available | Update Bun to 1.2.20+                     |
| Credential access denied  | Check OS credential manager               |
| Security scan failed      | Review package.json for policy violations |
| Deployment blocked        | Fix security issues first                 |

### Debug Mode

```bash
# Enable debug logging
DEBUG=1 bun run enhanced:scan

# Use Bun debug flag
bun --debug run enhanced:scan
```

## 🔄 Migration Guide

### From Environment Variables

```bash
# 1. Backup current .env file
cp .env .env.backup

# 2. Migrate to enhanced storage
bun run enhanced:migrate

# 3. Verify migration
bun run enhanced:audit

# 4. Remove sensitive data from .env
# (Keep non-sensitive variables)
```

### From Existing Credential Manager

```bash
# 1. Check existing credentials
bun run enhanced:audit

# 2. Migrate to enhanced storage
bun run enhanced:migrate

# 3. Verify all credentials accessible
bun run enhanced:report
```

## 📚 Next Steps

### Learn More

- [Full Documentation](./ENHANCED-SECURITY-INTEGRATION.md)
- [Security Best Practices](./SECURITY-DOCUMENTATION.md)
- [API Reference](./SECURITY-INTEGRATION-GUIDE.md)

### Advanced Features

- Custom security policies
- Environment-specific security levels
- Security check customization
- Integration with CI/CD pipelines

### Support

- Run `bun run enhanced:help` for command help
- Check security audit results
- Review security documentation
- Contact Fire22 security team

## 🎉 Success Checklist

- ✅ Enhanced security setup completed
- ✅ Credentials configured and validated
- ✅ Security scan passed
- ✅ First secure deployment successful
- ✅ Security monitoring active
- ✅ Team trained on new security features

---

**Need Help?** Run `bun run enhanced:help` or check the full documentation!
