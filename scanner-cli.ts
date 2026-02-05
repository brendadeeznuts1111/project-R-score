#!/usr/bin/env bun
/**
 * 🏭 scanner-cli.ts - Tier-1380 CLI v2.3
 * 
 * Production-ready CLI tool for FactoryWager Tier-1380 system
 * Integrates with configuration management, A/B testing, and R2 snapshots
 */

import { readFileSync } from 'fs'

interface ScannerConfig {
  projectId: string
  sessionId: string
  theme: string
  tier: string
  r2Bucket: string
  environment: string
}

interface ScannerData {
  cookies: Array<[string, string]>
  scripts: string[]
  logs: number
  unicodeWidth: number
  checksum: string
  compressedSize: number
  rawSize: number
  compressionRatio: number
}

export class Tier1380ScannerCLI {
  private config: ScannerConfig
  private data: ScannerData

  constructor(projectId?: string, sessionId?: string) {
    // Load configuration
    this.loadConfig(projectId, sessionId)
    
    // Initialize data (async)
    this.data = {} as ScannerData
  }

  /**
   * Initialize scanner data (must be called after constructor)
   */
  async initialize(): Promise<void> {
    await this.initializeData()
  }

  /**
   * Load configuration from arguments and environment
   */
  private loadConfig(projectId?: string, sessionId?: string): void {
    // Argument parsing
    const args = process.argv.slice(2)
    const getArg = (i: number, fallback = '') => args[i] ?? fallback

    this.config = {
      projectId: projectId || getArg(0, process.env.PROJECT_ID || 'default'),
      sessionId: sessionId || getArg(1, crypto.randomUUID()),
      theme: process.env.SCANNER_THEME || 'dark',
      tier: process.env.TIER || '1380',
      r2Bucket: process.env.R2_BUCKET || 'scanner-cookies',
      environment: process.env.NODE_ENV || 'development'
    }
  }

  /**
   * Initialize scanner data
   */
  private async initializeData(): Promise<void> {
    try {
      // Load package.json
      let pkg: any = { scripts: {} }
      try {
        const pkgContent = readFileSync('package.json', 'utf8')
        pkg = JSON.parse(pkgContent)
      } catch {
        // Use default if package.json doesn't exist
        pkg = { scripts: {} }
      }
      
      // Parse logs (if available)
      let logs = 0
      try {
        const logData = await Bun.file('scanner.log').text()
        const logLines = logData.trim().split('\n')
        logs = logLines.length
      } catch {
        logs = 0
      }

      // Cookie data
      const cookies = new Map([
        ['projectId', this.config.projectId],
        ['session', this.config.sessionId],
        ['theme', this.config.theme],
        ['tier', this.config.tier],
        ['environment', this.config.environment],
        ['timestamp', Date.now().toString()]
      ])

      // Buffer performance demo
      const arrayData = [...cookies.entries()]
      const rawBuffer = Buffer.from(arrayData) // 50% faster in v1.3.6
      const checksum = Bun.hash.crc32(rawBuffer)

      // Prepare data for compression
      const data = {
        cookies: arrayData,
        scripts: Object.keys(pkg.scripts || {}),
        logs,
        unicodeWidth: Bun.stringWidth('क्ष') // GB9c support
      }

      // Compress for R2
      const jsonString = JSON.stringify(data)
      const compressed = Bun.zstdCompressSync(jsonString)
      const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])

