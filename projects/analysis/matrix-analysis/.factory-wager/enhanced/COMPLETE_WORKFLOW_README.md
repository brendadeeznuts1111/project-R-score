

# FactoryWager Complete Enhanced Workflow v2.0

## 🚀 Overview

This is the complete FactoryWager enhanced deployment pipeline that orchestrates AI-powered validation, intelligent release management, and progressive rollout with real-time monitoring.

## 📋 Workflow Components

### 1. Enhanced Release Orchestrator

- **File**: `fw-release-enhanced.ts`

- **Purpose**: AI-powered release with validation and auto-fix

- **Features**: ML insights, predictive analytics, compliance checking

### 2. Enhanced Rollout Scheduler

- **File**: `rollout-scheduler.ts`

- **Purpose**: Enterprise-grade progressive rollout with comprehensive monitoring

- **Features**: Risk assessment, auto-rollback, SSE notifications

### 3. Simple Rollout Scheduler

- **File**: `simple-rollout-scheduler.ts`

- **Purpose**: Streamlined A/B rollout based on original concept

- **Features**: Progressive phases (5% → 25% → 50% → 100%), real-time metrics

### 4. Complete Workflow Script

- **File**: `complete-workflow.sh`

- **Purpose**: Orchestrates the entire deployment pipeline

- **Features**: Health checks, monitoring, graceful shutdown

## 🔧 Quick Start

### Option 1: Complete Workflow (Recommended)

```bash

# Run the complete enhanced workflow

./.factory-wager/enhanced/complete-workflow.sh
```

### Option 2: Quick Start

```bash

# Quick mode (skip health checks)

./.factory-wager/enhanced/complete-workflow.sh --quick
```

### Option 3: Manual Step-by-Step

```bash

# 1. Enhanced release with validation

bun run ".factory-wager/enhanced/fw-release-enhanced.ts" --auto-approve --auto-fix

# 2. Progressive rollout

bun run ".factory-wager/enhanced/simple-rollout-scheduler.ts" start

# 3. Monitor both systems

curl http://localhost:3002/status  # Enhanced rollout
curl http://localhost:3003/status  # Simple rollout
```

## 📊 Monitoring Dashboard

### Access the Dashboard

```bash

# Show all available endpoints

./.factory-wager/enhanced/monitor-dashboard.sh

# Start live monitoring

./.factory-wager/enhanced/monitor-dashboard.sh --live
```

### Key Endpoints

**Enhanced Rollout (Port 3002)**:

- Status: `http://localhost:3002/status`

- Events: `http://localhost:3002/events`

**Simple Rollout (Port 3003)**:

- Status: `http://localhost:3003/status`

- Events: `http://localhost:3003/events`

- Health: `http://localhost:3003/health`

### Real-Time Monitoring Commands

```bash

# Watch enhanced rollout

watch -n 2 'curl -s http://localhost:3002/status | jq .'

# Watch simple rollout

watch -n 2 'curl -s http://localhost:3003/status | jq .'

# Stream SSE events

curl -N http://localhost:3002/events
curl -N http://localhost:3003/events
```

## 🎯 Workflow Phases

### Phase 1: Environment Validation

- Validates Bun runtime and dependencies

- Checks configuration files

- Creates default config if needed

### Phase 2: Enhanced Release with AI Validation

- Runs AI-powered configuration analysis

- Applies auto-fixes for validation violations

- Generates comprehensive release reports

### Phase 3: Service Health Verification

- Verifies enhanced rollout service health

- Checks simple rollout service status

- Ensures all endpoints are accessible

### Phase 4: Progressive Rollout Initiation

- Starts simple rollout scheduler

- Begins progressive A/B rollout

- Initializes real-time monitoring

### Phase 5: Real-time Monitoring Dashboard

- Displays monitoring URLs and commands

- Shows initial rollout metrics

- Provides access to live dashboards

### Phase 6: Continuous Monitoring

- Monitors health scores and metrics

- Collects performance data

- Tracks rollout progress

### Phase 7: Workflow Completion

- Generates final reports

- Summarizes deployment results

- Provides next steps

## 📈 Metrics and Analytics

### Collected Metrics

- **Health Scores**: Real-time system health

- **Request Metrics**: Success rates, response times

- **Rollout Progress**: Phase advancement tracking

- **Error Tracking**: Error rates and patterns

- **Performance**: System performance indicators

### Generated Reports

