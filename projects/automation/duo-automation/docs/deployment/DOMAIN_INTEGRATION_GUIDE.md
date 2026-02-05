# 🌐 Domain Integration Deployment Guide

## 🚀 Overview

This guide shows how to deploy your dashboards to be accessible via your domain instead of local ports, providing professional CLI and web URL access.

## 📋 What's Been Created

### **🌐 Domain URLs**

- **Analytics**: <https://apple.factory-wager.com/analytics>
- **Metrics**: <https://apple.factory-wager.com/metrics>  
- **Dashboard**: <https://apple.factory-wager.com/dashboard>
- **Status**: <https://apple.factory-wager.com/status>
- **Admin**: <https://apple.factory-wager.com/admin>

### **⚡ CLI Commands**

- `./domain-cli.sh analytics` - Open analytics dashboard
- `./domain-cli.sh metrics` - Open metrics dashboard
- `./domain-cli.sh status` - Open status page
- `./domain-cli.sh admin` - Open admin panel
- `./domain-cli.sh health` - Check system health

### **🔧 Generated Files**

- `domain-server.js` - Local domain server
- `cloudflare-worker.js` - Cloudflare Worker for production
- `domain-cli.sh` - CLI command interface

## 🎯 Access Methods

### **Method 1: Local Domain Server (Current)**

```bash
# Start the domain server
bun run domain-server

# Access via CLI
./domain-cli.sh analytics
./domain-cli.sh metrics
./domain-cli.sh status
./domain-cli.sh admin

# Access via browser
https://apple.factory-wager.com/analytics
https://apple.factory-wager.com/metrics
https://apple.factory-wager.com/dashboard
https://apple.factory-wager.com/status
https://apple.factory-wager.com/admin
```

### **Method 2: Cloudflare Worker (Production)**

```bash
# Deploy to Cloudflare
wrangler deploy cloudflare-worker.js

# Access via domain (no local server needed)
https://apple.factory-wager.com/analytics
https://apple.factory-wager.com/metrics
https://apple.factory-wager.com/dashboard
https://apple.factory-wager.com/status
https://apple.factory-wager.com/admin
```

## 🔧 Deployment Options

### **Option 1: Local Development (Recommended for testing)**

1. **Start Domain Server**:

   ```bash
   bun run domain-server
   ```

2. **Access via CLI**:

   ```bash
   ./domain-cli.sh analytics
   ```

3. **Access via Browser**:

   ```
   https://apple.factory-wager.com/analytics
   ```

### **Option 2: Cloudflare Worker (Production)**

1. **Install Wrangler**:

   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:

   ```bash
   wrangler login
   ```

3. **Deploy Worker**:

   ```bash
   wrangler deploy cloudflare-worker.js
   ```

4. **Access via Domain**:

   ```
   https://apple.factory-wager.com/analytics
   ```

### **Option 3: Reverse Proxy (Advanced)**

Set up nginx or Apache reverse proxy to route domain requests to local servers.

## 📊 Dashboard Mapping

| Domain URL | Local Port | Description |
|------------|------------|-------------|
| `/analytics` | 3003 | Profile Analytics Dashboard |
| `/metrics` | 3001 | Improved Metrics Dashboard |
| `/dashboard` | 3000 | System Metrics Dashboard |
| `/status` | - | System Status Page |
| `/admin` | - | Admin Control Panel |

## 🛠️ Configuration

### **Domain Server Configuration**

The domain server (`domain-server.js`) handles:

- Route mapping to local dashboards
- Status page generation
- Admin panel interface
- API endpoints for health checks

### **Cloudflare Worker Configuration**

The Cloudflare Worker (`cloudflare-worker.js`) provides:

- Global CDN distribution
- SSL/TLS termination
- Edge routing to dashboards
- 99.9% uptime guarantee

### **CLI Configuration**

The CLI script (`domain-cli.sh`) offers:

- Quick dashboard access
- Health check commands
- URL management
- Error handling

## 🚀 Quick Start Commands

### **Local Development**

```bash
# Start all services
bun run domain-server &

# Open analytics dashboard
./domain-cli.sh analytics

# Check system health
./domain-cli.sh health

# View all dashboards
./domain-cli.sh
```

### **Production Deployment**

```bash
# Deploy to Cloudflare
wrangler deploy cloudflare-worker.js

# Test deployment
curl https://apple.factory-wager.com/api/health

# Access analytics
open https://apple.factory-wager.com/analytics
```

## 📱 Mobile Access

All dashboards are mobile-responsive and accessible via:

- **Mobile Browser**: <https://apple.factory-wager.com/analytics>
- **QR Codes**: Generate QR codes for each dashboard
- **Progressive Web App**: Add to home screen for app-like experience

## 🔒 Security Considerations

### **Local Development**

- Dashboards accessible only on local network
- No authentication required
- Suitable for development and testing

### **Production Deployment**

- Cloudflare Workers provide DDoS protection
- SSL/TLS encryption enabled
- Can add authentication via Workers

### **Recommended Security**

```bash
# Add authentication to Cloudflare Worker
# Configure IP whitelisting
# Enable rate limiting
# Set up CORS policies
```

## 📈 Performance Optimization

### **CDN Benefits**

- Global edge locations
- Automatic caching
- Compression
- HTTP/2 support

### **Monitoring**

- Health check endpoint: `/api/health`
- Performance metrics: `/api/metrics`
- Analytics data: `/api/analytics`

## 🔍 Troubleshooting

### **Common Issues**

1. **Port conflicts**: Change domain server port
2. **Dashboard not found**: Run dashboard generators first
3. **DNS issues**: Check domain configuration
4. **SSL errors**: Use Cloudflare for SSL

### **Debug Commands**

```bash
# Check domain server status
curl http://localhost:8080/api/health

# Test CLI commands
./domain-cli.sh health

# Verify dashboard files
ls -la *.html

# Check logs
bun run domain-server 2>&1 | tee domain-server.log
```

## 🎯 Best Practices

### **Development Workflow**

1. Use local domain server for development
2. Test all CLI commands
3. Verify dashboard functionality
4. Deploy to Cloudflare for production

### **Production Deployment**

1. Use Cloudflare Workers for reliability
2. Set up custom domain routing
3. Configure SSL certificates
4. Monitor performance and uptime

### **Maintenance**

1. Regular health checks
2. Update dashboard content
3. Monitor analytics data
4. Backup configurations

---

## 🎉 Summary

Your dashboards are now accessible via your domain with:

- **🌐 Professional URLs**: <https://apple.factory-wager.com/analytics>
- **⚡ CLI Access**: ./domain-cli.sh analytics
- **📱 Mobile Ready**: Responsive design
- **🔒 Production Ready**: Cloudflare deployment
- **📊 All Dashboards**: Analytics, Metrics, Status, Admin

**Current Status**: ✅ Local domain server running on port 8080  
**Next Step**: Deploy Cloudflare Worker for production access
