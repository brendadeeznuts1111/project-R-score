import { describe, test, expect, beforeEach } from 'bun:test';
import { GraphemeClusterer, GraphemeUtils } from '../src/core/unicode/grapheme';
import { UnicodeValidator, UnicodeShortcutBuilder } from '../src/core/unicode/validation';

describe('Grapheme Clustering', () => {
  let clusterer: GraphemeClusterer;
  
  beforeEach(() => {
    clusterer = new GraphemeClusterer();
  });
  
  test('should handle simple ASCII text', () => {
    const text = 'Hello World';
    const clusters = clusterer.getClusters(text);
    
    expect(clusters).toEqual(['H', 'e', 'l', 'l', 'o', ' ', 'W', 'o', 'r', 'l', 'd']);
    expect(clusterer.getClusterLength(text)).toBe(11);
  });
  
  test('should handle emoji sequences', () => {
    const text = '👨‍👩‍👧‍👦'; // Family emoji (man, woman, girl, boy with ZWJ)
    const clusters = clusterer.getClusters(text);
    
    expect(clusters).toEqual(['👨‍👩‍👧‍👦']);
    expect(clusterer.getClusterLength(text)).toBe(1);
  });
  
  test('should handle skin tone modifiers', () => {
    const text = '👍🏻👍🏿'; // Thumbs up with light and dark skin
    const clusters = clusterer.getClusters(text);
    
    expect(clusters).toEqual(['👍🏻', '👍🏿']);
    expect(clusterer.getClusterLength(text)).toBe(2);
  });
  
  test('should handle country flags', () => {
    const text = '🇺🇸🇯🇵'; // US and Japan flags
    const clusters = clusterer.getClusters(text);
    
    expect(clusters).toEqual(['🇺🇸', '🇯🇵']);
    expect(clusterer.getClusterLength(text)).toBe(2);
  });
  
  test('should handle combining marks', () => {
    const text = 'c\u0327'; // c + combining cedilla = ç
    const clusters = clusterer.getClusters(text);
    
    expect(clusters).toEqual(['ç']);
    expect(clusterer.getClusterLength(text)).toBe(1);
  });
  
  test('should truncate by grapheme clusters', () => {
    const text = 'Hello 👨‍👩‍👧‍👦 World 🇺🇸';
    const truncated = clusterer.truncate(text, 3);
    
    expect(truncated).toBe('Hel…');
  });
  
  test('should calculate visual width', () => {
    expect(clusterer.getVisualWidth('Hello')).toBe(5);
    expect(clusterer.getVisualWidth('🇺🇸')).toBe(1); // Flags are counted as single visual unit
    expect(clusterer.getVisualWidth('🎉')).toBe(1); // Emoji are counted as single visual unit
  });
  
  test('should detect emoji', () => {
    expect(clusterer.isEmoji('👍')).toBe(true);
    expect(clusterer.isEmoji('A')).toBe(false);
    expect(clusterer.isEmoji('🎉')).toBe(true);
  });
});

describe('Unicode Validation', () => {
  let validator: UnicodeValidator;
  
  beforeEach(() => {
    validator = new UnicodeValidator();
  });
  
  test('should validate ASCII text', () => {
    const result = validator.validateShortcutText('Hello', 'action');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should reject control characters', () => {
    const text = 'Hello\u0000World';
    const result = validator.validateShortcutText(text, 'action');
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('CONTROL_CHARACTER');
  });
  
  test('should validate emoji in descriptions', () => {
    const text = 'Save theme 🎨';
    const result = validator.validateShortcutText(text, 'description');
    
    expect(result.isValid).toBe(true);
    expect(result.metadata.emojiCount).toBe(1);
  });
  
  test('should reject emoji in actions', () => {
    const text = 'theme.save🎨';
    const result = validator.validateShortcutText(text, 'action');
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('EMOJI_NOT_ALLOWED');
  });
  
  test('should validate key combinations', () => {
    const result = validator.validateKeyCombination('Ctrl+Shift+S', 'windows');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should reject invalid key combinations', () => {
    const result = validator.validateKeyCombination('Ctrl+Ctrl+S', 'windows');
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('DUPLICATE_MODIFIER');
  });
  
  test('should detect mixed scripts', () => {
    const text = 'Hello 世界'; // Latin + CJK
    const result = validator.validateShortcutText(text, 'description');
    
    expect(result.metadata.scriptCount).toBeGreaterThan(1);
  });
  
  test('should normalize text', () => {
    const normalized = validator.normalizeForStorage('  Hello  World  ', 'description');
    
    expect(normalized).toBe('Hello  World');
  });
});

describe('Unicode Utilities', () => {
  test('should extract emojis', () => {
    const text = 'Hello 🎨 World 🌍 Test';
    const emojis = GraphemeUtils.extractEmojis(text);
    
    expect(emojis).toEqual(['🎨', '🌍']);
  });
  
  test('should count emojis', () => {
    const text = '👍 🎉 🚀';
    const count = GraphemeUtils.countEmojis(text);
    
    expect(count).toBe(3);
  });
  
  test('should wrap text by visual width', () => {
    const text = 'Hello World, this is a test with emoji 🎉';
    const lines = GraphemeUtils.wrapText(text, 10);
    
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(line => {
      // Each line should be close to width 10
      const visualWidth = new GraphemeClusterer().getVisualWidth(line);
      expect(visualWidth).toBeLessThanOrEqual(12); // Allow some flexibility
    });
  });
  
  test('should detect complex Unicode', () => {
    expect(GraphemeUtils.hasComplexUnicode('Hello')).toBe(false);
    expect(GraphemeUtils.hasComplexUnicode('c\u0327')).toBe(true); // Combining mark
    expect(GraphemeUtils.hasComplexUnicode('👨‍👩‍👧‍👦')).toBe(true); // ZWJ sequence
  });
});

describe('Unicode Shortcut Builder', () => {
  test('should create valid shortcut', () => {
    const { shortcut, validation } = UnicodeShortcutBuilder.create(
      'test.shortcut',
      'Save Theme',
      'Save current theme configuration 🎨',
      'Ctrl+S',
      'windows'
    );
    
    expect(shortcut.id).toBe('test.shortcut');
    expect(validation.action.isValid).toBe(true);
    expect(validation.description.isValid).toBe(true);
    expect(validation.key.isValid).toBe(true);
    expect(shortcut.enabled).toBe(true);
  });
  
  test('should generate unique IDs', () => {
    const now = Date.now;
    let callCount = 0;
    
    // Mock Date.now to return different values
    Date.now = () => {
      callCount++;
      return 1000000 + callCount;
    };
    
    try {
      const id1 = UnicodeShortcutBuilder.generateId('Save Theme');
      const id2 = UnicodeShortcutBuilder.generateId('Save Theme');
      
      expect(id1).toMatch(/^save\.theme\.[a-z0-9]+$/);
      expect(id2).toMatch(/^save\.theme\.[a-z0-9]+$/);
      expect(id1).not.toBe(id2); // Different timestamps
    } finally {
      Date.now = now;
    }
  });
});
