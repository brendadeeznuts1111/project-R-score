# 🚀 Matrix Insights Dashboard

Enterprise-grade analytics dashboard with SQLite backend, real-time ML insights, and Bun-native performance.

## ✨ Features

### 🎯 **Core Capabilities**
- **Real-time Analytics**: Live dashboard with 30-second auto-refresh
- **SQLite Backend**: Persistent data storage with time-series insights
- **ML-Powered Insights**: Anomaly detection, predictions, and optimization recommendations
- **Interactive Charts**: Chart.js visualizations with responsive design
- **Alert Management**: Critical, warning, and info alert tracking
- **Performance Gauges**: Visual CPU, memory, disk, and network monitoring

### 🛠️ **Technical Features**
- **Bun-Native**: Ultra-fast performance with Bun runtime
- **Zero Dependencies**: CDN-hosted Chart.js, no npm packages required
- **Live Server**: Built-in HTTP server with API endpoints
- **Data Export**: JSON, CSV, and HTML export capabilities
- **Auto-Archival**: Automatic data cleanup with configurable retention
- **CLI Interface**: Rich command-line tools with table formatting

## 🚀 Quick Start

### 1. **Basic Usage**
```bash
# Show insights summary table
bun src/mod.ts insights

# Start live dashboard server
bun src/mod.ts insights --serve

# Run system health checks
bun src/mod.ts doctor

# Simulate application run with metrics
bun src/mod.ts run
```

### 2. **Dashboard Generation**
```bash
# Generate dashboard HTML
bun src/mod.ts insights --html > dashboard.html

# Start live server (localhost:3133)
bun src/mod.ts insights --serve

# Open in browser: http://localhost:3133/insights
```

### 3. **Data Management**
```bash
# Log sample data for testing
bun src/mod.ts insights --log

# Clean up old data (default 30 days)
bun src/mod.ts insights --cleanup 7

# Get real-time data via API
curl http://localhost:3133/data.json
```

## 📊 Dashboard Features

### 🎯 **System Health Overview**
- **Health Score**: Overall system wellness (0-100)
- **SLA Compliance**: Service level agreement adherence
- **Active Sessions**: Real-time user activity
- **ML Confidence**: Machine learning model accuracy

### 📈 **Performance Metrics**
- **CPU Usage**: Real-time processor utilization
- **Memory Usage**: RAM consumption monitoring
- **Disk Usage**: Storage space tracking
- **Network Usage**: Bandwidth utilization

### 🧠 **ML Insights**
- **Anomaly Detection**: Confidence scoring with progress bars
- **Predictions**: Growth forecasts and capacity planning
- **Optimization**: Performance improvement recommendations

### 🔔 **Alert Management**
- **Critical Alerts**: Immediate attention required
- **Warning Alerts**: Potential issues detected
- **Info Alerts**: Informational notifications

## 🗂️ Project Structure

```
src/
├── mod.ts              # Main CLI entry point
├── data/
│   └── insights.ts      # SQLite database operations
├── utils/
│   └── bun.js          # Bun utility functions
└── enterprise/
    └── analytics-engine.ts  # Advanced analytics engine

dashboard.html          # Dashboard template
README-INSIGHTS.md      # This documentation
package-insights.json   # Package configuration
```

## 🔧 Configuration

### Database Setup
```typescript
// SQLite database automatically created at:
// ./.matrix/insights.db

// Tables:
// - insights (id, timestamp, metric, value, project)
// - indexes on metric and timestamp for performance
```

### Environment Variables
```bash
# Optional configuration
MATRIX_INSIGHTS_PORT=3133      # Dashboard server port
MATRIX_INSIGHTS_RETENTION=30    # Data retention in days
MATRIX_INSIGHTS_REFRESH=30      # Auto-refresh interval in seconds
```

## 📡 API Endpoints

### Live Server Endpoints
```bash
# Main dashboard
GET http://localhost:3133/insights

# Real-time data (JSON)
GET http://localhost:3133/data.json

# Health check
GET http://localhost:3133/
```

### Data Format
```json
{
  "health": 99.9,
  "cpu": 0.23,
  "memory": 0.67,
  "disk": 0.32,
  "network": 0.18,
  "alerts": { "critical": 0, "warning": 2, "info": 5 },
  "trends": [...],
  "ml": { "confidence": 97.2, "anomaly": 0.3 },
  "sessions": 247,
  "throughput": 1247,
  "sla": 99.9,
  "cacheEfficiency": 85.2,
  "errorRate": 2.1
}
```

## 🎮 CLI Commands

### Insights Command
```bash
# Show summary table
bun src/mod.ts insights

# Generate HTML dashboard
bun src/mod.ts insights --html

# Start live server
bun src/mod.ts insights --serve

# Clean up old data
bun src/mod.ts insights --cleanup [days]

# Log sample data
bun src/mod.ts insights --log
```

