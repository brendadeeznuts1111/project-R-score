#!/usr/bin/env bun

/**
 * Unicode Enhancement Demo for Lightning Shortcut System
 * Demonstrates grapheme clustering, validation, and Unicode-aware features
 */

import { GraphemeClusterer, GraphemeUtils } from '../core/unicode/grapheme';
import { UnicodeValidator, UnicodeShortcutBuilder } from '../core/unicode/validation';
import { UnicodeEnhancedShortcutManager } from '../core/shortcuts/unicode-enhanced';

console.info('🌍 Unicode Enhancement Demo');
console.info('============================\n');

// Initialize Unicode components
const clusterer = new GraphemeClusterer();
const validator = new UnicodeValidator();
const unicodeManager = new UnicodeEnhancedShortcutManager();

// Check Unicode capabilities
const unicodeInfo = GraphemeUtils.getUnicodeInfo();
console.info('📊 Unicode Capabilities:');
console.info(`   Version: ${unicodeInfo.version}`);
console.info(`   Intl.Segmenter: ${unicodeInfo.hasSegmenter ? '✅ Available' : '❌ Not Available'}`);
console.info(`   Normalization: ${unicodeInfo.hasNormalization ? '✅ Available' : '❌ Not Available'}\n`);

async function demonstrateGraphemeClustering() {
  console.info('🔤 Grapheme Clustering Demo');
  console.info('==========================\n');
  
  const testCases = [
    {
      name: 'Simple ASCII',
      text: 'Hello World',
      expected: ['H', 'e', 'l', 'l', 'o', ' ', 'W', 'o', 'r', 'l', 'd']
    },
    {
      name: 'Emoji Family',
      text: '👨‍👩‍👧‍👦',
      expected: ['👨‍👩‍👧‍👦']
    },
    {
      name: 'Skin Tones',
      text: '👍🏻👍🏼👍🏽👍🏾👍🏿',
      expected: ['👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿']
    },
    {
      name: 'Country Flags',
      text: '🇺🇸🇯🇵🇬🇧🇫🇷',
      expected: ['🇺🇸', '🇯🇵', '🇬🇧', '🇫🇷']
    },
    {
      name: 'Combining Marks',
      text: 'café résumé naïve',
      expected: ['c', 'a', 'f', 'é', ' ', 'r', 'é', 's', 'u', 'm', 'é', ' ', 'n', 'a', 'ï', 'v', 'e']
    },
    {
      name: 'Mixed Scripts',
      text: 'Hello 世界 🌍',
      expected: ['H', 'e', 'l', 'l', 'o', ' ', '世', '界', ' ', '🌍']
    }
  ];
  
  for (const testCase of testCases) {
    const clusters = clusterer.getClusters(testCase.text);
    const clusterCount = clusterer.getClusterLength(testCase.text);
    const visualWidth = clusterer.getVisualWidth(testCase.text);
    
    console.info(`📝 ${testCase.name}:`);
    console.info(`   Text: "${testCase.text}"`);
    console.info(`   Clusters: [${clusters.map(c => `"${c}"`).join(', ')}]`);
    console.info(`   Count: ${clusterCount} clusters`);
    console.info(`   Visual Width: ${visualWidth}`);
    console.info(`   Emoji Count: ${GraphemeUtils.countEmojis(testCase.text)}`);
    console.info(`   Complex Unicode: ${GraphemeUtils.hasComplexUnicode(testCase.text)}`);
    console.info();
  }
}

