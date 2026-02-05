# Render Deployment Guide

Render is a modern cloud platform that provides simple deployment and hosting for web applications. This guide will walk you through deploying the RSS Feed Optimization project on Render.

## Why Render?

- **Simple Setup**: Easy deployment process with minimal configuration
- **Free Tier**: Generous free tier for development and small projects
- **Automatic HTTPS**: Free SSL certificates for all services
- **Git Integration**: Automatic deployments from Git repositories
- **Database Support**: Built-in PostgreSQL and Redis support
- **Global CDN**: Content delivery network for static assets
- **Monitoring**: Built-in monitoring and alerting

## Prerequisites

1. **Render account**: [Sign up for free](https://render.com)
2. **GitHub account**: Connected to Render
3. **Project repository**: Your RSS Feed Optimization project on GitHub

## Step-by-Step Deployment

### 1. Connect Your GitHub Repository

1. **Log in to Render**: Go to [render.com](https://render.com) and sign in
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect Repository**: Choose your RSS Feed Optimization repository
4. **Authorize**: Grant Render access to your repository

### 2. Configure Build Settings

Render will automatically detect your project type. Configure the following:

#### Build Configuration

```json
{
  "buildCommand": "bun install",
  "publishDirectory": "./",
  "startCommand": "bun run start"
}
```

#### Environment Configuration

- **Environment**: Node (even though we use Bun, select Node for compatibility)
- **Build Image**: Ubuntu (latest)
- **Node Version**: 18.x (or latest available)

### 3. Configure Environment Variables

Add environment variables in the Render dashboard:

#### Required Environment Variables

```bash
# Application Settings
BLOG_TITLE="Your Blog Title"
BLOG_URL="https://your-blog.onrender.com"
ADMIN_TOKEN="your-secret-admin-token"

# R2 Storage (if using Cloudflare R2)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-production-bucket"

# Performance Settings
CACHE_TTL=600
MAX_CACHE_SIZE=200
ENABLE_CACHE=true

# Security Settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=200

# Monitoring
ENABLE_PROFILING=false
ENABLE_METRICS=true
LOG_LEVEL=info
```

#### Adding Environment Variables in Render

1. Go to your service settings
2. Click on "Environment" tab
3. Add each environment variable
4. Click "Save Changes"

### 4. Set Up R2 Storage (Optional)

If you're using Cloudflare R2 for storage:

#### Option 1: Use Render's Storage

1. Go to "Storage" in Render dashboard
2. Set up Render's object storage
3. Update your R2 client to use Render's storage

#### Option 2: Manual R2 Configuration

1. Set up R2 bucket in Cloudflare dashboard
2. Add R2 credentials to Render environment variables
3. Verify R2 connection works

### 5. Configure Database (Optional)

If you need a database, Render makes it easy:

1. Go to "New" → "PostgreSQL" or "Redis"
2. Configure database settings
3. Environment variables are automatically configured

### 6. Deploy Your Application

1. **Trigger Deployment**: Push to your GitHub repository or click "Deploy"
2. **Monitor Progress**: Watch the deployment logs in Render dashboard
3. **Verify Success**: Check that your application is running

### 7. Configure Custom Domain (Optional)

1. Go to "Settings" → "Custom Domains"
2. Add your custom domain
3. Configure DNS settings with your domain provider
4. Render will automatically provision SSL certificate

## Render-Specific Features

### Environment Management

Render provides excellent environment management:

```bash
# Development environment
NODE_ENV=development
ENABLE_PROFILING=true
LOG_LEVEL=debug

# Production environment
NODE_ENV=production
ENABLE_PROFILING=false
LOG_LEVEL=info
```

### Database Integration

Render provides managed databases:

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://user:password@host:port
```

### Caching Strategy

Render provides built-in caching:

```bash
# Enable Render's caching
ENABLE_RENDER_CACHE=true

# Configure cache TTL
CACHE_TTL=600
```

### Monitoring and Logging

Render provides built-in monitoring:

1. **Logs**: Real-time log streaming
2. **Metrics**: CPU, memory, and network usage
3. **Alerts**: Set up alerts for resource usage

### Auto-Scaling

Render supports auto-scaling:

1. Go to "Settings" → "Auto-Scaling"
2. Configure scaling rules
3. Set minimum and maximum instances

## Render Configuration Files

### render.yaml (Recommended)

Create a `render.yaml` file for Render-specific configuration:

```yaml
services:
  - type: web
    name: rss-feed-optimization
    env: node
    region: oregon
    plan: free
    buildCommand: "bun install"
    startCommand: "bun run start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: BLOG_TITLE
        value: "RSS Feed Optimization"
      - key: BLOG_URL
        value: "https://your-blog.onrender.com"
      - key: ADMIN_TOKEN
        fromGroup: rss-secrets
        property: admin-token
      - key: ENABLE_CACHE
        value: true
      - key: CACHE_TTL
        value: 600
      - key: LOG_LEVEL
        value: info

databases:
  - name: rss-feed-optimization-db
    plan: free

secrets:
  - name: rss-secrets
    values:
      - key: admin-token
        generateValue: true
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "bun run src/server.js",
    "build": "bun install",
    "start": "bun run src/server.js"
  }
}
```

## Troubleshooting Render Deployment

### Common Issues

#### 1. Build Failures

**Problem**: Build fails with dependency errors.

**Solution**:
```bash
# Check bun.lock file exists
# Verify package.json syntax
# Check for missing dependencies
# Ensure Bun is compatible with Render's Node environment
```

#### 2. Environment Variables Not Loading

**Problem**: Application can't find environment variables.

**Solution**:
```bash
# Verify variables are set in Render dashboard
# Check variable names match exactly
# Restart service after adding variables
```

#### 3. Port Configuration

**Problem**: Application won't start or is inaccessible.

**Solution**:
```bash
# Render sets PORT environment variable automatically
# Ensure your application uses process.env.PORT
# Check firewall settings
```

#### 4. R2 Connection Issues

**Problem**: Cannot connect to R2 storage.

**Solution**:
```bash
# Verify R2 credentials are correct
# Check R2 bucket permissions
# Test R2 connection locally first
```

### Render-Specific Debugging

#### View Logs

```bash
# In Render dashboard
# Go to "Logs" tab
# Filter by time and log level
```

#### Performance Monitoring

```bash
# Use Render's monitoring tools
# Monitor CPU and memory usage
# Check for performance bottlenecks
```

#### Health Checks

```bash
# Render performs automatic health checks
# Configure health check endpoint
# Monitor health check results
```

## Performance Optimization on Render

### Resource Allocation

```bash
# Free tier: 0.1 CPU, 100MB RAM
# Starter tier: 0.2 CPU, 256MB RAM
# Standard tier: 0.5 CPU, 512MB RAM
# Professional tier: 1+ CPU, 1GB+ RAM
```

### Caching Strategy

```bash
# Enable Render's built-in caching
# Configure appropriate cache TTL
# Use Redis for session storage
```

### Database Optimization

```bash
# Use Render's managed databases
# Configure connection pooling
# Monitor database performance
```

## Cost Management

### Free Tier Usage

```bash
# Render offers generous free tier
# Free web services with 750 hours/month
# Free PostgreSQL with 100MB storage
# Free Redis with 100MB storage
```

### Cost Optimization

```bash
# Use appropriate instance sizes
# Scale down during off-peak hours
# Monitor resource usage
# Use free tier features when possible
```

## Render Best Practices

### 1. Use Environment-Specific Configurations

```bash
# Development environment
NODE_ENV=development
ENABLE_PROFILING=true
LOG_LEVEL=debug

