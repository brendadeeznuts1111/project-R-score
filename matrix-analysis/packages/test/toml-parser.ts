// packages/test/toml-parser.ts
import { BunTestConfig } from './config-schema'

// TOML parsing errors
export class TomlParseError extends Error {
  constructor(message: string, public line?: number, public column?: number) {
    super(message)
    this.name = 'TomlParseError'
  }
}

// TOML value types
type TomlValue = string | number | boolean | string[] | TomlTable
type TomlTable = Record<string, TomlValue>

// Enhanced TOML parser with inheritance support
export class TomlParser {
  private lines: string[]
  private currentLine = 0
  private context: 'ci' | 'local' | 'staging'
  
  constructor(context: 'ci' | 'local' | 'staging' = 'local') {
    this.context = context
  }
  
  parse(content: string): TomlTable {
    this.lines = content.split('\n')
    this.currentLine = 0
    
    const root: TomlTable = {}
    let currentSection: string[] = []
    let currentTable: TomlTable = root
    
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine].trim()
      this.currentLine++
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue
      }
      
      // Section header
      if (line.startsWith('[') && line.endsWith(']')) {
        const sectionPath = line.slice(1, -1).trim()
        currentSection = sectionPath.split('.')
        currentTable = this.getOrCreateSection(root, currentSection)
        continue
      }
      
      // Key-value pair
      const keyValueMatch = line.match(/^([^=]+)=(.*)$/)
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch
        const parsedValue = this.parseValue(value.trim())
        currentTable[key.trim()] = parsedValue
        continue
      }
      
      // Multi-line array (starts with [[)
      if (line.startsWith('[[') && line.endsWith(']]')) {
        throw new TomlParseError('Multi-line arrays not yet supported', this.currentLine)
      }
      
      // Unrecognized line
      throw new TomlParseError(`Invalid TOML syntax: ${line}`, this.currentLine)
    }
    
    return root
  }
  
  parseWithInheritance(content: string): BunTestConfig {
    const rawConfig = this.parse(content)
    return this.resolveInheritance(rawConfig)
  }
  
  private getOrCreateSection(root: TomlTable, path: string[]): TomlTable {
    let current = root
    
    for (const segment of path) {
      if (!(segment in current) || typeof current[segment] !== 'object') {
        current[segment] = {}
      }
      current = current[segment] as TomlTable
    }
    
    return current
  }
  
  private parseValue(value: string): TomlValue {
    // Remove surrounding quotes for strings
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1)
    }
    
    // Parse booleans
    if (value === 'true') return true
    if (value === 'false') return false
    
    // Parse numbers
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10)
    }
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value)
    }
    
    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      return this.parseArray(value.slice(1, -1))
    }
    
    // Inline table (not yet supported)
    if (value.startsWith('{') && value.endsWith('}')) {
      throw new TomlParseError('Inline tables not yet supported')
    }
    
    // Default to string
    return value
  }
  
  private parseArray(arrayContent: string): string[] {
    const items: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''
    let depth = 0
    
    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i]
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
        current += char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        current += char
      } else if (!inQuotes && (char === ',' || char === ' ')) {
        if (current.trim()) {
          items.push(this.parseValue(current.trim()) as string)
          current = ''
        }
        if (char === ',') depth++
      } else {
        current += char
      }
    }
    
    if (current.trim()) {
      items.push(this.parseValue(current.trim()) as string)
    }
    
    return items
  }
  
  private resolveInheritance(rawConfig: TomlTable): BunTestConfig {
    const baseConfig: Partial<BunTestConfig> = {
      install: rawConfig.install as any || {},
      test: rawConfig.test as any || {}
    }
    
    // Apply context-specific inheritance
    const contextKey = `test.${this.context}`
    if (rawConfig[contextKey]) {
      baseConfig.test = {
        ...baseConfig.test,
        ...rawConfig[contextKey]
      }
    }
    
    // Auto-inherit install settings for test authentication
    if (baseConfig.test && baseConfig.install) {
      (baseConfig.test as any)._inherited = {
        registry: baseConfig.install.registry,
        cafile: baseConfig.install.cafile,
        prefer: baseConfig.install.prefer,
        exact: baseConfig.install.exact
      }
    }
    
    // Add conditional sections
    if (rawConfig['test.ci']) {
      (baseConfig as any)['test.ci'] = rawConfig['test.ci']
    }
    if (rawConfig['test.staging']) {
      (baseConfig as any)['test.staging'] = rawConfig['test.staging']
    }
    if (rawConfig['test.local']) {
      (baseConfig as any)['test.local'] = rawConfig['test.local']
    }
    
    return baseConfig as BunTestConfig
  }
}

