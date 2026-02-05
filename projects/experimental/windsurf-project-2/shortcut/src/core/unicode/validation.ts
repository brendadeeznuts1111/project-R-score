import { GraphemeClusterer, GraphemeUtils } from './grapheme';

export interface UnicodeValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    position?: number;
    suggestion?: string;
  }>;
  warnings: string[];
  normalizedText?: string;
  metadata: {
    clusterCount: number;
    visualWidth: number;
    scriptCount: number;
    emojiCount: number;
    hasComplexUnicode: boolean;
    bidiLevel: number;
  };
}

export class UnicodeValidator {
  private clusterer: GraphemeClusterer;
  
  constructor() {
    this.clusterer = new GraphemeClusterer();
  }
  
  /**
   * Validate text for use in shortcut system
   */
  validateShortcutText(
    text: string,
    context: 'action' | 'description' | 'key' | 'icon',
    options: {
      maxClusters?: number;
      maxVisualWidth?: number;
      allowEmoji?: boolean;
      allowBidi?: boolean;
      requireAscii?: boolean;
      allowedScripts?: string[];
    } = {}
  ): UnicodeValidationResult {
    const errors: Array<any> = [];
    const warnings: string[] = [];
    const clusters = this.clusterer.getClusters(text);
    
    // Context-specific defaults
    const defaults: Record<string, any> = {
      action: { maxClusters: 50, maxVisualWidth: 60, allowEmoji: false, requireAscii: true },
      description: { maxClusters: 200, maxVisualWidth: 100, allowEmoji: true, requireAscii: false },
      key: { maxClusters: 20, maxVisualWidth: 30, allowEmoji: false, requireAscii: true },
      icon: { maxClusters: 1, maxVisualWidth: 2, allowEmoji: true, requireAscii: false }
    };
    
    const config = { ...defaults[context], ...options };
    
    // 1. Check for control characters
    const controlChars = this.findControlCharacters(text);
    if (controlChars.length > 0) {
      errors.push({
        code: 'CONTROL_CHARACTER',
        message: `Control characters found: ${controlChars.map(c => `U+${c.codePoint.toString(16)}`).join(', ')}`,
        severity: 'error',
        positions: controlChars.map(c => c.position)
      });
    }
    
    // 2. Check length by grapheme clusters
    if (config.maxClusters && clusters.length > config.maxClusters) {
      errors.push({
        code: 'TOO_LONG',
        message: `Text too long: ${clusters.length} grapheme clusters (max ${config.maxClusters})`,
        severity: 'error'
      });
    }
    
    // 3. Check visual width
    const visualWidth = this.clusterer.getVisualWidth(text);
    if (config.maxVisualWidth && visualWidth > config.maxVisualWidth) {
      warnings.push(`Visual width ${visualWidth} may cause display issues`);
    }
    
    // 4. Check for emoji if not allowed
    const emojiCount = GraphemeUtils.countEmojis(text);
    if (!config.allowEmoji && emojiCount > 0) {
      errors.push({
        code: 'EMOJI_NOT_ALLOWED',
        message: `Emojis are not allowed in ${context} (found ${emojiCount})`,
        severity: 'error'
      });
    }
    
    // 5. Check for ASCII requirement
    if (config.requireAscii && !this.isAscii(text)) {
      errors.push({
        code: 'NON_ASCII',
        message: `Only ASCII characters are allowed in ${context}`,
        severity: 'error'
      });
    }
    
    // 6. Check for mixed scripts
    const scripts = this.detectScripts(text);
    if (config.allowedScripts && scripts.size > 0) {
      const disallowed = Array.from(scripts).filter(script => !config.allowedScripts!.includes(script));
      if (disallowed.length > 0) {
        errors.push({
          code: 'DISALLOWED_SCRIPT',
          message: `Disallowed scripts: ${disallowed.join(', ')}`,
          severity: 'error'
        });
      }
    }
    
    // 7. Check for bidirectional text
    const bidiLevel = this.getBidiLevel(text);
    if (!config.allowBidi && bidiLevel > 0) {
      warnings.push('Text contains bidirectional characters which may display incorrectly');
    }
    
    // 8. Check for confusables/homoglyphs
    const confusables = this.findConfusables(text);
    if (confusables.length > 0) {
      errors.push({
        code: 'CONFUSABLE_CHARACTER',
        message: `Potentially confusing characters found: ${confusables.map(c => c.char).join(', ')}`,
        severity: 'warning',
        suggestion: 'Consider using canonical characters'
      });
    }
    
    // 9. Check for invalid combining sequences
    const invalidSequences = this.findInvalidCombiningSequences(text);
    if (invalidSequences.length > 0) {
      errors.push({
        code: 'INVALID_COMBINING',
        message: 'Invalid combining character sequence',
        severity: 'error'
      });
    }
    
    // 10. Check for zalgo/text
    const zalgoScore = this.getZalgoScore(text);
    if (zalgoScore > 3) {
      warnings.push('Text contains excessive combining marks (zalgo text)');
    }
    
    // Create normalized version if valid
    let normalizedText: string | undefined;
    if (errors.filter(e => e.severity === 'error').length === 0) {
      normalizedText = this.normalizeForStorage(text, context);
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      normalizedText,
      metadata: {
        clusterCount: clusters.length,
        visualWidth,
        scriptCount: scripts.size,
        emojiCount,
        hasComplexUnicode: GraphemeUtils.hasComplexUnicode(text),
        bidiLevel
      }
    };
  }
  
