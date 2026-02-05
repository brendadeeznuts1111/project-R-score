# Deployment Guide

This guide provides comprehensive information about deploying the RSS Feed Optimization project to various platforms and environments.

## Overview

The RSS Feed Optimization project is designed for easy deployment across multiple platforms. This guide covers deployment strategies, environment configuration, and platform-specific instructions.

## Deployment Strategies

### 1. Production Deployment

#### Prerequisites

- Bun.js 1.3.7+
- Environment variables configured
- R2 storage bucket created
- Domain name configured (optional)

#### Environment Configuration

```bash
# .env.production
NODE_ENV=production
BLOG_TITLE="Your Blog Title"
BLOG_URL=https://your-blog.com
ADMIN_TOKEN=your-super-secret-admin-token

# R2 Storage Configuration
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name

# Security Settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN=https://your-blog.com
LOG_LEVEL=warn

# Performance Settings
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
```

#### Build and Deploy

```bash
# Install dependencies
bun install

# Run production build (if needed)
bun run build

# Start the application
bun run start

# Or with PM2 for production
pm2 start cli.js --name rss-feed-optimization
```

### 2. Development Deployment

#### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun test

# Run linting
bun run lint
```

#### Docker Development

```dockerfile
# Dockerfile
FROM oven/bun:1.3.7

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["bun", "run", "dev"]
```

```bash
# Build and run Docker container
docker build -t rss-feed-optimization .
docker run -p 3000:3000 rss-feed-optimization
```

## Platform-Specific Deployment

### 1. Railway

#### Setup

1. **Connect Repository**
   - Go to Railway.app
   - Click "New Project"
   - Connect your GitHub repository

2. **Configure Environment Variables**
   - Add all required environment variables in Railway dashboard
   - Set `NODE_ENV=production`

3. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Monitor deployment in Railway dashboard

#### Railway Configuration

```yaml
# railway.yml
services:
  - name: rss-feed-optimization
    source: .
    build:
      command: bun install
    startCommand: bun run start
    env:
      NODE_ENV: production
      PORT: $PORT
    healthcheck:
      path: /api/v1/health
      interval: 30
      timeout: 10
```

### 2. Vercel

#### Setup

1. **Connect Repository**
   - Go to Vercel.com
   - Import your GitHub repository

2. **Configure Project Settings**
   - Framework Preset: Other
   - Build Command: `bun install`
   - Output Directory: (leave empty)
   - Install Command: (leave empty)

3. **Environment Variables**
   - Add all required environment variables
   - Set `NODE_ENV=production`

4. **Deploy**
   - Vercel will automatically deploy
   - Configure custom domain if needed

#### Vercel Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "cli.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "cli.js"
    }
  ]
}
```

### 3. Render

#### Setup

1. **Connect Repository**
   - Go to Render.com
   - Create new Web Service
   - Connect your GitHub repository

2. **Configure Settings**
   - Runtime: Bun
   - Build Command: `bun install`
   - Start Command: `bun run start`
   - Region: Choose closest to your users

3. **Environment Variables**
   - Add all required environment variables
   - Set `NODE_ENV=production`

4. **Deploy**
   - Render will automatically deploy
   - Monitor deployment logs

#### Render Configuration

```yaml
# render.yaml
services:
  - type: web
    name: rss-feed-optimization
    env: bun
    buildCommand: bun install
    startCommand: bun run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        fromService:
          type: port
          value: "3000"
```

### 4. Docker

#### Production Docker Setup

```dockerfile
# Dockerfile.production
FROM oven/bun:1.3.7-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["bun", "run", "start"]
```

