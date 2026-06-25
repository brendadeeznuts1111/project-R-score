# Keyboard Shortcuts Lite

🚀 **Blazing fast keyboard shortcut library optimized for Bun**

A lightweight, accessible, and performant keyboard shortcut management system that respects user context and provides delightful user experience.

## ✨ Features

- **⚡ Bun-Optimized** - Built from the ground up for Bun's runtime
- **🎯 Context-Aware** - Respects typing in form elements
- **♿ Accessible** - Screen reader support with ARIA live regions  
- **🎨 Visual Feedback** - Smooth focus animations and tooltips
- **🛡️ Memory Safe** - Proper cleanup and event management
- **📏 Tiny Size** - 891 bytes gzipped
- **🧪 Well-Tested** - Comprehensive test suite with Bun's native runner

## 📦 Installation

```bash
bun add keyboard-shortcuts-lite
```

## 🚀 Quick Start

```typescript
import { shortcuts, focusWithFeedback } from 'keyboard-shortcuts-lite';

// Register shortcuts
shortcuts.register('k', () => {
  focusWithFeedback('[data-search-input]', { 
    announce: true,
    announceMessage: 'Search activated' 
  });
});

shortcuts.register('e', () => exportData());
shortcuts.register('r', () => refreshDashboard());
shortcuts.register('h', () => showHelp());

// That's it! Shortcuts are automatically initialized
```

## 📖 API Reference

### `KeyboardShortcutManager`

#### Methods

- `register(key, callback, options?)` - Register a keyboard shortcut
- `unregister(key)` - Remove a keyboard shortcut  
- `has(key)` - Check if shortcut exists
- `getAll()` - Get all registered shortcuts
- `setEnabled(enabled)` - Enable/disable all shortcuts
- `init()` - Initialize the manager
- `destroy()` - Cleanup and destroy
- `getMetrics()` - Get performance metrics

#### Options

```typescript
interface ShortcutOptions {
  requireModifier?: boolean; // Default: true
  description?: string;
}
```

### Focus Utilities

#### `focusWithFeedback`

```typescript
focusWithFeedback(selector, options?): boolean
```

#### Focus Options

```typescript
interface FocusOptions {
  selectText?: boolean;      // Default: true
  announce?: boolean;        // Default: true  
  announceMessage?: string;  // Default: "Element focused"
}
```

## 🎯 Advanced Usage

### Custom Key Mapping

```typescript
import { KeyboardShortcutManager } from 'keyboard-shortcuts-lite';

const kb = new KeyboardShortcutManager();

// Register without modifier (like Escape key)
kb.register('escape', () => closeModal(), { 
  requireModifier: false 
});

// Register with custom description
kb.register('s', () => saveDocument(), {
  description: 'Save document'
});
```

### Async Callbacks

```typescript
shortcuts.register('s', async () => {
  await saveDocument();
  await showSuccessMessage();
});
```

### Performance Monitoring

```typescript
const metrics = shortcuts.getMetrics();
console.log(metrics);
// {
//   registeredShortcuts: 4,
//   isInitialized: true,
//   enabled: true,
//   lastExecutions: { k: 1640995200000 }
// }
```

## 🧪 Testing

```bash
bun test
```

## 🏗️ Development

```bash
# Install dependencies
bun install

# Run tests in watch mode  
bun dev

# Build for production
bun run build

# Run tests
bun test
```

## 📊 Performance

| Metric           | Value                     |
|------------------|---------------------------|
| Bundle Size      | 891 bytes gzipped        |
| Test Execution   | ~0.03s                    |
| Build Time       | ~0.1s                     |
| Memory Footprint | < 1KB                     |

## 🌟 Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome!

---

**Built with ❤️ and Bun** 🚀
