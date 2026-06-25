# Geelark Dashboard & Frontend Guide

**Last Updated**: 2026-01-08
**Version**: 1.0.0
**Framework**: React 19 + TypeScript + Vite

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard Architecture](#dashboard-architecture)
3. [React Components](#react-components)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [WebSocket Integration](#websocket-integration)
7. [Styling & UI](#styling--ui)
8. [Configuration](#configuration)
9. [Development](#development)
10. [Build & Deployment](#build--deployment)

---

## Overview

The Geelark Dashboard is a **React-based web application** that provides real-time monitoring, file upload capabilities, and system health visualization. Built with **React 19**, **TypeScript**, and **Vite**, it offers a modern, responsive interface for managing Geelark services.

### Key Features

- 📊 **Real-time Monitoring** - Live metrics via WebSocket
- ☁️ **File Upload** - Drag-and-drop upload with progress tracking
- 🔌 **WebSocket Integration** - Real-time updates without polling
- 📈 **Data Visualization** - Charts and graphs with Recharts
- 🎨 **Modern UI** - Clean interface with Tailwind CSS
- ⚡ **Fast Development** - Vite for hot module replacement
- 📱 **Responsive Design** - Works on desktop and mobile

### Technology Stack

```typescript
// Core Framework
React 19.2.3        // Latest React with concurrent features
TypeScript 5.8      // Static type checking
Vite 6.2           // Build tool and dev server

// UI Libraries
lucide-react       // Icon library
recharts          // Charting library
react-dom         // DOM rendering

// Development
@vitejs/plugin-react  // React plugin for Vite
```

---

## Dashboard Architecture

### Directory Structure

```text
dashboard-react/
├── src/
│   ├── components/          # React components
│   │   ├── UploadPanel.tsx           # File upload UI
│   │   ├── MonitoringDashboard.tsx   # System metrics
│   │   ├── TelemetryPanel.tsx        # Performance data
│   │   ├── AlertsPanel.tsx           # Alert management
│   │   ├── AuthenticationPanel.tsx   # Auth system
│   │   ├── GeolocationPanel.tsx      # Geo tracking
│   │   ├── SocketInspectionPanel.tsx # WebSocket inspection
│   │   ├── StreamPanel.tsx           # Real-time streaming
│   │   ├── BuildHistory.tsx          # Build history
│   │   ├── RuntimeMetrics.tsx        # Runtime metrics
│   │   └── TerminalView.tsx          # Terminal output
│   ├── lib/
│   │   └── api.ts                    # API client
│   ├── hooks/                        # Custom React hooks
│   ├── config.ts                     # Configuration constants
│   ├── types.ts                      # TypeScript types
│   ├── constants.tsx                 # Component constants
│   ├── App.tsx                       # Main app component
│   └── index.tsx                     # Entry point
├── public/                           # Static assets
├── index.html                        # HTML template
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite config
└── tailwind.config.js                # Tailwind config
```

### Component Hierarchy

```text
App (Root)
├── MonitoringDashboard      # System metrics overview
│   ├── RuntimeMetrics       # CPU, memory, uptime
│   └── Health Indicators    # Service health status
│
├── UploadPanel              # File upload interface
│   ├── Drop Zone            # Drag-and-drop area
│   ├── Active Uploads       # In-progress uploads
│   └── Completed Uploads    # Upload history
│
├── TelemetryPanel           # Performance telemetry
│   ├── Metrics Charts       # Graphs and visualizations
│   └── Data Tables          # Tabular data
│
├── AlertsPanel              # Alert management
│   ├── Active Alerts        # Current alerts
│   └── Alert History        # Past alerts
│
├── AuthenticationPanel      # Auth system
├── GeolocationPanel         # Geo tracking
├── SocketInspectionPanel    # WebSocket inspection
├── StreamPanel              # Real-time streaming
├── BuildHistory             # Build history
└── TerminalView             # Terminal output
```

---

## React Components

### 1. UploadPanel Component

**File**: `src/components/UploadPanel.tsx` (428 lines)

**Purpose**: Drag-and-drop file upload with real-time progress tracking

**Features**:
- Drag-and-drop file upload
- File browser input
- Real-time progress tracking (WebSocket + polling fallback)
- Upload cancellation
- Active/completed upload lists
- File size formatting
- Duration tracking

**Props**:

```typescript
interface UploadPanelProps {
  apiBaseUrl?: string;           // Default: '/api'
  wsUrl?: string;                // Default: 'ws://localhost:3000'
  onUploadComplete?: (result: UploadProgress) => void;
  onUploadError?: (error: string) => void;
}
```

**Usage**:

```tsx
import { UploadPanel } from './components/UploadPanel';

function App() {
  return (
    <UploadPanel
      apiBaseUrl="/api"
      wsUrl="ws://localhost:3000"
      onUploadComplete={(result) => console.log('Uploaded:', result.url)}
      onUploadError={(error) => console.error('Error:', error)}
    />
  );
}
```

**State Management**:

```typescript
const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
const [dragActive, setDragActive] = useState(false);
const [isConnected, setIsConnected] = useState(false);
```

**WebSocket Integration**:

```typescript
useEffect(() => {
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    setIsConnected(true);
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'dashboard' }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'upload-progress') {
      setUploads(prev => new Map(prev).set(message.data.uploadId, message.data));
    }
  };

  return () => ws.close();
}, [wsUrl]);
```

**Polling Fallback**:

```typescript
useEffect(() => {
  if (isConnected) return; // Don't poll if WebSocket is connected

  const interval = setInterval(async () => {
    const activeUploads = Array.from(uploads.values()).filter(
      u => u.status === 'initiated' || u.status === 'uploading'
    );

    for (const upload of activeUploads) {
      const response = await fetch(`${apiBaseUrl}/upload/status/${upload.uploadId}`);
      const progress = await response.json();
      setUploads(prev => new Map(prev).set(progress.uploadId, progress));
    }
  }, 1000);

  return () => clearInterval(interval);
}, [isConnected, uploads]);
```

---

### 2. MonitoringDashboard Component

**File**: `src/components/MonitoringDashboard.tsx` (450+ lines)

**Purpose**: Real-time system metrics dashboard

**Features**:
- CPU usage monitoring
- Memory usage tracking
- Uptime display
- Service health indicators
- Performance graphs
- Alert notifications

**Key Sections**:

```tsx
<MonitoringDashboard>
  {/* Status Bar */}
  <StatusBar>
    <FeatureBadges />      // Active feature flags
    <EnvironmentBadge />   // Current environment
    <ConnectionStatus />   // WebSocket connection
  </StatusBar>

  {/* Metrics Grid */}
  <MetricsGrid>
    <CPUMetric />
    <MemoryMetric />
    <UptimeMetric />
    <RequestRateMetric />
  </MetricsGrid>

  {/* Performance Charts */}
  <PerformanceCharts>
    <CPUChart />
    <MemoryChart />
    <ResponseTimeChart />
  </PerformanceCharts>
</MonitoringDashboard>
```

---

### 3. TelemetryPanel Component

**File**: `src/components/TelemetryPanel.tsx` (750+ lines)

**Purpose**: Performance telemetry and analytics

**Features**:
- Query builder
- Metrics visualization
- Data tables
- Export functionality
- Time range selection

---

### 4. AlertsPanel Component

**File**: `src/components/AlertsPanel.tsx` (450+ lines)

**Purpose**: Alert management and notification

**Features**:
- Active alerts list
- Alert history
- Severity filtering
- Alert acknowledgment
- Notification preferences

---

### 5. AuthenticationPanel Component

**File**: `src/components/AuthenticationPanel.tsx` (400+ lines)

**Purpose**: User authentication management

**Features**:
- Login/logout
- User profile
- Session management
- API key management

---

### 6. GeolocationPanel Component

**File**: `src/components/GeolocationPanel.tsx` (400+ lines)

**Purpose**: Geographic location tracking

**Features**:
- IP geolocation
- Country/city detection
- Map visualization
- Location statistics

---

### 7. SocketInspectionPanel Component

**File**: `src/components/SocketInspectionPanel.tsx` (750+ lines)

**Purpose**: WebSocket connection inspection

**Features**:
- Active connections list
- Message history
- Connection details
- Channel subscriptions
- Real-time message monitoring

---

### 8. StreamPanel Component

**File**: `src/components/StreamPanel.tsx` (250+ lines)

**Purpose**: Real-time data streaming

**Features**:
- Live data feed
- Stream controls
- Data filtering
- Export functionality

---

## State Management

### Local State

Components use React's built-in `useState` for local state:

```typescript
const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
const [dragActive, setDragActive] = useState(false);
const [isConnected, setIsConnected] = useState(false);
```

### Side Effects

`useEffect` for side effects like WebSocket connections:

```typescript
useEffect(() => {
  // Setup
  const ws = new WebSocket(wsUrl);

  // Cleanup
  return () => ws.close();
}, [wsUrl]);
```

### Custom Hooks

Reusable hooks in `src/hooks/`:

```typescript
// useWebSocket.ts
export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [url]);

  return { isConnected, ws: wsRef.current };
}
```

---

## API Integration

### API Client

**File**: `src/lib/api.ts` (163 lines)

**Class**: `DashboardAPI`

**Methods**:

```typescript
class DashboardAPI {
  // Get merged feature flags
  async getMergedFlags(): Promise<MergedFlagsResponse>

  // Get build configurations
  async getBuildConfigs()

  // Trigger build
  async triggerBuild(configName: string, flags: string[]): Promise<BuildTriggerResponse>

  // Get metrics
  async getMetrics(): Promise<Metrics>

  // Health check
  async healthCheck(): Promise<HealthResponse>

  // Get system info
  async getInfo()

  // WebSocket connection
  connectWebSocket(): void
  onMetrics(callback: (metrics: Metrics) => void): () => void
  disconnect(): void
}
```

**Usage**:

```typescript
import { api } from './lib/api';

// Get metrics
const metrics = await api.getMetrics();
console.log(metrics.cpu, metrics.memory);

// Subscribe to real-time metrics
const unsubscribe = api.onMetrics((metrics) => {
  console.log('Real-time metrics:', metrics);
});

// Unsubscribe later
unsubscribe();

// WebSocket connection
api.connectWebSocket();
```

---

## WebSocket Integration

### WebSocket Configuration

**File**: `src/config.ts`

```typescript
export const WS_CONFIG = {
  CHANNEL: 'dashboard',              // Default channel
  RECONNECT_INTERVAL: 3000,          // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  CONNECTION_TIMEOUT: 10000,         // 10 seconds
} as const;
```

### WebSocket Connection Pattern

```typescript
useEffect(() => {
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    // Subscribe to channels
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'dashboard'
    }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'upload-progress':
        // Handle upload progress
        break;
      case 'metrics':
        // Handle metrics update
        break;
      case 'alert':
        // Handle alert
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Auto-reconnect
    setTimeout(() => {
      // Reconnect logic
    }, WS_CONFIG.RECONNECT_INTERVAL);
  };

  return () => ws.close();
}, [wsUrl]);
```

### Message Types

**Server → Client**:

```typescript
// Upload progress
{
  type: 'upload-progress',
  data: {
    uploadId: string;
    filename: string;
    progress: number;
    status: 'uploading' | 'completed' | 'failed';
  }
}

// Metrics update
{
  type: 'metrics',
  data: {
    cpu: number;
    memory: number;
    uptime: number;
  }
}

// Alert
{
  type: 'alert',
  data: {
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }
}
```

**Client → Server**:

```typescript
// Subscribe to channel
{
  type: 'subscribe',
  channel: 'dashboard' | 'uploads' | 'telemetry'
}

// Unsubscribe from channel
{
  type: 'unsubscribe',
  channel: 'dashboard'
}
```

---

## Styling & UI

### Tailwind CSS

The dashboard uses **Tailwind CSS** for styling:

```bash
# Install Tailwind
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

**Configuration**: `tailwind.config.js`

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Usage**:

```tsx
<div className="upload-panel p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold flex items-center gap-2">
    <CloudUpload className="w-6 h-6" />
    File Upload
  </h2>
</div>
```

### Icons

**lucide-react** icon library:

```tsx
import { Upload, CloudUpload, FileCheck, XCircle } from 'lucide-react';

<CloudUpload className="w-6 h-6" />
<Upload className="w-16 h-16 text-gray-400" />
```

### Charts

**recharts** for data visualization:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<LineChart width={600} height={300} data={metrics}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="timestamp" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
</LineChart>
```

---

## Configuration

### Environment Variables

```bash
# Vite environment variables
VITE_WS_BASE=ws://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api
```

### Config Constants

**File**: `src/config.ts` (241 lines)

**Sections**:

```typescript
// API Configuration
export const API_CONFIG = {
  BASE: '/api',
  WS_BASE: 'ws://localhost:3000',
  HEALTH: '/api/health',
  METRICS: '/api/metrics',
  // ... more endpoints
}

// WebSocket Configuration
export const WS_CONFIG = {
  CHANNEL: 'dashboard',
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
}

// UI Configuration
export const UI_CONFIG = {
  AUTO_REFRESH_INTERVAL: 30000,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
}

// Monitoring Thresholds
export const MONITORING_THRESHOLDS = {
  CPU_WARNING: 70,
  CPU_CRITICAL: 90,
  MEMORY_WARNING: 75,
  MEMORY_CRITICAL: 85,
}
```

---

## Development

### Prerequisites

```bash
# Node.js 18+ required
node --version  # Should be >= 18.0.0
```

### Setup

```bash
# Navigate to dashboard directory
cd dashboard-react

# Install dependencies
bun install

# Start development server
bun run dev
```

**Dev Server**: `http://localhost:3001`

### Available Scripts

```json
{
  "dev": "vite",                          // Start dev server
  "build": "vite build",                  // Build for production
  "preview": "vite preview",              // Preview production build
  "type-check": "tsc --noEmit"           // Type checking
}
```

### Hot Module Replacement

Vite provides **instant HMR** during development:

```typescript
// Edit any component
// Save file
// Browser updates instantly without full reload
```

### TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Vite Configuration

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
        },
      },
    },
  },
});
```

---

## Build & Deployment

### Development Build

```bash
bun run dev
```

**Output**: In-memory dev server at `http://localhost:3001`

