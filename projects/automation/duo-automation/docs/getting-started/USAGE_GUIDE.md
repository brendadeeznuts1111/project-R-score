# 🚀 Keyboard Shortcuts Lite - Complete Usage Guide & Codebase Examples

## **📦 Installation & Basic Usage**

### **Installation:**

```bash
# Using npm
npm install keyboard-shortcuts-lite

# Using yarn
yarn add keyboard-shortcuts-lite

# Using bun (recommended for maximum performance)
bun add keyboard-shortcuts-lite
```

### **Basic Usage:**

```typescript
// Import the library
import { shortcuts } from 'keyboard-shortcuts-lite';

// Register a simple shortcut
shortcuts.register('ctrl+s', () => {
    console.log('Save triggered!');
});

// Initialize the shortcut system
shortcuts.init();

// Your application continues...
```

---

## **🎯 Advanced Usage Examples**

### **1. Complete Application Integration:**

```typescript
// app.ts - Main application file
import { shortcuts, KeyboardShortcutManager } from 'keyboard-shortcuts-lite';

class TextEditor {
    private shortcutManager: KeyboardShortcutManager;
    
    constructor() {
        this.shortcutManager = shortcuts;
        this.setupShortcuts();
        this.shortcutManager.init();
    }
    
    private setupShortcuts(): void {
        // File operations
        this.shortcutManager.register('ctrl+n', () => this.newFile(), {
            description: 'Create new file',
            category: 'file'
        });
        
        this.shortcutManager.register('ctrl+o', () => this.openFile(), {
            description: 'Open file',
            category: 'file'
        });
        
        this.shortcutManager.register('ctrl+s', () => this.saveFile(), {
            description: 'Save file',
            category: 'file',
            preventDefault: true
        });
        
        // Edit operations
        this.shortcutManager.register('ctrl+z', () => this.undo(), {
            description: 'Undo',
            category: 'edit'
        });
        
        this.shortcutManager.register('ctrl+y', () => this.redo(), {
            description: 'Redo',
            category: 'edit'
        });
        
        this.shortcutManager.register('ctrl+a', () => this.selectAll(), {
            description: 'Select all',
            category: 'edit'
        });
        
        // View operations
        this.shortcutManager.register('ctrl+plus', () => this.zoomIn(), {
            description: 'Zoom in',
            category: 'view'
        });
        
        this.shortcutManager.register('ctrl+minus', () => this.zoomOut(), {
            description: 'Zoom out',
            category: 'view'
        });
        
        this.shortcutManager.register('ctrl+0', () => this.resetZoom(), {
            description: 'Reset zoom',
            category: 'view'
        });
        
        // Custom application shortcuts
        this.shortcutManager.register('ctrl+shift+f', () => this.formatCode(), {
            description: 'Format code',
            category: 'tools'
        });
        
        this.shortcutManager.register('f11', () => this.toggleFullscreen(), {
            description: 'Toggle fullscreen',
            category: 'view'
        });
    }
    
    private newFile(): void {
        console.log('Creating new file...');
        // Implementation here
    }
    
    private openFile(): void {
        console.log('Opening file...');
        // Implementation here
    }
    
    private saveFile(): void {
        console.log('Saving file...');
        // Implementation here
    }
    
    private undo(): void {
        console.log('Undoing last action...');
        // Implementation here
    }
    
    private redo(): void {
        console.log('Redoing last action...');
        // Implementation here
    }
    
    private selectAll(): void {
        console.log('Selecting all content...');
        // Implementation here
    }
    
    private zoomIn(): void {
        console.log('Zooming in...');
        // Implementation here
    }
    
    private zoomOut(): void {
        console.log('Zooming out...');
        // Implementation here
    }
    
    private resetZoom(): void {
        console.log('Resetting zoom...');
        // Implementation here
    }
    
    private formatCode(): void {
        console.log('Formatting code...');
        // Implementation here
    }
    
    private toggleFullscreen(): void {
        console.log('Toggling fullscreen...');
        // Implementation here
    }
}

// Initialize the application
const editor = new TextEditor();
```

### **2. React Component Integration:**

