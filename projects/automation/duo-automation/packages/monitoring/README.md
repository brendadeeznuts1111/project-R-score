# @duoplus/monitoring

Enterprise system monitoring, health checks, and dashboards for production applications.

## Features

- 🔍 **Health Checks**: Comprehensive system health monitoring
- 📊 **Metrics Collection**: Real-time performance metrics
- 📱 **Dashboards**: Beautiful real-time visualization
- 🚨 **Alerting**: Automated alert system
- 📈 **Analytics**: Performance analytics and reporting

## Installation

```bash
bun add @duoplus/monitoring
```

## Quick Start

```typescript
import { createHealthCheck, devDashboard } from '@duoplus/monitoring';

// Health check endpoint
const health = createHealthCheck();
console.log(health);

// Development dashboard
const dashboard = devDashboard.getDashboardData();
console.log(dashboard);
```

## Packages

- `@duoplus/monitoring/health` - Health check framework
- `@duoplus/monitoring/metrics` - Metrics collection
- `@duoplus/monitoring/dashboards` - Dashboard components

## Documentation

See the [full documentation](https://duoplus.com/monitoring) for detailed usage examples.

## License

MIT © DuoPlus Enterprise Team
