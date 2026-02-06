# Frequently Asked Questions (FAQ)

This document contains answers to frequently asked questions about the RSS Feed Optimization project.

## Installation and Setup

### Q: How do I install Bun?

**A**: Bun can be installed in several ways:

```bash
# Using the official installer (recommended)
curl -fsSL https://bun.sh/install | bash

# Using npm
npm install -g bun

# Using Homebrew (macOS)
brew install bun
```

For more installation options, see the [Installation Guide](../getting-started/installation.md).

### Q: I'm getting "command not found: bun" after installation

**A**: This usually means Bun isn't in your PATH. Try:

```bash
# Add to your shell configuration
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc

# Or install globally
sudo npm install -g bun
```

### Q: How do I check if Bun is properly installed?

**A**: Run these commands:

```bash
bun --version
bun --help
```

### Q: Can I use Node.js instead of Bun?

**A**: While the project is optimized for Bun, you can try running it with Node.js. However, you may encounter compatibility issues since the project uses Bun-specific APIs like `Bun.serve()`, `Bun.escapeHTML()`, and the built-in S3 client.

## Configuration

### Q: What are the minimum required environment variables?

**A**: The minimum required environment variables are:

```bash
BLOG_TITLE="Your Blog Title"
BLOG_URL="http://localhost:3000"
ADMIN_TOKEN="your-secret-token"
```

### Q: Do I need R2 storage for the project to work?

**A**: No, R2 storage is optional. The project can work with local file storage, but R2 provides better scalability and performance for production use.

### Q: How do I configure R2 storage?

**A**: Set these environment variables:

```bash
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"
```

See the [Configuration Guide](../getting-started/configuration.md) for more details.

### Q: Why is my application not finding environment variables?

**A**: Common causes:

1. **.env file not created**: Create a `.env` file with your variables
2. **Wrong location**: Ensure `.env` is in your project root
3. **Variable names**: Check variable names match exactly
4. **Quotes**: Don't use quotes around values in `.env` files

## Development

### Q: How do I start the development server?

**A**: Run:

```bash
bun run dev
```

This starts the server with hot reload enabled.

### Q: How do I run tests?

**A**: Run:

```bash
bun test
```

For specific test files:

```bash
bun test tests/dns-optimization.test.js
```

### Q: How do I run the application in production mode?

**A**: Run:

```bash
bun run start
```

Or with profiling:

```bash
bun run start:prod
```

### Q: Hot reload isn't working, what should I do?

**A**: Try these steps:

1. Ensure you're using `bun run dev`
2. Check that files are being watched in `bunfig.toml`
3. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
4. Check for syntax errors in your code

## Deployment

### Q: Which deployment platform should I choose?

**A**: For beginners, we recommend:

1. **Railway** - Easy setup, great documentation
2. **Vercel** - Excellent for frontend-focused projects
3. **Render** - Good balance of features and pricing

For more advanced users:
1. **Docker** - Maximum flexibility
2. **Kubernetes** - Enterprise-grade orchestration

See the [Deployment Overview](../deployment/overview.md) for detailed comparisons.

### Q: How do I deploy to Railway?

**A**: Follow the [Railway Deployment Guide](../deployment/platforms/railway.md). The basic steps are:

1. Connect your GitHub repository to Railway
2. Configure environment variables
3. Set build and start commands
4. Deploy

### Q: My deployment failed, how do I debug it?

**A**: Check these common issues:

1. **Environment variables**: Ensure all required variables are set
2. **Build errors**: Check deployment logs for build failures
3. **Port configuration**: Ensure your app uses `process.env.PORT`
4. **Dependencies**: Verify all dependencies are in `package.json`

### Q: How do I set up a custom domain?

**A**: The process varies by platform, but generally:

1. Configure DNS settings with your domain provider
2. Add the domain to your deployment platform
3. Wait for SSL certificate to be provisioned
4. Update your `BLOG_URL` environment variable

## Performance

### Q: How can I improve RSS feed generation performance?

**A**: Try these optimizations:

1. **Enable caching**: Set `ENABLE_CACHE=true`
2. **Increase cache TTL**: Set `CACHE_TTL=600` (10 minutes)
3. **Use CDN**: Configure a CDN for static assets
4. **Optimize images**: Compress and optimize images
5. **Monitor performance**: Use the built-in profiling tools

### Q: Why is my application using too much memory?

**A**: Common causes and solutions:

1. **Large cache**: Reduce `MAX_CACHE_SIZE`
2. **Memory leaks**: Monitor memory usage and restart if needed
3. **Large RSS feeds**: Implement streaming for large feeds
4. **Unclosed connections**: Ensure database connections are properly closed

### Q: How do I enable DNS prefetching?

**A**: Set these environment variables:

```bash
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
PREFETCH_COMMON_RSS=true
```

### Q: How do I monitor application performance?

**A**: Use these endpoints:

```bash
# View metrics
curl http://localhost:3000/metrics

# View health status
curl http://localhost:3000/health

# View network performance
curl http://localhost:3000/performance/network
```

## RSS Feeds

### Q: My RSS feed isn't validating

**A**: Common issues:

1. **XML syntax**: Check for proper XML escaping
2. **Required fields**: Ensure all required RSS fields are present
3. **Character encoding**: Ensure UTF-8 encoding
4. **Content length**: Check content isn't too long

Use the [W3C Feed Validation Service](https://validator.w3.org/feed/) to check your feed.

### Q: How do I add custom fields to RSS feeds?

**A**: Modify the `generateItem` method in `src/rss-generator.js`:

```javascript
generateItem(post) {
  return `<item>
    <!-- existing fields -->
    <custom:field>${this.escapeXML(post.customField)}</custom:field>
  </item>`;
}
```

### Q: How do I create category-specific RSS feeds?

**A**: Category feeds are automatically generated based on post tags. Access them at:

```text
http://your-domain.com/rss/{category}.xml
```

### Q: Why are some RSS feeds missing content?

**A**: Check these common issues:

1. **Post format**: Ensure posts have required fields
2. **R2 storage**: Verify posts are properly stored and accessible
3. **Content parsing**: Check content parsing logic
4. **Caching**: Clear cache if content is stale

## Security

### Q: How do I secure admin endpoints?

**A**: Ensure:

1. **Strong admin token**: Use a long, random admin token
2. **Environment variable**: Store token in environment variables
3. **HTTPS**: Use HTTPS in production
4. **Rate limiting**: Enable rate limiting

### Q: How do I prevent XSS attacks?

**A**: The application uses `Bun.escapeHTML()` for XSS protection. Ensure:

1. **All user input is escaped**: Use `Bun.escapeHTML()` for all user content
2. **Content Security Policy**: Enable CSP headers
3. **Input validation**: Validate all user input

### Q: How do I configure CORS?

**A**: Set the `CORS_ORIGIN` environment variable:

```bash
# Allow all origins (not recommended for production)
CORS_ORIGIN="*"

# Allow specific origin
CORS_ORIGIN="https://your-domain.com"
```

## Troubleshooting

### Q: I'm getting "Port already in use" error

**A**: Try these solutions:

```bash
# Change port in .env
echo "PORT=3001" >> .env

# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Q: Tests are failing, what should I do?

**A**: Try these steps:

1. **Check test environment**: Ensure `NODE_ENV=test`
2. **Run specific test**: Run failing test individually
3. **Check dependencies**: Ensure all dependencies are installed
4. **Check test data**: Verify test fixtures and data

### Q: How do I debug performance issues?

**A**: Use these tools:

```bash
# Generate performance profile
bun run profile

# View memory usage
curl http://localhost:3000/metrics

# Monitor in real-time
bun run dev:profile
```

### Q: How do I clear the application cache?

**A**: Use the admin endpoint:

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/admin/cache/clear
```

## R2 Storage

### Q: How do I test R2 connection?

**A**: Use the CLI:

```bash
bun run cli.js status
```

### Q: R2 uploads are failing, what should I check?

**A**: Verify:

1. **Credentials**: Check R2 credentials are correct
2. **Bucket permissions**: Ensure bucket has proper permissions
3. **CORS settings**: Configure CORS for your domain
4. **Network connectivity**: Test network connection to R2

### Q: How do I migrate from local storage to R2?

**A**: Use the sync command:

```bash
bun run sync
```

This uploads local posts to R2 storage.

## General

### Q: Where can I find more documentation?

**A**: Check these resources:

- [Main Documentation](../README.md)
- [API Reference](../api-reference/server-api.md)
- [Troubleshooting Guide](./common-issues.md)
- [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)

### Q: How do I contribute to the project?

**A**: See the [Contributing Guidelines](../../CONTRIBUTING.md) for information on how to contribute.

### Q: Where can I get help?

**A**: You can:

1. **Check the FAQ**: This document
2. **Read documentation**: Project documentation
3. **Create an issue**: [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
4. **Join discussions**: [GitHub Discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)

### Q: How do I update the application?

**A**: To update:

1. **Pull latest changes**: `git pull origin main`
2. **Update dependencies**: `bun install`
3. **Test locally**: Run tests and verify functionality
4. **Deploy**: Deploy to your platform

### Q: What should I do if I find a security vulnerability?

**A**: Please report security vulnerabilities privately by:

1. **Creating a private issue**: If you have access
2. **Emailing the maintainers**: Contact information in repository
3. **Wait for response**: Maintainers will respond within 48 hours

Do not report security vulnerabilities in public issues.

## Performance Benchmarks

### Q: What are the expected performance metrics?

**A**: Based on our benchmarks:

- **RSS Generation**: 22,246 posts/second
- **DNS Prefetching**: 0.06ms per host
- **Memory Usage**: < 100MB baseline
- **Response Time**: < 100ms for cached content

### Q: How do I run performance benchmarks?

**A**: Run:

```bash
bun run benchmark
```

This runs the built-in performance benchmarks.

## Support

If you can't find an answer to your question:

1. **Search existing issues**: Check [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
2. **Create a new issue**: Include detailed information about your problem
3. **Join the community**: [GitHub Discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)
4. **Check documentation**: Review relevant documentation sections

When creating an issue, please include:

- **Environment details** (OS, Bun version, Node.js version)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Error messages** and stack traces
- **Relevant configuration** files
- **Screenshots** if applicable

This helps maintainers understand and resolve your issue more quickly.