```typescript
// components/KeyboardShortcutsProvider.tsx
import React, { useEffect, createContext, useContext } from 'react';
import { shortcuts, KeyboardShortcutManager } from 'keyboard-shortcuts-lite';

interface KeyboardContextType {
    shortcuts: KeyboardShortcutManager;
    registerShortcut: (key: string, callback: () => void, options?: any) => void;
    unregisterShortcut: (key: string) => void;
}

const KeyboardContext = createContext<KeyboardContextType | null>(null);

export const useKeyboardShortcuts = () => {
    const context = useContext(KeyboardContext);
    if (!context) {
        throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
    }
    return context;
};

interface KeyboardShortcutsProviderProps {
    children: React.ReactNode;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
    const [shortcutManager] = useState(() => shortcuts);
    
    useEffect(() => {
        shortcutManager.init();
        return () => {
            shortcutManager.destroy();
        };
    }, [shortcutManager]);
    
    const registerShortcut = (key: string, callback: () => void, options?: any) => {
        shortcutManager.register(key, callback, options);
    };
    
    const unregisterShortcut = (key: string) => {
        shortcutManager.unregister(key);
    };
    
    return (
        <KeyboardContext.Provider value={{ 
            shortcuts: shortcutManager, 
            registerShortcut, 
            unregisterShortcut 
        }}>
            {children}
        </KeyboardContext.Provider>
    );
};

// Usage in a component
// components/TextEditor.tsx
import React, { useState } from 'react';
import { useKeyboardShortcuts } from './KeyboardShortcutsProvider';

export const TextEditor: React.FC = () => {
    const [content, setContent] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { registerShortcut } = useKeyboardShortcuts();
    
    React.useEffect(() => {
        // Register shortcuts for this component
        registerShortcut('ctrl+b', () => {
            document.execCommand('bold');
        }, { description: 'Bold text' });
        
        registerShortcut('ctrl+i', () => {
            document.execCommand('italic');
        }, { description: 'Italic text' });
        
        registerShortcut('ctrl+u', () => {
            document.execCommand('underline');
        }, { description: 'Underline text' });
        
        registerShortcut('f11', () => {
            setIsFullscreen(!isFullscreen);
        }, { description: 'Toggle fullscreen' });
    }, [registerShortcut, isFullscreen]);
    
    return (
        <div className={`text-editor ${isFullscreen ? 'fullscreen' : ''}`}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing... (Ctrl+B for bold, Ctrl+I for italic, Ctrl+U for underline)"
            />
        </div>
    );
};
```

### **3. Vue.js Integration:**

```typescript
// composables/useKeyboardShortcuts.ts
import { onMounted, onUnmounted } from 'vue';
import { shortcuts, KeyboardShortcutManager } from 'keyboard-shortcuts-lite';

export function useKeyboardShortcuts() {
    const shortcutManager = shortcuts;
    
    onMounted(() => {
        shortcutManager.init();
    });
    
    onUnmounted(() => {
        shortcutManager.destroy();
    });
    
    const register = (key: string, callback: () => void, options?: any) => {
        shortcutManager.register(key, callback, options);
    };
    
    const unregister = (key: string) => {
        shortcutManager.unregister(key);
    };
    
    return {
        register,
        unregister,
        manager: shortcutManager
    };
}

// Usage in Vue component
// components/Editor.vue
<template>
    <div class="editor" :class="{ fullscreen: isFullscreen }">
        <textarea 
            v-model="content"
            placeholder="Type here... Use Ctrl+S to save"
            @keydown="handleKeydown"
        />
        <div class="status">
            Press Ctrl+S to save, Ctrl+Z to undo, Ctrl+Y to redo
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

const content = ref('');
const isFullscreen = ref(false);
const { register } = useKeyboardShortcuts();

onMounted(() => {
    // Register shortcuts
    register('ctrl+s', () => {
        saveContent();
    }, { description: 'Save content' });
    
    register('ctrl+z', () => {
        undo();
    }, { description: 'Undo' });
    
    register('ctrl+y', () => {
        redo();
    }, { description: 'Redo' });
    
    register('f11', () => {
        isFullscreen.value = !isFullscreen.value;
    }, { description: 'Toggle fullscreen' });
});

const saveContent = () => {
    console.log('Saving content:', content.value);
    // Save logic here
};

const undo = () => {
    console.log('Undo action');
    // Undo logic here
};

const redo = () => {
    console.log('Redo action');
    // Redo logic here
};

const handleKeydown = (event: KeyboardEvent) => {
    // Additional keyboard handling if needed
};
</script>
```

