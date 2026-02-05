# Deployment Issues

This document provides comprehensive troubleshooting for deployment-related issues in the RSS Feed Optimization project.

## Overview

Deployment issues can occur during various stages of the deployment process, from build failures to runtime problems in production. This guide covers identification, diagnosis, and resolution of common deployment problems.

## Build and Compilation Issues

### Build Failures

**Problem**: Application fails to build or compile
**Symptoms:**
- Build process fails
- Compilation errors
- Missing dependencies
- TypeScript errors

**Diagnosis:**
```bash
# Check build process
bun run build

# Check for TypeScript errors
bun run typecheck

# Check dependencies
bun install

# Check build configuration
bun run build:config
```

**Solutions:**
```bash
# Clean build cache
bun pm cache clean
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
bun install

# Fix TypeScript errors
bun run typecheck --fix

# Check build configuration
cat bunfig.toml
cat tsconfig.json

# Build with verbose output
bun run build --verbose
```

### Dependency Issues

**Problem**: Missing or incompatible dependencies
**Symptoms:**
- Module not found errors
- Version conflicts
- Peer dependency warnings
- Import errors

**Diagnosis:**
```bash
# Check installed dependencies
bun list

# Check for missing dependencies
bun install --dry-run

# Check for outdated dependencies
bun update --dry-run

# Check dependency tree
bun list --depth=0
```

**Solutions:**
```bash
# Update dependencies
bun update

# Install missing dependencies
bun install

# Fix peer dependency issues
bun install --force

# Check for conflicting versions
bun list --pattern="package-name"

# Use specific versions
bun add package-name@1.2.3
```

### Environment-Specific Build Issues

**Problem**: Build works locally but fails in deployment environment
**Symptoms:**
- Different behavior between environments
- Missing environment-specific dependencies
- Platform-specific issues

**Diagnosis:**
```bash
# Check environment differences
diff <(env | sort) <(ssh user@server 'env | sort')

# Test build in clean environment
docker run --rm -v $(pwd):/app -w /app node:18-alpine bun install && bun run build

# Check platform-specific dependencies
bun list --platform=linux
bun list --platform=darwin
```

**Solutions:**
```bash
# Use environment-specific configurations
# bunfig.production.toml
[env]
NODE_ENV = "production"

# Use platform-specific dependencies
[dependencies]
"package-name" = { version = "1.0.0", platform = ["linux", "darwin"] }

# Clean build for production
bun run build:production

# Use Docker for consistent builds
docker build -t rss-feed-optimization .
```

## Container Deployment Issues

### Docker Build Failures

**Problem**: Docker image fails to build
**Symptoms:**
- Docker build errors
- Missing files in container
- Incorrect base image
- Build context issues

**Diagnosis:**
```bash
# Check Docker build
docker build -t rss-feed-optimization .

# Check Dockerfile syntax
docker build --dry-run .

# Check build context
ls -la
docker build --no-cache -t rss-feed-optimization .

# Check Docker daemon
docker info
```

**Solutions:**
```dockerfile
# Optimized Dockerfile for Bun.js
FROM oven/bun:1.3.7

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["bun", "run", "start"]
```

### Container Runtime Issues

**Problem**: Container builds successfully but fails to run
**Symptoms:**
- Container crashes on startup
- Port binding issues
- Environment variable issues
- File permission problems

**Diagnosis:**
```bash
# Check container logs
docker logs container-name

# Check container status
docker ps -a

# Check container environment
docker exec container-name env

# Check file permissions
docker exec container-name ls -la /app

# Test container interactively
docker run -it rss-feed-optimization /bin/sh
```

**Solutions:**
```bash
# Fix port binding
docker run -p 3000:3000 rss-feed-optimization

# Set environment variables
docker run -e NODE_ENV=production -e BLOG_TITLE="My Blog" rss-feed-optimization

# Fix file permissions
docker run -u node rss-feed-optimization

# Use volume mounts for persistent data
docker run -v /host/data:/app/data rss-feed-optimization

# Check container health
docker run --health-cmd="curl -f http://localhost:3000/api/v1/health || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  rss-feed-optimization
```

