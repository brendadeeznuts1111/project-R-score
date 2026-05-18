# 🩺 Fire22 Health Check CLI

A comprehensive health monitoring and status reporting tool for the Fire22
Dashboard Worker.

## Features

- **Real-time Health Monitoring**: Check the status of all system components
- **Performance Metrics**: Track response times, success rates, uptime, and
  error rates
- **Security Status**: Monitor SSL, firewall, DDoS protection, and encryption
- **Multiple Output Formats**: Text, JSON, and detailed formats
- **Component-specific Checks**: Test individual system components
- **Endpoint Testing**: Verify health check endpoints
- **Statistics Overview**: Get system health scores and component status

## Quick Start

### Basic Health Check

```bash
# Using npm scripts (recommended)
bun run health

# Or run directly
bun scripts/health-check-cli.ts
```

### Output Example

```text
💚 API Health Check
🔍 Scanning all endpoints...

✅ API Gateway: Healthy
✅ Authentication: Healthy
✅ Database: Healthy
✅ Cache: Healthy
✅ Monitoring: Healthy

📊 Performance:
• Response Time: 142ms
• Success Rate: 99.9%
• Uptime: 99.9%
• Error Rate: 0.1%

🛡️ Security:
• SSL: Active
• Firewall: Enabled
• DDoS Protection: Active
• Encryption: AES-256

✅ All systems operational!
```

## Available Commands

### Health Check Commands

- `bun run health` - Run comprehensive health check
- `bun run health:check` - Same as above
- `bun run health:component <name>` - Check specific component
- `bun run health:endpoint` - Test health endpoint
- `bun run health:stats` - Show health statistics

### Direct Script Usage

```bash
# Basic check
bun scripts/health-check-cli.ts

# JSON format
bun scripts/health-check-cli.ts --format json

# Check specific component
bun scripts/health-check-cli.ts component database

# Verbose output
bun scripts/health-check-cli.ts --verbose

# Test endpoint
bun scripts/health-check-cli.ts endpoint --endpoint http://localhost:3001/api/health

# Show statistics
bun scripts/health-check-cli.ts stats
```

## Command Reference

### Options

- `-f, --format <type>` - Output format: `text`, `json`, `detailed` (default:
  `text`)
- `-c, --component <name>` - Component to check (can be used multiple times)
- `-t, --timeout <ms>` - Request timeout in milliseconds (default: `10000`)
- `-v, --verbose` - Enable verbose output
- `-e, --endpoint <url>` - Health endpoint URL to test
- `-h, --help` - Show help message

### Commands

- `check` - Run comprehensive health check (default)
- `component <name>` - Check specific component health
- `endpoint` - Test health endpoint
- `stats` - Show health statistics

## Monitored Components

The health check monitors these core system components:

1. **Database** - Connection status and query performance
2. **API Gateway** - Endpoint availability and response times
3. **Authentication** - User authentication and authorization
4. **Cache** - Caching system performance
5. **Monitoring** - Internal monitoring systems

## Output Formats

### Text Format (Default)

Human-readable format with emojis and clear status indicators.

### JSON Format

Structured JSON output for programmatic consumption:

```json
{
  "title": "API Health Check",
  "status": "healthy",
  "components": {
    "API Gateway": "healthy",
    "Authentication": "healthy",
    "Database": "healthy",
    "Cache": "healthy",
    "Monitoring": "healthy"
  },
  "performance": {
    "responseTime": "142ms",
    "successRate": "99.9%",
    "uptime": "99.9%",
    "errorRate": "0.1%"
  },
  "security": {
    "ssl": "Active",
    "firewall": "Enabled",
    "ddosProtection": "Active",
    "encryption": "AES-256"
  },
  "timestamp": "2025-08-29T05:45:32.136Z",
  "executionTime": "22ms"
}
```

## Integration

### CI/CD Integration

Add to your CI/CD pipeline for automated health monitoring:

```yaml
# .github/workflows/health-check.yml
- name: Health Check
  run: bun run health --format json
```

### Monitoring Integration

Use with monitoring systems:

```bash
# Cron job for regular health checks
*/5 * * * * /path/to/dashboard-worker/bun run health >> /var/log/health-check.log
```

### API Integration

Parse JSON output in other systems:

```javascript
const healthCheck = JSON.parse(
  await Bun.$`bun run health --format json`.text()
);
if (healthCheck.status !== 'healthy') {
  // Alert or take action
}
```

## Configuration

The health check CLI uses the existing `HealthMonitor` class from
`src/monitoring/health-check.ts`. Configuration options include:

- **Component List**: Define which components to monitor
- **Health Check Intervals**: Set periodic check frequency
- **Timeout Settings**: Configure request timeouts
- **Custom Endpoints**: Specify health check endpoints

## Troubleshooting

### Common Issues

1. **Component shows "Unknown" status**

   - Check component name spelling
   - Verify component is included in the monitor configuration

2. **Endpoint test fails**

   - Verify endpoint URL is correct
   - Check if the service is running
   - Confirm network connectivity

3. **JSON format not working**
   - Use `--format json` option
   - Check for JSON parsing errors in consuming applications

### Debug Mode

Enable verbose output for detailed information:

```bash
bun run health --verbose
```

## Architecture

The health check CLI integrates with:

- **HealthMonitor Class**: Core health monitoring logic
- **HealthUtils**: Utility functions for health checks
- **Component Health Checks**: Individual component monitoring
- **Performance Metrics**: Response time and throughput tracking
- **Security Monitoring**: SSL, firewall, and encryption status

## Development

### Adding New Components

1. Add component to `HealthMonitor` constructor
2. Implement component-specific health check method
3. Update CLI display logic if needed

### Custom Health Checks

Extend the `HealthMonitor` class for custom health check logic:

```typescript
class CustomHealthMonitor extends HealthMonitor {
  async checkCustomComponent(): Promise<ComponentHealth> {
    // Custom health check logic
  }
}
```

## Related Documentation

- [Health Check API Reference](../src/monitoring/health-check.ts)
- [System Monitoring Guide](./monitoring.md)
- [Performance Monitoring](./performance-monitoring.md)
- [Security Monitoring](./security-monitoring.md)
