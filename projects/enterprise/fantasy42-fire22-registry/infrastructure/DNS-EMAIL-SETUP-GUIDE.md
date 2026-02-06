# 🌐 DNS & Email Setup Guide for Fantasy42-Fire22

<div align="center">

**Complete DNS Configuration & Email Routing Setup**

[![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS-orange?style=for-the-badge)](https://cloudflare.com)
[![Email](https://img.shields.io/badge/Email-Routing-blue?style=for-the-badge)](https://cloudflare.com)

_Enterprise-grade DNS and email infrastructure setup_

</div>

---

## 📋 **Overview**

This guide provides complete DNS configuration for `apexodds.net` and email
routing setup for enterprise communication.

### **🏗️ Infrastructure Components**

- **6 CNAME Records** for subdomains (dev, staging, api, docs, registry,
  dashboard)
- **3 MX Records** for email routing
- **2 TXT Records** for email security (SPF, DMARC)
- **1 Wildcard CNAME** for dynamic subdomains
- **Email Routing Rules** for enterprise communication
- **Email Workers** for automated processing

---

## 🌐 **DNS Configuration**

### **Step 1: Access Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your `apexodds.net` domain
3. Navigate to **DNS** section

### **Step 2: Add CNAME Records**

Add these CNAME records in your DNS settings:

```dns
# Development Environment
CNAME dev.apexodds.net fantasy42-fire22-dev.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)

# Staging Environment
CNAME staging.apexodds.net fantasy42-fire22-staging.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)

# Production API
CNAME api.apexodds.net fantasy42-fire22-prod.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)

# Package Registry
CNAME registry.apexodds.net fantasy42-fire22-prod.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)

# GitHub Pages Documentation
CNAME docs.apexodds.net brendadeeznuts1111.github.io
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)

# Dashboard Interface
CNAME dashboard.apexodds.net fantasy42-fire22-prod.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)
```

### **Step 3: Add MX Records for Email**

```dns
# Email Routing MX Records
MX @ route1.mx.cloudflare.net Priority: 58
MX @ route2.mx.cloudflare.net Priority: 17
MX @ route3.mx.cloudflare.net Priority: 91
TTL: 300 (5 minutes)
```

### **Step 4: Add TXT Records for Email Security**

```dns
# SPF Record for Email Authentication
TXT @ "v=spf1 include:_spf.mx.cloudflare.net ~all"
TTL: 300 (5 minutes)

# DMARC Record for Email Security (Enhanced)
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@apexodds.net; ruf=mailto:forensic@apexodds.net; fo=1"
TTL: 300 (5 minutes)
- rua: Aggregate reports to security/compliance teams
- ruf: Forensic reports to dedicated forensics team
- fo=1: Generate forensic reports on failures

# DKIM Record for Email Signing (Google Workspace)
TXT google._domainkey "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
TTL: 300 (5 minutes)

# Microsoft Domain Verification
TXT @ "MS=ms12345678"
TTL: 300 (5 minutes)

# Google Search Console Verification
TXT @ "google-site-verification=your-verification-code"
TTL: 300 (5 minutes)
```

### **Step 5: Add Wildcard CNAME**

```dns
# Wildcard for dynamic subdomains
CNAME * fantasy42-fire22-prod.apexodds.workers.dev
TTL: 300 (5 minutes)
Proxied: ✅ (orange cloud)
```

---

## 📧 **Email Routing Configuration**

### **Step 1: Enable Email Routing**

1. In Cloudflare Dashboard, go to **Email** > **Email Routing**
2. Click **"Get Started"** to enable email routing
3. Verify your domain ownership

### **Step 2: Create Email Routing Rules**

Create these routing rules in order:

#### **Rule 1: Enterprise Team**

```text
Name: Enterprise Team
Matcher: enterprise@apexodds.net
Action: Forward to team@fire22.com, enterprise@fire22.com
Enabled: ✅
Priority: 10
```

#### **Rule 2: Security Team**

```text
Name: Security Team
Matcher: security@apexodds.net
Action: Forward to security@fire22.com, ciso@fire22.com
Enabled: ✅
Priority: 9
```

#### **Rule 3: Support Tickets**

```text
Name: Support Tickets
Matcher: support@apexodds.net
Action 1: Forward to support@fire22.com
Action 2: Send to Worker > support-ticket-worker
Enabled: ✅
Priority: 8
```

#### **Rule 4: DMARC Reports**

```text
Name: DMARC Reports
Matcher: dmarc@apexodds.net
Action: Forward to security@fire22.com, compliance@fire22.com
Enabled: ✅
Priority: 7
Description: Handles aggregate DMARC reports for policy compliance monitoring
```

#### **Rule 5: DMARC Forensic Reports**

```text
Name: DMARC Forensic Reports
Matcher: forensic@apexodds.net
Action 1: Forward to forensics@fire22.com, security@fire22.com
Action 2: Send to Worker > dmarc-forensic-worker
Enabled: ✅
Priority: 6
Description: Advanced security monitoring for forensic DMARC reports
```

#### **Rule 6: Wildcard Catch-All**

```text
Name: Wildcard Catch-All
Matcher: *@apexodds.net
Action 1: Forward to catchall@fire22.com
Action 2: Send to Worker > email-logging-worker
Enabled: ✅
Priority: 0 (lowest)
```

### **Step 3: Create Catch-All Rule**

```text
Matcher: Any address not handled by other rules
Action: Forward to catchall@fire22.com
Enabled: ✅
```

---

## 🔧 **Email Workers Setup**

### **Step 1: Deploy Support Ticket Worker**

```bash
# Deploy the support ticket worker
cd enterprise/packages/cloudflare
wrangler deploy src/email-support-worker.ts --name support-ticket-worker --env production
```

### **Step 2: Deploy Email Logging Worker**

```bash
# Deploy the email logging worker
wrangler deploy src/email-logging-worker.ts --name email-logging-worker --env production
```

### **Step 3: Configure Worker Routes**

In Cloudflare Dashboard > Workers:

- **support-ticket-worker**: Handles support@ emails
- **email-logging-worker**: Logs all wildcard emails

---

## 🚀 **Quick Setup Commands**

### **Generate DNS Commands**

```bash
# Get all DNS setup commands
bun run dns:setup
```

### **Verify DNS Setup**

```bash
# Comprehensive DNS verification
bun run dns:check

# Check specific aspects
bun run dns:check:dns    # DNS records only
bun run dns:check:http   # HTTP connectivity
bun run dns:check:ssl    # SSL certificates

# Legacy verification
bun run dns:verify
```

### **Email Routing Setup**

```bash
# Get email routing configuration
bun run dns:email
```

### **Complete Setup Guide**

```bash
# Get all setup information
bun run dns:all

# Enterprise Infrastructure Setup (Recommended)
bun run enterprise:setup    # Complete setup: auth + DNS + Cloudflare + verification
bun run enterprise:verify   # Verify all infrastructure is working

# Individual Components
bun run wrangler:auth       # Authenticate with Cloudflare
bun run dns:all            # DNS and email setup
bun run wrangler:setup     # Deploy Cloudflare workers
bun run dns:check          # Comprehensive verification
```

---

## 🔐 **Advanced DMARC Security Features**

### **DMARC Forensic Worker**

The `dmarc-forensic-worker` provides advanced security monitoring for email
authentication failures:

**Security Alert Levels:**

- **🚨 Critical**: Both DKIM and SPF failures (potential spoofing attempts)
- **⚠️ High**: DKIM/SPF failures with quarantine/reject policies
- **📊 Medium**: Policy violations requiring monitoring
- **ℹ️ Low**: Minor authentication issues

**Automated Response Capabilities:**

- Real-time security alerting to dedicated forensics team
- Automated incident response triggering
- Security database logging for compliance
- IP-based threat analysis and blocking

**Forensic Analysis Features:**

- XML report parsing and validation
- Threat pattern recognition
- Evidence collection and correlation
- Executive security reporting

**Integration Ready:**

- CRM integration for incident tracking
- SIEM integration for security monitoring
- Automated remediation workflows
- Compliance reporting dashboards

---

## 🔍 **Verification Steps**

### **DNS Verification**

```bash
# Check CNAME records
dig dev.apexodds.net CNAME
dig staging.apexodds.net CNAME
dig api.apexodds.net CNAME
dig docs.apexodds.net CNAME

# Check MX records
dig apexodds.net MX

# Check TXT records
dig apexodds.net TXT
dig _dmarc.apexodds.net TXT
```

### **Email Verification**

```bash
# Test email routing
echo "Test email" | mail -s "Test Subject" test@apexodds.net

# Check if email arrives at catchall@fire22.com
```

### **Worker Verification**

```bash
# Check worker health
curl https://api.apexodds.net/health

# Verify email workers are running
wrangler tail --format pretty
```

---

## 📊 **Domain Structure**

### **Subdomain Mapping**

```text
apexodds.net          # Main domain
├── dev.apexodds.net          # Development environment
├── staging.apexodds.net      # Staging environment
├── api.apexodds.net          # Production API
├── registry.apexodds.net     # Package registry
├── docs.apexodds.net         # GitHub Pages documentation
├── dashboard.apexodds.net    # Dashboard interface
└── *.apexodds.net           # Wildcard subdomains
```

### **Email Address Structure**

```text
apexodds.net emails:
├── enterprise@apexodds.net   # → team@fire22.com, enterprise@fire22.com
├── security@apexodds.net     # → security@fire22.com, ciso@fire22.com
├── support@apexodds.net      # → support@fire22.com + worker processing
└── *@apexodds.net           # → catchall@fire22.com + logging
```

---

## 🔒 **Security Configuration**

### **SSL/TLS Settings**

- **Mode**: Strict (always HTTPS)
- **Certificate**: Managed by Cloudflare
- **Minimum TLS**: 1.2
- **TLS 1.3**: Enabled
- **HSTS**: Enabled
- **Automatic HTTPS**: Enabled

### **Security Headers**

- **Content Security Policy**: Configured
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Camera, microphone, geolocation disabled

### **Rate Limiting**

- **Requests per minute**: 100
- **Burst size**: 50
- **Action**: Block excessive requests

---

## 📈 **Monitoring & Analytics**

### **DNS Monitoring**

- **DNS Propagation**: Monitor with `dig` commands
- **Certificate Status**: Check SSL certificate validity
- **Response Times**: Monitor DNS resolution times

### **Email Monitoring**

- **Delivery Rates**: Monitor email delivery success
- **Spam Scores**: Track email filtering effectiveness
- **Bounce Rates**: Monitor bounced email notifications

### **Worker Monitoring**

- **Request/Response Times**: Monitor API performance
- **Error Rates**: Track application errors
- **Resource Usage**: Monitor CPU and memory usage

---

## 🚨 **Troubleshooting**

### **DNS Issues**

```bash
# Clear DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Check propagation
dig apexodds.net NS
dig dev.apexodds.net CNAME
```

### **Email Issues**

```bash
# Check MX records
dig apexodds.net MX

# Test email routing
echo "Test" | mail -s "Test" test@apexodds.net

# Check Cloudflare email logs
# Go to: Dashboard > Email > Email Routing > Logs
```

### **Worker Issues**

```bash
# Check worker status
wrangler tail

# Test worker endpoints
curl https://api.apexodds.net/health

# Check worker logs in Cloudflare Dashboard
```

---

## 📞 **Support & Resources**

### **Cloudflare Resources**

- [DNS Documentation](https://developers.cloudflare.com/dns/)
- [Email Routing Guide](https://developers.cloudflare.com/email-routing/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)

### **Enterprise Support**

- **DNS Issues**: Check Cloudflare status page
- **Email Issues**: Review email routing logs
- **Worker Issues**: Check worker logs and metrics

### **Monitoring Tools**

- **Cloudflare Analytics**: Real-time DNS and security metrics
- **Email Analytics**: Delivery and engagement metrics
- **Worker Analytics**: Performance and error metrics

---

<div align="center">

**🌐 Fantasy42-Fire22 DNS & Email Setup Complete**

_Enterprise-grade DNS configuration and email routing infrastructure_

**✅ DNS Records:** 6 CNAME + 3 MX + 2 TXT + 1 Wildcard **✅ Email Rules:** 4
Routing Rules + Catch-All **✅ Workers:** Support Ticket + Email Logging **✅
Security:** SSL/TLS + Rate Limiting + Headers

**Ready for enterprise communication and global distribution!**

---

**🔐 CONFIDENTIAL - Enterprise Use Only**

_This configuration contains enterprise-sensitive DNS and email settings._

**📞 Contact:** enterprise@fire22.com | **🔐 Classification:** CONFIDENTIAL

</div>