  /**
   * Validate key combination for shortcuts
   */
  validateKeyCombination(
    keyCombo: string,
    platform: 'windows' | 'macOS' | 'linux'
  ): UnicodeValidationResult {
    // Split by + and validate each part
    const parts = keyCombo.split('+');
    const errors: Array<any> = [];
    const warnings: string[] = [];
    
    // Check each part
    parts.forEach((part, index) => {
      const isModifier = ['Ctrl', 'Cmd', 'Alt', 'Shift', 'Win', 'Super', 'Meta'].includes(part);
      const isSpecial = ['Enter', 'Tab', 'Esc', 'Space', 'Backspace', 'Delete'].includes(part);
      const isFunctionKey = /^F[1-9][0-9]?$/.test(part);
      const isArrowKey = /^Arrow(Up|Down|Left|Right)$/.test(part);
      const isSingleChar = part.length === 1 && /[A-Za-z0-9]/.test(part);
      
      if (!isModifier && !isSpecial && !isFunctionKey && !isArrowKey && !isSingleChar) {
        errors.push({
          code: 'INVALID_KEY',
          message: `Invalid key: ${part}`,
          severity: 'error',
          position: index
        });
      }
    });
    
    // Platform-specific validation
    if (platform === 'macOS' && keyCombo.includes('Win')) {
      warnings.push('Windows key not typically used on macOS');
    }
    
    if (platform === 'windows' && keyCombo.includes('Cmd')) {
      warnings.push('Command key not typically used on Windows');
    }
    
    // Check for duplicate modifiers
    const uniqueParts = new Set(parts.map(p => p.toLowerCase()));
    if (uniqueParts.size !== parts.length) {
      errors.push({
        code: 'DUPLICATE_MODIFIER',
        message: 'Duplicate modifier in key combination',
        severity: 'error'
      });
    }
    
    // Check modifier order (typically Ctrl/Command first)
    const lastPart = parts[parts.length - 1];
    if (['Ctrl', 'Cmd', 'Alt', 'Shift', 'Win', 'Super', 'Meta'].includes(lastPart)) {
      errors.push({
        code: 'MODIFIER_LAST',
        message: 'Modifier should not be the last part of key combination',
        severity: 'error'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        clusterCount: parts.length,
        visualWidth: this.clusterer.getVisualWidth(keyCombo),
        scriptCount: 1, // Key combos should be ASCII
        emojiCount: 0,
        hasComplexUnicode: false,
        bidiLevel: 0
      }
    };
  }
  
  /**
   * Normalize text for consistent storage
   */
  normalizeForStorage(text: string, context: 'action' | 'description' | 'key' | 'icon'): string {
    let normalized = text;
    
    // 1. Normalize to NFC form
    if (typeof normalized.normalize === 'function') {
      normalized = normalized.normalize('NFC');
    }
    
    // 2. Remove control characters
    normalized = normalized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // 3. Context-specific normalization
    switch (context) {
      case 'action':
      case 'key':
        // Convert to uppercase ASCII
        normalized = normalized.toUpperCase();
        break;
        
      case 'description':
        // Normalize emoji to emoji presentation
        normalized = GraphemeUtils.normalizeEmoji(normalized);
        // Trim whitespace
        normalized = normalized.trim();
        break;
        
      case 'icon':
        // Ensure single grapheme cluster
        const clusters = this.clusterer.getClusters(normalized);
        if (clusters.length > 0) {
          normalized = clusters[0];
        }
        // Normalize to emoji presentation
        normalized = this.clusterer.normalizeToEmojiPresentation(normalized);
        break;
    }
    
    return normalized;
  }
  
  /**
   * Find control characters in text
   */
  private findControlCharacters(text: string): Array<{ position: number; codePoint: number }> {
    const controlChars: Array<{ position: number; codePoint: number }> = [];
    
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
        controlChars.push({ position: i, codePoint });
      }
      if (codePoint > 0xFFFF) {
        i++; // Skip surrogate pair
      }
    }
    
