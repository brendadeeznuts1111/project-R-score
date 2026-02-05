/**
 * ShortcutRebindUI - Keyboard Shortcuts Customization Interface
 *
 * Allows users to customize keyboard shortcuts with:
 * - Visual shortcut mapping by category
 * - Real-time conflict detection
 * - Preset configurations (default, vim-style, custom)
 * - Export/import functionality
 * - localStorage persistence
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { shortcutsConfig, getConfigIntegrity } from "../config";
import type { ShortcutBinding } from "../config";
import { detectConflicts as detectConflictsUtil, wouldConflict, suggestAlternatives } from "../utils/shortcut-conflict-resolver";

interface ShortcutPreset {
  name: string;
  description: string;
  shortcuts: Record<string, Record<string, ShortcutBinding>>;
}

interface ConflictInfo {
  key: string;
  actions: string[];
  categories: string[];
}

const PRESETS: ShortcutPreset[] = [
  {
    name: "default",
    description: "Standard keyboard shortcuts",
    shortcuts: shortcutsConfig.keyboard,
  },
  {
    name: "vim-style",
    description: "Vim-inspired navigation shortcuts",
    shortcuts: {
      global: {
        "Escape": { action: "close-modal", description: "Close modal / clear selection" },
        "?": { action: "show-shortcuts", description: "Show keyboard shortcuts" },
      },
      tabs: {
        "g t": { action: "tab-next", description: "Next tab" },
        "g T": { action: "tab-prev", description: "Previous tab" },
        "g d": { action: "tab-diagnose", description: "Go to Diagnose tab" },
        "g k": { action: "tab-kyc", description: "Go to KYC tab" },
        "g p": { action: "tab-projects", description: "Go to Projects" },
        "g a": { action: "tab-analytics", description: "Go to Analytics" },
        "g n": { action: "tab-network", description: "Go to Network" },
        "g c": { action: "tab-config", description: "Go to Config" },
        "g s": { action: "tab-settings", description: "Go to Settings" },
      },
      data: {
        "w": { action: "save-config", description: "Save current config" },
        "Ctrl/Cmd + r": { action: "refresh-data", description: "Refresh current view" },
      },
      projects: {
        "Enter": { action: "open-selected", description: "Open selected item" },
        "Space": { action: "preview-project", description: "Quick preview" },
        "d d": { action: "delete-project", description: "Delete selected project" },
      },
      kyc: {
        "a": { action: "kyc-validate", description: "Validate KYC" },
        "s": { action: "kyc-failsafe", description: "Run KYC failsafe" },
        "r": { action: "kyc-review-queue", description: "Open KYC review queue" },
      },
    },
  },
  {
    name: "minimal",
    description: "Minimal shortcut set for accessibility",
    shortcuts: {
      global: {
        "Escape": { action: "close-modal", description: "Close modal / clear selection" },
        "?": { action: "show-shortcuts", description: "Show keyboard shortcuts" },
      },
      tabs: {
        "1": { action: "tab-dashboard", description: "Go to Dashboard" },
        "2": { action: "tab-projects", description: "Go to Projects" },
        "3": { action: "tab-analytics", description: "Go to Analytics" },
        "4": { action: "tab-network", description: "Go to Network" },
        "5": { action: "tab-config", description: "Go to Config" },
        "6": { action: "tab-settings", description: "Go to Settings" },
        "9": { action: "tab-kyc", description: "Go to KYC tab" },
        "0": { action: "tab-diagnose", description: "Go to Diagnose tab" },
      },
      data: {
        "Ctrl/Cmd + r": { action: "refresh-data", description: "Refresh current view" },
        "Ctrl/Cmd + s": { action: "save-config", description: "Save current config" },
      },
    },
  },
];

export function ShortcutRebindUI() {
  const [currentShortcuts, setCurrentShortcuts] = useState<typeof shortcutsConfig.keyboard>(shortcutsConfig.keyboard);
  const [selectedPreset, setSelectedPreset] = useState("default");
  const [recordingMode, setRecordingMode] = useState<{
    category: string;
    action: string;
    currentKey?: string;
  } | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Platform detection for key display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  // Load saved shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom-shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          setCurrentShortcuts(parsed);
          setSelectedPreset("custom");
        } else {
          throw new Error('Invalid shortcuts format: expected object');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to load saved shortcuts:', errorMessage, error);
        // Clear corrupted data
        localStorage.removeItem('custom-shortcuts');
      }
    }
  }, []);

  // Save shortcuts to localStorage
  const saveShortcuts = useCallback((shortcuts: typeof currentShortcuts) => {
    try {
      const jsonString = JSON.stringify(shortcuts);
      localStorage.setItem('custom-shortcuts', jsonString);
      setCurrentShortcuts(shortcuts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save shortcuts:', errorMessage, error);
      // Could show a toast here if available
    }
  }, []);

  // Enhanced conflict detection using utility function
  const detectConflicts = useCallback((shortcuts: typeof currentShortcuts) => {
    try {
      const platform = isMac ? "mac" : "windows";
      const detectedConflicts = detectConflictsUtil(shortcuts as Record<string, Record<string, ShortcutBinding>>, platform);
      
      // Convert to component's ConflictInfo format
      const newConflicts: ConflictInfo[] = detectedConflicts.map(c => ({
        key: c.key,
        actions: c.actions,
        categories: c.categories,
      }));

      setConflicts(newConflicts);
      return newConflicts.length === 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to detect conflicts:', errorMessage, error);
      setConflicts([]);
      return false;
    }
  }, [isMac]);

  // Start recording a shortcut
  const startRecording = useCallback((category: string, action: string, currentKey?: string) => {
    setRecordingMode({ category, action, currentKey });
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    setRecordingMode(null);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
  }, []);

  // Handle key recording
  const handleKeyRecording = useCallback((event: KeyboardEvent) => {
    if (!recordingMode) return;

    event.preventDefault();
    event.stopPropagation();

    // Build key combination
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl/Cmd');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');

    // Handle special keys
    let keyName = event.key;
    if (keyName === ' ') keyName = 'Space';
    if (keyName.length === 1) keyName = keyName.toUpperCase();
    if (keyName === 'Escape') keyName = 'Escape';
    if (keyName === 'Enter') keyName = 'Enter';
    if (keyName === 'Tab') keyName = 'Tab';
    if (keyName === 'Backspace') keyName = 'Backspace';
    if (keyName === 'Delete') keyName = 'Delete';

    parts.push(keyName);
    const newKey = parts.join(' + ');

    // Update the shortcut
    const updatedShortcuts = { ...currentShortcuts } as typeof currentShortcuts;
    const category = recordingMode.category as keyof typeof updatedShortcuts;
    if (!updatedShortcuts[category]) {
      (updatedShortcuts as Record<string, Record<string, ShortcutBinding>>)[category] = {};
    }

    // Remove old binding if it exists
    if (recordingMode.currentKey && updatedShortcuts[category] && recordingMode.currentKey in updatedShortcuts[category]) {
      delete (updatedShortcuts[category] as Record<string, ShortcutBinding>)[recordingMode.currentKey as string];
    }

    // Add new binding with conflict check
    if (updatedShortcuts[category]) {
      const categoryBindings = updatedShortcuts[category] as Record<string, ShortcutBinding>;
      
      // Check for immediate conflict using utility
      const platform = isMac ? "mac" : "windows";
      const conflict = wouldConflict(
        updatedShortcuts as Record<string, Record<string, ShortcutBinding>>,
        newKey,
        category,
        platform
      );
      const hasConflict = conflict !== null;

      categoryBindings[newKey] = {
        action: recordingMode.action,
        description: (() => {
          const categoryKey = recordingMode.category as keyof typeof shortcutsConfig.keyboard;
          const categoryConfig = shortcutsConfig.keyboard[categoryKey];
          
          if (categoryConfig && recordingMode.currentKey) {
            const currentKeyStr = recordingMode.currentKey as string;
            if (currentKeyStr in categoryConfig) {
              return categoryConfig[currentKeyStr]?.description;
            }
          }
          
          if (recordingMode.currentKey && categoryBindings[recordingMode.currentKey]) {
            return categoryBindings[recordingMode.currentKey].description;
          }
          
          return recordingMode.action;
        })(),
      };

      // Warn about conflict and suggest alternatives
      if (hasConflict) {
        const platform = isMac ? "mac" : "windows";
        const alternatives = suggestAlternatives(updatedShortcuts, newKey, platform);
        console.warn(
          `Conflict detected for key "${newKey}" - consider resolving in conflict panel`,
          alternatives.length > 0 ? `\nSuggested alternatives: ${alternatives.join(", ")}` : ""
        );
      }
    }

    saveShortcuts(updatedShortcuts);
    detectConflicts(updatedShortcuts);
    stopRecording();
  }, [recordingMode, currentShortcuts, saveShortcuts, detectConflicts, stopRecording]);

  // Global key listener for recording
  useEffect(() => {
    if (recordingMode) {
      document.addEventListener('keydown', handleKeyRecording, true);
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 10000); // Auto-stop after 10 seconds
    }

    return () => {
      document.removeEventListener('keydown', handleKeyRecording, true);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, [recordingMode, handleKeyRecording, stopRecording]);

  // Load preset
  const loadPreset = useCallback((presetName: string) => {
    try {
      const preset = PRESETS.find(p => p.name === presetName);
      if (!preset) {
        console.warn(`Preset not found: ${presetName}`);
        return;
      }
      // Type assertion needed because preset shortcuts might not match exact structure
      saveShortcuts(preset.shortcuts as typeof currentShortcuts);
      detectConflicts(preset.shortcuts as typeof currentShortcuts);
      setSelectedPreset(presetName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load preset ${presetName}:`, errorMessage, error);
    }
  }, [saveShortcuts, detectConflicts, currentShortcuts]);

  // Export shortcuts
  const exportShortcuts = useCallback(() => {
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      shortcuts: currentShortcuts,
      integrity: getConfigIntegrity().shortcuts,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyboard-shortcuts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  }, [currentShortcuts]);

  // Import shortcuts
  const importShortcuts = useCallback(() => {
    try {
      const importData = JSON.parse(importText);
      if (importData.shortcuts) {
        saveShortcuts(importData.shortcuts);
        detectConflicts(importData.shortcuts);
        setSelectedPreset("custom");
        setShowImportModal(false);
        setImportText("");
      } else {
        alert("Invalid shortcut configuration format");
      }
    } catch (error) {
      alert("Failed to parse shortcut configuration: " + error);
    }
  }, [importText, saveShortcuts, detectConflicts]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    if (confirm("Reset all shortcuts to default? This will remove your customizations.")) {
      localStorage.removeItem('custom-shortcuts');
      setCurrentShortcuts(shortcutsConfig.keyboard);
      detectConflicts(shortcutsConfig.keyboard);
      setSelectedPreset("default");
    }
  }, [detectConflicts]);

  // Enhanced conflict resolution with smart suggestions
  const resolveConflict = useCallback((conflict: ConflictInfo, actionToRemove: string) => {
    try {
      const updatedShortcuts = { ...currentShortcuts } as typeof currentShortcuts;
      let removed = false;
      
      // Find and remove the conflicting binding
      Object.entries(updatedShortcuts).forEach(([category, bindings]) => {
        if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return;
        
        const categoryKey = category as keyof typeof updatedShortcuts;
        const categoryBindings = bindings as Record<string, ShortcutBinding>;
        
        Object.entries(categoryBindings).forEach(([key, binding]) => {
          const normalizedKey = key
            .toLowerCase()
            .replace(/cmdorctrl/gi, modifierKey.toLowerCase())
            .replace(/cmd\/ctrl/gi, modifierKey.toLowerCase())
            .trim();
          
          if (binding.action === actionToRemove && normalizedKey === conflict.key.toLowerCase()) {
            delete categoryBindings[key];
            removed = true;
          }
        });
      });

      if (removed) {
        saveShortcuts(updatedShortcuts);
        detectConflicts(updatedShortcuts);
        setSelectedConflict(null);
        setShowConflictResolver(false);
      } else {
        console.warn(`Could not find binding to remove: ${actionToRemove} for key ${conflict.key}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to resolve conflict:', errorMessage, error);
    }
  }, [currentShortcuts, saveShortcuts, detectConflicts, modifierKey]);

  // Filter shortcuts for search - memoized for performance
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return currentShortcuts;

    const filtered = {} as typeof currentShortcuts;
    const queryLower = searchQuery.toLowerCase();
    
    Object.entries(currentShortcuts).forEach(([category, bindings]) => {
      if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return;
      
      const filteredBindings: Record<string, ShortcutBinding> = {};
      Object.entries(bindings as Record<string, ShortcutBinding>).forEach(([key, binding]) => {
        if (
          binding.action?.toLowerCase().includes(queryLower) ||
          binding.description?.toLowerCase().includes(queryLower) ||
          key.toLowerCase().includes(queryLower)
        ) {
          filteredBindings[key] = binding;
        }
      });
      if (Object.keys(filteredBindings).length > 0) {
        (filtered as any)[category] = filteredBindings;
      }
    });
    return filtered;
  }, [currentShortcuts, searchQuery]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-theme">Keyboard Shortcuts</h2>
          <p className="text-gray-600 mt-1">Customize keyboard shortcuts for better productivity</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            📤 Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            📥 Import
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-2">⚠️</span>
              <div>
                <h3 className="text-red-800 font-semibold">Shortcut Conflicts Detected</h3>
                <p className="text-red-600 text-sm mt-1">
                  {conflicts.length} conflict(s) found. Some shortcuts may not work as expected.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConflictResolver(true)}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Resolve Conflicts
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="text-sm text-red-700">
                <strong>{conflict.key}</strong> is used by: {conflict.actions.join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording Mode Alert */}
      {recordingMode && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <div className="flex items-center">
            <span className="text-blue-600 text-xl mr-2">🎤</span>
            <div>
              <h3 className="text-blue-800 font-semibold">Recording Shortcut</h3>
              <p className="text-blue-600 text-sm mt-1">
                Press the key combination for "{recordingMode.action}". Press Escape to cancel.
              </p>
            </div>
            <button
              onClick={stopRecording}
              className="ml-auto px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-3">Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.name)}
              className={`p-3 border rounded text-left transition-colors ${
                selectedPreset === preset.name
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="font-semibold capitalize">{preset.name}</div>
              <div className="text-sm text-gray-600">{preset.description}</div>
            </button>
          ))}
          <button
            onClick={() => setSelectedPreset("custom")}
            className={`p-3 border rounded text-left transition-colors ${
              selectedPreset === "custom"
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="font-semibold">Custom</div>
            <div className="text-sm text-gray-600">Your personalized shortcuts</div>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts by Category */}
      <div className="space-y-4">
        {Object.entries(filteredShortcuts).map(([category, bindings]) => {
          if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return null;
          
          return (
            <div key={category} className="bg-white rounded shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold capitalize">{category} Shortcuts</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {Object.entries(bindings as Record<string, ShortcutBinding>).map(([key, binding]) => {
                  const normalizedKey = key
                    .toLowerCase()
                    .replace(/cmdorctrl/gi, modifierKey.toLowerCase())
                    .replace(/cmd\/ctrl/gi, modifierKey.toLowerCase())
                    .trim();
                  
                  const hasConflict = conflicts.some(c =>
                    c.key.toLowerCase() === normalizedKey
                  );
                  const displayKey = key.replace(/CmdOrCtrl/gi, modifierKey).replace(/Cmd\/Ctrl/gi, `${modifierKey}/Ctrl`);

                  return (
                    <div key={`${category}-${key}`} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{binding.description || 'No description'}</div>
                        <div className="text-sm text-gray-600">{binding.action || 'No action'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded text-sm font-mono ${
                          hasConflict ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {displayKey}
                        </div>
                        <button
                          onClick={() => startRecording(category, binding.action || '', key)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                          disabled={!!recordingMode}
                        >
                          {recordingMode?.category === category && recordingMode?.action === binding.action
                            ? "Recording..." : "Rebind"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Export Shortcuts</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Export your current shortcut configuration as a JSON file for backup or sharing.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={exportShortcuts}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Import Shortcuts</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Paste your exported shortcut configuration JSON below.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON configuration here..."
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={importShortcuts}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolver Modal */}
      {showConflictResolver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConflictResolver(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Resolve Shortcut Conflicts</h3>
              <button
                onClick={() => setShowConflictResolver(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Multiple actions are bound to the same key. Choose which action to keep for each conflicting key.
            </p>
            <div className="space-y-4">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="border border-red-200 rounded p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-red-600 text-lg">⚠️</span>
                    <strong className="text-red-800">
                      Key "{conflict.key}" has {conflict.actions.length} conflicting actions
                    </strong>
                  </div>
                  <div className="space-y-2">
                    {conflict.actions.map((action, actionIdx) => (
                      <div key={actionIdx} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm">{action}</span>
                        <button
                          onClick={() => resolveConflict(conflict, action)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Remove This
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-2">
                    Choose which action to remove. The remaining actions will keep their shortcuts.
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowConflictResolver(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}