# Plugin System Quick Start Guide

## Getting Started

### 1. Load the Plugin System

```javascript
import PluginSystem from './plugins/plugin-system.js';

const pluginSystem = new PluginSystem();
await pluginSystem.loadPluginsFromDirectory('./plugins');
```

### 2. Create a New Plugin

Create a file `plugins/my-plugin.js`:

```javascript
export default {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    priority: 50, // Lower = higher priority
    
    async init(pluginSystem, sandbox) {
        // Initialize your plugin
        this.pluginSystem = pluginSystem;
        this.sandbox = sandbox;
        
        // Register hooks
        pluginSystem.addHook('dashboard:init', this.onInit.bind(this), 50);
        
        // Register UI component
        pluginSystem.executeHook('ui:component:add', {
            id: 'my-widget',
            title: 'My Widget',
            render: () => this.renderWidget()
        });
    },
    
    async teardown(pluginSystem, sandbox) {
        // Cleanup
    },
    
    onInit(data) {
        return data;
    },
    
    renderWidget() {
        return '<div>My Widget Content</div>';
    }
};
```

### 3. Available Hooks

**Lifecycle Hooks**:
- `dashboard:init` - Dashboard initialization
- `dashboard:refresh` - Dashboard refresh events
- `dashboard:shutdown` - Cleanup before shutdown

**UI Hooks**:
- `ui:component:add` - Register UI components

**Command Hooks**:
- `command:execute` - Intercept command execution

**Performance Hooks**:
- `performance:update` - Receive performance metrics

**Notification Hooks**:
- `notification:show` - Intercept notification display

### 4. Emit Events

```javascript
pluginSystem.events.emit('my:event', { data: 'value' });
```

### 5. Listen to Events

```javascript
pluginSystem.events.on('my:event', (data) => {
    console.log('Event received:', data);
});
```

### 6. Access Sandbox Context

```javascript
// Set context
sandbox.context.myData = { value: 123 };

// Access from other plugins
const myData = sandbox.context.myData;
```

### 7. Persistent Configuration

```javascript
// Load config
this.config = await pluginSystem.pluginStorage.get(this.id, 'config', defaults);

// Save config
await pluginSystem.pluginStorage.set(this.id, 'config', this.config);
```

## Plugin Types

### UI Plugin
```javascript
{
    priority: 30,
    init(pluginSystem, sandbox) {
        pluginSystem.executeHook('ui:component:add', {
            id: 'my-widget',
            render: () => '<div>Widget</div>'
        });
    }
}
```

### Hook Plugin
```javascript
{
    priority: 10,
    init(pluginSystem, sandbox) {
        pluginSystem.addHook('command:execute', (data) => {
            // Modify data
            return data;
        }, 10);
    }
}
```

### Service Plugin
```javascript
{
    priority: 20,
    init(pluginSystem, sandbox) {
        this.interval = setInterval(() => {
            // Background task
        }, 5000);
    },
    teardown() {
        clearInterval(this.interval);
    }
}
```

### Integration Plugin
```javascript
{
    priority: 15,
    init(pluginSystem, sandbox) {
        // Connect to external service
        this.api = new ExternalAPI();
    }
}
```

## Examples

See working examples:
- `git-integration.js` - Multi-role plugin (UI + Hook + Integration + Service)
- `performance-monitor.js` - Service + Hook plugin
- `analytics.js` - Service plugin
- `demo-clock.js` - UI plugin

## Priority Guidelines

- **0-9**: Core system plugins
- **10-49**: Essential integration plugins
- **50-99**: Standard plugins
- **100+**: User-installed plugins

## Best Practices

1. Always use `const` (no `let`)
2. Use early returns (no `else` blocks)
3. Clean up resources in `teardown()`
4. Handle errors gracefully
5. Use async/await for async operations
6. Emit events for inter-plugin communication
7. Store configuration via `pluginStorage`
8. Document your plugin clearly

## Testing

Run demos to test:
```bash
bun run plugins/demo-all-plugins.js
bun run plugins/demo-git-integration.js
```
