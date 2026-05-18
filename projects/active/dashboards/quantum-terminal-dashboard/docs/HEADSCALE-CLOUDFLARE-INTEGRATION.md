# Headscale + Cloudflare Workers + Tailscale Integration

**Date**: January 19, 2026  
**Status**: ✅ **Production Ready**

---

## 🎯 Architecture Overview

```text
Tailscale Clients
    ↓
Cloudflare Worker (Rate Limiting, Auth, DDoS)
    ↓
Headscale Server (100.64.0.10:8080)
    ↓
SQLite Database
```

---

## 📦 Components

### 1. **Cloudflare Worker** (`workers/headscale-proxy.ts`)
- Rate limiting per IP (100 req/min)
- API authentication (Bearer token)
- WebSocket proxy for DERP
- Security headers (HSTS, X-Frame-Options)
- Durable Objects for state management

### 2. **Headscale Configuration** (`headscale/config.yaml`)
- SQLite database backend
- DERP server (region 999)
- OIDC integration with Cloudflare Access
- JSON logging for observability
- Tailscale IP range: 100.64.0.0/10

### 3. **Access Control** (`headscale/policy.yaml`)
- Tag-based ACLs
- SSH access for operators
- Monitoring access (Prometheus)
- API access restrictions

### 4. **Docker Compose** (`docker-compose.headscale.yml`)
- Headscale service (100.64.0.10)
- Headplane UI (100.64.0.11)
- Prometheus metrics (100.64.0.12)
- Health checks on all services

### 5. **Operator CLI** (`scripts/opr`)
- Deploy to Cloudflare
- Register nodes
- Health checks
- Service management

---

## 🚀 Quick Start

### 1. Deploy Headscale

```bash
# Start services
docker-compose -f docker-compose.headscale.yml up -d

# Create admin user
docker-compose -f docker-compose.headscale.yml exec headscale \
  headscale users create admin

# Generate auth key
docker-compose -f docker-compose.headscale.yml exec headscale \
  headscale preauthkeys create --reusable --user admin --expiration 24h
```

### 2. Deploy Cloudflare Worker

```bash
# Set secrets
wrangler secret put HEADSCALE_API_KEY --env production
wrangler secret put HEADSCALE_URL --env production

# Deploy
wrangler deploy --env production
```

### 3. Register Tailscale Client

```bash
# Get auth key
opr node:register

# Register client
tailscale up --login-server=https://api.example.com --authkey=tskey-auth-xxxx
```

### 4. Verify Setup

```bash
# Full health check
opr health:full

# Check DERP status
opr derp:status

# View logs
opr logs
```

---

## 🔒 Security Features

✅ **Cloudflare Zero Trust** - Requires Cloudflare Access authentication  
✅ **Rate Limiting** - 100 req/min per IP, burst of 20  
✅ **API Authentication** - Bearer token required for /api/* routes  
✅ **TLS/HTTPS** - Enforced via Cloudflare  
✅ **DDoS Protection** - Cloudflare DDoS mitigation  
✅ **Null-byte Injection** - Prevented in all inputs  
✅ **HSTS** - 1-year max-age with subdomains  

---

## 📊 Observability

### Metrics Available
- Total nodes
- Active nodes
- API request latency
- Error rate
- Rate limit events
- Authentication events

### Access Metrics
```bash
# Prometheus endpoint
http://100.64.0.12:9090

# Headscale metrics
http://100.64.0.10:9090/metrics

# Cloudflare Analytics
Dashboard → Analytics Engine
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Headscale
HEADSCALE_API_KEY=tskey-api-xxxx
HEADSCALE_URL=http://100.64.0.10:8080

# Cloudflare Access
CF_ACCESS_CLIENT_ID=xxxx
CF_ACCESS_CLIENT_SECRET=xxxx

# Headplane UI
COOKIE_SECRET=xxxx
```

### Rate Limiting

Edit `workers/headscale-proxy.ts`:
```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,      // Requests per window
  windowMs: 60000,       // Window in milliseconds
  burst: 20,             // Burst allowance
};
```

---

## 📝 Operator Commands

```bash
# Deploy
opr cf:deploy

# Health check
opr health:full

# Register node
opr node:register

# View logs
opr logs

# Start/stop services
opr start
opr stop

# Check DERP
opr derp:status

# Test WebSocket
opr ws:test
```

---

## 🎯 Use Cases

### 1. **Secure Remote Access**
- Tailscale clients connect via Cloudflare
- Zero Trust authentication
- Encrypted WireGuard tunnels

### 2. **Team Collaboration**
- Shared Tailscale network
- Tag-based access control
- SSH access for operators

### 3. **Monitoring & Observability**
- Prometheus metrics
- Cloudflare Analytics
- Structured JSON logging

### 4. **Cost Optimization**
- Headscale: Open source (free)
- Cloudflare: Free tier available
- Tailscale: Free for personal use

---

## 🐛 Troubleshooting

### WebSocket Connection Failed
```bash
# Check DERP server
opr derp:status

# Test WebSocket
opr ws:test

# Check Cloudflare Worker logs
wrangler tail --env production
```

### Rate Limiting Issues
```bash
# Check rate limit config
grep RATE_LIMIT workers/headscale-proxy.ts

# Increase limits if needed
# Edit RATE_LIMIT_CONFIG in headscale-proxy.ts
```

### Node Registration Failed
```bash
# Generate new auth key
opr node:register

# Check Headscale logs
opr logs

# Verify API key
echo $HEADSCALE_API_KEY
```

---

## 📚 References

- [Headscale Documentation](https://headscale.net/)
- [Tailscale Documentation](https://tailscale.com/kb/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)

---

**🎉 Headscale + Cloudflare + Tailscale integration is production-ready!**

