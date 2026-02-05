# Live Events (SSE)

Real-time event streaming using Server-Sent Events.

## GET /api/live

Stream real-time dashboard updates and system events.

### Connection

```javascript
const eventSource = new EventSource('/api/live');
```

### Event Types

#### fire22-status

Real-time Fire22 API status updates.

#### system-metrics

System performance metrics and health data.

#### user-actions

Interactive dashboard updates and user activities.
