# FactoryWager Enhanced Rollout Integration Guide

## 🚀 Overview

The Enhanced Rollout Scheduler integrates seamlessly with FactoryWager Enhanced Workflows to provide progressive, risk-aware deployment with real-time monitoring and automatic rollback capabilities.

## 📋 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FactoryWager Enhanced                    │
│                    Release Orchestrator                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Enhanced Rollout Scheduler                    │
│  • Progressive A/B rollout (5% → 25% → 50% → 100%)         │
│  • Real-time risk assessment                               │
│  • SSE notifications                                       │
│  • Auto-rollback on health degradation                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Traffic & Monitoring                        │
│  • Request routing based on rollout phase                  │
│  • Real-time metrics collection                            │
│  • Health score calculation                                │
│  • SSE dashboard updates                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Rollout Phases

### Phase 0: Initial Canary (5%)

- **Duration**: 2 minutes
- **Risk Score**: 65/100
- **Purpose**: Initial validation with minimal user impact
- **Success Criteria**: Error rate < 1%, response time < 500ms

### Phase 1: Limited Rollout (25%)

- **Duration**: 3 minutes
- **Risk Score**: 55/100
- **Purpose**: Expanded testing with moderate user exposure
- **Success Criteria**: Error rate < 0.5%, health score > 85%

### Phase 2: Balanced Rollout (50%)

- **Duration**: 4 minutes
- **Risk Score**: 45/100
- **Purpose**: Majority rollout with comprehensive monitoring
- **Success Criteria**: Error rate < 0.3%, health score > 90%

### Phase 3: Full Deployment (100%)

- **Duration**: 5 minutes
- **Risk Score**: 35/100
- **Purpose**: Complete deployment with full traffic
- **Success Criteria**: Error rate < 0.1%, health score > 95%

## 🔧 Usage Examples

### Basic Rollout
```bash
# Start progressive rollout
bun run ".factory-wager/enhanced/rollout-scheduler.ts" start

# Monitor progress
curl http://localhost:3002/status

# Listen to SSE events
curl -N http://localhost:3002/events
```

### Integration with Enhanced Release
```bash
# Complete enhanced release with progressive rollout
bun run ".factory-wager/enhanced/fw-release-enhanced.ts" \
  --env=production \
  --strategy=canary \
  --auto-approve \
  --auto-fix

# Then start progressive rollout
bun run ".factory-wager/enhanced/rollout-scheduler.ts" start
```

### Manual Control
```bash
# Pause rollout for investigation
bun run ".factory-wager/enhanced/rollout-scheduler.ts" pause

# Resume rollout
bun run ".factory-wager/enhanced/rollout-scheduler.ts" resume

# Force advance to next phase
bun run ".factory-wager/enhanced/rollout-scheduler.ts" advance

# Emergency rollback
bun run ".factory-wager/enhanced/rollout-scheduler.ts" rollback
```

## 📊 Real-Time Monitoring

### SSE Events
The rollout scheduler emits real-time events via Server-Sent Events:

```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3002/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'rollout_started':
      console.log('Rollout started:', data.phase);
      break;
    case 'phase_advanced':
      console.log(`Advanced to phase ${data.toPhase}: ${data.percentage}% traffic`);
      break;
    case 'metrics_update':
      console.log('Health:', data.health);
      break;
    case 'rollback_completed':
      console.log('Rollback triggered!');
      break;
  }
};
```

### REST API
```bash
# Get current status
curl http://localhost:3002/status

# Response includes:
{
  "state": {
    "currentPhase": 1,
    "isRunning": true,
    "overallHealth": 92,
    "totalRequests": 1250,
    "totalErrors": 3
  },
  "currentPhase": {
    "description": "Limited rollout",
    "percentage": 25,
    "riskScore": 55,
    "metrics": {
      "requestsServed": 1250,
      "errorRate": 0.24,
      "responseTime": 145,
      "userSatisfaction": 96.2
    }
  },
  "progress": 25,
  "health": 92,
  "estimatedCompletion": "3:45 PM"
}
```

## 🚨 Risk Management & Auto-Rollback

### Health Score Calculation
The health score is calculated using weighted metrics:

```typescript
healthScore = (
  errorScore * 0.4 +           // Error rate impact
  responseScore * 0.3 +        // Response time impact
  satisfactionScore * 0.3      // User satisfaction impact
)
```

### Auto-Rollback Triggers
- **Health Score < 70%**: Automatic rollback to previous phase
- **Error Rate > 1%**: Immediate rollback
- **Response Time > 1000ms**: Rollback consideration
- **Manual Trigger**: Via CLI or API

### Rollback Process
1. **Detection**: Health monitoring detects degradation
2. **Alerting**: SSE notifications sent to all clients
3. **Rollback**: Traffic redirected to previous stable phase
4. **Analysis**: Rollback report generated
5. **Recovery**: System stabilized for investigation

## 🔌 Integration Patterns

### 1. Enhanced Release → Rollout Scheduler
```typescript
// After successful enhanced release
const releaseResult = await orchestrator.execute();

if (releaseResult.overallStatus === 'success') {
  console.log('🚀 Release successful, starting progressive rollout...');
  const scheduler = new EnhancedRolloutScheduler();
  await scheduler.start();
}
```

### 2. Request Routing Integration
```typescript
// In your application router
function handleRequest(req, res) {
  const scheduler = getRolloutScheduler(); // Singleton instance

  if (!scheduler.shouldServeRequest()) {
    // Route to old version or return 404
    return res.status(404).send('Feature not available');
  }

  const startTime = Date.now();
  try {
    // Process request with new version
    const result = await processRequest(req);
    scheduler.recordRequest(true, Date.now() - startTime);
    res.send(result);
  } catch (error) {
    scheduler.recordRequest(false, Date.now() - startTime);
    res.status(500).send('Internal error');
  }
}
```

