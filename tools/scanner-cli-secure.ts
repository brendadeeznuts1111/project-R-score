#!/usr/bin/env bun
// tools/scanner-cli-secure.ts — Tier-1380 CLI with secure credential management

import { readFileSync } from 'fs'
import Tier1380SecretsManager from './tier1380-secrets-manager'

interface ScannerConfig {
  projectId: string
  sessionId: string
  theme: string
  tier: string
  r2Bucket: string
  environment: string
  useSecureStorage: boolean
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
  secretsLoaded: boolean
  r2Credentials: boolean
}

export class Tier1380SecureScannerCLI {
  private config: ScannerConfig
  private data: ScannerData

  constructor(projectId?: string, sessionId?: string, useSecureStorage: boolean = true) {
    // Load configuration
    this.loadConfig(projectId, sessionId, useSecureStorage)

    // Initialize data (async)
    this.data = {} as ScannerData
  }

  /**
   * Load configuration from arguments and environment
   */
  private loadConfig(projectId?: string, sessionId?: string, useSecureStorage?: boolean): void {
    // Argument parsing
    const args = process.argv.slice(2)
    const getArg = (i: number, fallback = '') => args[i] ?? fallback

    this.config = {
      projectId: projectId || getArg(0, process.env.PROJECT_ID || 'default'),
      sessionId: sessionId || getArg(1, crypto.randomUUID()),
      theme: process.env.SCANNER_THEME || 'dark',
      tier: process.env.TIER || '1380',
      r2Bucket: process.env.R2_BUCKET || 'scanner-cookies',
      environment: process.env.NODE_ENV || 'development',
      useSecureStorage: useSecureStorage ?? (process.env.USE_SECURE_STORAGE !== 'false')
    }
  }

