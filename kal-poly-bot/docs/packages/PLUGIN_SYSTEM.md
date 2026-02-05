# Bun Surgical Dashboard Plugin System

## Overview

The Bun Surgical Dashboard Plugin System provides a flexible, extensible architecture for enhancing dashboard functionality through five primary plugin types. Plugins integrate seamlessly with the dashboard's lifecycle and can combine multiple roles while adhering to defined priority and lifecycle conventions.

## Plugin Types

### 1. UI Plugins

**Purpose**: Extend the dashboard's user interface by adding visual components such as widgets or panels.

**Key Characteristics**:
- Register components via `'ui:component:add'` hook
- Render dynamic visual elements
- Integrate with dashboard layout system

**Examples**:

#### Live Clock Plugin (`demo-clock`)
```typescript
{
  name: 'demo-clock',
  type: 'ui',
  hooks: {
    'ui:component:add': (context) => {
      return {
        id: 'clock-widget',
        component: ClockWidget,
        props: { timezone: 'UTC', format: '24h' }
      };
    }
  }
}
```
- Registers a dynamic widget displaying real-time clock information
- Includes timezone details and formatting options
- Updates automatically via dashboard refresh cycle

#### Git Status Widget (Git Integration Plugin)
- Adds dedicated UI component rendering repository status
- Displays branch information and change metrics
- Updates on repository state changes

#### Analytics Widget (Analytics Plugin)
- Provides panel with command distribution charts
- Shows event counts and error summaries
- Visualizes dashboard usage patterns

---

### 2. Hook Plugins

**Purpose**: Intercept and modify core dashboard behavior through lifecycle hooks without necessarily adding new UI elements.

**Key Characteristics**:
- Attach to lifecycle events (`'dashboard:init'`, `'dashboard:refresh'`)
- Intercept command execution (`'command:execute'`)
- Modify data flows and behaviors
- Can inject insights or transform data

**Examples**:

#### Performance Monitor Plugin
```typescript
{
  name: 'performance-monitor',
  type: 'hook',
  hooks: {
    'dashboard:init': (context) => {
      // Initialize performance tracking
      startPerformanceMonitoring();
    },
    'performance:update': (context) => {
      // Inject high memory warnings
      if (context.memory > 0.9) {
        injectWarning('High memory usage detected');
      }
    }
  }
}
```
- Hooks into `'dashboard:init'` to start monitoring
- Intercepts `'performance:update'` to inject insights
- Provides warnings for high memory usage

#### Git Integration Plugin
- Attaches to `'command:execute'` to tag Git-related commands
- Hooks into `'dashboard:refresh'` to trigger repository rescans
- Modifies command context with Git metadata

#### Custom Notifications Plugin
- Overrides `'notification:show'` hook
- Enhances notifications with sound and persistence
- Transforms notification data before display

---

### 3. Service Plugins

**Purpose**: Operate background tasks, periodic monitoring, or persistent services independent of direct user interaction.

**Key Characteristics**:
- Run continuously in background
- Establish recurring intervals for periodic tasks
- Maintain state across sessions
- Emit events for other plugins to consume

**Examples**:

#### Performance Monitor Plugin
```typescript
{
  name: 'performance-monitor',
  type: 'service',
  services: {
    start: () => {
      setInterval(() => {
        const metrics = collectSystemMetrics();
        emit('performance:update', metrics);
      }, 5000);
    }
  }
}
```
- Establishes recurring interval (every 5 seconds)
- Collects system metrics (memory, CPU, uptime)
- Emits events for other plugins to consume

#### Analytics Plugin
- Tracks events (commands, notifications, file changes, errors)
- Maintains in-memory storage for background aggregation
- Persists data across sessions
- Provides aggregation APIs

#### Backup Plugin (Built-in)
- Runs periodic data backups as background service
- Schedules automatic backup operations
- Manages backup retention policies

---

### 4. Integration Plugins

**Purpose**: Bridge external systems, tools, or data sources into the dashboard.

**Key Characteristics**:
- Interface with external APIs or tools
- Use Bun-native shell execution (`Bun.$`)
- Scan filesystem for configuration
- Transform external data for dashboard consumption

**Examples**:

#### Git Integration Plugin
```typescript
{
  name: 'git-integration',
  type: 'integration',
  integrations: {
    git: {
      status: async () => {
        const result = await Bun.$`git status --porcelain`;
        return parseGitStatus(result.stdout);
      },
      branch: async () => {
        const result = await Bun.$`git branch --show-current`;
        return result.stdout.trim();
      }
    }
  },
  hooks: {
    'dashboard:init': async () => {
      // Scan for .git directories
      const repos = await scanForGitRepos();
      return { repositories: repos };
    }
  }
}
```
- Interfaces with local Git repositories using `Bun.$`
- Executes Git commands (status, branch detection)
- Scans filesystem for `.git` directories
- Provides Git data to other plugins

#### Security Plugin (Built-in)
- Integrates external vulnerability databases
- Connects to security scanners
- Provides security audit capabilities

#### Compliance Plugin (Built-in)
- Connects to regulatory checklists
- Interfaces with external audit services
- Manages compliance tracking

---

### 5. Tool / Utility Plugins

**Purpose**: Provide developer-oriented diagnostics, creation tools, or utilities accessible through the dashboard.

