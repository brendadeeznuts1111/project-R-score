import { GraphemeClusterer, GraphemeUtils } from '../unicode/grapheme';
import { UnicodeValidator } from '../unicode/validation';

export interface UnicodeEnhancedShortcutConfig {
  id: string;
  action: string;
  description: string;
  unicodeDescription?: {
    raw: string;
    normalized: string;
    clusters: string[];
    visualWidth: number;
    hasComplexUnicode: boolean;
    emojiCount: number;
  };
  displayName?: {
    raw: string;
    truncated?: string;
    aligned?: string;
  };
  category: string;
  icon?: string; // Unicode emoji or symbol
  iconInfo?: {
    raw: string;
    normalized: string;
    presentation: 'text' | 'emoji' | 'unknown';
    skinTone: string | null;
    isComplex: boolean;
  };
  default: {
    primary: string;
    secondary?: string;
    macOS?: string;
    linux?: string;
    unicodePrimary?: string; // For displaying keys with symbols
    unicodeModifiers?: Record<string, string>; // Platform-specific modifier symbols
  };
  enabled: boolean;
  scope: 'global' | 'panel' | 'component';
  requiresConfirmation?: boolean;
  condition?: () => boolean;
  
  // Unicode metadata
  unicodeMetadata?: {
    createdAt: Date;
    lastNormalized: Date;
    normalizationVersion: string;
    graphemeVersion: string;
  };
}

export class UnicodeEnhancedShortcutManager {
  private clusterer: GraphemeClusterer;
  private validator: UnicodeValidator;
  private shortcuts: Map<string, UnicodeEnhancedShortcutConfig> = new Map();
  
  constructor() {
    this.clusterer = new GraphemeClusterer();
    this.validator = new UnicodeValidator();
  }
  
  /**
   * Create a new shortcut with Unicode support
   */
  createShortcut(config: Omit<UnicodeEnhancedShortcutConfig, 'unicodeDescription' | 'displayName' | 'iconInfo' | 'unicodeMetadata'>): UnicodeEnhancedShortcutConfig {
    const enhancedConfig: UnicodeEnhancedShortcutConfig = {
      ...config,
      unicodeDescription: this.analyzeUnicodeText(config.description),
      displayName: this.createDisplayName(config.action, config.description),
      iconInfo: config.icon ? this.analyzeIcon(config.icon) : undefined,
      unicodeMetadata: {
        createdAt: new Date(),
        lastNormalized: new Date(),
        normalizationVersion: '1.0.0',
        graphemeVersion: 'UAX#29'
      }
    };
    
    // Process key combinations for Unicode display
    enhancedConfig.default.unicodePrimary = this.getUnicodeKeyDisplay(enhancedConfig.default.primary);
    
    this.shortcuts.set(config.id, enhancedConfig);
    return enhancedConfig;
  }
  
  /**
   * Analyze Unicode text for display and storage
   */
  private analyzeUnicodeText(text: string): UnicodeEnhancedShortcutConfig['unicodeDescription'] {
    const clusters = this.clusterer.getClusters(text);
    const visualWidth = this.clusterer.getVisualWidth(text);
    
    return {
      raw: text,
      normalized: GraphemeUtils.normalizeEmoji(text),
      clusters,
      visualWidth,
      hasComplexUnicode: GraphemeUtils.hasComplexUnicode(text),
      emojiCount: GraphemeUtils.countEmojis(text)
    };
  }
  
  /**
   * Create a display name with proper truncation
   */
  private createDisplayName(action: string, description: string): UnicodeEnhancedShortcutConfig['displayName'] {
    const maxLength = 30;
    const truncated = GraphemeUtils.safeTruncate(description, maxLength);
    
    return {
      raw: description,
      truncated: truncated !== description ? truncated : undefined,
      aligned: this.clusterer.padToWidth(description, 40, 'left')
    };
  }
  
  /**
   * Analyze icon Unicode properties
   */
  private analyzeIcon(icon: string): UnicodeEnhancedShortcutConfig['iconInfo'] {
    const clusters = this.clusterer.getClusters(icon);
    const mainCluster = clusters[0] || '';
    
    return {
      raw: icon,
      normalized: this.clusterer.normalizeToEmojiPresentation(mainCluster),
      presentation: this.clusterer.getEmojiPresentation(mainCluster),
      skinTone: this.clusterer.getSkinTone(mainCluster),
      isComplex: clusters.length > 1 || mainCluster.length > 2
    };
  }
  