### System Commands
```bash
# Run health checks
bun src/mod.ts doctor

# Simulate application run
bun src/mod.ts run
```

### Package Scripts
```bash
# Using package-insights.json
bun run insights          # Show summary
bun run dashboard         # Start server
bun run doctor           # Health checks
bun run demo             # Log data + start server
bun run html             # Generate dashboard.html
bun run cleanup          # Clean up old data
```

## 📊 Metrics & Insights

### Available Metrics
- **health_score**: Overall system health (0-100)
- **cpu**: CPU usage (0-1)
- **memory**: Memory usage (0-1)
- **disk**: Disk usage (0-1)
- **network**: Network usage (0-1)
- **sessions**: Active session count
- **throughput**: Events per minute
- **sla**: SLA compliance percentage
- **cache_efficiency**: Cache hit rate percentage
- **error_rate**: Error rate percentage
- **critical_alerts**: Critical alert count
- **warning_alerts**: Warning alert count
- **info_alerts**: Info alert count

### Logging Custom Metrics
```typescript
import { insights } from './src/data/insights.js';

// Log custom metrics
await insights.logHealth(95.5);
await insights.logCPU(0.45);
await insights.logMemory(0.67);
await insights.logThroughput(1500);
await insights.logErrorRate(1.2);
```

## 🎨 Customization

### Dashboard Styling
- **Tailwind CSS**: Utility-first styling
- **Dark Theme**: Enterprise-grade dark mode
- **Responsive**: Mobile-friendly design
- **Animations**: Smooth transitions and pulse effects

### Chart Configuration
```javascript
// Customize Chart.js settings
new Chart(ctx, {
  type: 'line',
  data: { /* your data */ },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e5e7eb' } }
    },
    scales: {
      x: { grid: { color: '#374151' } },
      y: { grid: { color: '#374151' } }
    }
  }
});
```

## 🔒 Security & Performance

### Security Features
- **SQLite**: Local database, no external dependencies
- **Input Validation**: All inputs sanitized
- **CORS Headers**: Configurable access control
- **No Secrets**: No API keys or credentials required

### Performance Optimizations
- **Bun Runtime**: Ultra-fast JavaScript execution
- **SQLite Indexes**: Optimized database queries
- **Caching**: Browser caching for static assets
- **Compression**: Optional zstd compression
- **Lazy Loading**: Charts load on demand

## 🚀 Deployment

### Local Development
```bash
# Clone and run
git clone <repository>
cd bun-toml-secrets-editor
bun run demo
```

### Production Deployment
```bash
# Build for production
bun run build

# Run with PM2 or similar
pm2 start dist/mod.ts --name matrix-insights

# Or use Docker (Dockerfile not included)
docker run -p 3133:3133 matrix-insights
```

### Environment Setup
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies (none required)
bun install

# Make executable
chmod +x src/mod.ts
```

## 📈 Advanced Features

### Data Archival
```typescript
// Automatic cleanup of old data
await cleanupOldInsights(30); // 30 days

// Manual cleanup
bun src/mod.ts insights --cleanup 7
```

### Real-time Updates
```javascript
// Auto-refresh every 30 seconds
setInterval(async () => {
  const data = await fetch('/data.json').then(r => r.json());
  updateDashboard(data);
}, 30000);
```

### Export Capabilities
```bash
# Export to JSON
curl http://localhost:3133/data.json > insights.json

# Export dashboard HTML
bun src/mod.ts insights --html > dashboard.html

# Export to CSV (via dashboard)
# Use the dashboard export functionality
```

## 🛠️ Troubleshooting

### Common Issues
```bash
# Database locked
rm ./.matrix/insights.db

# Port in use
lsof -ti:3133 | xargs kill -9

# Permissions error
chmod +x src/mod.ts
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=1 bun src/mod.ts insights --serve

# Check database
sqlite3 ./.matrix/insights.db ".schema"
```

## 🤝 Contributing

### Development Setup
```bash
# Fork and clone
git clone <your-fork>
cd bun-toml-secrets-editor

# Create feature branch
git checkout -b feature/new-metric

# Make changes and test
bun run demo

# Submit pull request
```

### Code Style
- **TypeScript**: Strong typing preferred
- **ESLint**: Use provided configuration
- **Tests**: Add unit tests for new features
- **Docs**: Update documentation for changes

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Bun**: Ultra-fast JavaScript runtime
- **Chart.js**: Beautiful charting library
- **Tailwind CSS**: Utility-first CSS framework
- **SQLite**: Reliable database engine
- **Font Awesome**: Icon library

---

**🚀 Matrix Insights Dashboard - Enterprise Analytics, Simplified**

For support, issues, or contributions, please visit the project repository.
