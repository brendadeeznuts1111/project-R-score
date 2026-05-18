/**
 * Shared shortcuts data used by both macros and seeds
 * 
 * This file contains the default shortcuts configuration that can be
 * imported by both runtime code (seeds.ts) and bundle-time macros.
 */

import type { ShortcutConfig } from '../types';

export const defaultShortcuts: ShortcutConfig[] = [
  {
    id: 'file.save',
    action: 'save',
    description: 'Save file',
    category: 'general',
    default: {
      primary: 'Ctrl+S',
      macOS: 'Cmd+S'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'file.open',
    action: 'open',
    description: 'Open file',
    category: 'general',
    default: {
      primary: 'Ctrl+O',
      macOS: 'Cmd+O'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'file.new',
    action: 'new',
    description: 'New file',
    category: 'general',
    default: {
      primary: 'Ctrl+N',
      macOS: 'Cmd+N'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.undo',
    action: 'undo',
    description: 'Undo',
    category: 'general',
    default: {
      primary: 'Ctrl+Z',
      macOS: 'Cmd+Z'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.redo',
    action: 'redo',
    description: 'Redo',
    category: 'general',
    default: {
      primary: 'Ctrl+Y',
      macOS: 'Cmd+Shift+Z'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.cut',
    action: 'cut',
    description: 'Cut',
    category: 'general',
    default: {
      primary: 'Ctrl+X',
      macOS: 'Cmd+X'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.copy',
    action: 'copy',
    description: 'Copy',
    category: 'general',
    default: {
      primary: 'Ctrl+C',
      macOS: 'Cmd+C'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.paste',
    action: 'paste',
    description: 'Paste',
    category: 'general',
    default: {
      primary: 'Ctrl+V',
      macOS: 'Cmd+V'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.find',
    action: 'find',
    description: 'Find',
    category: 'general',
    default: {
      primary: 'Ctrl+F',
      macOS: 'Cmd+F'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'edit.replace',
    action: 'replace',
    description: 'Find and Replace',
    category: 'general',
    default: {
      primary: 'Ctrl+H',
      macOS: 'Cmd+Option+F'
    },
    enabled: true,
    scope: 'global'
  },
  // Development shortcuts
  {
    id: 'dev.build',
    action: 'build',
    description: 'Build project',
    category: 'developer',
    default: {
      primary: 'Ctrl+B',
      macOS: 'Cmd+B'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'dev.run',
    action: 'run',
    description: 'Run/debug project',
    category: 'developer',
    default: {
      primary: 'F5',
      macOS: 'F5'
    },
    enabled: true,
    scope: 'global'
  },
  // Navigation shortcuts
  {
    id: 'nav.goto-line',
    action: 'goto-line',
    description: 'Go to line',
    category: 'navigation',
    default: {
      primary: 'Ctrl+G',
      macOS: 'Cmd+L'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nav.bookmark',
    action: 'toggle-bookmark',
    description: 'Toggle bookmark',
    category: 'navigation',
    default: {
      primary: 'Ctrl+F2',
      macOS: 'Cmd+F2'
    },
    enabled: true,
    scope: 'global'
  },
  // IDE/Editor shortcuts
  {
    id: 'ide.command-palette',
    action: 'command-palette',
    description: 'Open command palette',
    category: 'ide',
    default: {
      primary: 'Ctrl+Shift+P',
      macOS: 'Cmd+Shift+P'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'ide.quick-open',
    action: 'quick-open',
    description: 'Quick open file',
    category: 'ide',
    default: {
      primary: 'Ctrl+P',
      macOS: 'Cmd+P'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'ide.toggle-terminal',
    action: 'toggle-terminal',
    description: 'Toggle integrated terminal',
    category: 'ide',
    default: {
      primary: 'Ctrl+`',
      macOS: 'Cmd+`'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'ide.split-editor',
    action: 'split-editor',
    description: 'Split editor',
    category: 'ide',
    default: {
      primary: 'Ctrl+\\',
      macOS: 'Cmd+\\'
    },
    enabled: true,
    scope: 'global'
  },
  // Browser shortcuts
  {
    id: 'browser.new-tab',
    action: 'new-tab',
    description: 'Open new tab',
    category: 'browser',
    default: {
      primary: 'Ctrl+T',
      macOS: 'Cmd+T'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'browser.close-tab',
    action: 'close-tab',
    description: 'Close current tab',
    category: 'browser',
    default: {
      primary: 'Ctrl+W',
      macOS: 'Cmd+W'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'browser.refresh',
    action: 'refresh',
    description: 'Refresh page',
    category: 'browser',
    default: {
      primary: 'Ctrl+R',
      macOS: 'Cmd+R'
    },
    enabled: true,
    scope: 'global'
  },
  // Window management
  {
    id: 'window.minimize',
    action: 'minimize-window',
    description: 'Minimize window',
    category: 'window',
    default: {
      primary: 'Alt+F9',
      macOS: 'Cmd+M'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'window.close',
    action: 'close-window',
    description: 'Close window',
    category: 'window',
    default: {
      primary: 'Alt+F4',
      macOS: 'Cmd+Shift+W'
    },
    enabled: true,
    scope: 'global'
  }
];