function demonstrateUnicodeValidation() {
  console.info('✅ Unicode Validation Demo');
  console.info('===========================\n');
  
  const validationTests = [
    {
      name: 'Valid Action',
      text: 'Save Theme',
      context: 'action' as const
    },
    {
      name: 'Valid Description with Emoji',
      text: 'Save current theme 🎨',
      context: 'description' as const
    },
    {
      name: 'Invalid Action with Emoji',
      text: 'save.theme🎨',
      context: 'action' as const
    },
    {
      name: 'Control Characters',
      text: 'Hello\u0000World',
      context: 'description' as const
    },
    {
      name: 'Mixed Scripts',
      text: 'Hello 世界',
      context: 'description' as const
    },
    {
      name: 'Valid Icon',
      text: '💾',
      context: 'icon' as const
    }
  ];
  
  for (const test of validationTests) {
    const result = validator.validateShortcutText(test.text, test.context);
    
    console.info(`🔍 ${test.name}:`);
    console.info(`   Text: "${test.text}"`);
    console.info(`   Context: ${test.context}`);
    console.info(`   Valid: ${result.isValid ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.info(`   Errors:`);
      result.errors.forEach(error => {
        console.info(`     - ${error.code}: ${error.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.info(`   Warnings:`);
      result.warnings.forEach(warning => {
        console.info(`     - ${warning}`);
      });
    }
    
    console.info(`   Metadata:`);
    console.info(`     Clusters: ${result.metadata.clusterCount}`);
    console.info(`     Visual Width: ${result.metadata.visualWidth}`);
    console.info(`     Scripts: ${result.metadata.scriptCount}`);
    console.info(`     Emojis: ${result.metadata.emojiCount}`);
    console.info(`     Complex: ${result.metadata.hasComplexUnicode}`);
    console.info();
  }
}

function demonstrateKeyValidation() {
  console.info('⌨️ Key Combination Validation Demo');
  console.info('===================================\n');
  
  const keyTests = [
    { combo: 'Ctrl+S', platform: 'windows' as const },
    { combo: 'Cmd+S', platform: 'macOS' as const },
    { combo: 'Ctrl+Shift+S', platform: 'windows' as const },
    { combo: 'Ctrl+Ctrl+S', platform: 'windows' as const },
    { combo: 'Ctrl', platform: 'windows' as const },
    { combo: 'Win+Ctrl+Alt+Del', platform: 'windows' as const },
    { combo: 'Cmd+Option+Shift+S', platform: 'macOS' as const }
  ];
  
  for (const test of keyTests) {
    const result = validator.validateKeyCombination(test.combo, test.platform);
    
    console.info(`⌨️ ${test.combo} (${test.platform}):`);
    console.info(`   Valid: ${result.isValid ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.info(`   Errors:`);
      result.errors.forEach(error => {
        console.info(`     - ${error.code}: ${error.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.info(`   Warnings:`);
      result.warnings.forEach(warning => {
        console.info(`     - ${warning}`);
      });
    }
    
    // Show Unicode display
    const unicodeDisplay = UnicodeShortcutBuilder.getUnicodeKeyDisplay(test.combo, test.platform);
    console.info(`   Unicode Display: ${unicodeDisplay}`);
    console.info();
  }
}

function demonstrateUnicodeShortcuts() {
  console.info('🚀 Unicode-Enhanced Shortcuts Demo');
  console.info('====================================\n');
  
  // Create some Unicode-aware shortcuts
  const shortcuts = [
    {
      id: 'theme.save',
      action: 'Save Theme',
      description: 'Save current theme configuration 🎨',
      keyCombo: 'Ctrl+S',
      platform: 'windows' as const,
      icon: '💾'
    },
    {
      id: 'theme.load',
      action: 'Load Theme',
      description: 'Load theme from file 📁',
      keyCombo: 'Ctrl+O',
      platform: 'windows' as const,
      icon: '📂'
    },
    {
      id: 'emoji.insert',
      action: 'Insert Emoji',
      description: 'Open emoji picker 😊',
      keyCombo: 'Ctrl+Shift+E',
      platform: 'windows' as const,
      icon: '😊'
    },
    {
      id: 'text.rtl',
      action: 'RTL Text',
      description: 'Switch to right-to-left text direction العربية',
      keyCombo: 'Ctrl+Shift+R',
      platform: 'windows' as const,
      icon: '🔤'
    }
  ];
  
  for (const shortcutData of shortcuts) {
    const { shortcut, validation } = UnicodeShortcutBuilder.create(
      shortcutData.id,
      shortcutData.action,
      shortcutData.description,
      shortcutData.keyCombo,
      shortcutData.platform,
      shortcutData.icon
    );
    
    console.info(`🎯 ${shortcutData.id}:`);
    console.info(`   Action: ${shortcut.action}`);
    console.info(`   Description: ${shortcut.description}`);
    console.info(`   Icon: ${shortcut.icon}`);
    console.info(`   Key: ${shortcut.default.primary}`);
    console.info(`   Unicode Key: ${shortcut.default.unicodePrimary}`);
    console.info(`   Valid: ${shortcut.enabled ? '✅' : '❌'}`);
    
    if (!validation.action.isValid || !validation.description.isValid || !validation.key.isValid) {
      console.info(`   Issues:`);
      if (!validation.action.isValid) console.info(`     - Action invalid`);
      if (!validation.description.isValid) console.info(`     - Description invalid`);
      if (!validation.key.isValid) console.info(`     - Key invalid`);
    }
    
    console.info();
  }
}

function demonstrateTextProcessing() {
  console.info('📝 Advanced Text Processing Demo');
  console.info('=================================\n');
  
  const textSamples = [
    'Hello World 🌍',
    'Save theme 🎨 and close 💾',
    '👨‍👩‍👧‍👦 Family emoji',
    'Café résumé naïve',
    'Mixed scripts: Hello 世界 العربية'
  ];
  
  for (const text of textSamples) {
    console.info(`📄 Processing: "${text}"`);
    
    // Truncate
    const truncated = GraphemeUtils.safeTruncate(text, 5);
    console.info(`   Truncated (5): "${truncated}"`);
    
    // Visual width
    const visualWidth = GraphemeUtils.visualLength(text);
    console.info(`   Visual Width: ${visualWidth}`);
    
    // Wrap text
    const wrapped = GraphemeUtils.wrapText(text, 10);
    console.info(`   Wrapped (width 10):`);
    wrapped.forEach((line, i) => {
      console.info(`     ${i + 1}: "${line}"`);
    });
    
    // Extract emojis
    const emojis = GraphemeUtils.extractEmojis(text);
    if (emojis.length > 0) {
      console.info(`   Emojis: [${emojis.join(', ')}]`);
    }
    
    // Normalize
    const normalized = GraphemeUtils.normalizeEmoji(text);
    if (normalized !== text) {
      console.info(`   Normalized: "${normalized}"`);
    }
    
    console.info();
  }
}

function demonstrateKeyboardVisualization() {
  console.info('⌨️ Keyboard Visualization Demo');
  console.info('===============================\n');
  
  // Create some test shortcuts
  const testShortcuts = [
    unicodeManager.createShortcut({
      id: 'test.save',
      action: 'Save',
      description: 'Save file 💾',
      category: 'file',
      default: { primary: 'Ctrl+S' },
      enabled: true,
      scope: 'global'
    }),
    unicodeManager.createShortcut({
      id: 'test.open',
      action: 'Open',
      description: 'Open file 📁',
      category: 'file',
      default: { primary: 'Ctrl+O' },
      enabled: true,
      scope: 'global'
    }),
    unicodeManager.createShortcut({
      id: 'test.copy',
      action: 'Copy',
      description: 'Copy selection 📋',
      category: 'edit',
      default: { primary: 'Ctrl+C' },
      enabled: true,
      scope: 'global'
    })
  ];
  
  const keyboard = unicodeManager.createKeyboardVisualization(testShortcuts);
  
  console.info('🗺️ Keyboard Layout:');
  keyboard.layout.forEach((row, rowIndex) => {
    const rowDisplay = row.map(key => {
      const hasShortcut = key.shortcuts.length > 0;
      const shortcutIndicator = hasShortcut ? '●' : '○';
      return `${key.display}${shortcutIndicator}`;
    }).join(' ');
    console.info(`   Row ${rowIndex + 1}: ${rowDisplay}`);
  });
  
  console.info('\n📋 Legend:');
  Object.entries(keyboard.legend).forEach(([key, symbol]) => {
    console.info(`   ${key} → ${symbol}`);
  });
  
  console.info('\n🎯 Shortcuts Found:');
  testShortcuts.forEach(shortcut => {
    console.info(`   ${shortcut.id}: ${shortcut.default.primary} → ${shortcut.default.unicodePrimary}`);
  });
  
  console.info();
}

function demonstratePerformance() {
  console.info('⚡ Performance Benchmark Demo');
  console.info('==============================\n');
  
  const testTexts = [
    'Simple ASCII text for testing',
    'Text with emojis 🎉 🚀 🌟 📊 🎨',
    'Complex Unicode: café résumé naïve 👨‍👩‍👧‍👦',
    'Mixed scripts: Hello 世界 العربية العربية'
  ];
  
  const operations = [
    { name: 'Grapheme Clustering', fn: (text: string) => clusterer.getClusters(text) },
    { name: 'Cluster Length', fn: (text: string) => clusterer.getClusterLength(text) },
    { name: 'Visual Width', fn: (text: string) => clusterer.getVisualWidth(text) },
    { name: 'Emoji Detection', fn: (text: string) => clusterer.isEmoji(text) },
    { name: 'Unicode Validation', fn: (text: string) => validator.validateShortcutText(text, 'description') },
    { name: 'Text Normalization', fn: (text: string) => validator.normalizeForStorage(text, 'description') }
  ];
  
  const iterations = 1000;
  
  for (const testText of testTexts) {
    console.info(`📊 Testing: "${testText.substring(0, 30)}${testText.length > 30 ? '...' : ''}"`);
    
    for (const operation of operations) {
      // Warm up
      for (let i = 0; i < 100; i++) {
        operation.fn(testText);
      }
      
      // Benchmark
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        operation.fn(testText);
      }
      const end = performance.now();
      
      const duration = end - start;
      const opsPerSecond = (iterations / duration) * 1000;
      
      console.info(`   ${operation.name}: ${opsPerSecond.toFixed(0)} ops/sec (${duration.toFixed(2)}ms total)`);
    }
    
    console.info();
  }
}

async function main() {
  try {
    await demonstrateGraphemeClustering();
    demonstrateUnicodeValidation();
    demonstrateKeyValidation();
    demonstrateUnicodeShortcuts();
    demonstrateTextProcessing();
    demonstrateKeyboardVisualization();
    demonstratePerformance();
    
    console.info('🎉 Unicode Enhancement Demo Complete!');
    console.info('=====================================');
    console.info('All Unicode features demonstrated successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main();
}
