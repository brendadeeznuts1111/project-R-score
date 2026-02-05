// packages/test/security-validation.ts
import { BunTestConfig } from './config-schema'

// Security violation types
export interface SecurityViolation {
  type: 'secret_leak' | 'insecure_url' | 'path_traversal' | 'suspicious_pattern' | 'token_scope'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  context: string
  line?: number
  pattern?: string
}

// Threat intelligence patterns
export const THREAT_PATTERNS = {
  // Secret patterns
  secrets: [
    { pattern: /password\s*[:=]\s*["']?([^"'\s]{8,})/gi, type: 'password' },
    { pattern: /token\s*[:=]\s*["']?([^"'\s]{20,})/gi, type: 'token' },
    { pattern: /api[_-]?key\s*[:=]\s*["']?([^"'\s]{16,})/gi, type: 'api_key' },
    { pattern: /secret\s*[:=]\s*["']?([^"'\s]{8,})/gi, type: 'secret' },
    { pattern: /private[_-]?key\s*[:=]\s*["']?([^"'\s]{24,})/gi, type: 'private_key' },
    { pattern: /aws[_-]?access[_-]?key\s*[:=]\s*["']?([^"'\s]{16,})/gi, type: 'aws_access_key' },
    { pattern: /github[_-]?token\s*[:=]\s*["']?([^"'\s]{32,})/gi, type: 'github_token' },
    { pattern: /database[_-]?url\s*[:=]\s*["']?([^"'\s]{20,})/gi, type: 'database_url' }
  ],
  
  // Production URL patterns
  productionUrls: [
    /prod\./gi,
    /production\./gi,
    /live\./gi,
    /api\.prod/gi,
    /staging\./gi,
    /\.prod\./gi,
    /production-api/gi
  ],
  
  // Suspicious network patterns
  network: [
    /fetch\(["']https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\.test|\.local)[^"']+["']\)/gi,
    /axios\.(get|post|put|delete)\(["']https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\.test|\.local)[^"']+["']\)/gi,
    /XMLHttpRequest\s*\(.*?"https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\.test|\.local)/gi
  ],
  
  // File system patterns
  fileSystem: [
    /fs\.(read|write)File\(["'][^"']*\.\.[^"']*["']\)/gi,
    /require\(["'][^"']*\.\.[^"']*["']\)/gi,
    /import\s*.*?from\s*["'][^"']*\.\.[^"']*["']/gi,
    /path\.join\(__dirname,\s*["'][^"']*\.\./gi
  ],
  
  // Environment variable patterns
  environment: [
    /process\.env\.(PROD|PRODUCTION|LIVE)/gi,
    /process\.env\.(DB_|DATABASE_)(?!TEST)/gi,
    /process\.env\.API_KEY/gi,
    /process\.env\.SECRET/gi
  ]
}

// Threat Intelligence Service
export class ThreatIntelligenceService {
  private violationCache = new Map<string, SecurityViolation[]>()
  
  scanForSecrets(content: string, context: string): SecurityViolation[] {
    const cacheKey = `${context}:${this.hashContent(content)}`
    
    if (this.violationCache.has(cacheKey)) {
      return this.violationCache.get(cacheKey)!
    }
    
    const violations: SecurityViolation[] = []
    const lines = content.split('\n')
    
    // Scan for secrets
    for (const { pattern, type } of THREAT_PATTERNS.secrets) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const matches = [...line.matchAll(pattern)]
        
        for (const match of matches) {
          violations.push({
            type: 'secret_leak',
            severity: this.getSecretSeverity(type),
            message: `Potential ${type} leak detected`,
            context,
            line: i + 1,
            pattern: match[0]
          })
        }
      }
    }
    
    // Scan for production URLs
    for (const pattern of THREAT_PATTERNS.productionUrls) {
      if (pattern.test(content)) {
        violations.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          message: 'Production URL pattern detected',
          context,
          pattern: pattern.source
        })
      }
    }
    
    this.violationCache.set(cacheKey, violations)
    return violations
  }
  
  scanForNetworkAnomalies(content: string, context: string): SecurityViolation[] {
    const violations: SecurityViolation[] = []
    const lines = content.split('\n')
    
    for (const pattern of THREAT_PATTERNS.network) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const matches = [...line.matchAll(pattern)]
        
        for (const match of matches) {
          violations.push({
            type: 'suspicious_pattern',
            severity: 'medium',
            message: 'Suspicious network request to external domain',
            context,
            line: i + 1,
            pattern: match[0]
          })
        }
      }
    }
    
    return violations
  }
  
  scanForFileSystemAnomalies(content: string, context: string): SecurityViolation[] {
    const violations: SecurityViolation[] = []
    const lines = content.split('\n')
    
    for (const pattern of THREAT_PATTERNS.fileSystem) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const matches = [...line.matchAll(pattern)]
        
        for (const match of matches) {
          violations.push({
            type: 'path_traversal',
            severity: 'high',
            message: 'Potential path traversal attack',
            context,
            line: i + 1,
            pattern: match[0]
          })
        }
      }
    }
    
    return violations
  }
  
  scanEnvironmentVariables(env: Record<string, string>, context: string): SecurityViolation[] {
    const violations: SecurityViolation[] = []
    
    for (const [key, value] of Object.entries(env)) {
      // Check for production environment variables
      for (const pattern of THREAT_PATTERNS.environment) {
        if (pattern.test(key)) {
          violations.push({
            type: 'suspicious_pattern',
            severity: 'high',
            message: `Production environment variable detected: ${key}`,
            context,
            pattern: key
          })
        }
      }
      
      // Check for secrets in environment values
      if (value.length > 20 && !key.includes('TEST') && !key.includes('test')) {
        const secretViolations = this.scanForSecrets(`${key}=${value}`, context)
        violations.push(...secretViolations)
      }
    }
    
    return violations
  }
  
  async reportViolations(violations: {
    type: string
    violations: string[]
    context: string
    timestamp: string
  }): Promise<void> {
    // In production, this would send to a security monitoring service
    console.warn('🚨 SECURITY VIOLATIONS REPORTED:', {
      type: violations.type,
      count: violations.violations.length,
      context: violations.context,
      timestamp: violations.timestamp
    })
    
    // Store in audit log
    await this.logToAuditTrail(violations)
  }
  
  private getSecretSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      password: 'high',
      token: 'high',
      api_key: 'high',
      secret: 'critical',
      private_key: 'critical',
      aws_access_key: 'critical',
      github_token: 'high',
      database_url: 'high'
    }
    
    return severityMap[type] || 'medium'
  }
  
  private hashContent(content: string): string {
    return Bun.hash.crc32(content).toString()
  }
  
  private async logToAuditTrail(violations: any): Promise<void> {
    // Mock audit logging - in production would use secure logging
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event: 'security_violation',
      data: violations,
      severity: 'high'
    }
    
    console.log('📝 Audit entry:', auditEntry)
  }
}

// CSRF Protection Service
export class CSRFProtector {
  private tokens = new Map<string, { token: string; expires: number }>()
  
  constructor(private options: { testMode?: boolean } = {}) {}
  
  async generateToken(): Promise<string> {
    const token = this.options.testMode 
      ? 'test-csrf-token-' + Math.random().toString(36).substring(2)
      : await this.generateSecureToken()
    
    this.tokens.set(token, {
      token,
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    })
    
    return token
  }
  
  async verifyToken(token: string): Promise<boolean> {
    const stored = this.tokens.get(token)
    if (!stored) return false
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(token)
      return false
    }
    
    return true
  }
  
  async verifyTokenScope(token: string, registry: string): Promise<boolean> {
    // In production, would verify token against registry API
    // For now, just check token format and length
    return token.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(token)
  }
  
  async validateRequest(request: Request): Promise<boolean> {
    const token = request.headers.get('X-CSRF-Token')
    if (!token) return false
    
    return this.verifyToken(token)
  }
  
  private async generateSecureToken(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  cleanup(): void {
    const now = Date.now()
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(token)
      }
    }
  }
}

// Secure Cookie Manager
export class SecureCookieManager {
  private store = new Map<string, { value: string; expires?: number; httpOnly?: boolean; secure?: boolean }>()
  
  async get(key: string): Promise<string | undefined> {
    const cookie = this.store.get(key)
    if (!cookie) return undefined
    
    if (cookie.expires && Date.now() > cookie.expires) {
      this.store.delete(key)
      return undefined
    }
    
    return cookie.value
  }
  
  async set(key: string, value: string, options: {
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
  } = {}): Promise<void> {
    this.store.set(key, {
      value,
      expires: options.expires?.getTime(),
      httpOnly: options.httpOnly ?? true,
      secure: options.secure ?? true
    })
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
  
  async clear(): Promise<void> {
    this.store.clear()
  }
  
  getAll(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, cookie] of this.store.entries()) {
      if (!cookie.expires || Date.now() <= cookie.expires) {
        result[key] = cookie.value
      }
    }
    return result
  }
}

// Environment Isolation Validator
export class EnvironmentIsolationValidator {
  private threatIntel = new ThreatIntelligenceService()
  
  async validateEnvironmentFiles(context: 'ci' | 'local' | 'staging'): Promise<{
    valid: boolean
    violations: SecurityViolation[]
  }> {
    const violations: SecurityViolation[] = []
    const envFiles = [
      '.env.test',
      `.env.${context}`,
      '.env.local',
      '.env'
    ]
    
    for (const envFile of envFiles) {
      if (await Bun.file(envFile).exists()) {
        const content = await Bun.file(envFile).text()
        
        // Parse environment variables
        const env = this.parseEnvFile(content)
        
        // Scan for violations
        violations.push(...this.threatIntel.scanEnvironmentVariables(env, envFile))
        violations.push(...this.threatIntel.scanForSecrets(content, envFile))
      }
    }
    
    return {
      valid: violations.length === 0,
      violations
    }
  }
  
  async validateTestIsolation(): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    // Check NODE_ENV
    if (process.env.NODE_ENV !== 'test') {
      issues.push('NODE_ENV is not set to "test"')
    }
    
    // Check for production database URLs
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('test')) {
      issues.push('DATABASE_URL may be pointing to production database')
    }
    
    // Check for production API URLs
    if (process.env.API_URL && !process.env.API_URL.includes('test') && !process.env.API_URL.includes('localhost')) {
      issues.push('API_URL may be pointing to production API')
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
  
  private parseEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {}
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim()
        env[key.trim()] = value
      }
    }
    
    return env
  }
}

// Security Audit Service
export class SecurityAuditService {
  private threatIntel = new ThreatIntelligenceService()
  private csrfProtector = new CSRFProtector()
  private envValidator = new EnvironmentIsolationValidator()
  
  async auditConfiguration(config: BunTestConfig, context: string): Promise<{
    valid: boolean
    violations: SecurityViolation[]
  }> {
    const violations: SecurityViolation[] = []
    
    // Audit install section
    if (config.install.token) {
      violations.push(...this.threatIntel.scanForSecrets(
        `token=${config.install.token}`,
        `${context}.install.token`
      ))
    }
    
    if (config.install.registry) {
      const urlValidation = this.validateRegistryUrl(config.install.registry)
      if (!urlValidation.valid) {
        violations.push(...urlValidation.violations)
      }
    }
    
    // Audit test section
    if (config.test.preload) {
      for (const preload of config.test.preload) {
        if (preload.includes('..') || preload.startsWith('/')) {
          violations.push({
            type: 'path_traversal',
            severity: 'high',
            message: `Unsafe preload script path: ${preload}`,
            context: `${context}.test.preload`
          })
        }
      }
    }
    
    return {
      valid: violations.length === 0,
      violations
    }
  }
  
  async auditTestFiles(testFiles: string[]): Promise<{
    valid: boolean
    violations: SecurityViolation[]
  }> {
    const violations: SecurityViolation[] = []
    
    for (const file of testFiles) {
      if (await Bun.file(file).exists()) {
        const content = await Bun.file(file).text()
        
        violations.push(...this.threatIntel.scanForSecrets(content, file))
        violations.push(...this.threatIntel.scanForNetworkAnomalies(content, file))
        violations.push(...this.threatIntel.scanForFileSystemAnomalies(content, file))
      }
    }
    
    return {
      valid: violations.length === 0,
      violations
    }
  }
  
  private validateRegistryUrl(url: string): { valid: boolean; violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = []
    
    try {
      const parsed = new URL(url)
      
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
        violations.push({
          type: 'insecure_url',
          severity: 'high',
          message: 'Registry must use HTTPS or be localhost',
          context: 'install.registry',
          pattern: url
        })
      }
      
      // Check for suspicious registry domains
      const suspiciousDomains = ['npm-proxy', 'registry-mirror', 'pkg-proxy']
      if (suspiciousDomains.some(domain => parsed.hostname.includes(domain))) {
        violations.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          message: 'Suspicious registry domain detected',
          context: 'install.registry',
          pattern: parsed.hostname
        })
      }
      
    } catch (error) {
      violations.push({
        type: 'insecure_url',
        severity: 'high',
        message: 'Invalid registry URL format',
        context: 'install.registry',
        pattern: url
      })
    }
    
    return {
      valid: violations.length === 0,
      violations
    }
  }
}
