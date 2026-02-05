# Real-time Bundle Monitoring System

A comprehensive monitoring solution that tracks actual build data, dependencies, and performance metrics in real-time.

## 🚀 Features

### Real-time Bundle Analysis
- **Live Data**: Analyzes actual build artifacts from `./dist`
- **Multi-build Support**: Works with Vite, Webpack, Rollup, and Bun
- **Dependency Tracking**: Monitors node_modules usage and sizes
- **Asset Analysis**: Tracks CSS, images, fonts, and other assets
- **Build History**: Maintains historical build data for comparisons

### Monitoring Capabilities
- **File Watching**: Automatically detects build changes
- **Size Tracking**: Monitors bundle size changes over time
- **Performance Metrics**: Tracks build times and optimization scores
- **Alert System**: Notifies about bundle size issues and build problems
- **Health Checks**: Server health and build system status

### Interactive Dashboard
- **Real-time Updates**: Live data refresh every 5 seconds
- **Visual Charts**: Bundle size trends and dependency breakdowns
- **Build Controls**: Trigger builds and monitor progress
- **Export Features**: Download metrics and build history

## 📁 Files

- `realtime-monitoring.ts` - Complete real-time monitoring server
- `monitoring-standalone.ts` - Enhanced version with real-time data
- `test-realtime-monitoring.ts` - Test script with sample build data

## 🛠️ Installation & Usage

### Basic Usage

```bash
# Start the real-time monitoring server
bun run realtime-monitoring.ts

# Or use the enhanced standalone version
bun run monitoring-standalone.ts
```

### With Sample Data

```bash
# Create sample build and test the system
bun run test-realtime-monitoring.ts
```

### With Your Project

1. **Build your project**:
   ```bash
   bun run build
   # or
   npm run build
   # or
   vite build
   ```

2. **Start monitoring**:
   ```bash
   bun run realtime-monitoring.ts
   ```

3. **Access dashboard**:
   Open http://localhost:3003 in your browser

## 📊 API Endpoints

### Core Endpoints

- `GET /` - Interactive dashboard UI
- `GET /metrics` - Live metrics with bundle data
- `GET /bundle-analysis` - Detailed bundle analysis
- `GET /build-status` - Current build status
- `GET /build-history` - Historical build data
- `GET /health` - Server health check

### Response Examples

#### Bundle Analysis
```json
{
  "timestamp": 1705789200000,
  "buildTime": 1705789150000,
  "totalSize": 86016,
  "chunks": [
    {
      "name": "main.js",
      "size": 86016,
      "type": "js",
      "sizeFormatted": "84 KB"
    }
  ],
  "dependencies": [
    {
      "name": "react",
      "size": 51200,
      "sizeFormatted": "50 KB"
    }
  ],
  "assets": [
    {
      "name": "styles.css",
      "size": 2048,
      "type": "css",
      "sizeFormatted": "2 KB"
    }
  ],
  "recommendations": [],
  "buildSystem": "Vite"
}
```

#### Live Metrics
```json
{
  "timestamp": 1705789200000,
  "bundle": {
    "size": 86016,
    "sizeFormatted": "84 KB",
    "chunks": 1,
    "dependencies": 3,
    "assets": 1,
    "buildSystem": "Vite",
    "lastBuild": 1705789150000
  },
  "performance": {
    "bundleSizeChange": -2.3,
    "avgResponseTime": 45
  },
  "alerts": [],
  "buildStatus": "ready",
  "realTimeData": true
}
```

## 🔧 Configuration

### Build Directory
Default: `./dist`

Change by modifying the `buildDir` parameter:
```typescript
const buildMonitor = new BuildMonitor("./build");
```

### File Watching
The system automatically watches for changes in:
- Build directory files
- Manifest files (`manifest.json`)
- Metafiles (`.vite/metafile.json`, `.bun/metafile.json`)

### Supported Build Systems

#### Vite
- Looks for `.vite/metafile.json`
- Reads `manifest.json`
- Supports Vite-specific optimizations