// Utility functions for TOML manipulation
export class TomlUtils {
  static stringify(obj: TomlTable, indent = 0): string {
    const lines: string[] = []
    const spaces = '  '.repeat(indent)
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue
      }
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${spaces}[${key}]`)
        lines.push(this.stringify(value as TomlTable, indent + 1))
      } else {
        lines.push(`${spaces}${key} = ${this.stringifyValue(value)}`)
      }
    }
    
    return lines.join('\n')
  }
  
  private static stringifyValue(value: TomlValue): string {
    if (typeof value === 'string') {
      // Check if string needs quotes
      if (value.includes(' ') || value.includes('#') || value.includes('=')) {
        return `"${value}"`
      }
      return value
    }
    
    if (typeof value === 'boolean') {
      return value.toString()
    }
    
    if (Array.isArray(value)) {
      const items = value.map(v => this.stringifyValue(v)).join(', ')
      return `[${items}]`
    }
    
    return String(value)
  }
  
  static merge(base: TomlTable, override: TomlTable): TomlTable {
    const result = { ...base }
    
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined || value === null) {
        continue
      }
      
      if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
        result[key] = this.merge(result[key] as TomlTable || {}, value)
      } else {
        result[key] = value
      }
    }
    
    return result
  }
  
  static extractSection(config: TomlTable, section: string): TomlTable | null {
    const parts = section.split('.')
    let current: any = config
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return null
      }
    }
    
    return typeof current === 'object' ? current : null
  }
  
  static validateToml(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const lines = content.split('\n')
    
    let inMultiline = false
    let multilineStart = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNum = i + 1
      
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue
      }
      
      // Check for unmatched quotes
      if (line.includes('"') || line.includes("'")) {
        const quotes = (line.match(/"/g) || []).length + (line.match(/'/g) || []).length
        if (quotes % 2 !== 0 && !inMultiline) {
          errors.push(`Line ${lineNum}: Unmatched quote`)
        }
      }
      
      // Check section headers
      if (line.startsWith('[')) {
        if (!line.endsWith(']')) {
          errors.push(`Line ${lineNum}: Unclosed section header`)
        }
        continue
      }
      
      // Check key-value pairs
      if (line.includes('=')) {
        const parts = line.split('=')
        if (parts.length !== 2) {
          errors.push(`Line ${lineNum}: Invalid key-value syntax`)
        }
        continue
      }
      
      // Check arrays
      if (line.startsWith('[') && !line.startsWith('[[')) {
        if (!line.endsWith(']')) {
          errors.push(`Line ${lineNum}: Unclosed array`)
        }
        continue
      }
      
      // Unknown syntax
      if (line && !line.startsWith('#') && !line.includes('=') && !line.startsWith('[')) {
        errors.push(`Line ${lineNum}: Invalid TOML syntax`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Performance-optimized TOML parser for Tier-1380 compliance
export class FastTomlParser {
  private static readonly SECTION_REGEX = /^\[(.*?)\]$/
  private static readonly KEY_VALUE_REGEX = /^([^=]+)=(.*)$/
  private static readonly ARRAY_REGEX = /^\[(.*)\]$/
  
  static parse(content: string): TomlTable {
    const startTime = performance.now()
    
    const lines = content.split('\n')
    const root: TomlTable = {}
    let currentPath: string[] = []
    let currentTable = root
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line || line.startsWith('#')) continue
      
      // Section header
      const sectionMatch = line.match(this.SECTION_REGEX)
      if (sectionMatch) {
        currentPath = sectionMatch[1].split('.')
        currentTable = this.navigateToSection(root, currentPath)
        continue
      }
      
      // Key-value pair
      const kvMatch = line.match(this.KEY_VALUE_REGEX)
      if (kvMatch) {
        const [, key, value] = kvMatch
        currentTable[key.trim()] = this.parseValue(value.trim())
        continue
      }
    }
    
    const parseTime = performance.now() - startTime
    if (parseTime > 1) {
      console.warn(`⚠️  TOML parse time ${parseTime.toFixed(2)}ms exceeds Tier-1380 target of <1ms`)
    }
    
    return root
  }
  
  private static navigateToSection(root: TomlTable, path: string[]): TomlTable {
    let current = root
    for (const segment of path) {
      if (!(segment in current) || typeof current[segment] !== 'object') {
        current[segment] = {}
      }
      current = current[segment] as TomlTable
    }
    return current
  }
  
  private static parseValue(value: string): TomlValue {
    // Fast path for common values
    if (value === 'true') return true
    if (value === 'false') return false
    
    // Numbers
    if (/^-?\d+$/.test(value)) return parseInt(value, 10)
    if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value)
    
    // Strings
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1)
    }
    
    // Arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const content = value.slice(1, -1)
      if (!content) return []
      return content.split(',').map(item => this.parseValue(item.trim())) as string[]
    }
    
    return value
  }
}
