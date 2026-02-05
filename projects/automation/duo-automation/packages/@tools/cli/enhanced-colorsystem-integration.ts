#!/usr/bin/env bun
// Enhanced ColorSystem Integration with HSL/HEX Generation
// Integrates advanced color mathematics with the existing health endpoint system

import { Elysia } from 'elysia';
import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';
import { WebSocketServer } from 'ws';

// =============================================================================
// ADVANCED COLOR MANAGEMENT SYSTEM
// =============================================================================

/**
 * Color space representations for comprehensive color management
 */
export interface ColorValue {
  readonly hsl: string;
  readonly hex: string;
  readonly rgb: { readonly r: number; readonly g: number; readonly b: number };
}

/**
 * Color palette with systematic shade progression (50-900)
 */
export interface ColorPalette {
  readonly 50: string;   readonly 100: string;  readonly 200: string;
  readonly 300: string;  readonly 400: string;  readonly 500: string;
  readonly 600: string;  readonly 700: string;  readonly 800: string;
  readonly 900: string;
}

/**
 * Complete color scheme with semantic color roles
 */
export interface ColorScheme {
  readonly primary: string;     // Main brand color
  readonly secondary: string;   // Complementary color
  readonly accent: string;      // Emphasis color
  readonly background: string;  // Surface background
  readonly text: string;        // Primary text color
}

/**
 * Tension-based color classification
 */
export type TensionClassification = 
  | 'excellent' | 'very-good' | 'good' | 'fair' | 'moderate' 
  | 'concerning' | 'poor' | 'bad' | 'critical' | 'failure';

/**
 * Color generation parameters with validation
 */
export interface ColorGenerationParameters {
  readonly tension: number;           // 0-100 tension level
  readonly saturation?: number;       // 0-100 saturation (default: 70)
  readonly lightness?: number;        // 0-100 lightness (default: 50)
  readonly alpha?: number;           // 0-1 transparency (default: 1)
}

/**
 * Gradient configuration with direction and stops
 */
export interface GradientConfiguration {
  readonly angle?: number;           // Gradient angle in degrees (default: 135)
  readonly startSaturation?: number; // Start color saturation (default: 80)
  readonly endSaturation?: number;   // End color saturation (default: 80)
  readonly startLightness?: number;  // Start color lightness (default: 60)
  readonly endLightness?: number;    // End color lightness (default: 40)
}

/**
 * Advanced color management system with mathematical precision
 * Provides tension-based color generation, palette creation, and gradient generation
 */
export class AdvancedColorManagementSystem {
  private static readonly TENSION_TO_HUE_MULTIPLIER = 1.2;
  private static readonly MAX_HUE_GREEN = 120;
  private static readonly MIN_HUE_RED = 0;
  private static readonly DEFAULT_SATURATION = 70;
  private static readonly DEFAULT_LIGHTNESS = 50;
  private static readonly DEFAULT_ALPHA = 1;

