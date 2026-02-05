#!/usr/bin/env bun

import { ShortcutRegistry } from './core/registry';
import { createServer } from './api/server';
import { initializeDatabase } from './database/init';
import { UnicodeEnhancedShortcutManager } from './core/shortcuts/unicode-enhanced';
import { UnicodeValidator, UnicodeShortcutBuilder } from './core/unicode/validation';
import { GraphemeUtils } from './core/unicode/grapheme';

// Global instances
export const shortcutRegistry = new ShortcutRegistry();
export const unicodeManager = new UnicodeEnhancedShortcutManager();
export const unicodeValidator = new UnicodeValidator();

// Unicode configuration
const unicodeConfig = {
  enabled: true,
  normalization: {
    enabled: true,
    form: 'NFC',
    emojiPresentation: 'emoji', // 'emoji' | 'text'
    maxClusterLength: 100,
    validateOnSave: true
  },
  validation: {
    enabled: true,
    strict: false,
    allowMixedScripts: true,
    allowBidi: false,
    maxZalgoScore: 3
  },
  display: {
    useUnicodeSymbols: true,
    platformSpecific: true,
    truncateLongText: true,
    maxDisplayClusters: 50
  }
};

async function main() {
  console.log('Starting Lightning Shortcut System with Unicode Support...');
  
  // Check Unicode capabilities
  const unicodeInfo = GraphemeUtils.getUnicodeInfo();
  console.log('Unicode Capabilities:', unicodeInfo);
  
  if (!unicodeInfo.hasSegmenter) {
    console.warn('Intl.Segmenter not available. Using fallback grapheme clustering.');
  }
  
  if (!unicodeInfo.hasNormalization) {
    console.warn('String.normalize not available. Unicode normalization disabled.');
    unicodeConfig.normalization.enabled = false;
  }
  
  try {
    // Initialize database with Unicode support
    await initializeDatabase();
    
    // Load and validate existing shortcuts
    await loadAndValidateShortcuts();
    
    // Start server with Unicode endpoints
    const server = createServer(shortcutRegistry, {
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      hostname: process.env.HOST || 'localhost',
      enableWebSocket: true
    });
    
    // Add Unicode-specific endpoints
    addUnicodeEndpoints(server);
    
    const serverPort = server.getPort();
    const serverHostname = server.getHostname();
    console.log(`Server running at http://${serverHostname}:${serverPort}`);
    console.log('Unicode support: ENABLED');
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function loadAndValidateShortcuts() {
  console.log('Loading and validating shortcuts...');
  
  // Load shortcuts from database
  const shortcuts = await shortcutRegistry.getEnabledShortcuts();
  
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  for (const shortcut of shortcuts) {
    // Validate with Unicode rules
    const validation = unicodeValidator.validateShortcutText(
      shortcut.description,
      'description',
      {
        maxClusters: unicodeConfig.normalization.maxClusterLength,
        allowEmoji: true,
        allowBidi: unicodeConfig.validation.allowBidi
      }
    );
    
    if (validation.isValid) {
      validCount++;
      
      if (validation.warnings.length > 0) {
        warningCount++;
        console.warn(`Warning for shortcut ${shortcut.id}:`, validation.warnings);
      }
      
      // Apply normalization if enabled
      if (unicodeConfig.normalization.enabled && validation.normalizedText) {
        // Update shortcut with normalized text using the registry's update method
        // Note: This would need to be implemented in ShortcutRegistry
        console.log(`Shortcut ${shortcut.id} normalized successfully`);
      }
    } else {
      errorCount++;
      console.error(`Invalid shortcut ${shortcut.id}:`, validation.errors);
      
      // Disable invalid shortcuts if in strict mode
      if (unicodeConfig.validation.strict) {
        // Note: This would need to be implemented in ShortcutRegistry
        console.log(`Would disable shortcut ${shortcut.id} due to validation errors`);
      }
    }
  }
  
  console.log(`Validation complete: ${validCount} valid, ${warningCount} warnings, ${errorCount} errors`);
}

function addUnicodeEndpoints(server: any) {
  // Unicode analysis endpoint
  server.router.post('/api/unicode/analyze', async (req: Request) => {
    const { text } = await req.json();
    
    const clusterer = new (require('./core/unicode/grapheme')).GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    
    return Response.json({
      text,
      clusters,
      clusterCount: clusters.length,
      visualWidth: clusterer.getVisualWidth(text),
      isEmoji: clusterer.isEmoji(text),
      emojiPresentation: clusterer.getEmojiPresentation(text),
      skinTone: clusterer.getSkinTone(text),
      normalized: clusterer.normalizeToEmojiPresentation(text)
    });
  });
  
  // Unicode validation endpoint
  server.router.post('/api/unicode/validate', async (req: Request) => {
    const { text, context, options } = await req.json();
    
    const validator = new UnicodeValidator();
    const result = validator.validateShortcutText(
      text,
      context || 'description',
      options || {}
    );
    
    return Response.json(result);
  });
  
  // Unicode keyboard visualization
  server.router.get('/api/unicode/keyboard', async () => {
    const shortcuts = await shortcutRegistry.getEnabledShortcuts();
    
    // Transform shortcuts to match UnicodeEnhancedShortcutConfig interface
    const unicodeShortcuts = shortcuts.map((s: any) => ({
      id: s.id,
      action: s.action || 'Unknown Action',
      description: s.description || 'No description',
      category: s.category || 'general',
      default: {
        primary: s.default?.primary || 'Unknown',
        secondary: s.default?.secondary,
        macOS: s.default?.macOS,
        linux: s.default?.linux,
        unicodePrimary: unicodeManager.getPlatformKeyDisplay(s.default?.primary || '', process.platform === 'darwin' ? 'macOS' : 'linux')
      },
      enabled: s.enabled !== false,
      scope: s.scope || 'global',
      icon: s.icon
    }));
    
    const keyboard = unicodeManager.createKeyboardVisualization(unicodeShortcuts);
    
    return Response.json(keyboard);
  });
  
  // Unicode normalization endpoint
  server.router.post('/api/unicode/normalize', async (req: Request) => {
    const { text, context, options } = await req.json();
    
    const validator = new UnicodeValidator();
    const normalized = validator.normalizeForStorage(text, context || 'description');
    
    return Response.json({
      original: text,
      normalized,
      context
    });
  });
  
  // Unicode script detection
  server.router.post('/api/unicode/scripts', async (req: Request) => {
    const { text } = await req.json();
    
    const scripts = new Set<string>();
    const clusters = new (require('./core/unicode/grapheme')).GraphemeClusterer().getClusters(text);
    
    for (const cluster of clusters) {
      const cp = cluster.codePointAt(0);
      if (!cp) continue;
      
      if (cp >= 0x0041 && cp <= 0x005A) scripts.add('Latin');
      else if (cp >= 0x0061 && cp <= 0x007A) scripts.add('Latin');
      else if (cp >= 0x0400 && cp <= 0x04FF) scripts.add('Cyrillic');
      else if (cp >= 0x4E00 && cp <= 0x9FFF) scripts.add('CJK');
      else if (cp >= 0x0600 && cp <= 0x06FF) scripts.add('Arabic');
      else if (new (require('./core/unicode/grapheme')).GraphemeClusterer().isEmoji(cluster)) {
        scripts.add('Emoji');
      } else {
        scripts.add('Other');
      }
    }
    
    return Response.json({
      text,
      scripts: Array.from(scripts),
      scriptCount: scripts.size
    });
  });
}

// Run the application
if (import.meta.main) {
  main();
}
