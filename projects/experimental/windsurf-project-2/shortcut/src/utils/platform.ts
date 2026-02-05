import type { PlatformInfo } from '../types';

export function detectPlatform(): PlatformInfo {
  const os = process.platform;
  const arch = process.arch;
  const version = process.version;
  
  let platformOS: 'windows' | 'macOS' | 'linux';
  
  switch (os) {
    case 'darwin':
      platformOS = 'macOS';
      break;
    case 'linux':
      platformOS = 'linux';
      break;
    case 'win32':
      platformOS = 'windows';
      break;
    default:
      platformOS = 'windows'; // Default fallback
  }
  
  return {
    os: platformOS,
    arch,
    version
  };
}

export function getPlatformKeyBindings(): Record<string, string> {
  const platform = detectPlatform().os;
  
  const bindings: Record<string, Record<string, string>> = {
    windows: {
      meta: 'Ctrl',
      alt: 'Alt',
      shift: 'Shift',
      control: 'Ctrl'
    },
    macOS: {
      meta: 'Cmd',
      alt: 'Option',
      shift: 'Shift',
      control: 'Control'
    },
    linux: {
      meta: 'Ctrl',
      alt: 'Alt',
      shift: 'Shift',
      control: 'Ctrl'
    }
  };
  
  return bindings[platform];
}

export function normalizeKeyForPlatform(key: string, platform?: 'windows' | 'macOS' | 'linux'): string {
  const targetPlatform = platform || detectPlatform().os;
  const bindings = getPlatformKeyBindings();
  
  let normalized = key;
  
  // Replace platform-specific modifier names
  if (targetPlatform === 'macOS') {
    normalized = normalized.replace(/Ctrl/g, 'Cmd');
    normalized = normalized.replace(/Alt/g, 'Option');
  } else {
    normalized = normalized.replace(/Cmd/g, 'Ctrl');
    normalized = normalized.replace(/Option/g, 'Alt');
  }
  
  return normalized;
}

export function formatKeyDisplay(key: string): string {
  return key
    .replace(/\+/g, ' + ')
    .replace(/ctrl/i, 'Ctrl')
    .replace(/cmd/i, 'Cmd')
    .replace(/command/i, 'Cmd')
    .replace(/alt/i, 'Alt')
    .replace(/option/i, 'Option')
    .replace(/shift/i, 'Shift')
    .replace(/meta/i, 'Meta')
    .replace(/control/i, 'Control')
    .trim();
}

export function parseKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Cmd');
  
  // Handle special keys
  let key = event.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowUp') key = 'Up';
  if (key === 'ArrowDown') key = 'Down';
  if (key === 'ArrowLeft') key = 'Left';
  if (key === 'ArrowRight') key = 'Right';
  
  // Skip if just modifiers
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return '';
  }
  
  parts.push(key.toUpperCase());
  
  return parts.join(' + ');
}

export function isValidKeyCombination(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  
  const parts = key.split('+').map(p => p.trim());
  const modifiers = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Control', 'Option', 'Meta'];
  const validKeys = [
    // Letters
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    // Numbers
    ...'0123456789'.split(''),
    // Function keys
    ...Array.from({length: 12}, (_, i) => `F${i + 1}`),
    // Special keys
    'Space', 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete',
    'Insert', 'Home', 'End', 'PageUp', 'PageDown',
    'Up', 'Down', 'Left', 'Right',
    // Symbols
    ';', '=', ',', '-', '.', '/', '\\', '`', '[', ']', '\''
  ];
  
  // Check if we have at least one modifier and one key, or just a special key
  const hasModifier = parts.some(p => modifiers.includes(p));
  const hasValidKey = parts.some(p => validKeys.includes(p));
  
  if (hasModifier && hasValidKey) return true;
  
  // Allow special keys without modifiers
  const allSpecial = parts.every(p => 
    ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 
     'Space', 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Insert', 
     'Home', 'End', 'PageUp', 'PageDown', 'Up', 'Down', 'Left', 'Right'].includes(p)
  );
  
  return allSpecial && parts.length === 1;
}