### **4. Advanced Configuration:**

```typescript
// config/shortcuts.ts
import { KeyboardShortcutManager, ShortcutConfig } from 'keyboard-shortcuts-lite';

export const shortcutConfig: ShortcutConfig = {
    // Global configuration
    preventDefault: true,
    stopPropagation: true,
    allowRepeat: false,
    
    // Performance optimization
    throttle: 16, // 60fps
    debounce: 100,
    
    // Debug mode
    debug: process.env.NODE_ENV === 'development',
    
    // Custom key mappings
    keyMap: {
        'cmd': 'meta', // Mac command key
        'option': 'alt', // Mac option key
        'control': 'ctrl'
    },
    
    // Categories for organization
    categories: {
        'file': { priority: 1, color: '#3b82f6' },
        'edit': { priority: 2, color: '#10b981' },
        'view': { priority: 3, color: '#f59e0b' },
        'tools': { priority: 4, color: '#8b5cf6' },
        'help': { priority: 5, color: '#ef4444' }
    }
};

// advanced-shortcuts.ts
import { shortcuts } from 'keyboard-shortcuts-lite';

class AdvancedShortcutManager {
    private manager = shortcuts;
    
    constructor() {
        this.manager.init(shortcutConfig);
        this.setupAdvancedShortcuts();
    }
    
    private setupAdvancedShortcuts(): void {
        // Multi-key shortcuts
        this.manager.register('ctrl+k ctrl+s', () => {
            this.saveAndClose();
        }, {
            description: 'Save and close',
            category: 'file',
            sequence: true
        });
        
        // Conditional shortcuts
        this.manager.register('ctrl+enter', () => {
            if (this.isInEditMode()) {
                this.saveAndExitEditMode();
            } else {
                this.enterEditMode();
            }
        }, {
            description: 'Toggle edit mode',
            category: 'edit',
            condition: () => true // Always available
        });
        
        // Context-aware shortcuts
        this.manager.register('ctrl+f', () => {
            if (this.isInputFocused()) {
                this.findInInput();
            } else {
                this.findInPage();
            }
        }, {
            description: 'Find',
            category: 'edit',
            context: 'global'
        });
        
        // Dynamic shortcuts
        this.manager.register('ctrl+shift+p', () => {
            this.showCommandPalette();
        }, {
            description: 'Command palette',
            category: 'tools',
            dynamic: true
        });
    }
    
    private saveAndClose(): void {
        console.log('Saving and closing...');
        // Implementation
    }
    
    private isInEditMode(): boolean {
        return document.body.classList.contains('edit-mode');
    }
    
    private saveAndExitEditMode(): void {
        console.log('Saving and exiting edit mode...');
        // Implementation
    }
    
    private enterEditMode(): void {
        console.log('Entering edit mode...');
        // Implementation
    }
    
    private isInputFocused(): boolean {
        return document.activeElement?.tagName === 'INPUT' || 
               document.activeElement?.tagName === 'TEXTAREA';
    }
    
    private findInInput(): void {
        console.log('Finding in input...');
        // Implementation
    }
    
    private findInPage(): void {
        console.log('Finding in page...');
        // Implementation
    }
    
    private showCommandPalette(): void {
        console.log('Showing command palette...');
        // Implementation
    }
}

// Export the advanced manager
export const advancedShortcuts = new AdvancedShortcutManager();
```

### **5. Real-world Application Example:**