# Production environment
NODE_ENV=production
ENABLE_PROFILING=false
LOG_LEVEL=info
```

### 2. Implement Health Checks

```javascript
// src/server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    memory: process.memoryUsage(),
  });
});
```

### 3. Monitor Resource Usage

```bash
# Use Render's monitoring tools
# Set up alerts for high resource usage
# Optimize based on usage patterns
```

### 4. Use Render's Database Services

```bash
# Use managed databases when possible
# Configure proper backups
# Monitor database performance
```

### 5. Implement Proper Error Handling

```javascript
// src/server.js
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

## Advanced Render Features

### Background Jobs

For background processing:

```yaml
# render.yaml
jobs:
  - type: cron
    name: rss-feed-updater
    schedule: "0 */6 * * *"  # Every 6 hours
    command: "bun run scripts/update-feeds.js"
    envVars:
      - key: NODE_ENV
        value: production
```

### Static Sites

For static content:

```yaml
# render.yaml
staticSites:
  - name: rss-feed-docs
    path: "./docs"
    buildCommand: "npm run build"
```

### Private Services

For internal services:

```yaml
# render.yaml
services:
  - type: web
    name: rss-feed-api
    plan: private
    # ... other configuration
```

## Next Steps

After successful deployment:

1. **Test your application**: Verify all features work correctly
2. **Set up monitoring**: Configure alerts and monitoring
3. **Optimize performance**: Monitor and optimize based on usage
4. **Configure custom domain**: Set up your custom domain
5. **Set up SSL**: Ensure SSL is properly configured
6. **Implement backups**: Set up data backups

## Support

If you encounter issues:

1. **Render Documentation**: [https://render.com/docs](https://render.com/docs)
2. **Render Community**: [https://community.render.com](https://community.render.com)
3. **GitHub Issues**: [Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
4. **Render Support**: Contact via Render dashboard

Render provides an excellent platform for deploying the RSS Feed Optimization project with minimal configuration and excellent performance. The platform's ease of use and powerful features make it ideal for both development and production deployments.