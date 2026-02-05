#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), '.vscode', 'settings.json');
let settings: Record<string, any> = {};

// Read existing settings
try {
  if (existsSync(settingsPath)) {
    const content = readFileSync(settingsPath, 'utf-8');
    // Remove comments for parsing (VS Code supports JSONC but JSON.parse doesn't)
    const cleanedContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    settings = JSON.parse(cleanedContent);
  }
} catch (error) {
  console.log('Creating new settings file...');
}

// Deep merge helper for nested objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Essential performance and development settings
const essentialSettings = {
  // Privacy & Telemetry
  "telemetry.telemetryLevel": "off",
  "application.experimental.rendererProfiling": false,
  "application.experimental.telemetry": false,
  "workbench.enableExperiments": false,

  // Editor Performance
  "editor.smoothScrolling": false,
  "editor.minimap.enabled": false,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.organizeImports": "explicit"
  },

  // File Handling
  "files.maxMemoryForLargeFilesMB": 4096,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,

  // TypeScript
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.suggest.autoImports": true,
  "typescript.suggest.completeFunctionCalls": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  // Git
  "git.enableSmartCommit": true,
  "git.autoStash": true,
  "git.autofetch": true,
  "git.confirmSync": false,

  // Cursor AI
  "cursor.rules.preferredModel": "claude-3-5-sonnet-20241022",
  "cursor.chat.maxContextTokens": 8000,
  "cursor.general.globalCursorIgnoreList": [
    "**/.env.*",
    "**/credentials.json",
    "**/*.key",
    "**/.cursor/mcp.json"
  ],

  // Workbench
  "workbench.colorTheme": "Cursor Dark High Contrast",
  "workbench.editor.enablePreview": false,
  "workbench.editor.highlightModifiedTabs": true
};

// Merge settings (existing settings take precedence for nested objects)
settings = deepMerge(essentialSettings, settings);

// Ensure .vscode directory exists
const vscodeDir = path.dirname(settingsPath);
if (!existsSync(vscodeDir)) {
  mkdirSync(vscodeDir, { recursive: true });
}

writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Settings updated successfully!');
console.log(`📝 Settings file: ${settingsPath}`);