```typescript
// src/App.tsx - Complete application
import React, { useEffect, useState } from 'react';
import { shortcuts, KeyboardShortcutManager } from 'keyboard-shortcuts-lite';

interface AppState {
    files: File[];
    activeFile: File | null;
    isFullscreen: boolean;
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
}

class File {
    constructor(
        public id: string,
        public name: string,
        public content: string = '',
        public saved: boolean = true
    ) {}
}

export const App: React.FC = () => {
    const [state, setState] = useState<AppState>({
        files: [],
        activeFile: null,
        isFullscreen: false,
        theme: 'light',
        sidebarOpen: true
    });
    
    const shortcutManager = shortcuts;
    
    useEffect(() => {
        setupGlobalShortcuts();
        shortcutManager.init();
        
        return () => {
            shortcutManager.destroy();
        };
    }, []);
    
    const setupGlobalShortcuts = () => {
        // File operations
        shortcutManager.register('ctrl+n', () => {
            createNewFile();
        }, { description: 'New file', category: 'file' });
        
        shortcutManager.register('ctrl+o', () => {
            openFile();
        }, { description: 'Open file', category: 'file' });
        
        shortcutManager.register('ctrl+s', () => {
            saveCurrentFile();
        }, { description: 'Save file', category: 'file' });
        
        shortcutManager.register('ctrl+shift+s', () => {
            saveAllFiles();
        }, { description: 'Save all', category: 'file' });
        
        // Edit operations
        shortcutManager.register('ctrl+z', () => {
            undo();
        }, { description: 'Undo', category: 'edit' });
        
        shortcutManager.register('ctrl+y', () => {
            redo();
        }, { description: 'Redo', category: 'edit' });
        
        shortcutManager.register('ctrl+a', () => {
            selectAll();
        }, { description: 'Select all', category: 'edit' });
        
        // View operations
        shortcutManager.register('ctrl+b', () => {
            toggleSidebar();
        }, { description: 'Toggle sidebar', category: 'view' });
        
        shortcutManager.register('f11', () => {
            toggleFullscreen();
        }, { description: 'Toggle fullscreen', category: 'view' });
        
        shortcutManager.register('ctrl+plus', () => {
            increaseFontSize();
        }, { description: 'Increase font size', category: 'view' });
        
        shortcutManager.register('ctrl+minus', () => {
            decreaseFontSize();
        }, { description: 'Decrease font size', category: 'view' });
        
        shortcutManager.register('ctrl+0', () => {
            resetFontSize();
        }, { description: 'Reset font size', category: 'view' });
        
        // Theme operations
        shortcutManager.register('ctrl+shift+t', () => {
            toggleTheme();
        }, { description: 'Toggle theme', category: 'view' });
        
        // Navigation
        shortcutManager.register('ctrl+tab', () => {
            switchToNextFile();
        }, { description: 'Next file', category: 'navigation' });
        
        shortcutManager.register('ctrl+shift+tab', () => {
            switchToPreviousFile();
        }, { description: 'Previous file', category: 'navigation' });
        
        // Search
        shortcutManager.register('ctrl+f', () => {
            openSearch();
        }, { description: 'Find', category: 'edit' });
        
        shortcutManager.register('ctrl+h', () => {
            openReplace();
        }, { description: 'Replace', category: 'edit' });
        
        // Help
        shortcutManager.register('f1', () => {
            showHelp();
        }, { description: 'Show help', category: 'help' });
        
        shortcutManager.register('ctrl+/', () => {
            showShortcuts();
        }, { description: 'Show shortcuts', category: 'help' });
    };
    
    const createNewFile = () => {
        const newFile = new File(
            Date.now().toString(),
            `Untitled-${state.files.length + 1}.txt`
        );
        setState(prev => ({
            ...prev,
            files: [...prev.files, newFile],
            activeFile: newFile
        }));
    };
    
    const openFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    const newFile = new File(file.name, file.name, content);
                    setState(prev => ({
                        ...prev,
                        files: [...prev.files, newFile],
                        activeFile: newFile
                    }));
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
    
    const saveCurrentFile = () => {
        if (state.activeFile) {
            console.log('Saving file:', state.activeFile.name);
            state.activeFile.saved = true;
            setState(prev => ({ ...prev }));
        }
    };
    
    const saveAllFiles = () => {
        state.files.forEach(file => {
            file.saved = true;
        });
        setState(prev => ({ ...prev }));
    };
    
    const undo = () => {
        console.log('Undo action');
        // Implementation
    };
    
    const redo = () => {
        console.log('Redo action');
        // Implementation
    };
    
    const selectAll = () => {
        if (state.activeFile) {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                textarea.select();
            }
        }
    };
    
    const toggleSidebar = () => {
        setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    };
    
    const toggleFullscreen = () => {
        setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
    };
    
    const increaseFontSize = () => {
        console.log('Increasing font size');
        // Implementation
    };
    
    const decreaseFontSize = () => {
        console.log('Decreasing font size');
        // Implementation
    };
    
    const resetFontSize = () => {
        console.log('Resetting font size');
        // Implementation
    };
    
    const toggleTheme = () => {
        setState(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
        }));
    };
    
    const switchToNextFile = () => {
        if (state.files.length > 1) {
            const currentIndex = state.files.findIndex(f => f.id === state.activeFile?.id);
            const nextIndex = (currentIndex + 1) % state.files.length;
            setState(prev => ({ ...prev, activeFile: prev.files[nextIndex] }));
        }
    };
    
    const switchToPreviousFile = () => {
        if (state.files.length > 1) {
            const currentIndex = state.files.findIndex(f => f.id === state.activeFile?.id);
            const prevIndex = currentIndex === 0 ? state.files.length - 1 : currentIndex - 1;
            setState(prev => ({ ...prev, activeFile: prev.files[prevIndex] }));
        }
    };
    
    const openSearch = () => {
        console.log('Opening search');
        // Implementation
    };
    
    const openReplace = () => {
        console.log('Opening replace');
        // Implementation
    };
    
    const showHelp = () => {
        console.log('Showing help');
        // Implementation
    };
    
    const showShortcuts = () => {
        const shortcutsList = shortcutManager.getRegisteredShortcuts();
        console.log('Available shortcuts:', shortcutsList);
        // Implementation to show UI
    };
    
    return (
        <div className={`app ${state.theme} ${state.isFullscreen ? 'fullscreen' : ''}`}>
            {/* Header */}
            <header className="header">
                <h1>Text Editor Pro</h1>
                <div className="header-actions">
                    <button onClick={() => showShortcuts()}>
                        Shortcuts (Ctrl+/)
                    </button>
                    <button onClick={() => showHelp()}>
                        Help (F1)
                    </button>
                </div>
            </header>
            
            {/* Main content */}
            <div className="main-content">
                {/* Sidebar */}
                {state.sidebarOpen && (
                    <aside className="sidebar">
                        <h3>Files</h3>
                        <ul>
                            {state.files.map(file => (
                                <li
                                    key={file.id}
                                    className={state.activeFile?.id === file.id ? 'active' : ''}
                                    onClick={() => setState(prev => ({ ...prev, activeFile: file }))}
                                >
                                    {file.name} {!file.saved && '*'}
                                </li>
                            ))}
                        </ul>
                    </aside>
                )}
                
                {/* Editor */}
                <main className="editor">
                    {state.activeFile ? (
                        <div>
                            <div className="editor-header">
                                <h2>{state.activeFile.name}</h2>
                                <div className="editor-actions">
                                    <button onClick={() => saveCurrentFile()}>
                                        Save (Ctrl+S)
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={state.activeFile.content}
                                onChange={(e) => {
                                    state.activeFile.content = e.target.value;
                                    state.activeFile.saved = false;
                                    setState(prev => ({ ...prev }));
                                }}
                                placeholder="Start typing..."
                            />
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No file selected. Press Ctrl+N to create a new file.</p>
                        </div>
                    )}
                </main>
            </div>
            
            {/* Status bar */}
            <footer className="status-bar">
                <div>
                    {state.activeFile?.name || 'No file'}
                    {!state.activeFile?.saved && ' (unsaved)'}
                </div>
                <div>
                    Press Ctrl+/ for all shortcuts
                </div>
            </footer>
        </div>
    );
};
```