**Key Characteristics**:
- Offer template generation
- Provide validation utilities
- Create development workflows
- Supply standardized utility functions

**Examples**:

#### Plugin DevTools
```typescript
{
  name: 'plugin-devtools',
  type: 'tool',
  tools: {
    createPlugin: (template) => {
      return generatePluginTemplate(template);
    },
    validatePlugin: (plugin) => {
      return validatePluginStructure(plugin);
    }
  }
}
```
- Offers template generation for new plugins
- Provides plugin validation utilities
- Creates plugin development workflows
- Assists in plugin creation process

#### Notification Plugin (Built-in)
- Supplies utility functions for standardized notification display
- Manages notification lifecycle
- Provides notification management APIs

#### Code Quality Plugin (Built-in)
- Delivers linting or analysis tools
- Integrates code quality checks into dashboard
- Provides code analysis utilities

---

## Plugin Architecture

### Plugin Structure

```typescript
interface Plugin {
  name: string;
  version: string;
  type: 'ui' | 'hook' | 'service' | 'integration' | 'tool';
  priority: number; // Lower = higher priority
  dependencies?: string[];
  
  hooks?: {
    [hookName: string]: (context: HookContext) => any;
  };
  
  services?: {
    start?: () => void;
    stop?: () => void;
  };
  
  integrations?: {
    [integrationName: string]: any;
  };
  
  tools?: {
    [toolName: string]: (...args: any[]) => any;
  };
}
```

### Hook System

#### Available Hooks

**Lifecycle Hooks**:
- `'dashboard:init'` - Called when dashboard initializes
- `'dashboard:refresh'` - Called on dashboard refresh
- `'dashboard:shutdown'` - Called when dashboard shuts down

**UI Hooks**:
- `'ui:component:add'` - Register new UI components
- `'ui:component:remove'` - Remove UI components
- `'ui:layout:modify'` - Modify dashboard layout

**Command Hooks**:
- `'command:execute'` - Intercept command execution
- `'command:complete'` - Called after command completion
- `'command:error'` - Handle command errors

**Performance Hooks**:
- `'performance:update'` - Receive performance metrics
- `'performance:threshold'` - Trigger on threshold breaches

**Notification Hooks**:
- `'notification:show'` - Intercept notification display
- `'notification:hide'` - Handle notification dismissal

### Plugin Priority

Plugins execute in priority order (lower number = higher priority):
1. **Priority 0-9**: Core system plugins (built-in)
2. **Priority 10-49**: Essential integration plugins
3. **Priority 50-99**: Standard plugins
4. **Priority 100+**: User-installed plugins

### Plugin Lifecycle

1. **Registration**: Plugin registered with dashboard
2. **Initialization**: `'dashboard:init'` hook called
3. **Service Start**: Background services started
4. **Active**: Plugin fully operational
5. **Shutdown**: `'dashboard:shutdown'` hook called, services stopped

---

## Multi-Role Plugins

Plugins often combine multiple roles. For example:

### Git Integration Plugin (UI + Hook + Integration)

```typescript
{
  name: 'git-integration',
  type: 'integration', // Primary type
  hooks: {
    'ui:component:add': () => ({ /* Git Status Widget */ }),
    'command:execute': (context) => { /* Tag Git commands */ },
    'dashboard:refresh': () => { /* Rescan repositories */ }
  },
  integrations: {
    git: { /* Git API integration */ }
  }
}
```

This plugin:
- **UI Role**: Adds Git Status Widget
- **Hook Role**: Intercepts commands and refresh events
- **Integration Role**: Interfaces with Git repositories

---

## Best Practices

1. **Single Responsibility**: While plugins can have multiple roles, each role should have a clear purpose
2. **Priority Management**: Use appropriate priority levels to ensure correct execution order
3. **Error Handling**: Always handle errors gracefully to prevent plugin failures from affecting dashboard
4. **Resource Management**: Clean up resources in shutdown hooks
5. **Documentation**: Document plugin hooks, services, and integrations clearly
6. **Testing**: Test plugins in isolation before integration

---

## Examples Summary

| Plugin Type | Example | Primary Function |
|------------|---------|------------------|
| **UI** | Live Clock Plugin | Visual widget display |
| **Hook** | Performance Monitor | Intercept lifecycle events |
| **Service** | Analytics Plugin | Background event tracking |
| **Integration** | Git Integration | External system bridge |
| **Tool** | Plugin DevTools | Developer utilities |

These examples illustrate the flexibility of the architecture, where plugins often combine multiple roles while adhering to the defined priority and lifecycle conventions.

---

## Reference Implementation

### Git Integration Plugin

A complete, production-ready implementation of the Git Integration Plugin is available at `plugins/git-integration.js`. This plugin demonstrates:

- **Multi-role architecture**: Combines UI, Hook, and Integration types
- **Bun-native APIs**: Uses `Bun.$` for shell execution
- **Error handling**: Graceful fallbacks when Git is unavailable
- **Event system**: Emits events for other plugins to consume
- **UI component**: Renders real-time repository status widget
- **Hook integration**: Tracks commands and dashboard refresh events

**Key Features**:
- Automatic Git CLI detection
- Repository scanning with status reporting
- Branch, changes, ahead/behind tracking
- Real-time UI widget with refresh capability
- Command execution interception
- Safe error handling and fallback states

See `plugins/README.md` for installation and usage instructions.