      this.data = {
        cookies: arrayData,
        scripts: data.scripts,
        logs: data.logs,
        unicodeWidth: data.unicodeWidth,
        checksum: checksum.toString(16),
        compressedSize: prefixed.length,
        rawSize: rawBuffer.length,
        compressionRatio: prefixed.length / rawBuffer.length
      }
    } catch (error) {
      console.error('❌ Failed to initialize scanner data:', error.message)
      process.exit(1)
    }
  }

  /**
   * Display formatted output
   */
  display(): void {
    const wrapped = Bun.wrapAnsi(
      `▵ Tier-1380 CLI v2.3\n` +
      `🆔 ${this.config.projectId} 📊 ${this.config.sessionId.slice(0, 8)}... 📦 ${this.data.compressedSize}B\n` +
      `🔒 ${this.data.checksum} ⏱️ TTL:5s 🗜️ ${this.data.compressionRatio.toFixed(1)}x\n` +
      `📄 Scripts: ${this.data.scripts.length} | Logs: ${this.data.logs} | Unicode: ${this.data.unicodeWidth}`,
      120,
      { hard: true, trim: false }
    )

    console.log(wrapped)
  }

  /**
   * Display summary
   */
  displaySummary(): void {
    console.log({
      projectId: this.config.projectId,
      sessionId: `${this.config.sessionId.slice(0, 8)}...`,
      bundle: `${this.data.compressedSize}B`,
      checksum: this.data.checksum,
      scripts: this.data.scripts.length,
      logs: this.data.logs,
      unicode: this.data.unicodeWidth,
      r2Bucket: this.config.r2Bucket,
      environment: this.config.environment,
      status: '✅ READY'
    })
  }

  /**
   * Get configuration
   */
  getConfig(): ScannerConfig {
    return { ...this.config }
  }

  /**
   * Get data
   */
  getData(): ScannerData {
    return { ...this.data }
  }

  /**
   * Validate scanner state
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.projectId) {
      errors.push('Project ID is required')
    }

    if (!this.config.sessionId) {
      errors.push('Session ID is required')
    }

    if (!this.config.r2Bucket) {
      errors.push('R2 bucket is required')
    }

    if (!this.data.checksum) {
      errors.push('Checksum is missing')
    }

    // Compression validation - small data might not compress well
    if (this.data.rawSize > 100 && this.data.compressionRatio >= 1) {
      errors.push('Compression ratio should be < 1 for larger data')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Export data for R2 storage
   */
  exportForR2(): { key: string; data: Buffer; metadata: Record<string, string> } {
    const key = `scanner/${this.config.projectId}/${this.config.sessionId}.tier1380.zst`
    
    // Recreate compressed data
    const jsonString = JSON.stringify({
      cookies: this.data.cookies,
      scripts: this.data.scripts,
      logs: this.data.logs,
      unicodeWidth: this.data.unicodeWidth,
      timestamp: Date.now(),
      environment: this.config.environment
    })
    
    const compressed = Bun.zstdCompressSync(jsonString)
    const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])

    const metadata = {
      'project-id': this.config.projectId,
      'session-id': this.config.sessionId,
      'checksum': this.data.checksum,
      'compression-ratio': this.data.compressionRatio.toFixed(2),
      'environment': this.config.environment,
      'tier': this.config.tier,
      'scripts-count': this.data.scripts.length.toString(),
      'logs-count': this.data.logs.toString(),
      'created-at': new Date().toISOString()
    }

    return { key, data: prefixed, metadata }
  }
}

// CLI execution
if (import.meta.path === Bun.main) {
  const projectId = process.argv[2]
  const sessionId = process.argv[3]

  const scanner = new Tier1380ScannerCLI(projectId, sessionId)
  
  // Initialize async data
  scanner.initialize().then(() => {
    // Validate
    const validation = scanner.validate()
    if (!validation.valid) {
      console.error('❌ Validation failed:')
      validation.errors.forEach(error => console.error(`   - ${error}`))
      process.exit(1)
    }

    // Display output
    scanner.display()
    scanner.displaySummary()

    // Optional: Export for R2
    if (process.env.SCANNER_EXPORT_R2 === 'true') {
      try {
        const r2Data = scanner.exportForR2()
        console.log('\n📦 R2 Export Data:')
        console.log(`   Key: ${r2Data.key}`)
        console.log(`   Size: ${r2Data.data.length}B`)
        console.log(`   Metadata: ${Object.keys(r2Data.metadata).length} fields`)
      } catch (error) {
        console.error('❌ R2 export failed:', error.message)
      }
    }
  }).catch(error => {
    console.error('❌ Scanner initialization failed:', error.message)
    process.exit(1)
  })
}

export default Tier1380ScannerCLI
