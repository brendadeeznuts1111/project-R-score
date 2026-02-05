# Common Issues and Solutions

This guide covers common issues you might encounter while using or developing the RSS Feed Optimization project.

## Installation Issues

### Bun Installation Problems

**Problem**: Bun fails to install or isn't recognized.

**Solutions**:
```bash
# Check if Bun is in your PATH
echo $PATH

# Add Bun to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc
```

**Alternative**: Use npm installation
```bash
npm install -g bun
```

### Dependency Installation Failures

**Problem**: `bun install` fails with dependency errors.

**Solutions**:
```bash
# Clear Bun cache and retry
bun install --force

# Try with verbose output
bun install --verbose

# Check Bun version compatibility
bun --version
```

### Permission Errors

**Problem**: Permission denied errors during installation.

**Solutions**:
```bash
# Use sudo for global installation
sudo npm install -g bun

# Or fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## Runtime Issues

### Port Already in Use

**Problem**: Development server fails to start due to port conflict.

**Solutions**:
```bash
# Change the port in .env
echo "PORT=3001" >> .env

# Or find and kill the process using the port
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Environment Variables Not Loading

**Problem**: Application can't find environment variables.

**Solutions**:
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are set
echo $BLOG_TITLE
echo $ADMIN_TOKEN

# Source the environment file manually
source .env
```

### R2 Connection Issues

**Problem**: Cannot connect to R2 storage.

**Solutions**:
```bash
# Verify R2 credentials
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
echo $R2_BUCKET_NAME

# Test R2 connection
bun run cli.js status

# Check R2 bucket permissions
# Ensure the bucket exists and has proper CORS settings
```

## Development Issues

### Hot Reload Not Working

**Problem**: Changes don't reflect in the browser automatically.

**Solutions**:
```bash
# Start with hot reload enabled
bun run dev:hot

# Check if watch mode is enabled in bunfig.toml
# Ensure files are being watched

# Clear browser cache
# Try hard refresh (Ctrl+F5 or Cmd+Shift+R)
```

### Tests Failing

**Problem**: Tests fail with unexpected errors.

**Solutions**:
```bash
# Run tests with verbose output
bun test --verbose

# Run specific test file
bun test tests/dns-optimization.test.js

# Check test environment
echo $NODE_ENV

# Reset test environment
bun run test:reset
```

### Linting Errors

**Problem**: Code doesn't pass linting checks.

**Solutions**:
```bash
# Check linting errors
bun run lint

# Fix auto-fixable issues
bun run lint:fix

# Check Biome configuration
# Ensure .biome.json exists and is properly configured
```

## Performance Issues

### Slow RSS Feed Generation

**Problem**: RSS feeds take too long to generate.

**Solutions**:
```bash
# Enable caching
ENABLE_CACHE=true

# Increase cache TTL
CACHE_TTL=600

# Check for performance bottlenecks
bun run profile

# Monitor memory usage
bun run profile:memory
```

### High Memory Usage

**Problem**: Application uses too much memory.

**Solutions**:
```bash
# Check memory usage
curl http://localhost:3000/metrics

# Clear cache
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/admin/cache/clear

# Reduce cache size
MAX_CACHE_SIZE=50

# Monitor memory leaks
bun run profile:memory
```

### DNS Prefetching Not Working

**Problem**: DNS prefetching isn't improving performance.

**Solutions**:
```bash
# Check Bun version supports dns.prefetch()
bun --version

# Verify DNS prefetching is enabled
ENABLE_DNS_PREFETCH=true

# Check network performance
curl http://localhost:3000/performance/network

# Test with specific RSS feeds
# Ensure feeds are accessible
```

## Deployment Issues

### Application Won't Start in Production

**Problem**: Application fails to start in production environment.

**Solutions**:
```bash
# Check production environment variables
# Ensure all required variables are set

# Check logs for specific errors
# Look for missing dependencies or configuration issues

# Verify Node.js/Bun version compatibility
bun --version

# Test locally with production configuration
NODE_ENV=production bun run start
```

### SSL/HTTPS Issues

**Problem**: SSL certificate problems or HTTPS not working.

**Solutions**:
```bash
# Enable HTTPS in .env
ENABLE_HTTPS=true
FORCE_HTTPS=true

