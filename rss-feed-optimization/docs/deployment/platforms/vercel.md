# Vercel Deployment Guide

Vercel is a cloud platform for static sites and Serverless Functions. This guide will walk you through deploying the RSS Feed Optimization project on Vercel.

## Why Vercel?

- **Edge Network**: Global CDN for fast content delivery
- **Serverless Functions**: Automatic scaling and pay-per-use
- **Git Integration**: Automatic deployments from Git
- **Free Tier**: Generous free tier for development
- **Easy Setup**: Simple deployment process
- **Preview Deployments**: Automatic preview deployments for pull requests

## Prerequisites

1. **Vercel account**: [Sign up for free](https://vercel.com)
2. **GitHub account**: Connected to Vercel
3. **Project repository**: Your RSS Feed Optimization project on GitHub

## Step-by-Step Deployment

### 1. Connect Your GitHub Repository

1. **Log in to Vercel**: Go to [vercel.com](https://vercel.com) and sign in
2. **Import Project**: Click "New Project" → "Import Git Repository"
3. **Select Repository**: Choose your RSS Feed Optimization repository
4. **Import**: Click "Import"

### 2. Configure Project Settings

Vercel will automatically detect your project type. Configure the following:

#### Build Settings

```json
{
  "buildCommand": "bun install",
  "outputDirectory": "./",
  "devCommand": "bun run dev"
}
```

#### Framework Preset

- **Framework**: Other (since we're using Bun)
- **Root Directory**: `/` (project root)

### 3. Configure Environment Variables

Add environment variables in the Vercel dashboard:

#### Required Environment Variables

```bash
# Application Settings
BLOG_TITLE="Your Blog Title"
BLOG_URL="https://your-blog.vercel.app"
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

#### Adding Environment Variables in Vercel

1. Go to your project settings
2. Click on "Environment Variables"
3. Add each environment variable
4. Set Environment to "Production" or "Preview" as needed

### 4. Configure Vercel Functions

Since we're using a custom server, we need to configure Vercel to handle our routes properly.

#### vercel.json Configuration

Create a `vercel.json` file in your project root:

```json
{
  "version": 2,
  "functions": {
    "src/server.js": {
      "runtime": "bun"
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/src/server.js"
    }
  ],
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ]
}
```

#### Alternative: Using API Routes

If you prefer to use Vercel's API routes, you can create individual route handlers:

```javascript
// api/index.js
import { handleHome } from '../../src/server.js';

export default handleHome;
```

### 5. Set Up R2 Storage (Optional)

If you're using Cloudflare R2 for storage:

#### Option 1: Use Vercel's Storage

1. Go to "Storage" in Vercel dashboard
2. Set up Vercel Blob Storage
3. Update your R2 client to use Vercel Blob Storage

#### Option 2: Manual R2 Configuration

1. Set up R2 bucket in Cloudflare dashboard
2. Add R2 credentials to Vercel environment variables
3. Verify R2 connection works

### 6. Deploy Your Application

1. **Trigger Deployment**: Push to your GitHub repository or click "Deploy"
2. **Monitor Progress**: Watch the deployment logs in Vercel dashboard
3. **Verify Success**: Check that your application is running

### 7. Configure Custom Domain (Optional)

1. Go to "Domains" in Vercel dashboard
2. Add your custom domain
3. Configure DNS settings with your domain provider
4. Vercel will automatically provision SSL certificate

## Vercel-Specific Features

### Environment Management

Vercel provides excellent environment management:

```bash
# Development environment (Preview)
NODE_ENV=development
ENABLE_PROFILING=true
LOG_LEVEL=debug

# Production environment
NODE_ENV=production
ENABLE_PROFILING=false
LOG_LEVEL=info
```

### Edge Functions

For better performance, consider using Vercel Edge Functions:

```javascript
// middleware.js
export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'value');
  return response;
}
```

### Caching Strategy

Vercel provides automatic caching:

```javascript
// src/server.js
export default function handler(req, res) {
  // Set cache headers
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ message: 'Hello World' });
}
```

### Monitoring and Logging

Vercel provides built-in monitoring:

1. **Logs**: Real-time log streaming
2. **Metrics**: Performance metrics and usage
3. **Alerts**: Set up alerts for errors and performance issues

## Vercel Configuration Files

### vercel.json

```json
{
  "version": 2,
  "functions": {
    "src/server.js": {
      "runtime": "bun"
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/src/server.js"
    }
  ],
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
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

## Troubleshooting Vercel Deployment

### Common Issues

#### 1. Build Failures

**Problem**: Build fails with dependency errors.

**Solution**:
```bash
# Check bun.lock file exists
# Verify package.json syntax
# Check for missing dependencies
# Ensure Bun is supported in Vercel
```

#### 2. Function Timeouts

**Problem**: Serverless functions timeout.

**Solution**:
```bash
# Optimize function execution time
# Use streaming responses for large data
# Consider using Edge Functions for better performance
```

#### 3. Environment Variables Not Loading

**Problem**: Application can't find environment variables.

**Solution**:
```bash
# Verify variables are set in Vercel dashboard
# Check variable names match exactly
# Restart deployment after adding variables
```

#### 4. R2 Connection Issues

**Problem**: Cannot connect to R2 storage.

**Solution**:
```bash
# Verify R2 credentials are correct
# Check R2 bucket permissions
# Test R2 connection locally first
# Consider using Vercel's storage services
```

### Vercel-Specific Debugging

#### View Logs

```bash
# In Vercel dashboard
# Go to "Logs" tab
# Filter by time and log level
```

#### Performance Monitoring

```bash
# Use Vercel Analytics
# Monitor function execution time
# Check for cold starts
```

#### Health Checks

```bash
# Vercel performs automatic health checks
# Configure health check endpoint
# Monitor health check results
```

## Performance Optimization on Vercel

### Edge Network

```bash
# Leverage Vercel's global edge network
# Use edge caching for static content
# Minimize server-side processing
```

### Function Optimization

```bash
# Keep functions small and focused
# Use lazy loading for dependencies
# Minimize cold start time
```

### Caching Strategy

```bash
# Use Vercel's built-in caching
# Configure appropriate cache headers
# Implement CDN caching for static assets
```

## Cost Management

### Free Tier Usage

```bash
# Vercel offers generous free tier
# Monitor usage to avoid charges
# Set up billing alerts
```

### Cost Optimization

```bash
# Use appropriate function sizes
# Optimize function execution time
# Use edge functions for better performance
```

## Vercel Best Practices

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

### 2. Implement Proper Error Handling

```javascript
// src/server.js
export default function handler(req, res) {
  try {
    // Your application logic
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

### 3. Use Vercel's Built-in Features

```bash
# Use Vercel Analytics for monitoring
# Implement edge middleware for performance
# Use Vercel's image optimization
```

### 4. Optimize for Serverless

```javascript
// src/server.js
// Keep dependencies minimal
// Use lazy loading
// Implement proper caching
```

## Next Steps

After successful deployment:

1. **Test your application**: Verify all features work correctly
2. **Set up monitoring**: Configure alerts and monitoring
3. **Optimize performance**: Monitor and optimize based on usage
4. **Configure custom domain**: Set up your custom domain
5. **Set up SSL**: Ensure SSL is properly configured

## Support

If you encounter issues:

1. **Vercel Documentation**: [https://vercel.com/docs](https://vercel.com/docs)
2. **Vercel Community**: [https://vercel.com/community](https://vercel.com/community)
3. **GitHub Issues**: [Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
4. **Vercel Support**: Contact via Vercel dashboard

Vercel provides an excellent platform for deploying the RSS Feed Optimization project with automatic scaling and global content delivery. The platform's serverless architecture and edge network make it ideal for high-performance applications.