### Docker Compose Issues

**Problem**: Docker Compose setup fails
**Symptoms:**
- Service dependencies not working
- Network configuration issues
- Volume mounting problems
- Environment variable propagation

**Diagnosis:**
```bash
# Check Docker Compose configuration
docker-compose config

# Check service status
docker-compose ps

# Check service logs
docker-compose logs

# Check network configuration
docker network ls
docker network inspect rss-feed-optimization_default
```

**Solutions:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BLOG_TITLE=My Blog
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME}
      - ADMIN_TOKEN=${ADMIN_TOKEN}
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

## Cloud Platform Deployment Issues

### Railway Deployment Issues

**Problem**: Deployment to Railway fails
**Symptoms:**
- Build failures on Railway
- Environment variable issues
- Database connection problems
- Scaling issues

**Diagnosis:**
```bash
# Check Railway logs
railway logs

# Check Railway environment
railway env

# Check Railway status
railway status

# Check Railway build
railway build
```

**Solutions:**
```bash
# Set environment variables on Railway
railway add
# Follow prompts to add environment variables

# Check Railway configuration
railway config

# Redeploy
railway deploy

# Scale application
railway scale web=2
```

### Vercel Deployment Issues

**Problem**: Deployment to Vercel fails
**Symptoms:**
- Build configuration issues
- Function timeout errors
- Environment variable problems
- Domain configuration issues

**Diagnosis:**
```bash
# Check Vercel logs
vercel logs

# Check Vercel environment
vercel env ls

# Check Vercel build
vercel build

# Check Vercel status
vercel status
```

**Solutions:**
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

```bash
# Set environment variables on Vercel
vercel env add BLOG_TITLE production
vercel env add R2_ACCOUNT_ID production
vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_BUCKET_NAME production
vercel env add ADMIN_TOKEN production

# Deploy to Vercel
vercel deploy

# Set production domain
vercel alias set your-project.vercel.app your-domain.com
```

### Render Deployment Issues

**Problem**: Deployment to Render fails
**Symptoms:**
- Build script issues
- Environment variable problems
- Database connection failures
- SSL certificate issues

**Diagnosis:**
```bash
# Check Render logs
# Use Render dashboard or API

# Check Render environment
# Use Render dashboard

# Check Render build
# Use Render dashboard
```

**Solutions:**
```yaml
# render.yaml
services:
  - type: web
    name: rss-feed-optimization
    env: bun
    buildCommand: bun install && bun run build
    startCommand: bun run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: BLOG_TITLE
        fromDatabase: true
      - key: R2_ACCOUNT_ID
        fromDatabase: true
      - key: R2_ACCESS_KEY_ID
        fromDatabase: true
      - key: R2_SECRET_ACCESS_KEY
        fromDatabase: true
      - key: R2_BUCKET_NAME
        fromDatabase: true
      - key: ADMIN_TOKEN
        fromDatabase: true
    healthCheckPath: /api/v1/health
    healthCheckTimeout: 30
    plan: free
```

### AWS Deployment Issues

**Problem**: Deployment to AWS services fails
**Symptoms:**
- Lambda function issues
- API Gateway configuration problems
- S3 deployment failures
- RDS connection issues

**Diagnosis:**
```bash
# Check AWS Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/
aws logs filter-log-events --log-group-name /aws/lambda/function-name

# Check AWS API Gateway
aws apigateway get-rest-api --rest-api-id api-id

# Check AWS S3
aws s3 ls s3://bucket-name

# Check AWS RDS
aws rds describe-db-instances --db-instance-identifier db-name
```