  /**
   * Initialize scanner data with secrets integration
   */
  async initialize(): Promise<void> {
    try {
      // Load package.json
      let pkg: any = { scripts: {} }
      try {
        const pkgContent = readFileSync('package.json', 'utf8')
        pkg = JSON.parse(pkgContent)
      } catch {
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

      // Load secrets if secure storage is enabled
      let secretsLoaded = false
      let r2Credentials = false

      if (this.config.useSecureStorage) {
        try {
          const r2Creds = await Tier1380SecretsManager.getR2Credentials()
          if (r2Creds.accessKeyId && r2Creds.secretAccessKey) {
            r2Credentials = true
            secretsLoaded = true
          }
        } catch (error) {
          console.warn("⚠️ Could not load secrets from secure storage")
        }
      }

      // Cookie data
      const cookies = new Map([
        ['projectId', this.config.projectId],
        ['session', this.config.sessionId],
        ['theme', this.config.theme],
        ['tier', this.config.tier],
        ['environment', this.config.environment],
        ['timestamp', Date.now().toString()],
        ['secureStorage', this.config.useSecureStorage.toString()],
        ['secretsLoaded', secretsLoaded.toString()]
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
        unicodeWidth: Bun.stringWidth('क्ष'), // GB9c support
        secretsLoaded,
        r2Credentials
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
        compressionRatio: prefixed.length / rawBuffer.length,
        secretsLoaded: data.secretsLoaded,
        r2Credentials: data.r2Credentials
      }
    } catch (error) {
      console.error('❌ Failed to initialize scanner data:', error.message)
      process.exit(1)
    }
  }

  /**
   * Display formatted output with security status
   */
  display(): void {
    const securityStatus = this.data.secretsLoaded ? '🔐' : '⚠️'
    const r2Status = this.data.r2Credentials ? '🪣' : '❌'

    const wrapped = Bun.wrapAnsi(
      `▵ Tier-1380 CLI v2.4 (Secure)\n` +
      `🆔 ${this.config.projectId} 📊 ${this.config.sessionId.slice(0, 8)}... 📦 ${this.data.compressedSize}B\n` +
      `🔒 ${this.data.checksum} ⏱️ TTL:5s 🗜️ ${this.data.compressionRatio.toFixed(1)}x\n` +
      `${securityStatus} Secure Storage: ${this.data.secretsLoaded ? 'Enabled' : 'Disabled'} ${r2Status} R2 Creds: ${this.data.r2Credentials ? 'Loaded' : 'Missing'}\n` +
      `📄 Scripts: ${this.data.scripts.length} | Logs: ${this.data.logs} | Unicode: ${this.data.unicodeWidth}`,
      120,
      { hard: true, trim: false }
    )

    console.log(wrapped)
  }

  /**
   * Display summary with security information
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
      secureStorage: this.config.useSecureStorage,
      secretsLoaded: this.data.secretsLoaded,
      r2Credentials: this.data.r2Credentials,
      status: this.data.secretsLoaded && this.data.r2Credentials ? '✅ SECURE' : '⚠️ INSECURE'
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

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */
  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

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

    // Security warnings
    if (!this.config.useSecureStorage) {
      warnings.push('Secure storage is disabled - credentials may be exposed')
    }

    if (!this.data.secretsLoaded && this.config.useSecureStorage) {
      warnings.push('Secrets not loaded from secure storage')
    }

    if (!this.data.r2Credentials) {
      warnings.push('R2 credentials not found - may need to configure secrets')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Export data for R2 storage with security metadata
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
      environment: this.config.environment,
      secureStorage: this.config.useSecureStorage,
      secretsLoaded: this.data.secretsLoaded,
      r2Credentials: this.data.r2Credentials
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
      'secure-storage': this.config.useSecureStorage.toString(),
      'secrets-loaded': this.data.secretsLoaded.toString(),
      'r2-credentials': this.data.r2Credentials.toString(),
      'created-at': new Date().toISOString(),
      'security-level': this.data.secretsLoaded && this.data.r2Credentials ? 'high' : 'medium'
    }

    return { key, data: prefixed, metadata }
  }

  /**
   * Setup secure storage for first time
   */
  async setupSecureStorage(): Promise<void> {
    console.log("🔐 Setting up secure storage for Tier-1380 Scanner...");

    // Check if R2 credentials exist in environment
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (r2AccessKeyId && r2SecretAccessKey) {
      await Tier1380SecretsManager.storeR2Credentials(r2AccessKeyId, r2SecretAccessKey)
      console.log("✅ R2 credentials migrated to secure storage")
    } else {
      console.log("⚠️ R2 credentials not found in environment variables")
      console.log("   Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to migrate")
    }

    // Check database URL
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl) {
      await Tier1380SecretsManager.storeDatabaseUrl(databaseUrl)
      console.log("✅ Database URL migrated to secure storage")
    }

    // Health check
    const health = await Tier1380SecretsManager.healthCheck()
    console.log(`🏥 Secrets health: ${health.status}`)
    console.log(`   Message: ${health.message}`)
  }

  /**
   * Test secure storage integration
   */
  async testSecureStorage(): Promise<{ success: boolean; message: string }> {
    try {
      // Test storing and retrieving a test secret
      const testKey = `test-${Date.now()}`
      const testValue = crypto.randomUUID()

      await Tier1380SecretsManager.storeApiKey('test-service', testValue)
      const retrieved = await Tier1380SecretsManager.getApiKey('test-service')

      if (retrieved === testValue) {
        await Tier1380SecretsManager.deleteSecret(`api-key-test-service`)
        return { success: true, message: "Secure storage test passed" }
      } else {
        return { success: false, message: "Secure storage test failed - retrieved value mismatch" }
      }
    } catch (error) {
      return { success: false, message: `Secure storage test failed: ${error.message}` }
    }
  }
}

// CLI execution
if (import.meta.path === Bun.main) {
  const projectId = process.argv[2]
  const sessionId = process.argv[3]
  const useSecureStorage = process.argv[4] !== 'false'

  const scanner = new Tier1380SecureScannerCLI(projectId, sessionId, useSecureStorage)

  // Initialize async data
  scanner.initialize().then(() => {
    // Validate
    const validation = scanner.validate()
    if (!validation.valid) {
      console.error('❌ Validation failed:')
      validation.errors.forEach(error => console.error(`   - ${error}`))
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:')
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`))
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
        console.log(`   Security Level: ${r2Data.metadata['security-level']}`)
      } catch (error) {
        console.error('❌ R2 export failed:', error.message)
      }
    }
  }).catch(error => {
    console.error('❌ Scanner initialization failed:', error.message)
    process.exit(1)
  })
}

export default Tier1380SecureScannerCLI