#### Bun
- Looks for `.bun/metafile.json`
- Reads Bun build metadata
- Optimized for Bun's build system

#### Webpack
- Reads `webpack-stats.json`
- Supports Webpack bundle analysis
- Compatible with webpack-bundle-analyzer

#### Rollup
- Reads Rollup output manifests
- Supports Rollup bundle analysis
- Compatible with rollup-plugin-analyzer

## 📈 Dashboard Features

### Real-time Updates
- **Auto-refresh**: Data updates every 5 seconds
- **Live indicators**: Shows build status and changes
- **Timestamp tracking**: Displays last build time

### Visual Analytics
- **Bundle size charts**: Track size changes over time
- **Dependency breakdown**: Visualize largest dependencies
- **Chunk analysis**: See individual chunk sizes
- **Asset tracking**: Monitor CSS, images, fonts

### Build Controls
- **Trigger builds**: Start new builds from dashboard
- **Build status**: See current build progress
- **History view**: Browse previous builds
- **Comparison tools**: Compare builds side by side

### Alert System
- **Size warnings**: Notifies about large bundles
- **Dependency alerts**: High dependency count warnings
- **Build errors**: Shows build failures and issues
- **Optimization suggestions**: Provides improvement tips

## 🎯 Use Cases

### Development
- **Bundle optimization**: Identify large dependencies
- **Build performance**: Track build times
- **Size monitoring**: Prevent bundle bloat
- **Dependency management**: Track unused dependencies

### CI/CD
- **Build validation**: Check bundle sizes in pipelines
- **Performance gates**: Fail builds if size exceeds limits
- **Trend analysis**: Monitor size changes over time
- **Quality assurance**: Ensure build quality standards

### Production
- **Performance monitoring**: Track bundle performance
- **Size alerts**: Get notified about size changes
- **Health checks**: Monitor build system health
- **Analytics**: Export build data for analysis

## 🔍 Advanced Usage

### Custom Metrics
Add your own metrics by extending the `getLiveMetrics` function:
```typescript
async function getLiveMetrics() {
  const bundleAnalysis = await getRealBundleAnalysis();
  const customMetrics = await getCustomMetrics();
  
  return {
    ...bundleAnalysis,
    custom: customMetrics
  };
}
```

### WebSocket Integration
Enable real-time updates with WebSocket:
```typescript
// Add to your server
const server = Bun.serve({
  port: 3003,
  websocket: {
    message(ws, message) {
      // Handle client messages
    },
    open(ws) {
      // Send initial data
      ws.send(JSON.stringify(await getLiveMetrics()));
    }
  },
  fetch(req) {
    // Handle HTTP requests
  }
});
```

### Custom Build Systems
Add support for additional build systems:
```typescript
async function detectBuildSystem(buildDir: string) {
  if (existsSync(join(buildDir, '.custom-build'))) {
    return 'CustomBuild';
  }
  // ... other checks
}
```

## 🚨 Troubleshooting

### Common Issues

#### Build Directory Not Found
```
Error: Build directory not found
```
**Solution**: Run your build command first to generate the `./dist` directory.

#### No Dependencies Found
```
Dependencies: 0
```
**Solution**: Ensure your build generates metafiles or check your build system configuration.

#### File Watching Not Working
```
Error starting watcher
```
**Solution**: Check file permissions and ensure the build directory exists.

### Debug Mode
Enable debug logging:
```typescript
// Add to your monitoring script
process.env.DEBUG = 'true';
```

### Performance Issues
For large projects, consider:
- Increasing the update interval
- Limiting the number of tracked dependencies
- Using file system filters

## 📚 Integration Examples

### With Vite
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
```

### With Bun
```typescript
// bun.config.ts
export default {
  entrypoints: ['./src/index.tsx'],
  outdir: './dist',
  metafile: true,
  splitting: true
};
```

### With Next.js
```javascript
// next.config.js
module.exports = {
  webpack: (config, { buildId }) => {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: '../bundle-analysis.json'
      })
    );
    return config;
  }
};
```

## 🤝 Contributing

To add new features or fix issues:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
