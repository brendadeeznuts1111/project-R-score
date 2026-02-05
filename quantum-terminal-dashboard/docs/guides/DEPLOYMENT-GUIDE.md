# 🚀 Deployment Guide - Quantum Terminal Dashboard

Complete deployment guide with health checks, cookie state verification, and production best practices.

## Pre-Deployment Checklist

### 1. Environment Variables

```bash
# Required
export QUANTUM_SECRET=$(openssl rand -hex 32)
export NODE_ENV=production
export API_BASE=https://api.example.com

# Optional
export DEBUG=0
export LOG_LEVEL=info
```

### 2. Configuration Verification

```bash
# Verify bun.yaml
bun -e "
  const cfg = await Bun.yaml('bun.yaml');
  console.log('API Base:', cfg.api.base);
  console.log('Cookie Name:', cfg.api.cookie.name);
  console.log('Encryption:', cfg.security.encryption);
"
```

### 3. Migration Verification

```bash
# Ensure no hardcoded localhost
git diff --name-only | xargs grep -E 'localhost|127\.0\.0\.1' || \
  echo "✅ No hardcoded localhost found"
```

### 4. Health Check

```bash
# Test API connectivity
bun -e "
  import { healthCheck } from './src/deploy-helpers.js';
  const health = await healthCheck();
  console.log(health.healthy ? '✅ API Healthy' : '❌ API Down');
  process.exit(health.healthy ? 0 : 1);
"
```

## Deployment Steps

### Step 1: Build & Test

```bash
# Install dependencies
bun install

# Run tests
bun examples/tests/test-state-vault.js
bun examples/tests/test-advanced-patterns.js

# Build (if applicable)
bun build src/index.js --outdir dist
```

### Step 2: Verify Configuration

```bash
# Check all required env vars
required_vars=(QUANTUM_SECRET NODE_ENV API_BASE)
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  fi
done
echo "✅ All required env vars set"
```

### Step 3: Start Server

```bash
# Development
LOCAL=1 bun run src/server.js

# Production
NODE_ENV=production bun run src/server.js
```

### Step 4: Verify Deployment

```bash
# Health check
curl -X GET https://api.example.com/health \
  -H "X-Quantum-Id: test-123" \
  -v

# Test with cookies
curl -X GET https://api.example.com/v1/matrix \
  -H "Cookie: __quantum=..." \
  -v
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy files
COPY bun.yaml .
COPY package.json .
COPY src/ src/
COPY examples/ examples/

# Install dependencies
RUN bun install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "import('./src/deploy-helpers.js').then(m => m.healthCheck()).then(h => process.exit(h.healthy ? 0 : 1))"

# Run
CMD ["bun", "run", "src/server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  quantum-dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      QUANTUM_SECRET: ${QUANTUM_SECRET}
      API_BASE: https://api.example.com
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
```

## Kubernetes Deployment

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quantum-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quantum-dashboard
  template:
    metadata:
      labels:
        app: quantum-dashboard
    spec:
      containers:
      - name: quantum-dashboard
        image: quantum-dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: QUANTUM_SECRET
          valueFrom:
            secretKeyRef:
              name: quantum-secrets
              key: encryption-key
        - name: API_BASE
          value: "https://api.example.com"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Monitoring & Logging

### Structured Logging

```javascript
// src/logger.js
export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}
```

### Metrics Collection

```javascript
// src/metrics.js
export const metrics = {
  requests: 0,
  errors: 0,
  avgResponseTime: 0,
  
  recordRequest(duration) {
    this.requests++;
    this.avgResponseTime = 
      (this.avgResponseTime + duration) / 2;
  },
  
  recordError() {
    this.errors++;
  },
};
```

## Rollback Procedure

```bash
# If deployment fails
git revert HEAD
git push origin main

# Restart with previous version
docker pull quantum-dashboard:previous
docker run -d quantum-dashboard:previous
```

## Security Checklist

- ✅ QUANTUM_SECRET set and secure
- ✅ HTTPS enabled
- ✅ CORS configured
- ✅ CSP headers set
- ✅ Health checks passing
- ✅ No hardcoded secrets
- ✅ No localhost references
- ✅ Cookies secure (HttpOnly, Secure, SameSite)
- ✅ Rate limiting enabled
- ✅ Monitoring configured

## Troubleshooting

### Issue: API unreachable
```bash
# Check network connectivity
curl -v https://api.example.com/health

# Check DNS
nslookup api.example.com

# Check firewall
telnet api.example.com 443
```

### Issue: Cookie not working
```bash
# Verify QUANTUM_SECRET
echo $QUANTUM_SECRET | wc -c  # Should be 65 (64 hex + newline)

# Check cookie flags
curl -v https://api.example.com/v1/matrix | grep -i set-cookie
```

### Issue: High latency
```bash
# Enable HTTP/2 in bun.yaml
api:
  http2: true
  tlsSessionTimeout: 7200

# Check TLS session resumption
openssl s_client -connect api.example.com:443 -sess_out session.pem
openssl s_client -connect api.example.com:443 -sess_in session.pem
```

## Performance Optimization

- Enable HTTP/2 (40% handshake reduction)
- Enable TLS session resumption (30% connection time)
- Enable cookie compression (60% bandwidth)
- Use CDN for static assets
- Implement caching headers
- Monitor and optimize slow endpoints

## Next Steps

1. Review security checklist
2. Configure monitoring
3. Set up alerting
4. Plan rollback procedure
5. Document runbooks
6. Train team on deployment

