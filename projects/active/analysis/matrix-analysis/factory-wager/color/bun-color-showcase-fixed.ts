/**
 * FactoryWager Registry v4.0 - Bun Color Formatting Showcase (Corrected)
 * Comprehensive demonstration of Bun's actual color API capabilities
 */

import { writeFileSync } from 'fs'

console.info('🎨 FactoryWager Registry v4.0 - Bun Color Formatting Showcase')
console.info('=' .repeat(70))

// Demo colors for FactoryWager branding
const factoryColors = {
  primary: '#3b82f6',    // Enterprise blue
  success: '#22c55e',    // Success green  
  warning: '#f59e0b',    // Warning amber
  error: '#ef4444',      // Error red
  background: '#1f2937', // Dark background
  text: '#f3f4f6'        // Light text
}

// 1. Basic Color Conversion
console.info('\n🔧 1. Basic Color Conversion')
console.info('-' .repeat(40))

const blue = Bun.color('#3b82f6')
console.info('Hex input:', '#3b82f6')
console.info('Bun.color() result:', blue)

// Test different input formats
console.info('\nDifferent input formats:')
console.info('Hex:', Bun.color('#3b82f6'))
console.info('RGB object:', Bun.color({ r: 59, g: 130, b: 246 }))
console.info('RGB array:', Bun.color([59, 130, 246]))
console.info('RGBA object:', Bun.color({ r: 59, g: 130, b: 246, a: 0.8 }))
console.info('RGBA array:', Bun.color([59, 130, 246, 0.8]))

// 2. Color Channel Extraction
console.info('\n🔍 2. Color Channel Extraction')
console.info('-' .repeat(40))

// Convert hex to RGB manually for channel access
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

const colorRgb = hexToRgb('#3b82f6')
if (colorRgb) {
  console.info('Hex: #3b82f6')
  console.info('Red channel:', colorRgb.r)     // 59
  console.info('Green channel:', colorRgb.g)   // 130
  console.info('Blue channel:', colorRgb.b)    // 246
}

// 3. CSS Color Formatting (Manual Implementation)
console.info('\n🎨 3. CSS Color Formatting')
console.info('-' .repeat(40))

const toCssRGB = (hex: string) => {
  const rgb = hexToRgb(hex)
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex
}

const toCssRGBA = (hex: string, alpha: number = 1) => {
  const rgb = hexToRgb(hex)
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex
}

const toCssHSL = (hex: string) => {
  const rgb = hexToRgb(hex)
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

console.info('CSS RGB:', toCssRGB('#3b82f6'))           // rgb(59, 130, 246)
console.info('CSS RGBA:', toCssRGBA('#3b82f6', 0.8))    // rgba(59, 130, 246, 0.8)
console.info('CSS HSL:', toCssHSL('#3b82f6'))           // hsl(217, 91%, 60%)

// 4. ANSI Terminal Colors (16-color)
console.info('\n🖥️  4. ANSI Terminal Colors (16-color)')
console.info('-' .repeat(40))

// ANSI escape codes for 16-color palette
const ansi16 = {
  black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  bright_black: '\x1b[90m', bright_red: '\x1b[91m', bright_green: '\x1b[92m',
  bright_yellow: '\x1b[93m', bright_blue: '\x1b[94m', bright_magenta: '\x1b[95m',
  bright_cyan: '\x1b[96m', bright_white: '\x1b[97m', reset: '\x1b[0m'
}

console.info(`${ansi16.bright_blue}FactoryWager${ansi16.reset} Registry`)
console.info(`${ansi16.bright_green}✅ Success${ansi16.reset}: Operation completed`)
console.info(`${ansi16.bright_yellow}⚠️  Warning${ansi16.reset}: Deprecated API`)
console.info(`${ansi16.bright_red}❌ Error${ansi16.reset}: Validation failed`)

// 5. ANSI 256-color
console.info('\n🌈 5. ANSI 256-color')
console.info('-' .repeat(40))

// Convert colors to 256-color ANSI codes
const toAnsi256 = (hex: string) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return ''
  
  const r = Math.round(rgb.r * 5 / 255)
  const g = Math.round(rgb.g * 5 / 255)
  const b = Math.round(rgb.b * 5 / 255)
  const code = 16 + (36 * r) + (6 * g) + b
  return `\x1b[38;5;${code}m`
}

console.info(`${toAnsi256(factoryColors.primary)}FactoryWager${ansi16.reset} Registry (256-color)`)
console.info(`${toAnsi256(factoryColors.success)}✅ Success${ansi16.reset} (256-color)`)
console.info(`${toAnsi256(factoryColors.warning)}⚠️  Warning${ansi16.reset} (256-color)`)
console.info(`${toAnsi256(factoryColors.error)}❌ Error${ansi16.reset} (256-color)`)

// 6. ANSI 24-bit (True Color)
console.info('\n🎨 6. ANSI 24-bit (True Color)')
console.info('-' .repeat(40))

// Convert colors to 24-bit ANSI codes
const toAnsi24bit = (hex: string) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return ''
  
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
}