### Production Build

```bash
bun run build
```

**Output**: `dist/` directory with optimized assets

**Result**:
```text
dist/
├── index.html                  # HTML entry point
├── assets/
│   ├── index-[hash].js        # Bundled JavaScript
│   ├── index-[hash].css       # Bundled CSS
│   └── vendor-[hash].js       # Vendor chunk (React, etc.)
```

### Preview Production Build

```bash
bun run preview
```

**Output**: Production preview at `http://localhost:4173`

### Build Optimization

**Code Splitting**:

```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      'react-vendor': ['react', 'react-dom'],
      'charts': ['recharts'],
      'icons': ['lucide-react'],
    },
  },
}
```

**Tree Shaking**: Vite automatically removes unused code

**Minification**: Terser minifies JavaScript

**CSS Optimization**: PostCSS with Autoprefixer

### Deployment Options

#### 1. Static Hosting (Netlify, Vercel, GitHub Pages)

```bash
# Build
bun run build

# Deploy dist/ directory
netlify deploy --prod --dir=dist
```

#### 2. Serve with Bun

```bash
# Build dashboard
cd dashboard-react
bun run build

# Serve with Bun from root
cd ..
bun serve dashboard-react/dist
```

#### 3. Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1.3.6
WORKDIR /app
COPY --from=builder /app/dashboard-react/dist ./dist
COPY --from=builder /app/dashboard-react/package.json ./

