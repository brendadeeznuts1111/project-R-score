#!/usr/bin/env bun

/**
 * Unicode Enhancement Demo for Lightning Shortcut System
 * Demonstrates grapheme clustering, validation, and Unicode-aware features
 */

import { GraphemeClusterer, GraphemeUtils } from '../core/unicode/grapheme';
import { UnicodeValidator, UnicodeShortcutBuilder } from '../core/unicode/validation';
import { UnicodeEnhancedShortcutManager } from '../core/shortcuts/unicode-enhanced';

console.log('🌍 Unicode Enhancement Demo');
console.log('============================\n');

// Initialize Unicode components
const clusterer = new GraphemeClusterer();
const validator = new UnicodeValidator();
const unicodeManager = new UnicodeEnhancedShortcutManager();

// Check Unicode capabilities
const unicodeInfo = GraphemeUtils.getUnicodeInfo();
console.log('📊 Unicode Capabilities:');
console.log(`   Version: ${unicodeInfo.version}`);
console.log(`   Intl.Segmenter: ${unicodeInfo.hasSegmenter ? '✅ Available' : '❌ Not Available'}`);
console.log(`   Normalization: ${unicodeInfo.hasNormalization ? '✅ Available' : '❌ Not Available'}\n`);

async function demonstrateGraphemeClustering() {
  console.log('🔤 Grapheme Clustering Demo');
  console.log('==========================\n');
  
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
    
    console.log(`📝 ${testCase.name}:`);
    console.log(`   Text: "${testCase.text}"`);
    console.log(`   Clusters: [${clusters.map(c => `"${c}"`).join(', ')}]`);
    console.log(`   Count: ${clusterCount} clusters`);
    console.log(`   Visual Width: ${visualWidth}`);
    console.log(`   Emoji Count: ${GraphemeUtils.countEmojis(testCase.text)}`);
    console.log(`   Complex Unicode: ${GraphemeUtils.hasComplexUnicode(testCase.text)}`);
    console.log();
  }
}

function demonstrateUnicodeValidation() {
  console.log('✅ Unicode Validation Demo');
  console.log('===========================\n');
  
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
    
    console.log(`🔍 ${test.name}:`);
    console.log(`   Text: "${test.text}"`);
    console.log(`   Context: ${test.context}`);
    console.log(`   Valid: ${result.isValid ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors:`);
      result.errors.forEach(error => {
        console.log(`     - ${error.code}: ${error.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings:`);
      result.warnings.forEach(warning => {
        console.log(`     - ${warning}`);
      });
    }
    
    console.log(`   Metadata:`);
    console.log(`     Clusters: ${result.metadata.clusterCount}`);
    console.log(`     Visual Width: ${result.metadata.visualWidth}`);
    console.log(`     Scripts: ${result.metadata.scriptCount}`);
    console.log(`     Emojis: ${result.metadata.emojiCount}`);
    console.log(`     Complex: ${result.metadata.hasComplexUnicode}`);
    console.log();
  }
}

function demonstrateKeyValidation() {
  console.log('⌨️ Key Combination Validation Demo');
  console.log('===================================\n');
  
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
    
    console.log(`⌨️ ${test.combo} (${test.platform}):`);
    console.log(`   Valid: ${result.isValid ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors:`);
      result.errors.forEach(error => {
        console.log(`     - ${error.code}: ${error.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings:`);
      result.warnings.forEach(warning => {
        console.log(`     - ${warning}`);
      });
    }
    
    // Show Unicode display
    const unicodeDisplay = UnicodeShortcutBuilder.getUnicodeKeyDisplay(test.combo, test.platform);
    console.log(`   Unicode Display: ${unicodeDisplay}`);
    console.log();
  }
}