### **6. Performance Monitoring:**

```typescript
// utils/performance.ts
import { shortcuts } from 'keyboard-shortcuts-lite';

class PerformanceMonitor {
    private metrics = {
        registrations: 0,
        executions: 0,
        averageExecutionTime: 0,
        errors: 0
    };
    
    constructor() {
        this.setupPerformanceTracking();
    }
    
    private setupPerformanceTracking(): void {
        // Track registration performance
        const originalRegister = shortcuts.register.bind(shortcuts);
        shortcuts.register = (key: string, callback: Function, options?: any) => {
            const start = performance.now();
            const result = originalRegister(key, callback, options);
            const end = performance.now();
            
            this.metrics.registrations++;
            console.log(`Shortcut '${key}' registered in ${(end - start).toFixed(2)}ms`);
            
            return result;
        };
        
        // Track execution performance
        shortcuts.on('execute', (data: any) => {
            const start = performance.now();
            this.metrics.executions++;
            
            // Measure execution time
            setTimeout(() => {
                const end = performance.now();
                const executionTime = end - start;
                this.metrics.averageExecutionTime = 
                    (this.metrics.averageExecutionTime + executionTime) / 2;
                
                console.log(`Shortcut executed in ${executionTime.toFixed(2)}ms`);
            }, 0);
        });
        
        // Track errors
        shortcuts.on('error', (error: Error) => {
            this.metrics.errors++;
            console.error('Shortcut error:', error);
        });
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    generateReport(): string {
        const { registrations, executions, averageExecutionTime, errors } = this.metrics;
        return `
