# 🔥 Hot Module Replacement (HMR) Demo Guide

## Water Dashboard - Bun HMR Enhanced Edition

This guide demonstrates Bun's Hot Module Replacement capabilities with state
persistence, real-time updates, and comprehensive error tracking.

## 🚀 **Quick Start**

### 1. Start the HMR Development Server

```bash
# Start the HMR-enabled development server
bun run src/hmr-dev-server.ts
```

Server will start at: **http://localhost:3000**

### 2. Open Multiple Browser Tabs

Open the dashboard in multiple browser tabs to see synchronized updates:

- Main Dashboard: http://localhost:3000
- Health Check: http://localhost:3000/health
- Metrics API: http://localhost:3000/api/metrics

## 🔥 **HMR Features Demonstrated**

### **State Persistence Across Hot Reloads**

The dashboard preserves state during hot reloads:

```typescript
// This state survives hot reloads!
const dashboardState = (import.meta.hot.data.state ??= {
  metrics: { activeLogs: 1245789, cacheHits: 12456 },
  errors: new Map(),
  timezone: 'America/New_York',
  updateCount: 0,
});
```

### **Real-time HMR Event Handling**

```typescript
if (import.meta.hot) {
  // Save state before updates
  import.meta.hot.on('bun:beforeUpdate', () => {
    dashboardState.updateCount++;
    console.log('📦 Preserving state...');
  });

  // Restore state after updates
  import.meta.hot.on('bun:afterUpdate', () => {
    console.log('✅ State restored!');
    showNotification('🔥 Hot reload applied!');
  });

  // WebSocket connection events
  import.meta.hot.on('bun:ws:connect', () => {
    showNotification('🟢 HMR connected');
  });

  // Accept hot updates
  import.meta.hot.accept();
}
```

## 🧪 **Testing HMR - Step by Step**

### **Test 1: Basic Hot Reloading**

1. Start the server: `bun run src/hmr-dev-server.ts`
2. Open http://localhost:3000
3. Click the "Click me!" button several times
4. Edit `src/hmr-test-component.ts` - change this comment:
   ```typescript
   // Version: 1.0.0 - Edit this file to see hot reloading in action!
   ```
   To:
   ```typescript
   // Version: 1.1.0 - HMR test successful!
   ```
5. Save the file
6. **Watch**: Page updates instantly, button click count preserved! 🎉

### **Test 2: State Persistence with Metrics**

1. Watch the real-time metrics updating on the dashboard
2. Note the current values (Active Logs, Cache Hits, etc.)
3. Edit `src/hmr-dev-server.ts` - modify the HTML template:
   ```typescript
   <h1>🌈 Water Dashboard - HMR Enhanced</h1>
   ```
   To:
   ```typescript
   <h1>🔥 Water Dashboard - HMR WORKING!</h1>
   ```
4. Save the file
5. **Watch**: Title updates, but metrics continue from previous values!

### **Test 3: Error Handling & Recovery**

1. Introduce a syntax error in `src/hmr-test-component.ts`:
   ```typescript
   // Add this broken code:
   const broken = {
   ```
2. Save the file
3. **Watch**: HMR shows error notification, previous version still works
4. Fix the error and save
5. **Watch**: HMR recovers automatically with updated code!

### **Test 4: WebSocket & Logging Integration**

1. Open browser dev console (F12)
2. Watch HMR messages in console
3. Edit log messages in `src/hmr-dev-server.ts`
4. **Watch**: New log messages appear instantly in both console and UI

## 📊 **HMR Status Indicators**

### **Visual Indicators in UI**

- **🟢 HMR Ready Badge**: Top-right shows "HMR Active"
- **🔥 Hot Reload Notifications**: Appear after each update
- **📊 Update Counter**: Shows number of hot reloads applied
- **⏰ Last Update Time**: Displays when last HMR occurred

### **Console Messages**

```bash
🔥 HMR enabled for dashboard client
📦 Preserving state before HMR update
✅ State restored after HMR update
🟢 HMR WebSocket connected
❌ HMR Error: [error details]
```

## 🛠️ **Advanced HMR Patterns**

### **Pattern 1: Resource Cleanup**

```typescript
import.meta.hot.dispose(() => {
  // Cleanup intervals, websockets, etc.
  clearInterval(updateInterval);
  websocket?.close();
});
```

### **Pattern 2: State Migration**

```typescript
import.meta.hot.accept(newModule => {
  if (newModule) {
    // Migrate state to new module version
    migrateState(oldState, newModule.defaultState);
  }
});
```

### **Pattern 3: Dependency Acceptance**

```typescript
// Accept updates for specific dependencies
import.meta.hot.accept('./utils', newUtils => {
  // Handle utils module updates
  updateUtilities(newUtils);
});
```

## 🎯 **Performance Benefits**

### **Development Speed Improvements**

- **No full page reloads**: State preserved across updates
- **Instant feedback**: See changes in <100ms
- **Debug session continuity**: Breakpoints, console state maintained
- **Form data preservation**: User input not lost during updates

### **Bun-Specific Advantages**

- **Native TypeScript**: No transpilation needed
- **SIMD-optimized**: Ultra-fast file watching and rebuilds
- **Built-in WebSocket**: HMR communication built into runtime
- **Zero config**: HMR works out of the box with `development: { hmr: true }`

## 📋 **File Structure**

```
src/
├── hmr-dev-server.ts        # HMR development server
├── hmr-enhanced-dashboard.ts # Dashboard with HMR integration
├── hmr-test-component.ts    # Interactive test component
└── enhanced-logging-system.ts # Integrated logging
```

## 🐛 **Troubleshooting**

### **HMR Not Working?**

1. **Check server config**: Ensure `development: { hmr: true }` is set
2. **Verify WebSocket**: Look for connection messages in console
3. **File watching**: Make sure files aren't in `.gitignore`
4. **Port conflicts**: Try different port if 3000 is taken

### **State Not Persisting?**

1. **Check import.meta.hot.data usage**: Must use `??=` pattern
2. **Verify accept() call**: Must call `import.meta.hot.accept()`
3. **Resource cleanup**: Implement dispose handlers for cleanup

### **Build Errors?**

1. **Syntax errors**: Fix syntax and save again
2. **Missing imports**: Check all import statements
3. **Type errors**: Verify TypeScript types are correct

## 🚀 **Next Steps**

Try these advanced HMR scenarios:

1. **Multi-file updates**: Edit multiple connected files
2. **CSS hot reloading**: Update styles without losing state
3. **API hot reloading**: Update server endpoints live
4. **Database schema changes**: Apply migrations during development
5. **Component tree preservation**: Update React/Vue components

## 📚 **Resources**

- [Bun HMR Documentation](https://bun.sh/docs/bundler/hmr)
- [import.meta.hot API Reference](https://bun.sh/docs/bundler/hmr#import-meta-hot-api)
- [Vite HMR Guide](https://vitejs.dev/guide/api-hmr.html) (Compatible API)
- [Fire22 Dashboard Worker Repository](https://github.com/brendadeeznuts1111/fire22-dashboard-worker)

---

## 🎉 **Success Criteria**

You've successfully implemented HMR when you see:

✅ **Instant updates** without page refresh  
✅ **State preservation** across hot reloads  
✅ **Error recovery** with automatic reload  
✅ **WebSocket connection** working  
✅ **Console messages** showing HMR events  
✅ **Visual notifications** in UI  
✅ **Metrics continuity** during updates

**Happy Hot Reloading! 🔥**