EXPOSE 3000
CMD ["bun", "serve", "dist"]
```

#### 4. Nginx Reverse Proxy

```nginx
server {
  listen 80;
  server_name dashboard.example.com;

  # Serve static files
  location / {
    root /var/www/dashboard-react/dist;
    try_files $uri $uri/ /index.html;
  }

  # Proxy API requests
  location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # Proxy WebSocket
  location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
  }
}
```

### Environment-Specific Builds

```bash
# Development
bun run dev

# Production
bun run build

# Staging
VITE_WS_BASE=ws://staging.example.com bun run build

# Production with custom API
VITE_API_BASE_URL=https://api.example.com bun run build
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const TelemetryPanel = lazy(() => import('./components/TelemetryPanel'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TelemetryPanel />
    </Suspense>
  );
}
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const sortedUploads = useMemo(
  () => Array.from(uploads.values()).sort((a, b) => a.startedAt - b.startedAt),
  [uploads]
);

// Memoize callbacks
const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault();
  // Handle drop
}, []);
```

### Virtual Scrolling

For large lists, use virtual scrolling:

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={uploads.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      {uploads[index]}
    </div>
  )}
</FixedSizeList>
```

---

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Fails

**Problem**: WebSocket won't connect

**Solutions**:
```typescript
// Check WebSocket URL
const wsUrl = `ws://${window.location.host}`;