- **Workflow Log**: Detailed execution log

- **Metrics File**: JSON-formatted metrics data

- **Summary Report**: Markdown summary with results

## 🛠️ Configuration

### Environment Variables

```bash

# Optional: Set custom configuration

export FACTORY_WAGER_ENV=production
export FACTORY_WAGER_RISK_THRESHOLD=70
export FACTORY_WAGER_AUTO_APPROVE=true
```

### Configuration File

```yaml

# config.yaml

app:
  name: "factory-wager-enhanced"
  version: "2.0.0"
  environment: "production"

deployment:
  strategy: "canary"
  auto_approve: true
  auto_fix: true

monitoring:
  enabled: true
  port: 3002
  simple_port: 3003
```

## 🚨 Troubleshooting

### Common Issues

**Services Not Starting**
```bash

# Check if ports are available

lsof -i :3002
lsof -i :3003

# Kill existing processes

pkill -f "rollout-scheduler"
pkill -f "fw-release-enhanced"
```

**Health Checks Failing**
```bash

# Manual health check

curl -v http://localhost:3002/status
curl -v http://localhost:3003/status

# Check logs

tail -f .factory-wager/logs/workflow-*.log
```

**Permission Issues**
```bash

# Make scripts executable

chmod +x .factory-wager/enhanced/*.sh
```

### Debug Mode

```bash

# Enable verbose logging

DEBUG=factory-wager:* ./complete-workflow.sh

# Run individual components with debug

DEBUG=* bun run ".factory-wager/enhanced/fw-release-enhanced.ts"
```

## 🎚️ Advanced Usage

### Custom Rollout Configuration

```typescript
// Modify simple-rollout-scheduler.ts
const phases = [1, 5, 10, 25, 50, 75, 100]; // Custom phases
const phaseDuration = 120000; // 2 minutes per phase
```

### Integration with External Systems

```typescript
// Add custom metrics
scheduler.recordCustomMetric('business_metric', value);

// Custom webhook notifications
scheduler.on('phase_advanced', (phase) => {
  notifySlack(`Advanced to phase ${phase}`);
});
```

### Multi-Environment Deployment

```bash

# Development

./complete-workflow.sh --env=development

# Staging

./complete-workflow.sh --env=staging

# Production

./complete-workflow.sh --env=production
```

## 📚 Integration Examples

### Express.js Integration

```typescript
import { rolloutMiddleware } from './simple-rollout-scheduler.ts';

app.use('/new-feature', rolloutMiddleware, (req, res) => {
  res.json({ feature: 'enabled', phase: scheduler.getCurrentPhase() });
});
```

### Fetch Integration

```typescript
import { createRolloutScheduler } from './simple-rollout-scheduler.ts';

const scheduler = createRolloutScheduler();

async function apiCall(url: string) {
  if (!scheduler.shouldServeRequest()) {
    throw new Error('Feature not available in current phase');
  }
  
  return fetch(url);
}
```

### Kubernetes Integration

```yaml

# deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: factory-wager-enhanced
spec:
  template:
    spec:
      containers:
      - name: enhanced-workflow
        image: factory-wager:enhanced-v2.0
        ports:
        - containerPort: 3002
        - containerPort: 3003
        env:
        - name: FACTORY_WAGER_ENV
          value: "production"
```

## 🔮 Future Enhancements

### Planned Features

- **Multi-Region Rollout**: Coordinate rollouts across regions

- **Advanced Analytics**: Machine learning-powered optimization

- **Custom Hooks**: Pre/post deployment hooks

- **Rollback Templates**: Predefined rollback strategies

- **Performance Baselines**: Automated performance comparison

### Extensibility

- **Plugin System**: Custom validation plugins

- **Metric Collectors**: Custom metric collection

- **Notification Channels**: Slack, Teams, email integrations

- **Dashboard Themes**: Customizable dashboard themes

## 📞 Support

### Getting Help

```bash

# Show help for complete workflow

./complete-workflow.sh --help

# Show monitoring dashboard help

./monitor-dashboard.sh --help
```

### Community

- **Issues**: Report bugs and request features

- **Discussions**: Ask questions and share experiences

- **Contributions**: Submit pull requests and improvements

---

**FactoryWager Complete Enhanced Workflow v2.0** provides enterprise-grade deployment automation with AI-powered validation, intelligent rollback, and comprehensive monitoring. Perfect for production environments where reliability and user experience are paramount. 🚀