  /**
   * Convert key combination to Unicode symbols
   */
  private getUnicodeKeyDisplay(keyCombo: string): string {
    const modifiers: Record<string, string> = {
      'Ctrl': '⌃',   // Control
      'Control': '⌃',
      'Cmd': '⌘',    // Command
      'Meta': '⌘',
      'Alt': '⌥',    // Option/Alt
      'Option': '⌥',
      'Shift': '⇧',
      'Win': '⊞',    // Windows
      'Super': '⊞',
      'Enter': '↵',
      'Return': '↵',
      'Tab': '⇥',
      'Escape': '⎋',
      'Delete': '⌫',
      'Backspace': '⌫',
      'Space': '␣',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'PageUp': '⇞',
      'PageDown': '⇟',
      'Home': '↖',
      'End': '↘',
      'Insert': '⎀',
      'CapsLock': '⇪',
      'NumLock': '⇭',
      'ScrollLock': '⤓',
      'PrintScreen': '⎙',
      'Pause': '⎉',
      'Break': '⎊'
    };
    
    // Split and replace
    const parts = keyCombo.split('+');
    const unicodeParts = parts.map(part => {
      // Check for function keys
      if (part.match(/^F[1-9][0-9]?$/)) {
        return part; // Keep F1, F2, etc.
      }
      
      // Check for single letters/numbers
      if (part.length === 1 && /[A-Za-z0-9]/.test(part)) {
        return part.toUpperCase();
      }
      
      // Check for modifier mappings
      if (modifiers[part]) {
        return modifiers[part];
      }
      
      // Return original if no mapping
      return part;
    });
    
    return unicodeParts.join('');
  }
  
