# Pluggable Development Server Architecture

## Overview

This document describes the new pluggable architecture for the Dashboard Worker
development server that solves the "Brittle Dev Server" problem. Instead of
hardcoding file type support in complex conditionals, the new system uses a
plugin-based architecture that allows easy extension for new file types.

## The Problem

**Before:** Adding support for a new file type (e.g., `.graphql`) required:

1. Finding the hardcoded list of extensions in `hmr-manager.ts`
2. Adding the extension to the array
3. Implementing custom logic in multiple places
4. Testing to ensure no conflicts

**After:** Adding support for a new file type now requires:

1. Creating a new plugin class
2. Registering it with the plugin manager
3. That's it!

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Server                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 HMR Manager                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │          Plugin Manager                    │    │    │
│  │  │  ┌─────────┬─────────┬─────────┬─────────┐  │    │    │
│  │  │  │JavaScript│  CSS   │  HTML  │GraphQL │  │    │    │
│  │  │  │ Plugin  │ Plugin │ Plugin │Plugin │  │    │    │
│  │  │  └─────────┴─────────┴─────────┴─────────┘  │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Plugin Manager (`PluginManager`)

The central orchestrator that:

- Registers and manages plugins
- Processes file changes through appropriate plugins
- Handles plugin lifecycle (init/cleanup)
- Provides plugin statistics and configuration

### 2. File Watcher Plugins (`FileWatcherPlugin`)

Each plugin implements a standard interface:

- `canHandle(filePath)` - Determines if plugin handles a file
- `processFileChange(change)` - Processes file changes
- `initialize()` / `cleanup()` - Lifecycle management
- Priority-based execution order

### 3. Built-in Plugins

#### JavaScript/TypeScript Plugin

- **Extensions:** `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`
- **Priority:** 100 (highest)
- **Action:** HMR for most changes, reload for deletes/renames

#### CSS Plugin

- **Extensions:** `.css`, `.scss`, `.sass`, `.less`, `.styl`
- **Priority:** 90
- **Action:** HMR (hot-reload styles without page refresh)

#### HTML Plugin

- **Extensions:** `.html`, `.htm`, `.ejs`, `.pug`, `.hbs`
- **Priority:** 80
- **Action:** Reload (HTML changes require full page refresh)

#### GraphQL Plugin

- **Extensions:** `.graphql`, `.gql`, `.graphqls`
- **Priority:** 70
- **Action:** HMR with schema recompilation for schema files

#### Config Plugin

- **Extensions:** `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.env`
- **Priority:** 50
- **Action:** Reload (configuration changes require restart)

## Usage Examples

### Basic Usage

```typescript
import {
  PluginManager,
  createDefaultPluginConfig,
} from './core/file-watcher-plugin';

// Create plugin manager with default plugins
const pluginManager = new PluginManager(createDefaultPluginConfig());

// Initialize all plugins
await pluginManager.initialize();

// Process a file change
const result = await pluginManager.processFileChange({
  type: 'modify',
  path: '/src/components/Button.tsx',
  timestamp: new Date(),
});

console.log(`Action: ${result.action}, Processed by: ${result.processedBy}`);
```

### Adding Custom Plugins

```typescript
import { PluginManager, FileWatcherPlugin } from './core/file-watcher-plugin';

// Create custom plugin
class CustomPlugin implements FileWatcherPlugin {
  name = 'custom';
  version = '1.0.0';
  description = 'My custom file type handler';

  config = {
    extensions: ['.custom'],
    description: 'Custom file type',
    priority: 75,
    enabled: true,
  };

  async processFileChange(change) {
    // Custom processing logic
    return {
      success: true,
      action: 'hmr',
      data: { customField: 'value' },
    };
  }

  // ... implement other required methods
}

// Register and use
const pluginManager = new PluginManager();
pluginManager.registerPlugin(new CustomPlugin());
```

### Advanced Configuration

```typescript
import {
  PluginManager,
  JavaScriptPlugin,
  CSSPlugin,
} from './core/file-watcher-plugin';

// Custom plugin configuration
const pluginManager = new PluginManager({
  plugins: [new JavaScriptPlugin(), new CSSPlugin()],
  defaultAction: 'ignore',
  maxConcurrentPlugins: 5,
  pluginTimeout: 10000,
});

// Disable a specific plugin
pluginManager.setPluginEnabled('css', false);

// Get plugin statistics
const stats = pluginManager.getStats();
console.log(`Active plugins: ${stats.enabledPlugins}/${stats.totalPlugins}`);
```

## File Change Actions

### 1. HMR (Hot Module Replacement)

- **Description:** Updates modules without full page reload
- **Use Case:** JavaScript, TypeScript, CSS changes
- **Benefits:** Faster development, maintains application state

### 2. Reload (Full Page Reload)

- **Description:** Triggers complete page refresh
- **Use Case:** HTML, configuration, database changes
- **Benefits:** Ensures all changes are properly applied

### 3. Ignore

- **Description:** Ignores the file change
- **Use Case:** Log files, temporary files, build artifacts
- **Benefits:** Prevents unnecessary processing