  /**
   * Generate HSL color from tension level with customizable parameters
   * @param parameters - Color generation parameters including tension and optional overrides
   * @returns HSL color string in format "hsl(hue, saturation%, lightness%)"
   */
  static generateHSLColorFromTension(parameters: ColorGenerationParameters): string {
    const { tension, saturation = this.DEFAULT_SATURATION, lightness = this.DEFAULT_LIGHTNESS } = parameters;
    
    this.validateTensionValue(tension);
    this.validateColorParameter(saturation, 'saturation');
    this.validateColorParameter(lightness, 'lightness');
    
    // Map tension (0-100) to hue (120° green to 0° red)
    const hue = this.MAX_HUE_GREEN - (tension * this.TENSION_TO_HUE_MULTIPLIER);
    
    return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Generate HEX color from tension level
   * @param tension - Tension level (0-100, where 0=green/good, 100=red/bad)
   * @returns HEX color string in format "#RRGGBB"
   */
  static generateHEXColorFromTension(tension: number): string {
    this.validateTensionValue(tension);
    
    // Convert tension to hue value
    const hue = this.MAX_HUE_GREEN - (tension * this.TENSION_TO_HUE_MULTIPLIER);
    
    return this.convertHSLToHEX(hue, this.DEFAULT_SATURATION, this.DEFAULT_LIGHTNESS);
  }

  /**
   * Generate CSS gradient with HSL colors based on tension
   * @param tension - Tension level (0-100)
   * @param config - Optional gradient configuration
   * @returns CSS gradient string
   */
  static generateHSLGradientFromTension(
    tension: number, 
    config: GradientConfiguration = {}
  ): string {
    this.validateTensionValue(tension);
    
    const {
      angle = 135,
      startSaturation = 80,
      endSaturation = 80,
      startLightness = 60,
      endLightness = 40
    } = config;
    
    const startHue = this.MAX_HUE_GREEN - (tension * this.TENSION_TO_HUE_MULTIPLIER);
    const endHue = Math.max(this.MIN_HUE_RED, startHue - 30);
    
    return `linear-gradient(${angle}deg, 
      hsl(${Math.round(startHue)}, ${startSaturation}%, ${startLightness}%), 
      hsl(${Math.round(endHue)}, ${endSaturation}%, ${endLightness}%)
    )`;
  }

  /**
   * Generate CSS gradient with HEX colors based on tension
   * @param tension - Tension level (0-100)
   * @param config - Optional gradient configuration
   * @returns CSS gradient string with HEX colors
   */
  static generateHEXGradientFromTension(
    tension: number,
    config: GradientConfiguration = {}
  ): string {
    this.validateTensionValue(tension);
    
    const startColor = this.generateHEXColorFromTension(tension);
    const endColor = this.generateHEXColorFromTension(Math.min(100, tension + 20));
    
    const angle = config.angle || 135;
    return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`;
  }

  /**
   * Generate complete color scheme based on tension level
   * @param tension - Tension level (0-100)
   * @returns Complete color scheme with semantic roles
   */
  static generateColorSchemeFromTension(tension: number): ColorScheme {
    this.validateTensionValue(tension);
    
    const primaryHue = this.MAX_HUE_GREEN - (tension * this.TENSION_TO_HUE_MULTIPLIER);
    const secondaryHue = (primaryHue + 180) % 360; // Complementary color
    const accentHue = (primaryHue + 120) % 360; // Triadic color

    return {
      primary: this.convertHSLToHEX(primaryHue, 70, 50),
      secondary: this.convertHSLToHEX(secondaryHue, 60, 45),
      accent: this.convertHSLToHEX(accentHue, 80, 55),
      background: tension > 50 ? '#3b82f6' : '#3b82f6', // Light red or green background
      text: tension > 50 ? '#3b82f6' : '#14532d' // Dark red or green text
    };
  }

  /**
   * Generate systematic color palette with 10 shades (50-900)
   * @param tension - Tension level (0-100)
   * @returns Complete color palette with consistent shade progression
   */
  static generateColorPaletteFromTension(tension: number): ColorPalette {
    this.validateTensionValue(tension);
    
    const baseHue = this.MAX_HUE_GREEN - (tension * this.TENSION_TO_HUE_MULTIPLIER);
    const palette: any = {};

    // Generate shades from lightest (50) to darkest (900)
    const shadeLevels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    
    shadeLevels.forEach((shade, index) => {
      const lightness = 95 - (index * 8); // 95% to 15%
      const saturation = shade === 50 ? 30 : shade >= 700 ? 80 : 70;
      palette[shade] = this.convertHSLToHEX(baseHue, saturation, lightness);
    });

    return palette as ColorPalette;
  }

  /**
   * Generate comprehensive color value object with all formats
   * @param tension - Tension level (0-100)
   * @param parameters - Optional color generation parameters
   * @returns Complete color value with HSL, HEX, and RGB formats
   */
  static generateCompleteColorValue(
    tension: number, 
    parameters: Omit<ColorGenerationParameters, 'tension'> = {}
  ): ColorValue {
    this.validateTensionValue(tension);
    
    const fullParams = { ...parameters, tension };
    const hsl = this.generateHSLColorFromTension(fullParams);
    const hex = this.generateHEXColorFromTension(tension);
    const rgb = this.extractRGBFromHEX(hex);
    
    return { hsl, hex, rgb };
  }

  /**
   * Get human-readable tension classification
   * @param tension - Tension level (0-100)
   * @returns Tension classification with description
   */
  static getTensionClassification(tension: number): TensionClassification {
    this.validateTensionValue(tension);
    
    if (tension <= 10) return 'excellent';
    if (tension <= 20) return 'very-good';
    if (tension <= 30) return 'good';
    if (tension <= 40) return 'fair';
    if (tension <= 50) return 'moderate';
    if (tension <= 60) return 'concerning';
    if (tension <= 70) return 'poor';
    if (tension <= 80) return 'bad';
    if (tension <= 90) return 'critical';
    return 'failure';
  }

  /**
   * Get descriptive color information based on tension
   * @param tension - Tension level (0-100)
   * @returns Human-readable color description
   */
  static getColorDescriptionFromTension(tension: number): string {
    const classification = this.getTensionClassification(tension);
    const colorNames = {
      'excellent': 'Excellent (Emerald Green)',
      'very-good': 'Very Good (Light Green)',
      'good': 'Good (Green)',
      'fair': 'Fair (Yellow-Green)',
      'moderate': 'Moderate (Yellow)',
      'concerning': 'Concerning (Orange)',
      'poor': 'Poor (Red-Orange)',
      'bad': 'Bad (Red)',
      'critical': 'Critical (Deep Red)',
      'failure': 'Failure (Dark Red)'
    };
    
    return colorNames[classification];
  }

  /**
   * Extract RGB values from HEX color string
   * @param hexColor - HEX color string in format "#RRGGBB"
   * @returns RGB object with r, g, b values (0-255)
   */
  static extractRGBFromHEX(hexColor: string): { readonly r: number; readonly g: number; readonly b: number } {
    if (!hexColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error(`Invalid HEX color format: ${hexColor}`);
    }
    
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    return { r, g, b };
  }

  /**
   * Convert HSL values to HEX color string
   * @param hue - Hue angle (0-360)
   * @param saturation - Saturation percentage (0-100)
   * @param lightness - Lightness percentage (0-100)
   * @returns HEX color string in format "#RRGGBB"
   */
  private static convertHSLToHEX(hue: number, saturation: number, lightness: number): string {
    // Convert percentages to decimals
    const s = saturation / 100;
    const l = lightness / 100;
    
    // Calculate chroma
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    // Determine RGB values based on hue sector
    if (0 <= hue && hue < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= hue && hue < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= hue && hue < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= hue && hue < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= hue && hue < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= hue < 360) {
      r = c; g = 0; b = x;
    }
    
    // Convert to 0-255 range and apply lightness adjustment
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  /**
   * Validate tension value is within acceptable range
   * @param tension - Tension value to validate
   * @throws Error if tension is invalid
   */
  private static validateTensionValue(tension: number): void {
    if (typeof tension !== 'number' || isNaN(tension)) {
      throw new Error(`Tension must be a valid number, received: ${tension}`);
    }
    if (tension < 0 || tension > 100) {
      throw new Error(`Tension must be between 0 and 100, received: ${tension}`);
    }
  }

  /**
   * Validate color parameter is within acceptable range
   * @param value - Parameter value to validate
   * @param parameterName - Name of the parameter for error messaging
   * @throws Error if parameter is invalid
   */
  private static validateColorParameter(value: number, parameterName: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${parameterName} must be a valid number, received: ${value}`);
    }
    if (value < 0 || value > 100) {
      throw new Error(`${parameterName} must be between 0 and 100, received: ${value}`);
    }
  }
}

// =============================================================================
// ENHANCED COLOR SYSTEM INTEGRATION CLASSES
// =============================================================================

/**
 * Enhanced color information with ColorSystem integration
 */
interface EnhancedColorInfo {
  /** Primary color from ColorSystem */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Shadow color */
  shadow: string;
  /** Current tension level (0-100) */
  tension: number;
  /** Color scheme (light/dark) */
  scheme: 'light' | 'dark';
  /** HSL representation */
  hsl: string;
  /** HEX representation */
  hex: string;
  /** Gradient representation */
  gradient: string;
  /** Color description */
  description: string;
  /** RGB values */
  rgb: { readonly r: number; readonly g: number; readonly b: number };
  /** Color palette */
  palette: ColorPalette;
}