### 3. Dashboard Integration
```typescript
// Real-time dashboard component
function RolloutDashboard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource('/events');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);
    };

    return () => eventSource.close();
  }, []);

  return (
    <div>
      <h2>Rollout Progress: {status?.progress}%</h2>
      <div>Current Phase: {status?.currentPhase?.description}</div>
      <div>Health Score: {status?.health}%</div>
      <div>Requests: {status?.state?.totalRequests}</div>
    </div>
  );
}
```

## 📈 Metrics & Analytics

### Key Performance Indicators
- **Rollout Success Rate**: Percentage of rollouts completed without rollback
- **Time to 100%**: Average time to reach full deployment
- **User Impact**: Number of users affected by issues
- **Recovery Time**: Time to rollback and stabilize

### Business Metrics
- **Revenue Impact**: Real-time revenue calculation during rollout
- **Conversion Rate**: Impact on user conversion during each phase
- **Customer Satisfaction**: User satisfaction scores by phase
- **Error Cost**: Financial impact of errors during rollout

### Generated Reports
- **Completion Report**: Full rollout analysis with metrics
- **Rollback Report**: Analysis of rollback causes and impact
- **Performance Report**: Response time and error rate trends
- **Business Impact Report**: Revenue and conversion analysis

## 🛠️ Configuration Options

### Rollout Configuration
```typescript
const config = {
  phases: [
    { id: 0, percentage: 5, duration: 2, riskScore: 65, description: 'Initial canary' },
    { id: 1, percentage: 25, duration: 3, riskScore: 55, description: 'Limited rollout' },
    { id: 2, percentage: 50, duration: 4, riskScore: 45, description: 'Balanced rollout' },
    { id: 3, percentage: 100, duration: 5, riskScore: 35, description: 'Full deployment' }
  ],
  autoAdvance: true,           // Automatically advance phases
  riskThreshold: 70,          // Health threshold for advancement
  enableRollback: true,        // Enable automatic rollback
  monitoringInterval: 30,      // Metrics collection interval (seconds)
  sseEnabled: true,           // Enable SSE notifications
  port: 3002                  // SSE server port
};
```

### Environment-Specific Configurations
```typescript
// Production (conservative)
const prodConfig = {
  phases: [
    { percentage: 1, duration: 10, riskScore: 85 },
    { percentage: 5, duration: 15, riskScore: 75 },
    { percentage: 20, duration: 30, riskScore: 65 },
    { percentage: 50, duration: 45, riskScore: 55 },
    { percentage: 100, duration: 60, riskScore: 45 }
  ],
  riskThreshold: 85
};

// Staging (aggressive)
const stagingConfig = {
  phases: [
    { percentage: 10, duration: 2, riskScore: 55 },
    { percentage: 50, duration: 3, riskScore: 45 },
    { percentage: 100, duration: 5, riskScore: 35 }
  ],
  riskThreshold: 70
};
```

## 🚨 Troubleshooting

### Common Issues

**Rollout not advancing**
- Check health score: `curl http://localhost:3002/status`
- Verify auto-advance is enabled
- Check if rollout is paused

**High error rate**
- Review application logs
- Check system resources
- Consider manual rollback

**SSE notifications not working**
- Verify port 3002 is accessible
- Check firewall settings
- Test with curl: `curl -N http://localhost:3002/events`

### Debug Mode
```bash
# Enable verbose logging
DEBUG=rollout:* bun run ".factory-wager/enhanced/rollout-scheduler.ts" start

# Monitor specific metrics
watch -n 2 'curl -s http://localhost:3002/status | jq ".health"'
```

## 🎯 Best Practices

### 1. Pre-Rollout Preparation
- Ensure monitoring is properly configured
- Set appropriate risk thresholds
- Test rollback procedures
- Prepare communication plans

### 2. During Rollout
- Monitor health scores closely
- Watch for anomaly patterns
- Maintain communication channels
- Document any issues

### 3. Post-Rollout
- Analyze performance metrics
- Review rollback triggers (if any)
- Update configuration based on learnings
- Share insights with team

### 4. Continuous Improvement
- Adjust phase durations based on historical data
- Refine risk thresholds
- Enhance monitoring coverage
- Automate more aspects of the process

## 📚 Advanced Features

### Custom Metrics
```typescript
// Add custom business metrics
scheduler.recordCustomMetric('feature_adoption', 0.15);
scheduler.recordCustomMetric('user_retention', 0.92);
```

### A/B Testing Integration
```typescript
// Combine with feature flags
const rolloutPercentage = scheduler.getCurrentPhase().percentage;
const featureFlagEnabled = Math.random() < rolloutPercentage;

if (featureFlagEnabled && userInTestGroup) {
  // Show new feature
} else {
  // Show old feature
}
```

### Multi-Region Rollout
```typescript
// Coordinate rollouts across regions
const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
const rollouts = regions.map(region =>
  new EnhancedRolloutScheduler({ region })
);

// Stagger regional rollouts
await rollouts[0].start();
setTimeout(() => rollouts[1].start(), 300000); // 5 minutes later
```

---

**FactoryWager Enhanced Rollout Scheduler** provides enterprise-grade progressive deployment capabilities with real-time monitoring, automatic rollback, and comprehensive analytics. Perfect for production environments where reliability and user experience are paramount. 🚀
