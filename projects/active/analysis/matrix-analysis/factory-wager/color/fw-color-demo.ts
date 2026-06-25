/**
 * FactoryWager Registry v4.0 - Color Utility Library Demo
 * Demonstrates the comprehensive color management system
 */

import { FW_COLORS, FWColorUtils, TerminalStyles, generateCSSVariables, FWColor } from './fw-color-utils'

console.info(TerminalStyles.header('🎨 FactoryWager Registry v4.0 - Color Utility Library Demo'))
console.info('='.repeat(70))

// 1. Basic color access
console.info('\n🔧 1. Basic Color Access')
console.info('-' .repeat(40))

console.info('Available colors:')
Object.entries(FW_COLORS).forEach(([name, hex]) => {
  const coloredText = TerminalStyles.fw(name.toUpperCase(), name as FWColor)
  console.info(`  ${coloredText.padEnd(15)}: ${hex}`)
})

// 2. Color format conversions
console.info('\n🔄 2. Color Format Conversions')
console.info('-' .repeat(40))

const primaryColor = FW_COLORS.primary
console.info(`Original: ${primaryColor}`)
console.info(`RGB: ${FWColorUtils.toCssRGB(primaryColor)}`)
console.info(`RGBA (0.8): ${FWColorUtils.toCssRGBA(primaryColor, 0.8)}`)
console.info(`HSL: ${FWColorUtils.toCssHSL(primaryColor)}`)
console.info(`ANSI 256: ${FWColorUtils.toAnsi256(primaryColor).replace(/\x1b/g, '\\x1b')}m`)
console.info(`ANSI 24-bit: ${FWColorUtils.toAnsi24bit(primaryColor).replace(/\x1b/g, '\\x1b')}m`)

// 3. Color manipulation
console.info('\n🎨 3. Color Manipulation')
console.info('-' .repeat(40))

console.info(`Original: ${primaryColor}`)
console.info(`Lighter (+20%): ${FWColorUtils.lighten(primaryColor, 20)}`)
console.info(`Darker (-20%): ${FWColorUtils.darken(primaryColor, 20)}`)

// 4. Color palette generation
console.info('\n📊 4. Color Palette Generation')
console.info('-' .repeat(40))

const bluePalette = FWColorUtils.generatePalette(primaryColor)
Object.entries(bluePalette).forEach(([shade, color]) => {
  const coloredBlock = TerminalStyles.fw('■', 'primary')
  console.info(`  ${coloredBlock} ${shade.padEnd(3)}: ${color}`)
})

// 5. Terminal styling examples
console.info('\n🖥️  5. Terminal Styling Examples')
console.info('-' .repeat(40))

console.info(TerminalStyles.success('Operation completed successfully'))
console.info(TerminalStyles.warning('This feature is deprecated'))
console.info(TerminalStyles.error('Validation failed'))
console.info(TerminalStyles.info('For more information, see the documentation'))

// 6. FactoryWager registry status with colors
console.info('\n🏭 6. FactoryWager Registry Status')
console.info('-' .repeat(40))

const services = [
  { name: 'CRC32 Validator', status: 'active' as const },
  { name: 'Upload Handler', status: 'active' as const },
  { name: 'Security Module', status: 'warning' as const },
  { name: 'Performance Monitor', status: 'active' as const },
  { name: 'Documentation', status: 'error' as const }
]

services.forEach(service => {
  const statusColor = service.status === 'active' ? 'success' : 
                     service.status === 'warning' ? 'warning' : 'error'
  const statusText = service.status.toUpperCase()
  const coloredStatus = TerminalStyles.fw(statusText, statusColor)
  
  console.info(`  ${service.name.padEnd(20)} ${coloredStatus}`)
})

// 7. Color utility for different formats
console.info('\n📋 7. Color Format Utility')
console.info('-' .repeat(40))

const formats: Array<'hex' | 'rgb' | 'rgba' | 'hsl' | 'ansi256' | 'ansi24bit'> = 
  ['hex', 'rgb', 'rgba', 'hsl', 'ansi256', 'ansi24bit']

formats.forEach(format => {
  const result = FWColorUtils.formatColor('primary', format, 0.8)
  const displayFormat = format === 'ansi256' || format === 'ansi24bit' 
    ? result.replace(/\x1b/g, '\\x1b') + 'm'
    : result
  console.info(`  ${format.padEnd(10)}: ${displayFormat}`)
})

// 8. CSS generation
console.info('\n📦 8. CSS Variables Generation')
console.info('-' .repeat(40))

const cssVariables = generateCSSVariables()
console.info('Generated CSS variables (first 10 lines):')
cssVariables.split('\n').slice(0, 10).forEach(line => {
  console.info(`  ${line}`)
})
console.info(`  ... (${cssVariables.split('\n').length} total lines)`)

// Save CSS to file
await Bun.write('./factory-wager-colors-complete.css', cssVariables)
console.info('\n💾 Complete CSS variables saved to: factory-wager-colors-complete.css')

// 9. Advanced color calculations
console.info('\n🔬 9. Advanced Color Calculations')
console.info('-' .repeat(40))

// Calculate contrast ratio (simplified)
const getLuminance = (hex: string): number => {
  const rgb = FWColorUtils.hexToRgb(hex)
  if (!rgb) return 0
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

console.info(`Contrast ratio (primary on background): ${getContrastRatio(FW_COLORS.primary, FW_COLORS.background).toFixed(2)}`)
console.info(`Contrast ratio (text on background): ${getContrastRatio(FW_COLORS.text, FW_COLORS.background).toFixed(2)}`)
console.info(`Contrast ratio (success on background): ${getContrastRatio(FW_COLORS.success, FW_COLORS.background).toFixed(2)}`)

// 10. Color theme generator
console.info('\n🎭 10. Color Theme Generator')
console.info('-' .repeat(40))

const generateTheme = (baseColor: string) => {
  return {
    primary: baseColor,
    secondary: FWColorUtils.darken(baseColor, 20),
    accent: FWColorUtils.lighten(baseColor, 15),
    background: FWColorUtils.darken(baseColor, 80),
    surface: FWColorUtils.darken(baseColor, 60),
    text: FWColorUtils.lighten(baseColor, 90)
  }
}

const darkTheme = generateTheme(FW_COLORS.primary)
console.info('Dark theme based on primary color:')
Object.entries(darkTheme).forEach(([name, color]) => {
  const coloredName = TerminalStyles.fw(name, 'primary')
  console.info(`  ${coloredName.padEnd(12)}: ${color}`)
})

console.info('\n🎯 Color Utility Library Demo Complete!')
console.info('🚀 FactoryWager Registry v4.0 - Enterprise Color Management')