```bash
# Build production image
docker build -f Dockerfile.production -t rss-feed-optimization:production .

# Run container
docker run -d \
  --name rss-feed-optimization \
  -p 3000:3000 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e BLOG_TITLE="Your Blog" \
  -e BLOG_URL=https://your-blog.com \
  rss-feed-optimization:production
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  rss-feed-optimization:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BLOG_TITLE=Your Blog Title
      - BLOG_URL=https://your-blog.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 5. AWS (EC2)

#### EC2 Setup

1. **Launch EC2 Instance**
   - Choose Amazon Linux 2 or Ubuntu
   - Select appropriate instance size
   - Configure security groups (port 3000)

2. **Install Dependencies**
   ```bash
   # Update system
   sudo yum update -y
   
   # Install Bun
   curl -fsSL https://bun.sh/install | bash
   
   # Install PM2
   npm install -g pm2
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/rss-feed-optimization.git
   cd rss-feed-optimization
   
   # Install dependencies
   bun install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start application
   pm2 start cli.js --name rss-feed-optimization
   pm2 startup
   pm2 save
   ```

### 6. Google Cloud Run

#### Setup

1. **Prepare Application**
   ```dockerfile
   # Dockerfile for Cloud Run
   FROM oven/bun:1.3.7
   
   WORKDIR /app
   
   COPY package.json bun.lock* ./
   RUN bun install --production
   
   COPY . .
   
   EXPOSE 8080
   
   CMD ["bun", "run", "start"]
   ```

2. **Deploy to Cloud Run**
   ```bash
   # Build and push to Container Registry
   gcloud builds submit --tag gcr.io/your-project/rss-feed-optimization
   
   # Deploy to Cloud Run
   gcloud run deploy rss-feed-optimization \
     --image gcr.io/your-project/rss-feed-optimization \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Environment Configuration

### Environment Variables

#### Required Variables

```bash
# Application
NODE_ENV=production
BLOG_TITLE="Your Blog Title"
BLOG_URL=https://your-blog.com
ADMIN_TOKEN=your-admin-token

# R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

#### Optional Variables

```bash
# Security
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN=https://your-blog.com
LOG_LEVEL=warn

# Performance
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true

# Monitoring
SECURITY_LOG_FILE=/var/log/security.log
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

### Environment File Examples

#### Production Environment

```bash
# .env.production
NODE_ENV=production
BLOG_TITLE="High Performance Blog"
BLOG_URL=https://blog.example.com
ADMIN_TOKEN=$(openssl rand -base64 32)

# R2 Storage
R2_ACCOUNT_ID="1234567890abcdef"
R2_ACCESS_KEY_ID="ACCESS_KEY_ID"
R2_SECRET_ACCESS_KEY="SECRET_ACCESS_KEY"
R2_BUCKET_NAME="production-blog-bucket"

# Security
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN="https://blog.example.com,https://admin.example.com"
LOG_LEVEL=warn

# Performance
ENABLE_CACHE=true
CACHE_TTL=1200
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true

# Monitoring
SECURITY_LOG_FILE=/var/log/rss-security.log
```

#### Development Environment

```bash
# .env.development
NODE_ENV=development
BLOG_TITLE="Development Blog"
BLOG_URL=http://localhost:3000
ADMIN_TOKEN=dev-token-for-testing

# R2 Storage (use local or test bucket)
R2_ACCOUNT_ID="test-account"
R2_ACCESS_KEY_ID="test-key"
R2_SECRET_ACCESS_KEY="test-secret"
R2_BUCKET_NAME="dev-blog-bucket"

# Security (relaxed for development)
ENABLE_CSP=false
ENABLE_HSTS=false
ENABLE_RATE_LIMITING=false
CORS_ORIGIN="*"
LOG_LEVEL=debug

# Performance
ENABLE_CACHE=false
CACHE_TTL=300
ENABLE_DNS_PREFETCH=false
ENABLE_PRECONNECT=false
```

## CI/CD Pipeline

### GitHub Actions

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
        
      - name: Run linting
        run: bun run lint
        
      - name: Deploy to Railway
        if: github.ref == 'refs/heads/main'
        run: |
          curl -X POST "$RAILWAY_API_URL/deploy" \
            -H "Authorization: Bearer $RAILWAY_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"serviceId": "'$RAILWAY_SERVICE_ID'"}'
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          RAILWAY_API_URL: ${{ secrets.RAILWAY_API_URL }}
          RAILWAY_SERVICE_ID: ${{ secrets.RAILWAY_SERVICE_ID }}