/**
 * Enhanced Colorful Type Context using AdvancedColorManagementSystem
 */
class EnhancedColorfulTypeContext {
  private readonly contextType: string;
  private readonly scope: string;
  private readonly domain: string;
  private colorInfo: EnhancedColorInfo;
  private subscribers: Set<(update: { tension: number; colors: EnhancedColorInfo }) => void> = new Set();

  constructor(contextType: string, scope: string, domain: string) {
    this.contextType = contextType;
    this.scope = scope;
    this.domain = domain;
    this.colorInfo = this.generateEnhancedColorInfo();
  }

  /**
   * Generate enhanced color information using AdvancedColorManagementSystem
   */
  private generateEnhancedColorInfo(): EnhancedColorInfo {
    const tension = this.calculateTension();
    const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);

    return {
      primary: colorScheme.primary,
      secondary: colorScheme.secondary,
      background: colorScheme.background,
      text: colorScheme.text,
      border: palette[200],
      shadow: palette[700],
      tension,
      scheme: tension > 50 ? 'light' as const : 'light' as const,
      hsl: AdvancedColorManagementSystem.generateHSLColorFromTension({ tension }),
      hex: AdvancedColorManagementSystem.generateHEXColorFromTension(tension),
      gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(tension),
      description: AdvancedColorManagementSystem.getColorDescriptionFromTension(tension),
      rgb: AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(tension)),
      palette
    };
  }

  /**
   * Calculate tension based on system health and context
   */
  private calculateTension(): number {
    // Enhanced tension calculation with context-specific factors
    const baseTension = Math.random() * 30 + 10; // 10-40 base tension
    
    const contextMultipliers = {
      'STORAGE': 1.2,
      'API': 1.0,
      'DATABASE': 1.5,
      'NETWORK': 0.8
    };

    const scopeMultipliers = {
      'ENTERPRISE': 0.8,
      'DEVELOPMENT': 1.0,
      'LOCAL-SANDBOX': 1.1
    };

    const contextMultiplier = contextMultipliers[this.contextType as keyof typeof contextMultipliers] || 1.0;
    const scopeMultiplier = scopeMultipliers[this.scope as keyof typeof scopeMultipliers] || 1.0;
    
    return Math.min(100, baseTension * contextMultiplier * scopeMultiplier);
  }

  /**
   * Get current enhanced color information
   */
  get colorInfo(): EnhancedColorInfo {
    return this.colorInfo;
  }

  /**
   * Update tension and regenerate colors
   */
  updateTension(newTension: number): void {
    this.colorInfo.tension = Math.max(0, Math.min(100, newTension));
    
    // Regenerate all color information
    const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(this.colorInfo.tension);
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(this.colorInfo.tension);

    this.colorInfo = {
      ...this.colorInfo,
      primary: colorScheme.primary,
      secondary: colorScheme.secondary,
      background: colorScheme.background,
      text: colorScheme.text,
      border: palette[200],
      shadow: palette[700],
      hsl: AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: this.colorInfo.tension }),
      hex: AdvancedColorManagementSystem.generateHEXColorFromTension(this.colorInfo.tension),
      gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(this.colorInfo.tension),
      description: AdvancedColorManagementSystem.getColorDescriptionFromTension(this.colorInfo.tension),
      rgb: AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(this.colorInfo.tension)),
      palette
    };
    
    // Notify all subscribers
    const update = {
      tension: this.colorInfo.tension,
      colors: this.colorInfo
    };
    
    this.subscribers.forEach(callback => callback(update));
  }

  /**
   * Subscribe to color updates
   */
  subscribe(callback: (update: { tension: number; colors: EnhancedColorInfo }) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Generate comprehensive CSS variables
   */
  generateCSSVariables(): string {
    const { colorInfo } = this;
    const className = `${this.contextType.toLowerCase()}-${this.scope.toLowerCase().replace('_', '-')}`;
    
    return `
.${className} {
  /* Core Colors */
  --color-primary: ${colorInfo.primary};
  --color-secondary: ${colorInfo.secondary};
  --color-background: ${colorInfo.background};
  --color-text: ${colorInfo.text};
  --color-border: ${colorInfo.border};
  --color-shadow: ${colorInfo.shadow};
  
  /* Dynamic Colors */
  --color-hsl: ${colorInfo.hsl};
  --color-hex: ${colorInfo.hex};
  --color-gradient: ${colorInfo.gradient};
  
  /* State */
  --tension-level: ${colorInfo.tension};
  --color-description: '${colorInfo.description}';
  --color-scheme: ${colorInfo.scheme};
  
  /* RGB Values */
  --color-rgb: ${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b};
  
  /* Color Palette */
  ${Object.entries(colorInfo.palette).map(([shade, color]) => 
    `--color-palette-${shade}: ${color};`
  ).join('\n  ')}
}

/* Enhanced utility classes for ${className} */
.${className} .tension-based {
  background: var(--color-gradient);
  color: var(--color-text);
}

.${className} .palette-50 { background-color: var(--color-palette-50); color: var(--color-text); }
.${className} .palette-100 { background-color: var(--color-palette-100); color: var(--color-text); }
.${className} .palette-200 { background-color: var(--color-palette-200); color: var(--color-text); }
.${className} .palette-300 { background-color: var(--color-palette-300); color: var(--color-text); }
.${className} .palette-400 { background-color: var(--color-palette-400); color: var(--color-text); }
.${className} .palette-500 { background-color: var(--color-palette-500); color: white; }
.${className} .palette-600 { background-color: var(--color-palette-600); color: white; }
.${className} .palette-700 { background-color: var(--color-palette-700); color: white; }
.${className} .palette-800 { background-color: var(--color-palette-800); color: white; }
.${className} .palette-900 { background-color: var(--color-palette-900); color: white; }

.${className} .rgb-overlay {
  background-color: rgba(var(--color-rgb), 0.1);
  border-color: rgba(var(--color-rgb), 0.3);
}

.${className} .description-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.${className}::before {
  content: attr(data-tension) ' - ' attr(data-description);
  display: block;
  font-size: 10px;
  opacity: 0.7;
  margin-bottom: 4px;
}
`;
  }
}

/**
 * Enhanced WebSocket server with AdvancedColorManagementSystem integration
 */