**Solutions:**
```yaml
# serverless.yml
service: rss-feed-optimization

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    BLOG_TITLE: ${env:BLOG_TITLE}
    R2_ACCOUNT_ID: ${env:R2_ACCOUNT_ID}
    R2_ACCESS_KEY_ID: ${env:R2_ACCESS_KEY_ID}
    R2_SECRET_ACCESS_KEY: ${env:R2_SECRET_ACCESS_KEY}
    R2_BUCKET_NAME: ${env:R2_BUCKET_NAME}
    ADMIN_TOKEN: ${env:ADMIN_TOKEN}

functions:
  app:
    handler: server.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
      - http:
          path: /
          method: ANY
          cors: true

plugins:
  - serverless-bundle
```

## Platform-Specific Issues

### Railway Platform Issues

**Problem**: Railway-specific deployment problems
**Common Issues:**
- Database connection pooling
- File system permissions
- Environment variable propagation
- Build cache issues

**Solutions:**
```bash
# Clear Railway build cache
railway build --no-cache

# Check Railway database connection
railway db:info

# Set Railway environment variables
railway variables set KEY=value

# Check Railway logs in real-time
railway logs --tail
```

### Vercel Platform Issues

**Problem**: Vercel-specific deployment problems
**Common Issues:**
- Function timeout limits
- Cold start issues
- File system limitations
- Domain verification

**Solutions:**
```json
// vercel.json with optimized settings
{
  "version": 2,
  "functions": {
    "server.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate=120"
        }
      ]
    }
  ]
}
```

### Render Platform Issues

**Problem**: Render-specific deployment problems
**Common Issues:**
- Build timeout limits
- Environment variable encryption
- Database connection pooling
- SSL certificate management

**Solutions:**
```yaml
# render.yaml with optimized settings
services:
  - type: web
    name: rss-feed-optimization
    env: bun
    buildCommand: bun install && bun run build
    startCommand: bun run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: BLOG_TITLE
        sync: false  # Don't sync from database
      - key: R2_ACCOUNT_ID
        sync: false
    healthCheckPath: /api/v1/health
    healthCheckTimeout: 30
    plan: standard
    numInstances: 2
```

### Docker Platform Issues

**Problem**: Docker-specific deployment problems
**Common Issues:**
- Image size optimization
- Multi-stage builds
- Security vulnerabilities
- Resource limits

**Solutions:**
```dockerfile
# Multi-stage Dockerfile for optimization
FROM oven/bun:1.3.7 as builder

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1.3.7

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock* ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
CMD ["bun", "run", "start"]
```

## Production Deployment Issues

### Environment Variable Issues

**Problem**: Environment variables not working in production
**Symptoms:**
- Missing configuration values
- Incorrect values being used
- Variables not being loaded

**Diagnosis:**
```bash
# Check production environment
ssh user@server 'env | grep -E "(BLOG|R2|ADMIN)"'

# Check application environment
ssh user@server 'bun -e "console.log(process.env.BLOG_TITLE)"'

# Check .env file
ssh user@server 'cat /path/to/.env'
```

**Solutions:**
```bash
# Set environment variables in systemd service
sudo systemctl edit rss-feed-optimization
# Add:
[Service]
Environment="BLOG_TITLE=My Blog"
Environment="R2_ACCOUNT_ID=your-account-id"

# Set environment variables in Docker
docker run -e BLOG_TITLE="My Blog" -e R2_ACCOUNT_ID="your-account-id" rss-feed-optimization

# Set environment variables in Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=BLOG_TITLE="My Blog" \
  --from-literal=R2_ACCOUNT_ID="your-account-id"
```

### Database and Storage Issues

**Problem**: Database or storage connection issues in production
**Symptoms:**
- Connection timeouts
- Authentication failures
- Network connectivity issues
- Performance problems

**Diagnosis:**
```bash
# Test R2 connection
bun run test:r2

# Check network connectivity
ping feeds.feedburner.com
curl -I https://your-account.r2.cloudflarestorage.com

# Check connection pool status
curl http://localhost:3000/api/v1/admin/stats | jq '.data.stats.r2'
```

**Solutions:**
```javascript
// Production R2 configuration
const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
};

// Connection pooling
const connectionPool = {
  maxConnections: 100,
  idleTimeout: 300000, // 5 minutes
  connectionTimeout: 10000 // 10 seconds
};
```