### 4. Custom

- **Description:** Plugin-specific custom actions
- **Use Case:** Specialized processing (e.g., documentation rebuild)
- **Benefits:** Extensible for unique requirements

## Plugin Priority System

Plugins are executed in priority order (higher numbers first):

- **100+:** Critical system files (JavaScript/TypeScript)
- **90-99:** Styling files (CSS, preprocessors)
- **80-89:** Template files (HTML, templating engines)
- **70-79:** Data/API files (GraphQL, JSON)
- **50-69:** Configuration files
- **30-49:** Database/migrations
- **10-29:** Specialized/custom plugins
- **<10:** Low priority (logs, temporary files)

## Error Handling

The plugin system includes robust error handling:

- **Plugin Timeout:** Prevents hanging plugins (default: 5 seconds)
- **Graceful Degradation:** Failed plugins don't break the system
- **Detailed Logging:** Comprehensive error reporting
- **Fallback Actions:** Default actions when plugins fail

## Performance Considerations

- **Concurrent Processing:** Multiple plugins can process simultaneously
- **Debounced Changes:** File changes are batched to prevent overload
- **Plugin Prioritization:** High-priority plugins processed first
- **Resource Cleanup:** Proper cleanup prevents memory leaks

## Migration Guide

### From Hardcoded Extensions

**Old Approach:**

```typescript
// Hardcoded in multiple places
const validExtensions = ['.ts', '.js', '.tsx', '.jsx', '.vue', '.svelte'];

if (validExtensions.includes(ext)) {
  // Complex conditional logic here
}
```

**New Approach:**

```typescript
// Plugin-based - just add a new plugin
class VuePlugin implements FileWatcherPlugin {
  // Plugin implementation
}

// Register it
pluginManager.registerPlugin(new VuePlugin());
```

### Adding GraphQL Support

**Before:** Would require modifying core files and testing extensively

**After:**

```typescript
// Create GraphQL plugin
import { GraphQLPlugin } from './core/file-watcher-plugin';

// That's it! GraphQL support is already included
const pluginManager = new PluginManager(createDefaultPluginConfig());
```

## Best Practices

### 1. Plugin Design

- Keep plugins focused on specific file types
- Implement proper error handling
- Use appropriate priorities
- Document plugin behavior

### 2. Performance

- Avoid blocking operations in `processFileChange`
- Use timeouts for external operations
- Implement efficient file type detection

### 3. Testing

- Test plugins independently
- Verify priority ordering
- Test error scenarios
- Validate plugin cleanup

### 4. Configuration

- Use environment variables for plugin settings
- Provide sensible defaults
- Document configuration options

## Example: Adding Vue.js Support

```typescript
import {
  PluginManager,
  FileWatcherPlugin,
  FileTypeConfig,
} from './core/file-watcher-plugin';

class VuePlugin implements FileWatcherPlugin {
  name = 'vue';
  version = '1.0.0';
  description = 'Vue.js single-file component support';

  config: FileTypeConfig = {
    extensions: ['.vue'],
    description: 'Vue.js SFC files',
    priority: 95,
    enabled: true,
  };

  async processFileChange(change) {
    return {
      success: true,
      action: change.type === 'delete' ? 'reload' : 'hmr',
      data: {
        fileType: 'vue',
        componentUpdate: true,
      },
    };
  }

  // ... implement other required methods
}

// Usage
const pluginManager = new PluginManager();
pluginManager.registerPlugin(new VuePlugin());
```

## Troubleshooting

### Common Issues

1. **Plugin Not Triggering**

   - Check `canHandle()` method returns `true`
   - Verify plugin is enabled
   - Check priority vs other plugins

2. **Plugin Timeout**

   - Implement timeouts in plugin operations
   - Check for blocking I/O operations
   - Review plugin priority

3. **Memory Leaks**
   - Ensure proper cleanup in `cleanup()` method
   - Avoid circular references
   - Clear event listeners

### Debug Information

```typescript
// Get detailed plugin stats
const stats = pluginManager.getStats();
console.log(JSON.stringify(stats, null, 2));

// Enable verbose logging
console.log(
  'Registered plugins:',
  pluginManager.getPlugins().map(p => p.name)
);

// Test specific file
const testResult = await pluginManager.processFileChange({
  type: 'modify',
  path: '/test/file.vue',
  timestamp: new Date(),
});
```

## Future Enhancements

- **Plugin Marketplace:** Community-contributed plugins
- **Plugin Dependencies:** Plugin dependency management
- **Hot Plugin Loading:** Load plugins without restart
- **Plugin Configuration UI:** Web-based plugin management
- **Performance Monitoring:** Plugin performance metrics

## Conclusion

The pluggable architecture transforms the brittle dev server into a flexible,
extensible system. Adding new file types is now a matter of implementing a
simple plugin interface, making the system maintainable and future-proof.

**Key Benefits:**

- ✅ Easy extension for new file types
- ✅ Clean separation of concerns
- ✅ Priority-based processing
- ✅ Robust error handling
- ✅ Performance optimizations
- ✅ Community extensibility
