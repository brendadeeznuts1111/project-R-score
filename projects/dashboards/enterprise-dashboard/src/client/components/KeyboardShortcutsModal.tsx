/**
 * Keyboard Shortcuts Modal
 *
 * A comprehensive, searchable keyboard shortcuts reference panel.
 * Triggered by pressing "?" or via the shortcuts button.
 *
 * Theme Integration:
 * - Uses CSS variables from ui-themes.toml (--theme-*)
 * - Category colors use chart colors (chart-1 through chart-6)
 * - Respects light/dark/high-contrast/midnight themes
 */

import React, { useState, useEffect, useMemo } from "react";
import { shortcutsConfig, themeConfig } from "../config";
import type { ShortcutBinding } from "../config";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform?: "mac" | "windows" | "linux";
}

// Category metadata using theme chart colors
// Maps to chart-1 through chart-6 from ui-themes.toml
const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; colorVar: string; fallback: string }> = {
  global: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Global",
    colorVar: "--theme-chart-1", // primary/blue
    fallback: "#60a5fa",
  },
  tabs: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    label: "Navigation",
    colorVar: "--theme-chart-2", // success/green
    fallback: "#4ade80",
  },
  data: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    label: "Data",
    colorVar: "--theme-chart-5", // purple
    fallback: "#a78bfa",
  },
  view: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    label: "View",
    colorVar: "--theme-chart-6", // cyan
    fallback: "#22d3ee",
  },
  projects: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    label: "Projects",
    colorVar: "--theme-chart-3", // warning/yellow
    fallback: "#fbbf24",
  },
  network: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    label: "Network",
    colorVar: "--theme-warning", // orange/warning
    fallback: "#fbbf24",
  },
  dev: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: "Developer",
    colorVar: "--theme-chart-4", // danger/red-pink
    fallback: "#f87171",
  },
  chords: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: "Vim Chords",
    colorVar: "--theme-info", // info/cyan
    fallback: "#38bdf8",
  },
};

// Format key for display (platform-aware)
function formatKeyForDisplay(key: string, platform: "mac" | "windows" | "linux"): string {
  const isMac = platform === "mac";

  return key
    .replace(/Cmd\/Ctrl/gi, isMac ? "Cmd" : "Ctrl")
    .replace(/\bCmd\b/gi, isMac ? "" : "Ctrl")
    .replace(/\bCtrl\b/gi, isMac ? "" : "Ctrl")
    .replace(/\bAlt\b/gi, isMac ? "" : "Alt")
    .replace(/\bShift\b/gi, isMac ? "" : "Shift")
    .replace(/\bMeta\b/gi, isMac ? "" : "Win");
}

