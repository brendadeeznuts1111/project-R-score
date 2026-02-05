# Quick Start Guide

Get up and running with the RSS Feed Optimization project in minutes.

## Prerequisites

- **Bun** v1.3.7 or later
- **Node.js** 18+ (for compatibility)
- **Git** (for cloning the repository)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/brendadeeznuts1111/rss-feed-optimization.git
cd rss-feed-optimization
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Basic Configuration
BLOG_TITLE="My RSS Feed Blog"
BLOG_URL=http://localhost:3000
ADMIN_TOKEN=your-secret-token

# R2 Storage (optional for local development)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

## Running the Application

### Development Mode

```bash
bun run dev
```

The server will start on `http://localhost:3000`

### Production Mode

```bash
bun run start
```

### Production with Profiling

```bash
bun run start:prod
```

## Basic Usage

### Accessing the Blog

1. Open your browser and navigate to `http://localhost:3000`
2. You'll see the blog homepage with any available posts
3. Access RSS feeds at:
   - Main feed: `http://localhost:3000/rss.xml`
   - Category feeds: `http://localhost:3000/rss/{category}.xml`

### Admin Operations

Access admin endpoints with your admin token:

```bash
# Sync local posts to R2
curl -H "Authorization: Bearer your-admin-token" \
     http://localhost:3000/admin/sync

# View server metrics
curl -H "Authorization: Bearer your-admin-token" \
     http://localhost:3000/admin/stats

# Clear cache
curl -H "Authorization: Bearer your-admin-token" \
     http://localhost:3000/admin/cache/clear
```

### CLI Operations

Use the built-in CLI for various operations:

```bash
# Check system status
bun run cli.js status

# Sync local content
bun run cli.js sync

# Run performance benchmarks
bun run cli.js benchmark

# View help
bun run cli.js help
```

## Adding Content

### Local Development (Markdown)

1. Create markdown files in `content/posts/`:

```markdown
---
title: My First Blog Post
slug: my-first-post
author: Your Name
date: 2025-01-27T00:00:00Z
tags: bun, rss, optimization
excerpt: A brief description of your post
---

# My First Blog Post

This is the content of your blog post...
```

2. Sync to R2 (if using R2):

```bash
bun run sync
```

### R2 Storage

If using Cloudflare R2:

1. Set up your R2 bucket and credentials in `.env`
2. Upload posts via the sync command or admin API
3. The system will automatically fetch and serve posts from R2

## Testing

Run the test suite:

```bash
bun test
```

Run specific test files:

```bash
bun test tests/dns-optimization.test.js
bun test tests/buffer-optimization.test.js
```

## Performance Monitoring

### View Metrics

```bash
curl http://localhost:3000/metrics
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Performance Profiling

```bash
# Generate performance profiles
bun run profile

# Analyze profiles
bun run profile:analyze

# Compare profiles
bun run profile:compare
```

## Next Steps

- [Configuration Guide](./configuration.md) - Learn about all configuration options
- [Development Guide](../development/setup.md) - Set up your development environment
- [Deployment Guide](../deployment/overview.md) - Deploy to production
- [API Reference](../api-reference/server-api.md) - Explore the API endpoints

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env
   PORT=3001
   ```

2. **R2 connection issues**
   ```bash
   # Check your R2 credentials in .env
   # Verify R2 bucket exists and has proper permissions
   ```

3. **Missing dependencies**
   ```bash
   # Reinstall dependencies
   bun install
   ```

### Getting Help

- Check the [Troubleshooting Guide](../troubleshooting/common-issues.md)
- Browse [FAQ](../troubleshooting/faq.md)
- [Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues) if you need help

## What's Next?

Now that you have the project running, you can:

1. **Customize the blog** - Modify templates, styles, and configuration
2. **Add content** - Create blog posts and organize them with categories
3. **Optimize performance** - Use the profiling tools to improve performance
4. **Deploy to production** - Follow the [Deployment Guide](../deployment/overview.md)
5. **Contribute** - Check out the [Development Guide](../development/setup.md) to contribute to the project

Happy blogging! 🚀