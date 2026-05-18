# 🚀 Custom Domain Setup Guide - docs.apexodds.net

## Overview

This guide walks you through setting up the custom domain `docs.apexodds.net`
for your Crystal Clear Architecture documentation site on Cloudflare Pages.

## 📋 Prerequisites

1. **Cloudflare Account**: Active account with access to apexodds.net zone
2. **Wrangler CLI**: `bun add -g wrangler`
3. **Authentication**: `wrangler auth login`
4. **Domain**: apexodds.net registered and configured in Cloudflare

## 🔧 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
bun run domain:setup

# The script will:
# - Check authentication
# - Configure the custom domain
# - Provide DNS instructions
# - Test the setup
```

### Option 2: Manual Setup

Follow the step-by-step instructions below.

## 🛠️ Step-by-Step Setup

### Step 1: Update Configuration

The `wrangler.toml` is already configured with:

```toml
# Custom domain configuration
[[pages_build_config.custom_domain]]
domain = "docs.apexodds.net"
zone_name = "apexodds.net"
```

### Step 2: Add Custom Domain to Cloudflare Pages

1. **Via Dashboard**:

   - Go to:
     https://dash.cloudflare.com/5e5d2b2fa037e9924a50619c08f9f442/apexodds.net
   - Navigate to **Pages** → **crystal-clear-architecture**
   - Click **Custom domains** → **Add custom domain**
   - Enter: `docs.apexodds.net`
   - Click **Add domain**

2. **Via CLI**:
   ```bash
   wrangler pages deployment customize docs.apexodds.net
   ```

### Step 3: Configure DNS Records

In your Cloudflare dashboard, add this DNS record:

#### CNAME Record (Recommended)

```text
Name: docs
Type: CNAME
Target: crystal-clear-architecture.pages.dev
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

#### Alternative: A Record

If CNAME doesn't work for your setup:

```text
Name: docs
Type: A
Target: 192.0.2.1 (Cloudflare will update this automatically)
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

### Step 4: SSL Certificate

SSL certificates are **automatically provisioned** by Cloudflare:

- ✅ **Always-On SSL**: Enabled by default
- ✅ **Automatic HTTPS Rewrites**: Enabled
- ✅ **Certificate Transparency**: Enabled
- ✅ **HTTP/2**: Enabled
- ✅ **TLS 1.3**: Supported

### Step 5: Test the Setup

After DNS propagation (5-10 minutes):

```bash
# Test the custom domain
bun run domain:test

# Or manually:
curl -I https://docs.apexodds.net/api/health

# Expected response:
# HTTP/2 200
# content-type: application/json
# x-service-health: OK
# cf-ray: ...
```

## 🌐 Available URLs

After setup completion:

| Service          | URL                                          |
| ---------------- | -------------------------------------------- |
| **Main Site**    | https://docs.apexodds.net                    |
| **Health Check** | https://docs.apexodds.net/api/health         |
| **Analytics**    | https://docs.apexodds.net/api/analytics      |
| **Link Health**  | https://docs.apexodds.net/api/link-health    |
| **Pages Dev**    | https://crystal-clear-architecture.pages.dev |

## 📊 CDN & Performance

### Global CDN

- **285+ Data Centers**: Worldwide distribution
- **Edge Computing**: Functions run at the edge
- **Smart Routing**: Automatic traffic optimization

### Caching Strategy

```toml
# Static assets: 1 year
Cache-Control: public, max-age=31536000, immutable

# Documentation: 1 hour
Cache-Control: public, max-age=3600

# API endpoints: No cache
Cache-Control: no-cache
```

### Performance Benefits

- ⚡ **Cold Start**: <100ms (vs 2-5s on GitHub Pages)
- 🌍 **Global Latency**: 50-150ms (vs 200-800ms)
- 📦 **Compression**: Automatic gzip/brotli
- 🖼️ **Image Optimization**: WebP conversion
- 🚀 **HTTP/2**: Multiplexed connections

## 🔒 Security Features

### Automatic Security Headers

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Content Security Policy

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.githubusercontent.com; ...
```

### Rate Limiting

```toml
[rate_limiting]
burst = 100
period = 60
```

## 🧪 Testing & Monitoring

### Health Monitoring

```bash
# Check service health
bun run health:custom

# Monitor logs
bun run monitor
```

### Performance Testing

```bash
# Test from different locations
curl -H "CF-RAY: test" https://docs.apexodds.net/api/health

# Check Cloudflare data center
curl -s https://docs.apexodds.net/api/health | jq .cloudflare
```

## 🚨 Troubleshooting

### Common Issues

#### 1. DNS Propagation Delay

**Symptom**: Domain not resolving immediately **Solution**: Wait 5-10 minutes
for DNS propagation **Check**: `dig docs.apexodds.net`

#### 2. SSL Certificate Pending

**Symptom**: Certificate not issued yet **Solution**: Wait for Cloudflare to
provision SSL **Check**: Look for "Active Certificate" in Cloudflare dashboard

#### 3. Wrong DNS Record

**Symptom**: 404 or redirect errors **Solution**: Verify DNS record is proxied
(orange cloud) **Check**: Cloudflare DNS tab → Ensure proxy is enabled

#### 4. Authentication Issues

**Symptom**: Wrangler commands fail **Solution**: Re-authenticate with
Cloudflare

```bash
wrangler auth login
wrangler auth status
```

### Debug Commands

```bash
# Check DNS resolution
dig docs.apexodds.net

# Test SSL certificate
openssl s_client -connect docs.apexodds.net:443 -servername docs.apexodds.net

# Check HTTP headers
curl -I https://docs.apexodds.net/

# Test API endpoints
curl https://docs.apexodds.net/api/health

# Check Cloudflare status
curl -s https://docs.apexodds.net/api/health | jq .cloudflare
```

## 📈 Analytics & Monitoring

### Real-time Analytics

- Page views and user interactions
- Geographic distribution
- Performance metrics
- Error tracking

### Custom Analytics

```javascript
// Track page views
fetch(
  '/api/analytics?action=pageview&path=' +
    encodeURIComponent(window.location.pathname)
);

// Track custom events
fetch('/api/analytics?action=custom&event=documentation_view');
```

## 🔄 Migration Strategy

### From GitHub Pages

1. **Update Links**: Change all documentation links
2. **Update Bookmarks**: Update saved bookmarks
3. **SEO Redirects**: Set up redirects from old URLs
4. **Announce**: Notify users of new domain

### Gradual Migration

```bash
# Keep both domains active during transition
# - Old: crystal-clear-architecture.pages.dev
# - New: docs.apexodds.net

# After 30 days, redirect old domain to new
```

## 📞 Support & Resources

### Cloudflare Resources

- [Pages Documentation](https://developers.cloudflare.com/pages/)
- [Custom Domains](https://developers.cloudflare.com/pages/platform/custom-domains/)
- [SSL/TLS](https://developers.cloudflare.com/ssl/)

### Testing Tools

- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [HTTP/2 Test](https://tools.keycdn.com/http2-test)
- [CDN Performance](https://www.cdnperf.com/)

## 🎯 Next Steps

After custom domain setup:

1. **Set up CI/CD**: GitHub Actions for automated deployments
2. **Configure Monitoring**: Alerts and performance dashboards
3. **Add Analytics**: Enhanced tracking and reporting
4. **Performance Optimization**: Advanced caching strategies

---

**🎉 Your documentation is now available at: https://docs.apexodds.net**

_Enterprise-grade performance, security, and scalability with your custom
domain!_ 🚀