    return controlChars;
  }
  
  /**
   * Check if text is ASCII-only
   */
  private isAscii(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      if (codePoint > 0x7F) {
        return false;
      }
      if (codePoint > 0xFFFF) {
        i++; // Skip surrogate pair
      }
    }
    return true;
  }
  
  /**
   * Detect scripts in text
   */
  private detectScripts(text: string): Set<string> {
    const scripts = new Set<string>();
    const clusters = this.clusterer.getClusters(text);
    
    for (const cluster of clusters) {
      const codePoint = cluster.codePointAt(0);
      if (!codePoint) continue;
      
      // Simplified script detection
      if (this.clusterer.isEmoji(cluster)) {
        scripts.add('Emoji');
      } else if (codePoint >= 0x0041 && codePoint <= 0x005A) {
        scripts.add('Latin');
      } else if (codePoint >= 0x0061 && codePoint <= 0x007A) {
        scripts.add('Latin');
      } else if (codePoint >= 0x0400 && codePoint <= 0x04FF) {
        scripts.add('Cyrillic');
      } else if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) {
        scripts.add('CJK');
      } else if (codePoint >= 0x0600 && codePoint <= 0x06FF) {
        scripts.add('Arabic');
      } else if (codePoint >= 0x0900 && codePoint <= 0x097F) {
        scripts.add('Devanagari');
      }
    }
    
    return scripts;
  }
  
  /**
   * Get bidirectional text level
   */
  private getBidiLevel(text: string): number {
    // Simplified bidi detection
    const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/;
    const ltrChars = /[A-Za-z]/;
    
    let hasRTL = false;
    let hasLTR = false;
    
    for (const cluster of this.clusterer.getClusters(text)) {
      if (rtlChars.test(cluster)) hasRTL = true;
      if (ltrChars.test(cluster)) hasLTR = true;
    }
    
    if (hasRTL && hasLTR) return 2; // Mixed
    if (hasRTL) return 1; // RTL only
    return 0; // LTR only
  }
  
  /**
   * Find confusable characters (homoglyphs)
   */
  private findConfusables(text: string): Array<{ char: string; position: number; confusableWith: string }> {
    const confusables: Array<{ char: string; position: number; confusableWith: string }> = [];
    
    // Common confusable mappings
    const confusableMap: Record<string, string> = {
      'А': 'A', // Cyrillic
      'В': 'B',
      'Е': 'E',
      'К': 'K',
      'М': 'M',
      'Н': 'H',
      'О': 'O',
      'Р': 'P',
      'С': 'C',
      'Т': 'T',
      'Х': 'X',
      'а': 'a',
      'е': 'e',
      'о': 'o',
      'р': 'p',
      'с': 'c',
      'у': 'y',
      'х': 'x',
      'і': 'i', // Ukrainian
      'ј': 'j', // Macedonian
      'ӏ': 'l', // Cyrillic
      '٠': '0', // Arabic
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9'
    };
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (confusableMap[char]) {
        confusables.push({
          char,
          position: i,
          confusableWith: confusableMap[char]
        });
      }
    }
    
    return confusables;
  }
  
  /**
   * Find invalid combining character sequences
   */
  private findInvalidCombiningSequences(text: string): Array<{ position: number; sequence: string }> {
    const invalidSequences: Array<{ position: number; sequence: string }> = [];
    const clusters = this.clusterer.getClusters(text);
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      // Check for combining mark without base character
      if (i === 0 && this.isCombiningMark(cluster.codePointAt(0)!)) {
        invalidSequences.push({ position: 0, sequence: cluster });
      }
      
      // Check for multiple combining marks that shouldn't stack
      if (cluster.length > 2) {
        // Count combining marks
        let combiningCount = 0;
        for (let j = 0; j < cluster.length; j++) {
          const cp = cluster.codePointAt(j)!;
          if (this.isCombiningMark(cp)) combiningCount++;
          if (cp > 0xFFFF) j++; // Skip surrogate pair
        }
        
        if (combiningCount > 3) { // Arbitrary limit
          invalidSequences.push({ position: i, sequence: cluster });
        }
      }
    }
    
    return invalidSequences;
  }
  
  /**
   * Calculate "zalgo" score (excessive combining marks)
   */
  private getZalgoScore(text: string): number {
    let score = 0;
    
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      if (this.isCombiningMark(codePoint)) {
        score++;
      }
      if (codePoint > 0xFFFF) {
        i++; // Skip surrogate pair
      }
    }
    
    return Math.floor(score / 3); // Normalize
  }
  
  /**
   * Check if code point is a combining mark
   */
  private isCombiningMark(codePoint: number): boolean {
    return (
      (codePoint >= 0x0300 && codePoint <= 0x036F) || // Combining Diacritical Marks
      (codePoint >= 0x1AB0 && codePoint <= 0x1AFF) || // Combining Diacritical Marks Extended
      (codePoint >= 0x1DC0 && codePoint <= 0x1DFF) || // Combining Diacritical Marks Supplement
      (codePoint >= 0x20D0 && codePoint <= 0x20FF) || // Combining Diacritical Marks for Symbols
      (codePoint >= 0xFE20 && codePoint <= 0xFE2F)    // Combining Half Marks
    );
  }
}