  /**
   * Get platform-specific key display
   */
  getPlatformKeyDisplay(keyCombo: string, platform: 'windows' | 'macOS' | 'linux'): string {
    const platformModifiers: Record<string, Record<string, string>> = {
      macOS: {
        'Ctrl': '⌃',
        'Cmd': '⌘',
        'Alt': '⌥',
        'Shift': '⇧'
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
    
    const parts = keyCombo.split('+');
    const platformParts = parts.map(part => {
      return platformModifiers[platform]?.[part] || part;
    });
    
    return platformParts.join(platform === 'macOS' ? '' : '+');
  }
  
  /**
   * Validate Unicode text for shortcut fields
   */
  validateUnicodeText(text: string, field: 'action' | 'description' | 'icon'): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for control characters
    if (/[\x00-\x1F\x7F-\x9F]/.test(text)) {
      errors.push('Control characters are not allowed');
    }
    
    // Check length by grapheme clusters
    const clusters = this.clusterer.getClusters(text);
    const visualWidth = this.clusterer.getVisualWidth(text);
    
    if (field === 'action') {
      if (clusters.length > 50) {
        errors.push(`Action too long (${clusters.length} graphemes, max 50)`);
      }
    }
    
    if (field === 'description') {
      if (visualWidth > 100) {
        warnings.push(`Description visual width ${visualWidth} may cause display issues`);
        suggestions.push('Consider shortening the description');
      }
    }
    
    if (field === 'icon') {
      if (clusters.length > 1) {
        warnings.push('Icon should be a single grapheme cluster');
      }
      
      // Check if it's a valid emoji/symbol
      const isEmoji = this.clusterer.isEmoji(text);
      const presentation = this.clusterer.getEmojiPresentation(text);
      
      if (!isEmoji && presentation === 'unknown') {
        warnings.push('Icon may not display consistently across platforms');
      }
    }
    
    // Check for mixed scripts (security consideration)
    const scripts = this.detectScripts(text);
    if (scripts.size > 1) {
      warnings.push('Text contains mixed scripts which may cause display issues');
    }
    
    // Check for bidirectional text
    if (/[\u0600-\u06FF\u0590-\u05FF\u0700-\u074F]/.test(text)) {
      warnings.push('Text contains right-to-left characters');
      suggestions.push('Use Unicode directional formatting characters if needed');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  /**
   * Detect Unicode scripts in text
   */
  private detectScripts(text: string): Set<string> {
    const scripts = new Set<string>();
    
    // Simplified script detection
    const scriptRanges: Array<[number, number, string]> = [
      [0x0041, 0x005A, 'Latin'], // A-Z
      [0x0061, 0x007A, 'Latin'], // a-z
      [0x0400, 0x04FF, 'Cyrillic'],
      [0x0370, 0x03FF, 'Greek'],
      [0x0600, 0x06FF, 'Arabic'],
      [0x0590, 0x05FF, 'Hebrew'],
      [0x4E00, 0x9FFF, 'CJK Unified Ideographs'],
      [0x3040, 0x309F, 'Hiragana'],
      [0x30A0, 0x30FF, 'Katakana'],
      [0xAC00, 0xD7A3, 'Hangul'],
      [0x0900, 0x097F, 'Devanagari']
    ];
    
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      
      for (const [start, end, script] of scriptRanges) {
        if (codePoint >= start && codePoint <= end) {
          scripts.add(script);
          break;
        }
      }
      
      if (codePoint > 0xFFFF) {
        i++; // Skip surrogate pair
      }
    }
    
    // Check for emoji script
    if (GraphemeUtils.countEmojis(text) > 0) {
      scripts.add('Emoji');
    }
    
    return scripts;
  }
  
  /**
   * Normalize shortcut for storage
   */
  normalizeShortcut(shortcut: UnicodeEnhancedShortcutConfig): UnicodeEnhancedShortcutConfig {
    const normalized = { ...shortcut };
    
    // Normalize description
    if (normalized.unicodeDescription) {
      normalized.unicodeDescription.normalized = GraphemeUtils.normalizeEmoji(
        normalized.unicodeDescription.raw
      );
    }
    
    // Normalize icon
    if (normalized.iconInfo) {
      normalized.iconInfo.normalized = this.clusterer.normalizeToEmojiPresentation(
        normalized.iconInfo.raw
      );
    }
    
    // Update metadata
    if (normalized.unicodeMetadata) {
      normalized.unicodeMetadata.lastNormalized = new Date();
    }
    
    return normalized;
  }
  
  /**
   * Get display text with proper Unicode handling
   */
  getDisplayText(
    text: string,
    options: {
      maxClusters?: number;
      ellipsis?: string;
      align?: 'left' | 'right' | 'center';
      width?: number;
      preserveEmoji?: boolean;
    } = {}
  ): string {
    const {
      maxClusters,
      ellipsis = '…',
      align = 'left',
      width,
      preserveEmoji = true
    } = options;
    
    let displayText = text;
    
    // Normalize emoji if not preserving
    if (!preserveEmoji) {
      displayText = this.clusterer.normalizeToTextPresentation(displayText);
    }
    
    // Truncate if needed
    if (maxClusters !== undefined) {
      displayText = this.clusterer.truncate(displayText, maxClusters, ellipsis);
    }
    
    // Align if width specified
    if (width !== undefined) {
      displayText = this.clusterer.padToWidth(displayText, width, align);
    }
    
    return displayText;
  }
  
  /**
   * Create keyboard visualization with proper Unicode
   */
  createKeyboardVisualization(shortcuts: UnicodeEnhancedShortcutConfig[]): {
    layout: Array<Array<{
      key: string;
      display: string;
      shortcuts: string[];
      visualWidth: number;
      isEmoji: boolean;
    }>>;
    legend: Record<string, string>;
  } {
    // Standard QWERTY layout with Unicode symbols
    const layout = [
      // Function keys
      ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
      // Number row
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
      // First letter row
      ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
      // Second letter row
      ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
      // Third letter row
      ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
      // Bottom row
      ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Ctrl']
    ];
    
    const unicodeMap: Record<string, string> = {
      'Esc': '⎋',
      'Tab': '⇥',
      'CapsLock': '⇪',
      'Shift': '⇧',
      'Ctrl': '⌃',
      'Win': '⊞',
      'Alt': '⌥',
      'Enter': '↵',
      'Backspace': '⌫',
      'Space': '␣'
    };
    
    const result: Array<Array<any>> = [];
    
    for (const row of layout) {
      const resultRow: any[] = [];
      
      for (const key of row) {
        const unicodeKey = unicodeMap[key] || key;
        const keyShortcuts = shortcuts.filter(s => 
          s.default.primary.includes(key) || 
          s.default.secondary?.includes(key)
        );
        
        resultRow.push({
          key,
          display: unicodeKey,
          shortcuts: keyShortcuts.map(s => s.id),
          visualWidth: this.clusterer.getVisualWidth(unicodeKey),
          isEmoji: this.clusterer.isEmoji(unicodeKey)
        });
      }
      
      result.push(resultRow);
    }
    
    return {
      layout: result,
      legend: unicodeMap
    };
  }
  
  /**
   * Get all shortcuts
   */
  getAllShortcuts(): UnicodeEnhancedShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }
  
  /**
   * Get shortcut by ID
   */
  getShortcut(id: string): UnicodeEnhancedShortcutConfig | undefined {
    return this.shortcuts.get(id);
  }
  
  /**
   * Update shortcut
   */
  updateShortcut(id: string, updates: Partial<UnicodeEnhancedShortcutConfig>): boolean {
    const existing = this.shortcuts.get(id);
    if (!existing) return false;
    
    const updated = { ...existing, ...updates };
    
    // Re-analyze Unicode properties if text fields changed
    if (updates.description) {
      updated.unicodeDescription = this.analyzeUnicodeText(updates.description);
      updated.displayName = this.createDisplayName(updated.action, updates.description);
    }
    
    if (updates.icon) {
      updated.iconInfo = this.analyzeIcon(updates.icon);
    }
    
    if (updates.default?.primary) {
      updated.default.unicodePrimary = this.getUnicodeKeyDisplay(updates.default.primary);
    }
    
    // Update metadata
    if (updated.unicodeMetadata) {
      updated.unicodeMetadata.lastNormalized = new Date();
    }
    
    this.shortcuts.set(id, updated);
    return true;
  }
  
  /**
   * Delete shortcut
   */
  deleteShortcut(id: string): boolean {
    return this.shortcuts.delete(id);
  }
  
  /**
   * Search shortcuts by Unicode-aware criteria
   */
  searchShortcuts(query: string, options: {
    searchIn?: ('action' | 'description' | 'icon')[];
    includeUnicode?: boolean;
    caseSensitive?: boolean;
  } = {}): UnicodeEnhancedShortcutConfig[] {
    const {
      searchIn = ['action', 'description'],
      includeUnicode = true,
      caseSensitive = false
    } = options;
    
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    return this.getAllShortcuts().filter(shortcut => {
      // Search in specified fields
      for (const field of searchIn) {
        let searchText = '';
        
        switch (field) {
          case 'action':
            searchText = shortcut.action;
            break;
          case 'description':
            searchText = shortcut.description;
            if (includeUnicode && shortcut.unicodeDescription) {
              searchText += ' ' + shortcut.unicodeDescription.normalized;
            }
            break;
          case 'icon':
            searchText = shortcut.icon || '';
            break;
        }
        
        if (!caseSensitive) {
          searchText = searchText.toLowerCase();
        }
        
        if (searchText.includes(searchQuery)) {
          return true;
        }
      }
      
      return false;
    });
  }
  
  /**
   * Get Unicode statistics
   */
  getUnicodeStatistics(): {
    totalShortcuts: number;
    withEmojis: number;
    withComplexUnicode: number;
    averageVisualWidth: number;
    scriptDistribution: Record<string, number>;
    emojiFrequency: Record<string, number>;
  } {
    const shortcuts = this.getAllShortcuts();
    const scriptDistribution: Record<string, number> = {};
    const emojiFrequency: Record<string, number> = {};
    
    let totalVisualWidth = 0;
    let withEmojis = 0;
    let withComplexUnicode = 0;
    
    for (const shortcut of shortcuts) {
      // Analyze description
      if (shortcut.unicodeDescription) {
        totalVisualWidth += shortcut.unicodeDescription.visualWidth;
        
        if (shortcut.unicodeDescription.emojiCount > 0) {
          withEmojis++;
        }
        
        if (shortcut.unicodeDescription.hasComplexUnicode) {
          withComplexUnicode++;
        }
        
        // Extract emojis for frequency
        const emojis = GraphemeUtils.extractEmojis(shortcut.description);
        for (const emoji of emojis) {
          emojiFrequency[emoji] = (emojiFrequency[emoji] || 0) + 1;
        }
      }
      
      // Analyze icon
      if (shortcut.icon) {
        const scripts = this.detectScripts(shortcut.icon);
        for (const script of scripts) {
          scriptDistribution[script] = (scriptDistribution[script] || 0) + 1;
        }
      }
    }
    
    return {
      totalShortcuts: shortcuts.length,
      withEmojis,
      withComplexUnicode,
      averageVisualWidth: shortcuts.length > 0 ? totalVisualWidth / shortcuts.length : 0,
      scriptDistribution,
      emojiFrequency
    };
  }
}