```

### Docker Build Pipeline

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
          
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            your-username/rss-feed-optimization:latest
            your-username/rss-feed-optimization:${{ github.sha }}
```

## Monitoring and Logging

### Application Monitoring

#### Health Checks

```javascript
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    dependencies: {
      r2: checkR2Connection(),
      cache: checkCacheHealth()
    }
  };
  
  res.json(health);
});
```

#### Metrics Endpoint

```javascript
// Metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: getMetrics(),
    cache: getCacheMetrics()
  };
  
  res.json(metrics);
});
```

### Log Management

#### Structured Logging

```javascript
// src/utils/logger.js
export class Logger {
  static log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid,
      hostname: require('os').hostname()
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  static info(message, meta) {
    this.log('info', message, meta);
  }
  
  static warn(message, meta) {
    this.log('warn', message, meta);
  }
  
  static error(message, meta) {
    this.log('error', message, meta);
  }
}
```

#### Log Rotation

```bash
# Using PM2 for log rotation
pm2 start cli.js --name rss-feed-optimization --log-date-format="YYYY-MM-DD HH:mm:ss"
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

## Backup and Recovery

### Data Backup

#### R2 Backup Strategy

```bash
# Backup R2 bucket to another location
aws s3 sync s3://source-bucket s3://backup-bucket --storage-class STANDARD_IA

# Automated backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
aws s3 cp s3://production-bucket s3://backup-bucket/backup-$DATE/ --recursive
```

#### Database Backup (if using external database)

```bash
# PostgreSQL backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup-$(date +%Y-%m-%d).sql

# MySQL backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup-$(date +%Y-%m-%d).sql
```

### Recovery Procedures

#### Application Recovery

```bash
# Restart application
pm2 restart rss-feed-optimization

# Rollback to previous version
pm2 rollback rss-feed-optimization

# Check application status
pm2 status
pm2 logs rss-feed-optimization
```

#### Data Recovery

```bash
# Restore from R2 backup
aws s3 sync s3://backup-bucket/backup-date/ s3://production-bucket/

# Restore database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup-file.sql
```

## Security in Production

### SSL/TLS Configuration

```bash
# Using Let's Encrypt with Nginx
sudo apt install certbot nginx
sudo certbot --nginx -d your-blog.com

# Nginx configuration
server {
    listen 443 ssl;
    server_name your-blog.com;
    
    ssl_certificate /etc/letsencrypt/live/your-blog.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-blog.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Firewall Configuration

```bash
# UFW firewall rules
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3000   # Block direct access to app port
sudo ufw enable
```

### Security Headers

```javascript
// Additional security headers for production
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Troubleshooting

### Common Deployment Issues

#### 1. Environment Variables Not Loading

```bash
# Check if .env file exists
ls -la .env

# Check environment variables
echo $NODE_ENV
echo $BLOG_TITLE

# Restart application after changing .env
pm2 restart rss-feed-optimization
```

#### 2. R2 Connection Issues

```bash
# Test R2 connection
bun -e "
import { s3 } from 'bun';
const client = s3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: 'https://your-account.r2.cloudflarestorage.com',
  region: 'auto'
});
console.log('R2 connection test:', await client.listBuckets());
"
```

#### 3. Port Binding Issues

```bash
# Check if port is in use
netstat -tlnp | grep :3000

# Kill process using port
sudo fuser -k 3000/tcp

# Check firewall
sudo ufw status
```

#### 4. Memory Issues

```bash
# Check memory usage
free -h
pm2 monit

# Increase memory limit
pm2 start cli.js --max-memory-restart 512M
```

### Performance Issues

#### 1. High Response Times

```bash
# Check application metrics
curl http://localhost:3000/api/v1/metrics

# Check cache hit rate
curl http://localhost:3000/api/v1/cache/stats

# Monitor CPU usage
top
```

#### 2. High Memory Usage

```bash
# Check memory usage
pm2 monit

# Force garbage collection
pm2 restart rss-feed-optimization --update-env

# Check for memory leaks
pm2 show rss-feed-optimization
```

This comprehensive deployment guide ensures successful deployment of the RSS Feed Optimization project across various platforms and environments.