/**
 * Utility for creating Unicode-safe shortcuts
 */
export const UnicodeShortcutBuilder = {
  /**
   * Create a shortcut with Unicode validation
   */
  create(
    id: string,
    action: string,
    description: string,
    keyCombo: string,
    platform: 'windows' | 'macOS' | 'linux',
    icon?: string
  ): {
    shortcut: any;
    validation: {
      action: UnicodeValidationResult;
      description: UnicodeValidationResult;
      key: UnicodeValidationResult;
      icon?: UnicodeValidationResult;
    };
  } {
    const validator = new UnicodeValidator();
    
    // Validate all fields
    const actionValidation = validator.validateShortcutText(action, 'action');
    const descriptionValidation = validator.validateShortcutText(description, 'description');
    const keyValidation = validator.validateKeyCombination(keyCombo, platform);
    const iconValidation = icon ? validator.validateShortcutText(icon, 'icon') : undefined;
    
    // Check if all valid
    const allValid = [
      actionValidation,
      descriptionValidation,
      keyValidation,
      ...(iconValidation ? [iconValidation] : [])
    ].every(v => v.isValid);
    
    // Create shortcut object
    const shortcut = {
      id,
      action: actionValidation.normalizedText || action,
      description: descriptionValidation.normalizedText || description,
      default: {
        primary: keyValidation.normalizedText || keyCombo,
        unicodePrimary: this.getUnicodeKeyDisplay(keyCombo, platform)
      },
      icon: iconValidation?.normalizedText || icon,
      enabled: allValid,
      unicodeMetadata: {
        validatedAt: new Date().toISOString(),
        validationResults: {
          action: actionValidation.metadata,
          description: descriptionValidation.metadata,
          key: keyValidation.metadata,
          ...(iconValidation && { icon: iconValidation.metadata })
        }
      }
    };
    
    return {
      shortcut,
      validation: {
        action: actionValidation,
        description: descriptionValidation,
        key: keyValidation,
        icon: iconValidation
      }
    };
  },
  
  /**
   * Get Unicode display for key combination
   */
  getUnicodeKeyDisplay(keyCombo: string, platform: 'windows' | 'macOS' | 'linux'): string {
    const platformSymbols: Record<string, Record<string, string>> = {
      macOS: {
        'Ctrl': '⌃',
        'Cmd': '⌘',
        'Alt': '⌥',
        'Shift': '⇧',
        'Enter': '↵',
        'Tab': '⇥',
        'Esc': '⎋',
        'Backspace': '⌫',
        'Delete': '⌦',
        'Space': '␣',
        'ArrowUp': '↑',
        'ArrowDown': '↓',
        'ArrowLeft': '←',
        'ArrowRight': '→'
      },
      windows: {
        'Ctrl': 'Ctrl',
        'Win': 'Win',
        'Alt': 'Alt',
        'Shift': 'Shift'
      },
      linux: {
        'Ctrl': 'Ctrl',
        'Super': 'Super',
        'Alt': 'Alt',
        'Shift': 'Shift'
      }
    };
    
    const symbols = platformSymbols[platform] || platformSymbols.windows;
    const parts = keyCombo.split('+');
    
    return parts
      .map(part => symbols[part] || part)
      .join(platform === 'macOS' ? '' : '+');
  },
  
  /**
   * Generate a unique ID with Unicode awareness
   */
  generateId(baseName: string): string {
    const validator = new UnicodeValidator();
    const normalized = validator.normalizeForStorage(baseName, 'action');
    
    // Remove non-alphanumeric, convert to lowercase, replace spaces
    let id = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    
    // Add timestamp for uniqueness
    const timestamp = Date.now().toString(36);
    id = `${id}.${timestamp}`;
    
    return id;
  }
};