console.info(`${toAnsi24bit(factoryColors.primary)}FactoryWager${ansi16.reset} Registry (24-bit)`)
console.info(`${toAnsi24bit(factoryColors.success)}✅ Success${ansi16.reset} (24-bit)`)
console.info(`${toAnsi24bit(factoryColors.warning)}⚠️  Warning${ansi16.reset} (24-bit)`)
console.info(`${toAnsi24bit(factoryColors.error)}❌ Error${ansi16.reset} (24-bit)`)

// 7. FactoryWager Registry Status Display
console.info('\n🏭 7. FactoryWager Registry Status Display')
console.info('-' .repeat(40))

const registryStatus = [
  { service: 'CRC32 Validator', status: 'active', color: factoryColors.success },
  { service: 'Upload Handler', status: 'active', color: factoryColors.success },
  { service: 'Security Module', status: 'warning', color: factoryColors.warning },
  { service: 'Performance Monitor', status: 'active', color: factoryColors.success },
  { service: 'Documentation', status: 'error', color: factoryColors.error }
]

registryStatus.forEach(item => {
  const statusColor = toAnsi24bit(item.color)
  const statusIcon = item.status === 'active' ? '🟢' : item.status === 'warning' ? '🟡' : '🔴'
  console.info(`${statusIcon} ${item.service.padEnd(20)} ${statusColor}${item.status.toUpperCase()}${ansi16.reset}`)
})

// 8. Bundle-time Client-side Color Formatting
console.info('\n📦 8. Bundle-time Client-side Color Formatting')
console.info('-' .repeat(40))

// Generate CSS variables for client-side use
const cssVariables = `
:root {
  --fw-primary: ${factoryColors.primary};
  --fw-success: ${factoryColors.success};
  --fw-warning: ${factoryColors.warning};
  --fw-error: ${factoryColors.error};
  --fw-background: ${factoryColors.background};
  --fw-text: ${factoryColors.text};
  
  /* RGB values for calculations */
  --fw-primary-rgb: ${toCssRGB(factoryColors.primary)};
  --fw-success-rgb: ${toCssRGB(factoryColors.success)};
  --fw-warning-rgb: ${toCssRGB(factoryColors.warning)};
  --fw-error-rgb: ${toCssRGB(factoryColors.error)};
}`

console.info('Generated CSS Variables:')
console.info(cssVariables)

// Save CSS to file for client-side use
writeFileSync('./factory-wager-colors.css', cssVariables)
console.info('\n💾 CSS variables saved to: factory-wager-colors.css')

// 9. Color Manipulation and Utilities
console.info('\n🛠️  9. Color Manipulation and Utilities')
console.info('-' .repeat(40))

// Lighten and darken colors
const lightenColor = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const factor = 1 + percent / 100
  const lightened = {
    r: Math.min(255, Math.round(rgb.r * factor)),
    g: Math.min(255, Math.round(rgb.g * factor)),
    b: Math.min(255, Math.round(rgb.b * factor))
  }
  return `#${lightened.r.toString(16).padStart(2, '0')}${lightened.g.toString(16).padStart(2, '0')}${lightened.b.toString(16).padStart(2, '0')}`
}

const darkenColor = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const factor = 1 - percent / 100
  const darkened = {
    r: Math.max(0, Math.round(rgb.r * factor)),
    g: Math.max(0, Math.round(rgb.g * factor)),
    b: Math.max(0, Math.round(rgb.b * factor))
  }
  return `#${darkened.r.toString(16).padStart(2, '0')}${darkened.g.toString(16).padStart(2, '0')}${darkened.b.toString(16).padStart(2, '0')}`
}

console.info('Original blue:', factoryColors.primary)
console.info('Lighter (+20%):', lightenColor(factoryColors.primary, 20))
console.info('Darker (-20%):', darkenColor(factoryColors.primary, 20))

// Generate color palette
const generatePalette = (baseColor: string) => {
  return {
    50: lightenColor(baseColor, 45),
    100: lightenColor(baseColor, 35),
    200: lightenColor(baseColor, 25),
    300: lightenColor(baseColor, 15),
    400: lightenColor(baseColor, 5),
    500: baseColor,
    600: darkenColor(baseColor, 10),
    700: darkenColor(baseColor, 20),
    800: darkenColor(baseColor, 30),
    900: darkenColor(baseColor, 40)
  }
}

const bluePalette = generatePalette(factoryColors.primary)
console.info('\n🎨 Blue Palette Generated:')
Object.entries(bluePalette).forEach(([shade, color]) => {
  const ansiColor = toAnsi24bit(color)
  console.info(`${ansiColor}■${ansi16.reset} ${shade}: ${color}`)
})

// 10. Color Format Comparison
console.info('\n📊 10. Color Format Comparison')
console.info('-' .repeat(40))

const testColor = factoryColors.primary
console.info('Original hex:', testColor)
console.info('RGB object:', hexToRgb(testColor))
console.info('CSS RGB:', toCssRGB(testColor))
console.info('CSS RGBA (0.8):', toCssRGBA(testColor, 0.8))
console.info('CSS HSL:', toCssHSL(testColor))
console.info('ANSI 256:', toAnsi256(testColor).replace(/\x1b/g, '\\x1b'))
console.info('ANSI 24-bit:', toAnsi24bit(testColor).replace(/\x1b/g, '\\x1b'))

console.info('\n🎯 Color Formatting Showcase Complete!')
console.info('🚀 FactoryWager Registry v4.0 - Full Color API Integration')
