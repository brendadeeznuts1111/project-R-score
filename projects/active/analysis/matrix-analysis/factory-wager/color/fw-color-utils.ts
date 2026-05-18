/**
 * FactoryWager Registry v4.0 - Color Utility Library
 * Comprehensive color management for the FactoryWager ecosystem
 */

// FactoryWager brand colors
export const FW_COLORS = {
  primary: '#3b82f6',    // Enterprise blue
  success: '#22c55e',    // Success green  
  warning: '#f59e0b',    // Warning amber
  error: '#ef4444',      // Error red
  background: '#1f2937', // Dark background
  text: '#f3f4f6',      // Light text
  border: '#374151',     // Border gray
  muted: '#6b7280'       // Muted gray
} as const

export type FWColor = keyof typeof FW_COLORS

/**
 * Color utility class for FactoryWager
 */
export class FWColorUtils {
  /**
   * Convert hex to RGB object
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Convert RGB to hex string
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')}`
  }

  /**
   * Convert color to CSS RGB format
   */
  static toCssRGB(hex: string): string {
    const rgb = this.hexToRgb(hex)
    return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex
  }

  /**
   * Convert color to CSS RGBA format
   */
  static toCssRGBA(hex: string, alpha: number = 1): string {
    const rgb = this.hexToRgb(hex)
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex
  }

  /**
   * Convert color to CSS HSL format
   */
  static toCssHSL(hex: string): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex
    
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
  }

  /**
   * Convert color to ANSI 256-color escape code
   */
  static toAnsi256(hex: string): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return ''
    
    const r = Math.round(rgb.r * 5 / 255)
    const g = Math.round(rgb.g * 5 / 255)
    const b = Math.round(rgb.b * 5 / 255)
    const code = 16 + (36 * r) + (6 * g) + b
    return `\x1b[38;5;${code}m`
  }

  /**
   * Convert color to ANSI 24-bit escape code
   */
  static toAnsi24bit(hex: string): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return ''
    
    return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
  }

  /**
   * Lighten a color by percentage
   */
  static lighten(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex
    
    const factor = 1 + percent / 100
    const lightened = {
      r: Math.min(255, Math.round(rgb.r * factor)),
      g: Math.min(255, Math.round(rgb.g * factor)),
      b: Math.min(255, Math.round(rgb.b * factor))
    }
    return this.rgbToHex(lightened.r, lightened.g, lightened.b)
  }

  /**
   * Darken a color by percentage
   */
  static darken(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex
    
    const factor = 1 - percent / 100
    const darkened = {
      r: Math.max(0, Math.round(rgb.r * factor)),
      g: Math.max(0, Math.round(rgb.g * factor)),
      b: Math.max(0, Math.round(rgb.b * factor))
    }
    return this.rgbToHex(darkened.r, darkened.g, darkened.b)
  }

  /**
   * Generate color palette from base color
   */
  static generatePalette(baseColor: string): Record<string, string> {
    return {
      50: this.lighten(baseColor, 45),
      100: this.lighten(baseColor, 35),
      200: this.lighten(baseColor, 25),
      300: this.lighten(baseColor, 15),
      400: this.lighten(baseColor, 5),
      500: baseColor,
      600: this.darken(baseColor, 10),
      700: this.darken(baseColor, 20),
      800: this.darken(baseColor, 30),
      900: this.darken(baseColor, 40)
    }
  }

  /**
   * Get FactoryWager color utility
   */
  static getColor(colorName: FWColor): string {
    return FW_COLORS[colorName]
  }

  /**
   * Get FactoryWager color in specified format
   */
  static formatColor(colorName: FWColor, format: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'ansi256' | 'ansi24bit', alpha?: number): string {
    const hex = this.getColor(colorName)
    
    switch (format) {
      case 'hex': return hex
      case 'rgb': return this.toCssRGB(hex)
      case 'rgba': return this.toCssRGBA(hex, alpha)
      case 'hsl': return this.toCssHSL(hex)
      case 'ansi256': return this.toAnsi256(hex)
      case 'ansi24bit': return this.toAnsi24bit(hex)
      default: return hex
    }
  }
}

/**
 * ANSI color constants for terminal output
 */
export const ANSI = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  // Colors
  black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  // Bright colors
  bright_black: '\x1b[90m', bright_red: '\x1b[91m', bright_green: '\x1b[92m',
  bright_yellow: '\x1b[93m', bright_blue: '\x1b[94m', bright_magenta: '\x1b[95m',
  bright_cyan: '\x1b[96m', bright_white: '\x1b[97m'
} as const

/**
 * Terminal styling utilities
 */
export class TerminalStyles {
  /**
   * Apply FactoryWager color to text
   */
  static fw(text: string, colorName: FWColor, use24bit: boolean = true): string {
    const color = use24bit ? FWColorUtils.toAnsi24bit(FWColorUtils.getColor(colorName))
                        : FWColorUtils.toAnsi256(FWColorUtils.getColor(colorName))
    return `${color}${text}${ANSI.reset}`
  }

  /**
   * Success message
   */
  static success(text: string): string {
    return `${FWColorUtils.toAnsi24bit(FW_COLORS.success)}✅ ${text}${ANSI.reset}`
  }

  /**
   * Warning message
   */
  static warning(text: string): string {
    return `${FWColorUtils.toAnsi24bit(FW_COLORS.warning)}⚠️  ${text}${ANSI.reset}`
  }

  /**
   * Error message
   */
  static error(text: string): string {
    return `${FWColorUtils.toAnsi24bit(FW_COLORS.error)}❌ ${text}${ANSI.reset}`
  }

  /**
   * Info message
   */
  static info(text: string): string {
    return `${FWColorUtils.toAnsi24bit(FW_COLORS.primary)}ℹ️  ${text}${ANSI.reset}`
  }

  /**
   * Brand header
   */
  static header(text: string): string {
    return `${ANSI.bright}${FWColorUtils.toAnsi24bit(FW_COLORS.primary)}${text}${ANSI.reset}`
  }
}

/**
 * Generate CSS variables for client-side use
 */
export function generateCSSVariables(): string {
  const variables = [':root {']
  
  // Add color variables
  Object.entries(FW_COLORS).forEach(([name, hex]) => {
    variables.push(`  --fw-${name}: ${hex};`)
    variables.push(`  --fw-${name}-rgb: ${FWColorUtils.toCssRGB(hex)};`)
    variables.push(`  --fw-${name}-hsl: ${FWColorUtils.toCssHSL(hex)};`)
  })

  // Add palette variables
  Object.entries(FW_COLORS).forEach(([name, hex]) => {
    const palette = FWColorUtils.generatePalette(hex)
    Object.entries(palette).forEach(([shade, color]) => {
      variables.push(`  --fw-${name}-${shade}: ${color};`)
    })
  })

  variables.push('}')
  return variables.join('\n')
}

// Export default instance
export default {
  colors: FW_COLORS,
  utils: FWColorUtils,
  terminal: TerminalStyles,
  generateCSS: generateCSSVariables
}
