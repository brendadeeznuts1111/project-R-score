/**
 * Shortcut Customization Component
 * Enhanced UI for customizing keyboard shortcuts with presets and export/import
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import shortcutsConfig from '../config/shortcuts.toml' with { type: 'toml' };

interface ShortcutPreset {
  id: string;
  name: string;
  description: string;
  shortcuts: Record<string, string[]>;
}

const PRESETS: ShortcutPreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard keyboard shortcuts',
    shortcuts: {},
  },
  {
    id: 'vim-style',
    name: 'Vim Style',
    description: 'Vim-inspired navigation shortcuts',
    shortcuts: {
      'tab-prev': ['h'],
      'tab-next': ['l'],
      'go-top': ['g', 'g'],
      'go-end': ['G'],
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Your saved custom configuration',
    shortcuts: {},
  },
];

export function ShortcutCustomization() {
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string[]>>({});
  const [conflicts, setConflicts] = useState<Array<{ key: string; actions: string[] }>>([]);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  
  const startRecording = useCallback((shortcutId: string) => {
    setEditingShortcut(shortcutId);
  }, []);
  
  const stopRecording = useCallback(() => {
    setEditingShortcut(null);
  }, []);

  // Load custom shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customShortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          setCustomShortcuts(parsed);
          setSelectedPreset('custom');
        } else {
          throw new Error('Invalid shortcuts format: expected object');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to load custom shortcuts:', errorMessage, error);
        // Clear corrupted data
        localStorage.removeItem('customShortcuts');
      }
    }
  }, []);

  // Save custom shortcuts to localStorage
  useEffect(() => {
    if (Object.keys(customShortcuts).length > 0) {
      localStorage.setItem('customShortcuts', JSON.stringify(customShortcuts));
    }
  }, [customShortcuts]);

  const detectConflicts = useCallback(() => {
    try {
      const keyMap = new Map<string, string[]>();
      
      Object.entries(customShortcuts).forEach(([shortcutId, keys]) => {
        if (!Array.isArray(keys)) {
          console.warn(`Invalid keys format for shortcut ${shortcutId}:`, keys);
          return;
        }
        keys.forEach(key => {
          if (typeof key !== 'string') {
            console.warn(`Invalid key type for shortcut ${shortcutId}:`, key);
            return;
          }
          if (!keyMap.has(key)) {
            keyMap.set(key, []);
          }
          keyMap.get(key)!.push(shortcutId);
        });
      });

      const detectedConflicts: Array<{ key: string; actions: string[] }> = [];
      keyMap.forEach((actions, key) => {
        if (actions.length > 1) {
          detectedConflicts.push({ key, actions });
        }
      });

      setConflicts(detectedConflicts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to detect conflicts:', errorMessage, error);
      setConflicts([]);
    }
  }, [customShortcuts]);

  useEffect(() => {
    detectConflicts();
  }, [detectConflicts]);

  const applyPreset = useCallback((presetId: string) => {
    try {
      const preset = PRESETS.find(p => p.id === presetId);
      if (!preset) {
        console.warn(`Preset not found: ${presetId}`);
        return;
      }
      setSelectedPreset(presetId);
      if (presetId === 'default') {
        setCustomShortcuts({});
      } else {
        setCustomShortcuts(preset.shortcuts);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to apply preset ${presetId}:`, errorMessage, error);
    }
  }, []);

  const exportConfiguration = useCallback(() => {
    try {
      const config = {
        preset: selectedPreset,
        shortcuts: customShortcuts,
        exportedAt: new Date().toISOString(),
        version: shortcutsConfig.meta?.version || '1.0.0',
      };

      const jsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortcuts-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to export configuration:', errorMessage, error);
      alert(`Failed to export configuration: ${errorMessage}`);
    }
  }, [selectedPreset, customShortcuts]);

  const importConfiguration = useCallback(() => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = event.target?.result;
            if (typeof result !== 'string') {
              throw new Error('File read result is not a string');
            }

            const config = JSON.parse(result);
            
            if (!config || typeof config !== 'object') {
              throw new Error('Invalid configuration format: expected object');
            }

            if (config.shortcuts) {
              if (typeof config.shortcuts !== 'object' || Array.isArray(config.shortcuts)) {
                throw new Error('Invalid shortcuts format: expected object');
              }
              setCustomShortcuts(config.shortcuts);
            } else {
              throw new Error('Configuration missing shortcuts property');
            }

            if (config.preset && typeof config.preset === 'string') {
              setSelectedPreset(config.preset);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid file format';
            console.error('Failed to import configuration:', errorMessage, error);
            alert(`Failed to import configuration: ${errorMessage}`);
          }
        };
        reader.onerror = () => {
          const errorMessage = 'Failed to read file';
          console.error(errorMessage);
          alert(`Failed to import configuration: ${errorMessage}`);
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create file input:', errorMessage, error);
      alert(`Failed to import configuration: ${errorMessage}`);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    if (confirm('Reset all shortcuts to default? This cannot be undone.')) {
      try {
        setCustomShortcuts({});
        setSelectedPreset('default');
        localStorage.removeItem('customShortcuts');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to reset shortcuts:', errorMessage, error);
        alert(`Failed to reset shortcuts: ${errorMessage}`);
      }
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
        <div className="flex gap-2">
          <button
            onClick={exportConfiguration}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export Config
          </button>
          <button
            onClick={importConfiguration}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Import Config
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Preset Selection */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-3">Preset Configurations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`p-4 rounded border-2 transition-colors text-left ${
                selectedPreset === preset.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-sm text-gray-600 mt-1">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Resolution */}
      {conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Shortcut Conflicts Detected
          </h3>
          <div className="space-y-2">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="text-sm text-yellow-700">
                <strong>{conflict.key}</strong> is used by: {conflict.actions.join(', ')}
              </div>
            ))}
          </div>
          <button
            onClick={() => setConflicts([])}
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Shortcut List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Current Shortcut</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {useMemo(() => {
              try {
                return Object.entries(shortcutsConfig).flatMap(([category, categoryShortcuts]) => {
                  if (category === 'meta' || category === 'settings') return [];
                  
                  return Object.entries(categoryShortcuts as Record<string, any>).map(([id, config]) => {
                    const currentKeys = customShortcuts[id] || config.keys || [];
                    const hasConflict = conflicts.some(c => c.actions.includes(id));
                    
                    return (
                      <tr key={id} className={hasConflict ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{config.description || id}</div>
                          <div className="text-sm text-gray-500">{category}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {Array.isArray(currentKeys) ? currentKeys.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-2 py-1 bg-gray-100 rounded text-xs font-mono"
                              >
                                {key}
                              </kbd>
                            )) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setEditingShortcut(id);
                              startRecording(id);
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Rebind
                          </button>
                        </td>
                      </tr>
                    );
                  });
                });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Failed to render shortcuts table:', errorMessage, error);
                return [(
                  <tr key="error">
                    <td colSpan={3} className="px-4 py-3 text-red-600">
                      Failed to load shortcuts: {errorMessage}
                    </td>
                  </tr>
                )];
              }
            }, [shortcutsConfig, customShortcuts, conflicts, startRecording])}
          </tbody>
        </table>
      </div>

      {/* Rebind Dialog - Simple inline editing */}
      {editingShortcut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Rebind Shortcut: {editingShortcut}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Press the key combination you want to use for this shortcut
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditingShortcut(null);
                  stopRecording();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save would be handled by key recording
                  setEditingShortcut(null);
                  stopRecording();
                  detectConflicts();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