### Performance Issues in Production

**Problem**: Performance problems in production environment
**Symptoms:**
- Slow response times
- High resource usage
- Memory leaks
- High error rates

**Diagnosis:**
```bash
# Monitor production performance
curl http://localhost:3000/api/v1/metrics

# Check resource usage
top
htop
free -h

# Check application logs
tail -f /var/log/app.log

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/posts
```

**Solutions:**
```javascript
// Production performance optimization
const productionConfig = {
  cache: {
    maxSize: 2000,
    ttl: 1800, // 30 minutes
    evictionPolicy: 'LRU'
  },
  dns: {
    prefetchEnabled: true,
    cacheSize: 500,
    prefetchHosts: [
      'feeds.feedburner.com',
      'medium.com',
      'dev.to',
      'github.com'
    ]
  },
  monitoring: {
    enabled: true,
    interval: 60000, // 1 minute
    alertThresholds: {
      responseTime: 500, // 500ms
      memoryUsage: 80,   // 80%
      errorRate: 0.01,   // 1%
      cpuUsage: 80       // 80%
    }
  }
};
```

### Security Issues in Production

**Problem**: Security vulnerabilities or misconfigurations in production
**Symptoms:**
- Unauthorized access attempts
- Security scan failures
- SSL/TLS issues
- CORS problems

**Diagnosis:**
```bash
# Check SSL/TLS configuration
openssl s_client -connect your-domain.com:443

# Check security headers
curl -I https://your-domain.com

# Run security scan
npm audit
bun audit

# Check CORS configuration
curl -I -H "Origin: https://malicious-site.com" https://your-domain.com
```

**Solutions:**
```javascript
// Production security configuration
const securityConfig = {
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  rateLimiting: {
    enabled: true,
    windowMs: 600000, // 10 minutes
    maxRequests: 1000
  },
  cors: {
    origin: ['https://your-domain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
```

## Deployment Automation

### CI/CD Pipeline Issues

**Problem**: CI/CD pipeline failures
**Symptoms:**
- Build failures in pipeline
- Test failures
- Deployment failures
- Environment configuration issues

**Diagnosis:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun test
      
      - name: Run lint
        run: bun lint
      
      - name: Build application
        run: bun run build
      
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

**Solutions:**
```yaml
# Enhanced CI/CD pipeline
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_ENV: production

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun test
      
      - name: Run lint
        run: bun lint
      
      - name: Type check
        run: bun typecheck
  
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Build application
        run: bun run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
      
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

### Deployment Scripts

**Problem**: Manual deployment script failures
**Symptoms:**
- Script errors
- Missing dependencies
- Permission issues
- Environment setup problems

**Solutions:**
```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Check prerequisites
if ! command -v bun &> /dev/null; then
    echo "❌ Bun.js is not installed"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
else
    echo "❌ Production environment file not found"
    exit 1
fi

# Update code
echo "📦 Updating code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Run tests
echo "🧪 Running tests..."
bun test

# Build application
echo "🔨 Building application..."
bun run build

# Backup current version
echo "💾 Creating backup..."
sudo systemctl stop rss-feed-optimization
sudo cp -r /opt/rss-feed-optimization /opt/rss-feed-optimization.backup.$(date +%Y%m%d_%H%M%S)

# Deploy new version
echo "🚀 Deploying new version..."
sudo cp -r . /opt/rss-feed-optimization/
sudo chown -R www-data:www-data /opt/rss-feed-optimization

# Start application
echo "🚀 Starting application..."
sudo systemctl start rss-feed-optimization

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Health check
echo "🏥 Running health check..."
if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed, rolling back..."
    sudo systemctl stop rss-feed-optimization
    sudo rm -rf /opt/rss-feed-optimization
    sudo mv /opt/rss-feed-optimization.backup.* /opt/rss-feed-optimization
    sudo systemctl start rss-feed-optimization
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

This comprehensive deployment troubleshooting guide provides the tools and techniques needed to identify, diagnose, and resolve deployment issues in the RSS Feed Optimization project.