# Check SSL certificate configuration
# Ensure certificate files are accessible

# Test with HTTP first
# Verify application works before enabling HTTPS
```

### Rate Limiting Too Aggressive

**Problem**: Legitimate requests are being rate limited.

**Solutions**:
```bash
# Adjust rate limiting settings
RATE_LIMIT_WINDOW_MS=1800000  # 30 minutes
RATE_LIMIT_MAX_REQUESTS=200

# Check rate limit headers
curl -I http://localhost:3000/

# Monitor rate limiting
curl http://localhost:3000/metrics
```

## RSS Feed Issues

### RSS Feed Not Validating

**Problem**: RSS feed fails validation.

**Solutions**:
```bash
# Check RSS feed format
curl http://localhost:3000/rss.xml

# Validate with online tools
# Use W3C Feed Validation Service

# Check for XML syntax errors
# Ensure proper escaping of special characters
```

### RSS Feed Missing Content

**Problem**: RSS feed doesn't include expected content.

**Solutions**:
```bash
# Check post content
curl http://localhost:3000/posts/slug

# Verify post format
# Ensure posts have required fields (title, content, etc.)

# Check R2 storage
# Verify posts are properly stored and accessible
```

### Category RSS Feeds Not Working

**Problem**: Category-specific RSS feeds return errors.

**Solutions**:
```bash
# Check category names
# Ensure categories match post tags

# Verify category logic
# Check how categories are determined from tags

# Test with known categories
curl http://localhost:3000/rss/technology.xml
```

## Browser Issues

### CORS Errors

**Problem**: Cross-origin resource sharing errors.

**Solutions**:
```bash
# Check CORS configuration
CORS_ORIGIN="*"

# Verify request headers
# Ensure proper origin headers

# Test with different origins
# Check if issue is origin-specific
```

### Cache Issues

**Problem**: Browser shows old content.

**Solutions**:
```bash
# Clear browser cache
# Use hard refresh (Ctrl+F5 or Cmd+Shift+R)

# Check cache headers
curl -I http://localhost:3000/

# Disable caching for development
# Set appropriate cache headers
```

## Debugging Tips

### Enable Debug Mode

```bash
# Set debug environment variable
DEBUG=true
LOG_LEVEL=debug

# Restart application
bun run dev
```

### Check Application Logs

```bash
# View console output
# Look for error messages and warnings

# Check specific log files
# If logging to files is enabled
```

### Use Browser Developer Tools

```bash
# Open browser developer tools
# Check Network tab for failed requests
# Check Console tab for JavaScript errors
# Check Application tab for storage issues
```

### Monitor Performance

```bash
# Use built-in performance monitoring
curl http://localhost:3000/metrics

# Generate performance profiles
bun run profile

# Check memory usage
bun run profile:memory
```

## Getting Help

### Documentation

- Check the [Configuration Guide](../getting-started/configuration.md)
- Review the [API Reference](../api-reference/server-api.md)
- Read the [Troubleshooting FAQ](./faq.md)

### Community Support

- [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
- [GitHub Discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)

### When to Create an Issue

Create a GitHub issue if:

1. You've tried all troubleshooting steps
2. You have a clear reproduction case
3. The issue affects functionality
4. You have relevant logs or error messages

### Information to Include

When creating an issue, include:

1. **Environment details** (OS, Bun version, Node.js version)
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Error messages** and stack traces
5. **Relevant configuration** files
6. **Screenshots** if applicable

## Prevention Tips

### Regular Maintenance

```bash
# Update dependencies regularly
bun update

# Monitor performance metrics
# Check logs for warnings

# Backup important data
# Test backup restoration
```

### Best Practices

1. **Use environment-specific configurations**
2. **Monitor application metrics**
3. **Keep dependencies updated**
4. **Test deployments before production**
5. **Use version control for configuration**
6. **Document custom configurations**

Remember: Most issues can be resolved by checking logs, verifying configuration, and following the troubleshooting steps above. If you're still having issues, don't hesitate to reach out to the community for help!