// Ensure backend is running
// Check proxy configuration in vite.config.ts

// Add error handling
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Fallback to polling
};
```

#### 2. CORS Errors

**Problem**: API requests blocked by CORS

**Solution**: Configure Vite proxy

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

#### 3. Build Errors

**Problem**: TypeScript errors during build

**Solution**:
```bash
# Run type check
bun run type-check

# Fix type errors
# Update tsconfig.json if needed
```

#### 4. Large Bundle Size

**Problem**: Production bundle too large

**Solutions**:
```typescript
// Code splitting
const TelemetryPanel = lazy(() => import('./components/TelemetryPanel'));

// Manual chunks in vite.config.ts
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'charts': ['recharts'],
}

// Analyze bundle
bun run build -- --analyze
```

---

## Best Practices

### Component Design

1. **Keep components small** - Single responsibility
2. **Use TypeScript** - Type all props and state
3. **Memoize expensive operations** - Use `useMemo` and `useCallback`
4. **Handle errors gracefully** - Error boundaries
5. **Test components** - Unit tests with React Testing Library

### State Management

1. **Local state first** - Use `useState` before pulling in Redux
2. **Server state separately** - Use React Query or SWR for server data
3. **Global state sparingly** - Only for truly global state

### Performance

1. **Code split** - Lazy load routes and heavy components
2. **Optimize re-renders** - `React.memo`, `useMemo`, `useCallback`
3. **Virtualize long lists** - Use react-window
4. **Optimize images** - Use modern formats (WebP, AVIF)

### Accessibility

1. **Semantic HTML** - Use proper elements
2. **ARIA labels** - Add labels for screen readers
3. **Keyboard navigation** - Ensure keyboard support
4. **Focus management** - Manage focus properly

---

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [lucide-react Icons](https://lucide.dev/icons/)
- [Recharts Documentation](https://recharts.org/)

---

**Generated**: 2026-01-08
**Version**: 1.0.0
**Maintainer**: Geelark Development Team
