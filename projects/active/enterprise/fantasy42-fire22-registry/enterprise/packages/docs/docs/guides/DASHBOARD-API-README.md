# Fire22 Dashboard API

Real-time API endpoints for Fire22 Analytics and Performance Dashboards

## 🚀 Quick Start

### 1. Start the Dashboard API Server

```bash
# Install dependencies (if needed)
bun install

# Start the API server
bun run dashboard-server.ts
```

The server will start on `http://localhost:3001`

### 2. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Get API info
curl http://localhost:3001/api

# Get dashboard metrics
curl http://localhost:3001/api/dashboard/metrics

# Get analytics data
curl http://localhost:3001/api/dashboard/analytics

# Get system health
curl http://localhost:3001/api/dashboard/health

# Get API performance
curl http://localhost:3001/api/dashboard/performance
```

### 3. View the Dashboards

- **Analytics Dashboard**: Open `analytics/index.html` in your browser
- **Performance Dashboard**: Open `performance-dashboard.html` in your browser

## 📊 API Endpoints

### GET `/api/dashboard/metrics`

Returns real-time system metrics

**Response:**

```json
{
  "responseTime": 142,
  "throughput": 1247,
  "errorRate": 0.02,
  "uptime": 99.94,
  "cpuUsage": 23,
  "memoryUsage": 67,
  "activeConnections": 342,
  "cacheHitRate": 87,
  "dbQueries": 156,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/dashboard/analytics`

Returns analytics data for charts and visualizations

**Query Parameters:**

- `timeframe`: Time period (e.g., '7d', '30d')
- `points`: Number of data points (default: 30)

**Response:**

```json
{
  "revenue": [85000, 92000, 101000, ...],
  "users": [12000, 13500, 14200, ...],
  "engagement": [65, 72, 68, ...],
  "roi": [200, 220, 240, ...],
  "labels": ["2024-01-01", "2024-01-02", ...],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/dashboard/health`

Returns system health status

**Response:**

```json
{
  "status": "healthy",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "websocket": "healthy",
    "cache": "healthy"
  },
  "uptime": 86400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/dashboard/performance`

Returns API endpoint performance metrics

**Response:**

```json
{
  "endpoints": [
    {
      "path": "/api/manager/getLiveWagers",
      "method": "GET",
      "avgResponseTime": 89,
      "requestsPerMinute": 234,
      "errorRate": 0.01,
      "status": "healthy",
      "lastCheck": "2024-01-15T10:30:00.000Z"
    }
  ],
  "totalEndpoints": 4,
  "healthyEndpoints": 3,
  "averageResponseTime": 203.25,
  "totalRequestsPerMinute": 535,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Dashboard API Configuration
PORT=3001
NODE_ENV=development

# CORS Settings
CORS_ORIGIN=*

# API Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database Connection (if using real data)
DATABASE_URL=postgresql://user:password@localhost:5432/fire22

# Fantasy402 Integration
FANTASY402_API_KEY=your_api_key_here
FANTASY402_BASE_URL=https://api.fantasy402.com/v2
```

### Production Deployment

For production deployment, update the API URLs in the dashboard files:

1. **Analytics Dashboard** (`analytics/analytics.js`):

   ```javascript
   const apiBaseUrl =
     window.location.hostname === 'localhost'
       ? 'http://localhost:3001'
       : 'https://your-production-api.com';
   ```

2. **Performance Dashboard** (`performance-dashboard.html`):
   ```javascript
   const apiBaseUrl =
     window.location.hostname === 'localhost'
       ? 'http://localhost:3001'
       : 'https://your-production-api.com';
   ```

## 🏗️ Architecture

### Current Implementation

- **Simulated Data**: Currently returns realistic simulated data
- **Fallback Strategy**: Dashboards gracefully fall back to demo data if API is
  unavailable
- **Real-time Updates**: 30-second refresh intervals with WebSocket support
  ready

### Integration Points

- **Fantasy402 API**: Ready for real Fantasy402 data integration
- **Database**: Prepared for PostgreSQL/SQLite integration
- **WebSocket**: Configured for real-time data streaming
- **Caching**: Ready for Redis/memory caching implementation

## 🔄 Connecting Real Data

### 1. Database Integration

Replace simulated data with real database queries:

```typescript
// In dashboard.controller.ts
export async function getMetrics(request: ValidatedRequest): Promise<Response> {
  const metrics = await db.query(
    "SELECT * FROM system_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'"
  );
  // Process and return real data
}
```

### 2. Fantasy402 Integration

Connect to real Fantasy402 endpoints:

```typescript
// In dashboard.controller.ts
export async function getAnalytics(
  request: ValidatedRequest
): Promise<Response> {
  const fantasyData = await fantasy402Client.getAnalytics({
    timeframe: '7d',
    metrics: ['revenue', 'users', 'engagement'],
  });
  // Process and return real data
}
```

### 3. WebSocket Real-time Updates

Enable real-time data streaming:

```typescript
// WebSocket connection for live updates
const ws = new WebSocket('wss://your-websocket-server.com');
ws.onmessage = event => {
  const data = JSON.parse(event.data);
  updateDashboard(data);
};
```

## 📱 Dashboard Features

### Analytics Dashboard

- 📊 Real-time KPI metrics
- 📈 Interactive charts (Chart.js)
- 🎯 ROI calculator
- 🔗 Fantasy402 integration status
- 📱 Mobile responsive
- 🎨 Professional terminal theme

### Performance Dashboard

- ⚡ Real-time system monitoring
- 🔌 API endpoint performance
- 💻 Resource usage tracking
- 🏥 System health diagnostics
- 📊 Performance optimization tools
- 🎨 Terminal-inspired UI

## 🚀 Deployment

### GitHub Pages

The dashboards are ready for GitHub Pages deployment. Simply:

1. Enable GitHub Pages in repository settings
2. Set source to "main" branch
3. Access at: `https://yourusername.github.io/repository-name/`

### Production API Server

For production, deploy the API server:

```bash
# Using Bun
bun build dashboard-server.ts --target=bun --outdir=./dist
bun run ./dist/dashboard-server.js

# Using Docker
docker build -t fire22-dashboard-api .
docker run -p 3001:3001 fire22-dashboard-api
```

## 🔐 Security

### API Security Features

- ✅ CORS protection
- ✅ Rate limiting ready
- ✅ Input validation
- ✅ Error handling
- ✅ No sensitive data exposure

### Production Security

- 🔒 Use HTTPS in production
- 🔑 Implement API key authentication
- 🛡️ Add request validation
- 📊 Enable logging and monitoring
- 🚨 Set up alerts for anomalies

## 📈 Monitoring & Analytics

### Built-in Monitoring

- Health check endpoints
- Performance metrics tracking
- Error rate monitoring
- System resource monitoring

### External Monitoring

- Application Performance Monitoring (APM)
- Error tracking services
- Log aggregation
- Alert systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.

## 🆘 Support

For support and questions:

- 📧 Email: support@fire22.com
- 💬 Discord: [Fire22 Community](https://discord.gg/fire22)
- 📖 Documentation: [Fire22 Docs](https://docs.fire22.com)

---

**🎯 Ready to go live?** Your Fire22 dashboards are now connected to real API
endpoints with graceful fallbacks to demo data. Deploy the API server and update
the dashboard URLs to start seeing real-time Fire22 metrics!