Performance Report:
- Registrations: ${registrations}
- Executions: ${executions}
- Average Execution Time: ${averageExecutionTime.toFixed(2)}ms
- Errors: ${errors}
- Success Rate: ${executions > 0 ? ((executions - errors) / executions * 100).toFixed(2) : 0}%
        `.trim();
    }
}

export const performanceMonitor = new PerformanceMonitor();
```

---

## **🎯 Best Practices & Tips**

### **1. Performance Optimization:**

```typescript
// Use throttling for rapid-fire shortcuts
shortcuts.register('ctrl+space', () => {
    showAutocomplete();
}, {
    throttle: 100, // Limit to 10 times per second
    preventDefault: true
});

// Use debouncing for search shortcuts
shortcuts.register('ctrl+f', () => {
    openSearch();
}, {
    debounce: 200, // Wait 200ms after key release
    preventDefault: true
});
```

### **2. Context-Aware Shortcuts:**

```typescript
// Only register shortcuts when component is mounted
useEffect(() => {
    const unregister = shortcuts.register('ctrl+s', saveFile, {
        condition: () => document.activeElement?.tagName !== 'INPUT'
    });
    
    return unregister;
}, []);
```

### **3. Error Handling:**

```typescript
shortcuts.register('ctrl+r', () => {
    try {
        performRiskyOperation();
    } catch (error) {
        console.error('Shortcut failed:', error);
        showErrorMessage('Operation failed');
    }
}, {
    onError: (error) => console.error('Shortcut error:', error)
});
```

---

## **🚀 Production Deployment:**

### **Bundle Optimization:**

```typescript
// tree-shaking support
import { shortcuts } from 'keyboard-shortcuts-lite/dist/shortcuts.min.js';

// Use in production with optimized build
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    shortcuts.init({
        debug: false,
        performance: true
    });
}
```

### **CDN Usage:**

```html
<!-- Direct CDN usage -->
<script src="https://unpkg.com/keyboard-shortcuts-lite/dist/shortcuts.min.js"></script>
<script>
    const { shortcuts } = KeyboardShortcutsLite;
    shortcuts.register('ctrl+s', () => saveFile());
    shortcuts.init();
</script>
```

---

## **📊 Complete Example Repository Structure:**

```text
my-project/
├── src/
│   ├── components/
│   │   ├── KeyboardShortcutsProvider.tsx
│   │   ├── TextEditor.tsx
│   │   └── FileExplorer.tsx
│   ├── composables/
│   │   └── useKeyboardShortcuts.ts
│   ├── config/
│   │   └── shortcuts.ts
│   ├── utils/
│   │   └── performance.ts
│   ├── App.tsx
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

**🎉 That's it! You now have a complete understanding of how to use keyboard-shortcuts-lite in any codebase with comprehensive examples for React, Vue, TypeScript, and vanilla JavaScript!**