function demonstrateUnicodeShortcuts() {
  console.log('🚀 Unicode-Enhanced Shortcuts Demo');
  console.log('====================================\n');
  
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
    
    console.log(`🎯 ${shortcutData.id}:`);
    console.log(`   Action: ${shortcut.action}`);
    console.log(`   Description: ${shortcut.description}`);
    console.log(`   Icon: ${shortcut.icon}`);
    console.log(`   Key: ${shortcut.default.primary}`);
    console.log(`   Unicode Key: ${shortcut.default.unicodePrimary}`);
    console.log(`   Valid: ${shortcut.enabled ? '✅' : '❌'}`);
    
    if (!validation.action.isValid || !validation.description.isValid || !validation.key.isValid) {
      console.log(`   Issues:`);
      if (!validation.action.isValid) console.log(`     - Action invalid`);
      if (!validation.description.isValid) console.log(`     - Description invalid`);
      if (!validation.key.isValid) console.log(`     - Key invalid`);
    }
    
    console.log();
  }
}

function demonstrateTextProcessing() {
  console.log('📝 Advanced Text Processing Demo');
  console.log('=================================\n');
  
  const textSamples = [
    'Hello World 🌍',
    'Save theme 🎨 and close 💾',
    '👨‍👩‍👧‍👦 Family emoji',
    'Café résumé naïve',
    'Mixed scripts: Hello 世界 العربية'
  ];
  
  for (const text of textSamples) {
    console.log(`📄 Processing: "${text}"`);
    
    // Truncate
    const truncated = GraphemeUtils.safeTruncate(text, 5);
    console.log(`   Truncated (5): "${truncated}"`);
    
    // Visual width
    const visualWidth = GraphemeUtils.visualLength(text);
    console.log(`   Visual Width: ${visualWidth}`);
    
    // Wrap text
    const wrapped = GraphemeUtils.wrapText(text, 10);
    console.log(`   Wrapped (width 10):`);
    wrapped.forEach((line, i) => {
      console.log(`     ${i + 1}: "${line}"`);
    });
    
    // Extract emojis
    const emojis = GraphemeUtils.extractEmojis(text);
    if (emojis.length > 0) {
      console.log(`   Emojis: [${emojis.join(', ')}]`);
    }
    
    // Normalize
    const normalized = GraphemeUtils.normalizeEmoji(text);
    if (normalized !== text) {
      console.log(`   Normalized: "${normalized}"`);
    }
    
    console.log();
  }
}

function demonstrateKeyboardVisualization() {
  console.log('⌨️ Keyboard Visualization Demo');
  console.log('===============================\n');
  
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
  
  console.log('🗺️ Keyboard Layout:');
  keyboard.layout.forEach((row, rowIndex) => {
    const rowDisplay = row.map(key => {
      const hasShortcut = key.shortcuts.length > 0;
      const shortcutIndicator = hasShortcut ? '●' : '○';
      return `${key.display}${shortcutIndicator}`;
    }).join(' ');
    console.log(`   Row ${rowIndex + 1}: ${rowDisplay}`);
  });
  
  console.log('\n📋 Legend:');
  Object.entries(keyboard.legend).forEach(([key, symbol]) => {
    console.log(`   ${key} → ${symbol}`);
  });
  
  console.log('\n🎯 Shortcuts Found:');
  testShortcuts.forEach(shortcut => {
    console.log(`   ${shortcut.id}: ${shortcut.default.primary} → ${shortcut.default.unicodePrimary}`);
  });
  
  console.log();
}

function demonstratePerformance() {
  console.log('⚡ Performance Benchmark Demo');
  console.log('==============================\n');
  
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
    console.log(`📊 Testing: "${testText.substring(0, 30)}${testText.length > 30 ? '...' : ''}"`);
    
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
      
      console.log(`   ${operation.name}: ${opsPerSecond.toFixed(0)} ops/sec (${duration.toFixed(2)}ms total)`);
    }
    
    console.log();
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
    
    console.log('🎉 Unicode Enhancement Demo Complete!');
    console.log('=====================================');
    console.log('All Unicode features demonstrated successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main();
}
