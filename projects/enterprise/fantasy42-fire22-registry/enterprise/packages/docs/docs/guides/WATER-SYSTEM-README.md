# 🌊 Water System Terminal Display

A beautiful terminal-based water system monitoring interface that displays
real-time metrics using smooth box-drawing characters and water-themed
aesthetics.

## ✨ Features

- **Beautiful Terminal Display**: Uses smooth Unicode box-drawing characters
  (╭─╮│╰╯)
- **Real-time Monitoring**: Live updates with configurable intervals
- **Multiple Display Formats**: Box, simple, and JSON output options
- **Interactive Web Interface**: HTML version with hover effects and animations
- **CLI Integration**: Easy to integrate into existing terminal dashboards
- **Water-themed Styling**: Ocean-inspired color scheme and visual effects

## 🚀 Quick Start

### 1. Simple Display

```bash
# Show current water system metrics once
bun water-system-cli.js

# Output:
╭───────────────── WATER SYSTEM ─────────────────╮
│  🌊 Flow Rate: 85 L/min                          │
│  🌡️ Temperature: 22°C                            │
│  📊 Pressure: 120 PSI                            │
╰────────────────────────────────────────────────╯
```

### 2. Real-time Monitoring

```bash
# Start monitoring with 5-second updates
bun water-system-cli.js --monitor

# Custom update interval (3 seconds)
bun water-system-cli.js -m 3000
```

### 3. Web Interface

Open `water-system-terminal.html` in your browser for an interactive web version
with:

- Hover effects and animations
- Real-time metric updates
- Responsive design
- Water-themed styling

## 📁 Files Overview

### Core Components

- **`water-system-cli.js`** - Main CLI application with monitoring capabilities
- **`water-system-integration.js`** - Integration utilities for existing systems
- **`water-system-terminal.html`** - Interactive web interface

### Integration Files

- **`dashboard-worker/src/terminal-dashboard.html`** - Main terminal dashboard
  (water system section added)
- **`dashboard-worker/src/components/water-kpi-components.ts`** - Water KPI
  components
- **`dashboard-worker/src/components/water-dashboard-integration.ts`** -
  Dashboard integration utilities

## 🎯 Usage Examples

### CLI Commands

```bash
# Basic display
bun water-system-cli.js

# Real-time monitoring
bun water-system-cli.js --monitor

# Help
bun water-system-cli.js --help
```

### Integration Script Commands

```bash
# Box display format
bun water-system-integration.js --display

# Simple format
bun water-system-integration.js --simple

# System status
bun water-system-integration.js --status

# Real-time monitoring
bun water-system-integration.js --monitor 3000
```

## 🔧 Integration

### Adding to Existing Terminal Dashboards

The water system can be easily integrated into existing terminal dashboards:

```javascript
import { WaterSystemIntegrator } from './water-system-integration.js';

const waterSystem = new WaterSystemIntegrator();

// Get current metrics
const metrics = waterSystem.getMetrics();

// Generate display
const display = waterSystem.generateDisplay('box');

// Start monitoring
waterSystem.startMonitoring(5000, updatedMetrics => {
  console.log(waterSystem.generateDisplay());
});
```

### Web Dashboard Integration

The water system components are designed to work with the existing Fire22
dashboard infrastructure:

```typescript
import { WaterDashboardKPIManager } from './components/water-kpi-components.ts';

const waterManager = new WaterDashboardKPIManager(containerId);
waterManager.initializeWaterKPIs();
waterManager.startWaterMonitoring(3000);
```

## 🎨 Customization

### Colors and Styling

The water system uses a consistent color scheme:

- **Primary**: Ocean blue (#87ceeb)
- **Accent**: Deep blue (#4682b4)
- **Flow Rate**: Green (#4ade80)
- **Temperature**: Yellow (#fbbf24)
- **Pressure**: Red (#ef4444)

### Display Formats

Multiple display formats are supported:

- **Box**: Traditional terminal box with borders
- **Simple**: Clean text without borders
- **JSON**: Structured data for API integration

## 📊 Metrics

### Current Metrics

- **Flow Rate**: 85 L/min (range: 50-120 L/min)
- **Temperature**: 22°C (range: 18-26°C)
- **Pressure**: 120 PSI (range: 100-140 PSI)

### Status Indicators

- **Flow**: HIGH (>80), NORMAL (30-80), LOW (<30)
- **Temperature**: WARM (>24°C), NORMAL (20-24°C), COOL (<20°C)
- **Pressure**: HIGH (>130 PSI), NORMAL (110-130 PSI), LOW (<110 PSI)

## 🚀 Advanced Features

### Real-time Updates

- Configurable update intervals
- Simulated metric variations
- Graceful shutdown handling
- Event-driven callbacks

### Integration APIs

- Metric retrieval and updates
- Status monitoring
- Display generation
- Control functions

### Web Interface Features

- Responsive design
- Hover effects and animations
- Real-time updates
- Interactive elements

## 🔍 Troubleshooting

### Common Issues

1. **Box characters not displaying**: Ensure your terminal supports Unicode
2. **Colors not working**: Check if your terminal supports ANSI color codes
3. **Updates not working**: Verify the monitoring interval is set correctly

### Debug Mode

Enable debug output by setting environment variables:

```bash
DEBUG=water-system bun water-system-cli.js
```

## 📈 Performance

- **Update Frequency**: Configurable from 1 second to 1 minute
- **Memory Usage**: Minimal memory footprint
- **CPU Usage**: Low CPU overhead for monitoring
- **Network**: No external dependencies or network calls

## 🤝 Contributing

The water system is designed to be easily extensible:

1. Add new metrics to the `metrics` object
2. Extend display formats in `generateDisplay()`
3. Add new status indicators in `getStatusSummary()`
4. Create custom styling themes

## 📄 License

This project is part of the Fire22 ecosystem and follows the same licensing
terms.

## 🌊 Water System Aesthetics

The water system interface is designed with ocean-inspired aesthetics:

- Smooth, flowing box characters
- Ocean blue color palette
- Wave-like animations and effects
- Marine-themed icons and emojis

This creates a cohesive, professional appearance that fits well with water
management and monitoring applications.