// Render a single key badge with theme-aware styling
function KeyBadge({ keyStr, platform }: { keyStr: string; platform: "mac" | "windows" | "linux" }) {
  const isMac = platform === "mac";
  const parts = keyStr.split(/\s*\+\s*/);

  // Symbol mapping for Mac
  const macSymbols: Record<string, string> = {
    "cmd": "",
    "ctrl": "",
    "alt": "",
    "shift": "",
    "meta": "",
    "option": "",
    "enter": "",
    "return": "",
    "delete": "",
    "backspace": "",
    "tab": "",
    "esc": "",
    "escape": "",
    "space": "",
    "up": "",
    "down": "",
    "left": "",
    "right": "",
  };

  // Windows/Linux labels
  const winLabels: Record<string, string> = {
    "cmd": "Ctrl",
    "ctrl": "Ctrl",
    "alt": "Alt",
    "shift": "Shift",
    "meta": "Win",
    "option": "Alt",
    "enter": "Enter",
    "return": "Enter",
    "delete": "Del",
    "backspace": "Bksp",
    "tab": "Tab",
    "esc": "Esc",
    "escape": "Esc",
    "space": "Space",
    "up": "",
    "down": "",
    "left": "",
    "right": "",
  };

  return (
    <div className="flex items-center gap-0.5">
      {parts.map((part, idx) => {
        const lower = part.toLowerCase().replace(/cmd\/ctrl/i, "cmd");
        const display = isMac
          ? (macSymbols[lower] || part.toUpperCase())
          : (winLabels[lower] || part.toUpperCase());

        // Use theme surface-elevated for key background
        return (
          <kbd
            key={idx}
            className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-mono font-medium rounded shadow-sm"
            style={{
              backgroundColor: "var(--theme-surface-elevated, #334155)",
              borderColor: "var(--theme-border, #334155)",
              color: "var(--theme-text-secondary, #94a3b8)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {display}
          </kbd>
        );
      })}
    </div>
  );
}

// Category header with theme color
function CategoryHeader({ category, count }: { category: string; count: number }) {
  const meta = CATEGORY_META[category] || {
    icon: <span className="text-xs"></span>,
    label: category.charAt(0).toUpperCase() + category.slice(1),
    colorVar: "--theme-text-secondary",
    fallback: "#94a3b8",
  };

  return (
    <div
      className="flex items-center gap-2 mb-3"
      style={{ color: `var(${meta.colorVar}, ${meta.fallback})` }}
    >
      {meta.icon}
      <h3 className="text-sm font-semibold uppercase tracking-wider">{meta.label}</h3>
      <span
        className="text-xs"
        style={{ color: "var(--theme-text-muted, #64748b)" }}
      >
        ({count})
      </span>
    </div>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose, platform = "mac" }: KeyboardShortcutsModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Parse shortcuts from config
  const allShortcuts = useMemo(() => {
    const shortcuts: Array<{
      key: string;
      action: string;
      description: string;
      category: string;
    }> = [];

    const { keyboard, chords } = shortcutsConfig;

    // Keyboard shortcuts
    for (const [category, bindings] of Object.entries(keyboard)) {
      for (const [key, binding] of Object.entries(bindings as Record<string, ShortcutBinding>)) {
        shortcuts.push({
          key,
          action: binding.action,
          description: binding.description,
          category,
        });
      }
    }

    // Chord sequences (vim-style)
    for (const [key, binding] of Object.entries(chords)) {
      shortcuts.push({
        key,
        action: binding.action,
        description: binding.description,
        category: "chords",
      });
    }

    return shortcuts;
  }, []);

  // Filter shortcuts by search and category
  const filteredShortcuts = useMemo(() => {
    return allShortcuts.filter(shortcut => {
      // Category filter
      if (activeCategory && shortcut.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          shortcut.key.toLowerCase().includes(searchLower) ||
          shortcut.action.toLowerCase().includes(searchLower) ||
          shortcut.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allShortcuts, search, activeCategory]);

  // Group by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, typeof filteredShortcuts> = {};

    for (const shortcut of filteredShortcuts) {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    }

    return groups;
  }, [filteredShortcuts]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[data-shortcuts-search]');
        input?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = Object.keys(CATEGORY_META);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-theme-secondary rounded-2xl shadow-2xl border border-theme overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-theme">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme">Keyboard Shortcuts</h2>
                <p className="text-xs text-theme-muted">
                  {platform === "mac" ? "macOS" : platform === "windows" ? "Windows" : "Linux"} • {allShortcuts.length} shortcuts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-theme-tertiary transition-colors"
            >
              <svg className="w-5 h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              data-shortcuts-search
              placeholder="Search shortcuts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-theme bg-theme text-theme placeholder-theme-muted focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: activeCategory === null
                  ? "var(--theme-primary, #3b82f6)"
                  : "var(--theme-surface-tertiary, #1e293b)",
                color: activeCategory === null
                  ? "#ffffff"
                  : "var(--theme-text-muted, #64748b)",
              }}
            >
              All
            </button>
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? `var(${meta.colorVar}, ${meta.fallback})`
                      : "var(--theme-surface-tertiary, #1e293b)",
                    color: isActive
                      ? "#ffffff"
                      : "var(--theme-text-muted, #64748b)",
                  }}
                >
                  <span style={{ color: isActive ? "#ffffff" : `var(${meta.colorVar}, ${meta.fallback})` }}>
                    {meta.icon}
                  </span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              {/* Category Header - uses theme chart colors */}
              <CategoryHeader category={category} count={shortcuts.length} />

              {/* Shortcuts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shortcuts.map((shortcut, idx) => {
                  const meta = CATEGORY_META[category];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl transition-colors group"
                      style={{
                        backgroundColor: "var(--theme-surface, #1e293b)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface-tertiary, #334155)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface, #1e293b)";
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--theme-text-primary, #f8fafc)" }}
                        >
                          {shortcut.description}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{ color: "var(--theme-text-muted, #64748b)" }}
                        >
                          {shortcut.action}
                        </div>
                      </div>
                      <KeyBadge keyStr={shortcut.key} platform={platform} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-theme-tertiary flex items-center justify-center">
                <svg className="w-8 h-8 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-theme mb-1">No shortcuts found</h3>
              <p className="text-theme-muted">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-theme bg-theme-tertiary/50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-theme-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <KeyBadge keyStr="?" platform={platform} />
                <span>Toggle this panel</span>
              </span>
              <span className="flex items-center gap-1.5">
                <KeyBadge keyStr="Esc" platform={platform} />
                <span>Close</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Shortcuts from</span>
              <code className="px-1.5 py-0.5 rounded bg-theme-tertiary font-mono text-[10px]">shortcuts.toml</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