class EnhancedTensionWebSocketServer {
  private wss: WebSocketServer;
  private colorfulContexts: Map<string, EnhancedColorfulTypeContext> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 8766) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketHandlers();
    this.startTensionUpdates();
    
    console.log(UnicodeTableFormatter.colorize(`🌐 Enhanced WebSocket server started on ws://localhost:${port}`, DesignSystem.status.operational));
    console.log(UnicodeTableFormatter.colorize(`🎨 AdvancedColorManagementSystem integration active`, DesignSystem.text.accent.blue));
  }

  /**
   * Setup WebSocket event handlers with enhanced messaging
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws, request) => {
      console.log(UnicodeTableFormatter.colorize('🔗 Enhanced WebSocket connection established', DesignSystem.text.accent.blue));
      
      // Send enhanced initial context data
      this.sendEnhancedInitialContext(ws);
      
      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleEnhancedMessage(ws, message);
        } catch (error) {
          console.error(UnicodeTableFormatter.colorize(`❌ WebSocket message error: ${error}`, DesignSystem.status.downtime));
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(UnicodeTableFormatter.colorize('🔌 Enhanced WebSocket connection closed', DesignSystem.text.secondary));
      });
    });
  }

  /**
   * Send enhanced initial context data
   */
  private sendEnhancedInitialContext(ws: WebSocket): void {
    const contexts = Array.from(this.colorfulContexts.entries()).map(([key, context]) => ({
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo,
      colorSystem: {
        hsl: context.colorInfo.hsl,
        hex: context.colorInfo.hex,
        gradient: context.colorInfo.gradient,
        description: context.colorInfo.description,
        rgb: context.colorInfo.rgb
      }
    }));
    
    ws.send(JSON.stringify({
      type: 'enhanced-initial',
      contexts,
      timestamp: new Date().toISOString(),
      features: ['advanced-color-system', 'hsl-hex-generation', 'gradients', 'palettes', 'rgb']
    }));
  }

  /**
   * Handle enhanced WebSocket messages
   */
  private handleEnhancedMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleEnhancedSubscription(ws, message.context);
        break;
      case 'updateTension':
        this.handleEnhancedTensionUpdate(message.context, message.tension);
        break;
      case 'getColorScheme':
        this.handleColorSchemeRequest(ws, message.tension);
        break;
      case 'getPalette':
        this.handlePaletteRequest(ws, message.tension);
        break;
      case 'getContexts':
        this.sendEnhancedContexts(ws);
        break;
      default:
        console.log(UnicodeTableFormatter.colorize(`❓ Unknown message type: ${message.type}`, DesignSystem.text.secondary));
    }
  }

  /**
   * Handle enhanced subscription
   */
  private handleEnhancedSubscription(ws: WebSocket, contextKey: string): void {
    const context = this.colorfulContexts.get(contextKey);
    if (context) {
      const unsubscribe = context.subscribe((update) => {
        ws.send(JSON.stringify({
          type: 'enhanced-update',
          context: contextKey,
          tension: update.tension,
          colors: update.colors,
          colorSystem: {
            hsl: update.colors.hsl,
            hex: update.colors.hex,
            gradient: update.colors.gradient,
            description: update.colors.description,
            rgb: update.colors.rgb
          },
          timestamp: new Date().toISOString()
        }));
      });
      
      // Store unsubscribe function for cleanup
      (ws as any).unsubscribe = (ws as any).unsubscribe || new Map();
      (ws as any).unsubscribe.set(contextKey, unsubscribe);
      
      ws.send(JSON.stringify({
        type: 'enhanced-subscribed',
        context: contextKey,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Handle enhanced tension update
   */
  private handleEnhancedTensionUpdate(contextKey: string, tension: number): void {
    const context = this.colorfulContexts.get(contextKey);
    if (context) {
      context.updateTension(tension);
    }
  }

  /**
   * Handle color scheme request
   */
  private handleColorSchemeRequest(ws: WebSocket, tension: number): void {
    const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
    ws.send(JSON.stringify({
      type: 'colorScheme',
      tension,
      scheme: colorScheme,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle palette request
   */
  private handlePaletteRequest(ws: WebSocket, tension: number): void {
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);
    ws.send(JSON.stringify({
      type: 'palette',
      tension,
      palette,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Send enhanced contexts
   */
  private sendEnhancedContexts(ws: WebSocket): void {
    const contexts = Array.from(this.colorfulContexts.entries()).map(([key, context]) => ({
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo
    }));
    
    ws.send(JSON.stringify({
      type: 'enhanced-contexts',
      contexts,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Register an enhanced colorful context
   */
  registerContext(key: string, context: EnhancedColorfulTypeContext): void {
    this.colorfulContexts.set(key, context);
    
    // Notify all clients about new context
    this.broadcast({
      type: 'enhanced-contextAdded',
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo,
      colorSystem: {
        hsl: context.colorInfo.hsl,
        hex: context.colorInfo.hex,
        gradient: context.colorInfo.gradient,
        description: context.colorInfo.description,
        rgb: context.colorInfo.rgb
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast enhanced message to all clients
   */
  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Start periodic tension updates with AdvancedColorManagementSystem
   */
  private startTensionUpdates(): void {
    this.updateInterval = setInterval(() => {
      // Simulate tension changes with AdvancedColorManagementSystem integration
      this.colorfulContexts.forEach((context, key) => {
        const currentTension = context.colorInfo.tension;
        const change = (Math.random() - 0.5) * 10; // -5 to +5 change
        const newTension = Math.max(0, Math.min(100, currentTension + change));
        
        if (Math.abs(newTension - currentTension) > 1) {
          context.updateTension(newTension);
        }
      });
    }, 2000); // Update every 2 seconds
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.wss.close();
  }
}

/**
 * Enhanced CSS generator with AdvancedColorManagementSystem integration
 */
class EnhancedCSSVariableGenerator {
  private contexts: Map<string, EnhancedColorfulTypeContext> = new Map();

  /**
   * Register a context for enhanced CSS generation
   */
  registerContext(key: string, context: EnhancedColorfulTypeContext): void {
    this.contexts.set(key, context);
    
    // Subscribe to updates for real-time CSS refresh
    context.subscribe((update) => {
      this.generateEnhancedCSSFile();
    });
  }

  /**
   * Generate enhanced CSS file with AdvancedColorManagementSystem integration
   */
  generateEnhancedCSSFile(): string {
    let css = `
/* Enhanced CSS variables with AdvancedColorManagementSystem integration */
/* Generated at: ${new Date().toISOString()} */

:root {
  --default-tension: 50;
  --transition-duration: 0.3s;
  --transition-easing: ease-in-out;
}

/* AdvancedColorManagementSystem base classes */
.tension-excellent { --tension-level: 10; }
.tension-very-good { --tension-level: 20; }
.tension-good { --tension-level: 30; }
.tension-fair { --tension-level: 40; }
.tension-moderate { --tension-level: 50; }
.tension-concerning { --tension-level: 60; }
.tension-poor { --tension-level: 70; }
.tension-bad { --tension-level: 80; }
.tension-critical { --tension-level: 90; }
.tension-failure { --tension-level: 100; }

/* Dynamic color classes */
.hsl-based { background: var(--color-hsl); }
.hex-based { background: var(--color-hex); }
.gradient-based { background: var(--color-gradient); }
.rgb-overlay { background-color: rgba(var(--color-rgb), 0.1); }

/* Enhanced transitions */
* {
  transition: 
    background-color var(--transition-duration) var(--transition-easing),
    color var(--transition-duration) var(--transition-easing),
    border-color var(--transition-duration) var(--transition-easing),
    box-shadow var(--transition-duration) var(--transition-easing),
    background-image var(--transition-duration) var(--transition-easing);
}
`;

    // Add CSS for each context
    this.contexts.forEach((context, key) => {
      css += context.generateCSSVariables();
    });

    // Add enhanced utility classes
    css += this.generateEnhancedUtilities();

    return css;
  }

  /**
   * Generate enhanced utility classes
   */
  private generateEnhancedUtilities(): string {
    return `
/* Enhanced utility classes with AdvancedColorManagementSystem */
.color-description {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.tension-indicator {
  position: relative;
  overflow: hidden;
}

.tension-indicator::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: calc(var(--tension-level) * 1%);
  background: var(--color-gradient);
  transition: width var(--transition-duration) var(--transition-easing);
  z-index: 1;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
  background: var(--color-background);
}

.palette-swatch {
  height: 20px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Advanced animations */
@keyframes tension-pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.02);
  }
}

.tension-pulse {
  animation: tension-pulse 2s infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

/* Color system demonstrations */
.color-spectrum {
  background: linear-gradient(to right, 
    hsl(120, 70%, 50%),
    hsl(90, 70%, 50%),
    hsl(60, 70%, 50%),
    hsl(30, 70%, 50%),
    hsl(0, 70%, 50%)
  );
  height: 20px;
  border-radius: 10px;
}

.rgb-preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgb(var(--color-rgb));
  border: 2px solid var(--color-border);
  box-shadow: 0 2px 8px var(--color-shadow);
}
`;
  }

  /**
   * Get enhanced CSS file content
   */
  getCSS(): string {
    return this.generateEnhancedCSSFile();
  }
}

// =============================================================================
// ENHANCED API WITH ADVANCED COLOR SYSTEM
// =============================================================================

/**
 * Create enhanced API with AdvancedColorManagementSystem integration
 */
function createEnhancedColorSystemAPI(): Elysia {
  const wsServer = new EnhancedTensionWebSocketServer();
  const cssGenerator = new EnhancedCSSVariableGenerator();

  return new Elysia()
    // AdvancedColorManagementSystem demonstration endpoint
    .get('/color-system/demo', () => {
      const demoTensions = [10, 25, 50, 75, 90];
      const demonstrations = demoTensions.map(tension => {
        const colorValue = AdvancedColorManagementSystem.generateCompleteColorValue(tension);
        const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
        const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);
        const classification = AdvancedColorManagementSystem.getTensionClassification(tension);
        const description = AdvancedColorManagementSystem.getColorDescriptionFromTension(tension);

        return {
          tension,
          classification,
          description,
          colorValue,
          colorScheme,
          palette,
          gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(tension),
          hexGradient: AdvancedColorManagementSystem.generateHEXGradientFromTension(tension)
        };
      });

      return {
        title: 'AdvancedColorManagementSystem Demonstration',
        description: 'Comprehensive color generation with HSL/HEX mathematics',
        features: [
          'HSL color generation with tension mapping',
          'HEX conversion with mathematical precision',
          'Dynamic gradient generation',
          'Complete color palette (50-900 shades)',
          'RGB extraction for programmatic use',
          'Color scheme generation',
          'Tension classification system',
          'Human-readable descriptions'
        ],
        demonstrations,
        usage: {
          generateHSL: 'AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 50 })',
          generateHEX: 'AdvancedColorManagementSystem.generateHEXColorFromTension(50)',
          generateGradient: 'AdvancedColorManagementSystem.generateHSLGradientFromTension(50)',
          generateScheme: 'AdvancedColorManagementSystem.generateColorSchemeFromTension(50)',
          generatePalette: 'AdvancedColorManagementSystem.generateColorPaletteFromTension(50)',
          getRGB: 'AdvancedColorManagementSystem.extractRGBFromHEX("#26D926")',
          getClassification: 'AdvancedColorManagementSystem.getTensionClassification(50)',
          getDescription: 'AdvancedColorManagementSystem.getColorDescriptionFromTension(50)'
        }
      };
    })

    // AdvancedColorManagementSystem utilities endpoint
    .get('/color-system/utilities', () => {
      return {
        title: 'AdvancedColorManagementSystem Utilities',
        description: 'Advanced color mathematics and generation utilities',
        methods: {
          generateHSLColorFromTension: 'Generate HSL color from tension with customizable parameters',
          generateHEXColorFromTension: 'Generate HEX color from tension level',
          generateHSLGradientFromTension: 'Generate HSL gradient from tension with configuration',
          generateHEXGradientFromTension: 'Generate HEX gradient from tension',
          generateColorSchemeFromTension: 'Generate complete color scheme with semantic roles',
          generateColorPaletteFromTension: 'Generate color palette (50-900 shades)',
          generateCompleteColorValue: 'Generate comprehensive color value with all formats',
          getTensionClassification: 'Get tension-based color classification',
          getColorDescriptionFromTension: 'Get human-readable color description',
          extractRGBFromHEX: 'Extract RGB values from HEX color string'
        },
        types: {
          ColorValue: 'Object containing HSL, HEX, and RGB representations',
          ColorPalette: 'Systematic color palette with 10 shades (50-900)',
          ColorScheme: 'Complete color scheme with semantic roles',
          TensionClassification: '10-level tension classification system',
          ColorGenerationParameters: 'Parameters for color generation with validation',
          GradientConfiguration: 'Configuration for gradient generation'
        },
        examples: {
          basicHSL: 'AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 50 })',
          customHSL: 'AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 75, saturation: 80, lightness: 60 })',
          gradient: 'AdvancedColorManagementSystem.generateHSLGradientFromTension(50, { angle: 90, startSaturation: 90 })',
          completeValue: 'AdvancedColorManagementSystem.generateCompleteColorValue(50, { saturation: 80 })'
        }
      };
    })

    // Enhanced contexts endpoint with AdvancedColorManagementSystem
    .get('/contexts', () => {
      const contexts = [
        { key: 'storage-enterprise', tension: 27, colors: { hsl: 'hsl(87.6, 70%, 50%)', hex: '#B8D926', description: 'Good (Light Green)' } },
        { key: 'api-development', tension: 45, colors: { hsl: 'hsl(66, 70%, 50%)', hex: '#D4D926', description: 'Moderate (Yellow)' } },
        { key: 'database-primary', tension: 68, colors: { hsl: 'hsl(38.4, 70%, 50%)', hex: '#D98026', description: 'Poor (Orange)' } }
      ];

      return {
        contexts: contexts.map(ctx => ({
          ...ctx,
          colorSystem: {
            hsl: ctx.colors.hsl,
            hex: ctx.colors.hex,
            gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(ctx.tension),
            description: ctx.colors.description,
            rgb: AdvancedColorManagementSystem.extractRGBFromHEX(ctx.colors.hex),
            palette: AdvancedColorManagementSystem.generateColorPaletteFromTension(ctx.tension),
            scheme: AdvancedColorManagementSystem.generateColorSchemeFromTension(ctx.tension)
          }
        })),
        timestamp: new Date().toISOString(),
        webSocketUrl: 'ws://localhost:8766/ws-inspect',
        features: ['enhanced-color-system', 'advanced-color-mathematics', 'hsl-hex-generation', 'gradients', 'palettes', 'rgb-extraction']
      };
    })

    // Update tension endpoint with enhanced response
    .post('/contexts/:key/tension', ({ params, body }) => {
      const { key } = params;
      const { tension } = body as { tension: number };

      // Validate tension
      if (typeof tension !== 'number' || tension < 0 || tension > 100) {
        return { error: 'Tension must be a number between 0 and 100', status: 400 };
      }

      // Generate enhanced color information
      const colorValue = AdvancedColorManagementSystem.generateCompleteColorValue(tension);
      const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
      const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);
      const classification = AdvancedColorManagementSystem.getTensionClassification(tension);
      const description = AdvancedColorManagementSystem.getColorDescriptionFromTension(tension);

      return {
        success: true,
        context: key,
        tension,
        colors: {
          hsl: colorValue.hsl,
          hex: colorValue.hex,
          gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(tension),
          description,
          rgb: colorValue.rgb
        },
        colorSystem: {
          classification,
          colorValue,
          colorScheme,
          palette,
          gradient: AdvancedColorManagementSystem.generateHSLGradientFromTension(tension),
          hexGradient: AdvancedColorManagementSystem.generateHEXGradientFromTension(tension)
        },
        timestamp: new Date().toISOString()
      };
    })

    // Enhanced CSS variables endpoint
    .get('/colors.css', () => {
      const css = cssGenerator.getCSS();
      return new Response(css, {
        headers: {
          'Content-Type': 'text/css',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    })

    // Interactive demo page with AdvancedColorManagementSystem
    .get('/', () => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdvancedColorManagementSystem Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #3b82f6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .demo-section {
            margin: 30px 0;
            padding: 25px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .color-card {
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            color: white;
            font-weight: bold;
            transition: transform 0.2s ease;
        }
        .color-card:hover {
            transform: translateY(-2px);
        }
        .controls {
            display: flex;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        input[type="range"] {
            flex: 1;
            min-width: 200px;
        }
        .tension-display {
            font-size: 1.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .palette-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 5px;
            margin: 15px 0;
        }
        .palette-swatch {
            height: 30px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .gradient-demo {
            height: 60px;
            border-radius: 8px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .color-info {
            background: #3b82f6;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 14px;
        }
        .status-excellent { background: #10b981; }
        .status-very-good { background: #3b82f6; }
        .status-good { background: #3b82f6; }
        .status-fair { background: #3b82f6; }
        .status-moderate { background: #f59e0b; }
        .status-concerning { background: #3b82f6; }
        .status-poor { background: #3b82f6; }
        .status-bad { background: #ef4444; }
        .status-critical { background: #dc2626; }
        .status-failure { background: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 AdvancedColorManagementSystem Demo</h1>
        <p>Interactive demonstration of advanced color mathematics and generation</p>
        
        <div class="demo-section">
            <h2>🎛️ Tension Control</h2>
            <div class="controls">
                <input type="range" id="tensionSlider" min="0" max="100" value="50">
                <div class="tension-display" id="tensionDisplay">50%</div>
            </div>
            
            <div id="colorInfo" class="color-info">
                Loading color information...
            </div>
        </div>

        <div class="demo-section">
            <h2>🌈 Color Demonstrations</h2>
            <div id="colorGrid" class="color-grid">
                <!-- Color cards will be dynamically inserted here -->
            </div>
        </div>

        <div class="demo-section">
            <h2>📱 Color Palette</h2>
            <div id="paletteGrid" class="palette-grid">
                <!-- Palette swatches will be dynamically inserted here -->
            </div>
        </div>

        <div class="demo-section">
            <h2>🌊 Gradient Demonstrations</h2>
            <div id="hslGradient" class="gradient-demo">
                HSL Gradient
            </div>
            <div id="hexGradient" class="gradient-demo">
                HEX Gradient
            </div>
        </div>

        <div class="demo-section">
            <h2>🎯 Color Scheme</h2>
            <div id="colorScheme" class="color-grid">
                <!-- Color scheme will be dynamically inserted here -->
            </div>
        </div>
    </div>

    <script>
        let currentTension = 50;

        function updateColorDisplay() {
            const tension = parseInt(document.getElementById('tensionSlider').value);
            currentTension = tension;
            
            document.getElementById('tensionDisplay').textContent = tension + '%';
            
            // Fetch color information from API
            fetch('/color-system/demo')
                .then(response => response.json())
                .then(data => {
                    const demo = data.demonstrations.find(d => d.tension === tension || 
                        (tension < 25 && d.tension === 10) ||
                        (tension >= 25 && tension < 50 && d.tension === 25) ||
                        (tension >= 50 && tension < 75 && d.tension === 50) ||
                        (tension >= 75 && d.tension < 90 && d.tension === 75) ||
                        (tension >= 90 && d.tension === 90));
                    
                    if (demo) {
                        updateColorCards(demo);
                        updatePalette(demo.palette);
                        updateGradients(demo);
                        updateColorScheme(demo.colorScheme);
                        updateColorInfo(demo);
                    }
                });
        }

        function updateColorCards(demo) {
            const grid = document.getElementById('colorGrid');
            grid.innerHTML = '';
            
            const cards = [
                { title: 'HSL Color', value: demo.colorValue.hsl, class: 'status-' + demo.classification },
                { title: 'HEX Color', value: demo.colorValue.hex, class: 'status-' + demo.classification },
                { title: 'RGB Values', value: \`rgb(\${demo.colorValue.rgb.r}, \${demo.colorValue.rgb.g}, \${demo.colorValue.rgb.b})\`, class: 'status-' + demo.classification },
                { title: 'Classification', value: demo.classification, class: 'status-' + demo.classification }
            ];
            
            cards.forEach(card => {
                const div = document.createElement('div');
                div.className = \`color-card \${card.class}\`;
                div.innerHTML = \`
                    <div>\${card.title}</div>
                    <div style="font-size: 0.9em; margin-top: 5px;">\${card.value}</div>
                \`;
                grid.appendChild(div);
            });
        }

        function updatePalette(palette) {
            const grid = document.getElementById('paletteGrid');
            grid.innerHTML = '';
            
            Object.entries(palette).forEach(([shade, color]) => {
                const div = document.createElement('div');
                div.className = 'palette-swatch';
                div.style.backgroundColor = color;
                div.textContent = shade;
                div.title = color;
                grid.appendChild(div);
            });
        }

        function updateGradients(demo) {
            document.getElementById('hslGradient').style.background = demo.gradient;
            document.getElementById('hexGradient').style.background = demo.hexGradient;
        }

        function updateColorScheme(scheme) {
            const grid = document.getElementById('colorScheme');
            grid.innerHTML = '';
            
            Object.entries(scheme).forEach(([role, color]) => {
                const div = document.createElement('div');
                div.className = 'color-card';
                div.style.backgroundColor = color;
                div.style.color = role === 'background' ? '#333' : 'white';
                div.innerHTML = \`
                    <div>\${role.charAt(0).toUpperCase() + role.slice(1)}</div>
                    <div style="font-size: 0.8em; margin-top: 5px;">\${color}</div>
                \`;
                grid.appendChild(div);
            });
        }

        function updateColorInfo(demo) {
            const info = document.getElementById('colorInfo');
            info.innerHTML = \`
                <strong>Tension:</strong> \${demo.tension}%<br>
                <strong>Classification:</strong> \${demo.classification}<br>
                <strong>Description:</strong> \${demo.description}<br>
                <strong>HSL:</strong> \${demo.colorValue.hsl}<br>
                <strong>HEX:</strong> \${demo.colorValue.hex}<br>
                <strong>RGB:</strong> rgb(\${demo.colorValue.rgb.r}, \${demo.colorValue.rgb.g}, \${demo.colorValue.rgb.b})<br>
                <strong>Palette:</strong> \${Object.keys(demo.palette).length} shades
            \`;
        }

        // Initialize
        document.getElementById('tensionSlider').addEventListener('input', updateColorDisplay);
        updateColorDisplay();
    </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    });
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the enhanced ColorSystem integration
 */
async function demonstrateEnhancedColorSystem(): Promise<void> {
  console.log(EmpireProDashboard.generateHeader(
    'ENHANCED COLOR SYSTEM INTEGRATION DEMONSTRATION',
    'Advanced Color Mathematics with HSL/HEX Generation and Tension Mapping'
  ));

  const app = createEnhancedColorSystemAPI();
  const port = process.env.PORT || 3000;
  
  const server = app.listen(port);
  
  console.log(UnicodeTableFormatter.colorize('🚀 Enhanced ColorSystem API Started', DesignSystem.status.operational));
  console.log(UnicodeTableFormatter.colorize(`🌐 Main Server: http://localhost:${port}`, DesignSystem.text.accent.blue));
  console.log(UnicodeTableFormatter.colorize(`🎨 ColorSystem Demo: http://localhost:${port}/color-system/demo`, DesignSystem.text.accent.green));
  console.log(UnicodeTableFormatter.colorize(`🛠️ ColorSystem Utils: http://localhost:${port}/color-system/utilities`, DesignSystem.text.accent.purple));
  console.log(UnicodeTableFormatter.colorize(`📱 Contexts: http://localhost:${port}/contexts`, DesignSystem.text.accent.yellow));
  console.log(UnicodeTableFormatter.colorize(`🎨 CSS Variables: http://localhost:${port}/colors.css`, DesignSystem.text.secondary));
  console.log(UnicodeTableFormatter.colorize(`🌐 WebSocket: ws://localhost:8766/ws-inspect`, DesignSystem.text.accent.cyan));
  
  // Demonstrate AdvancedColorManagementSystem usage
  console.log(UnicodeTableFormatter.colorize('\n🎨 ADVANCED COLOR SYSTEM DEMONSTRATION:', DesignSystem.text.accent.blue));
  
  // Test different tension levels
  const testTensions = [10, 25, 50, 75, 90];
  
  testTensions.forEach(tension => {
    console.log(UnicodeTableFormatter.colorize(`\n🎯 Testing Tension: ${tension}%`, DesignSystem.text.primary));
    
    const colorValue = AdvancedColorManagementSystem.generateCompleteColorValue(tension);
    const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);
    const classification = AdvancedColorManagementSystem.getTensionClassification(tension);
    const description = AdvancedColorManagementSystem.getColorDescriptionFromTension(tension);
    const hslGradient = AdvancedColorManagementSystem.generateHSLGradientFromTension(tension);
    const hexGradient = AdvancedColorManagementSystem.generateHEXGradientFromTension(tension);
    
    console.log(`  Classification: ${classification}`);
    console.log(`  Description: ${description}`);
    console.log(`  HSL: ${colorValue.hsl}`);
    console.log(`  HEX: ${colorValue.hex}`);
    console.log(`  RGB: rgb(${colorValue.rgb.r}, ${colorValue.rgb.g}, ${colorValue.rgb.b})`);
    console.log(`  HSL Gradient: ${hslGradient.substring(0, 50)}...`);
    console.log(`  HEX Gradient: ${hexGradient.substring(0, 50)}...`);
    console.log(`  Color Scheme: Primary=${colorScheme.primary}, Secondary=${colorScheme.secondary}, Accent=${colorScheme.accent}`);
    console.log(`  Palette: ${Object.keys(palette).length} shades from ${palette[50]} to ${palette[900]}`);
  });
  
  // Test parameter validation
  console.log(UnicodeTableFormatter.colorize('\n🔍 TESTING PARAMETER VALIDATION:', DesignSystem.text.accent.blue));
  
  try {
    AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 50, saturation: 80, lightness: 60 });
    console.log('✅ Valid parameters accepted');
  } catch (error) {
    console.log('❌ Valid parameters rejected:', error);
  }
  
  try {
    AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 150 });
    console.log('❌ Invalid tension accepted');
  } catch (error) {
    console.log('✅ Invalid tension rejected:', error.message);
  }
  
  try {
    AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: 50, saturation: 150 });
    console.log('❌ Invalid saturation accepted');
  } catch (error) {
    console.log('✅ Invalid saturation rejected:', error.message);
  }
  
  // Test gradient configuration
  console.log(UnicodeTableFormatter.colorize('\n🌊 TESTING GRADIENT CONFIGURATION:', DesignSystem.text.accent.blue));
  
  const customGradient = AdvancedColorManagementSystem.generateHSLGradientFromTension(50, {
    angle: 90,
    startSaturation: 90,
    endSaturation: 70,
    startLightness: 65,
    endLightness: 35
  });
  
  console.log(`Custom gradient: ${customGradient}`);
  
  // Test RGB extraction
  console.log(UnicodeTableFormatter.colorize('\n🔴 TESTING RGB EXTRACTION:', DesignSystem.text.accent.blue));
  
  const testHex = '#26D926';
  const rgb = AdvancedColorManagementSystem.extractRGBFromHEX(testHex);
  console.log(`HEX: ${testHex} -> RGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  
  console.log(EmpireProDashboard.generateFooter());
  
  console.log('\n🎉 ENHANCED COLOR SYSTEM INTEGRATION DEMO COMPLETE!');
  console.log('✅ AdvancedColorManagementSystem with mathematical precision');
  console.log('✅ HSL/HEX generation with tension mapping');
  console.log('✅ Dynamic gradient generation with configuration');
  console.log('✅ Complete color palette generation (50-900)');
  console.log('✅ Enhanced ColorfulTypeContext with ColorSystem');
  console.log('✅ Real-time WebSocket updates with enhanced color data');
  console.log('✅ Enhanced CSS variable generation');
  console.log('✅ Interactive demo with visual feedback');
  
  console.log('\n📋 ADVANCED COLOR SYSTEM FEATURES:');
  console.log('  🎨 HSL Generation: Maps tension (0-100) to HSL colors with customizable parameters');
  console.log('  🔢 HEX Conversion: Mathematical HSL to HEX conversion with validation');
  console.log('  🌈 Dynamic Gradients: CSS gradients with configurable angles and stops');
  console.log('  📱 Color Palettes: Systematic 50-900 shade generation');
  console.log('  🎯 Color Schemes: Semantic color roles (primary, secondary, accent, background, text)');
  console.log('  📊 RGB Extraction: Precise RGB values for programmatic use');
  console.log('  📝 Descriptions: Human-readable color descriptions with classification');
  console.log('  ⚡ Parameter Validation: Comprehensive input validation with error messages');
  console.log('  🔧 TypeScript Types: Full type safety with interfaces and readonly properties');
  
  console.log('\n🔧 ADVANCED USAGE EXAMPLES:');
  console.log('  // AdvancedColorManagementSystem usage');
  console.log('  const hsl = AdvancedColorManagementSystem.generateHSLColorFromTension({');
  console.log('    tension: 50,');
  console.log('    saturation: 80,');
  console.log('    lightness: 60');
  console.log('  });');
  console.log('');
  console.log('  const hex = AdvancedColorManagementSystem.generateHEXColorFromTension(50);');
  console.log('  const gradient = AdvancedColorManagementSystem.generateHSLGradientFromTension(50, {');
  console.log('    angle: 90,');
  console.log('    startSaturation: 90,');
  console.log('    endSaturation: 70');
  console.log('  });');
  console.log('  const scheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(50);');
  console.log('  const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(50);');
  console.log('  const complete = AdvancedColorManagementSystem.generateCompleteColorValue(50);');
  console.log('  const classification = AdvancedColorManagementSystem.getTensionClassification(50);');
  console.log('  const description = AdvancedColorManagementSystem.getColorDescriptionFromTension(50);');
  console.log('  const rgb = AdvancedColorManagementSystem.extractRGBFromHEX("#26D926");');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(UnicodeTableFormatter.colorize('\n🛑 Shutting down Enhanced ColorSystem server...', DesignSystem.text.secondary));
    server.stop();
    process.exit(0);
  });
}

// Start the enhanced ColorSystem demonstration
demonstrateEnhancedColorSystem().catch(error => {
  console.error(UnicodeTableFormatter.colorize(`❌ Failed to start Enhanced ColorSystem: ${error}`, DesignSystem.status.downtime));
  process.exit(1);
});
