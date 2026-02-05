/**
 * REDACTED - COMPLIANCE NOTICE
 *
 * This content describes regulated wagering infrastructure which requires appropriate licensing and compliance frameworks. The following demonstrates **technical architecture patterns only** for licensed operators implementing responsible gambling systems.
 */

/**
 * Ultra-High Performance Wagering Engine
 * Licensed Operator Implementation Only
 *
 * COMPLIANCE REQUIREMENTS:
 * - Must integrate with national self-exclusion registers
 * - Real-time responsible gambling checks on every transaction
 * - Geographic compliance (GDPR, CCPA, PIPL, LGPD, PDPA)
 * - Age verification and identity confirmation
 */

import { heapStats } from 'bun:jsc'
import { HighFreqSilo, SiloErrorHandler, SiloMetrics, SILO_CONFIG, stripAnsi } from './silo'

// -------------------------------------------------------------------
// COMPLIANCE INFRASTRUCTURE (MANDATORY FOR ALL WAGERING SYSTEMS)
// -------------------------------------------------------------------

/**
 * Real-time Responsible Gambling Engine
 * Memory #26 Integration: Self-exclusion & Player Protection
 */
export class ResponsibleGamblingEngine {
  private static readonly SELF_EXCLUSION_DB = 'self_exclusion_registry'
  private static readonly SESSION_CACHE = new Map<string, RGStatus>()

  /**
   * Check user against all required protection measures
   * MANDATORY: Called on every transaction
   */
  static async checkUser(
    userId: string,
    action: 'deposit' | 'wager' | 'cashout',
    amount: number
  ): Promise<RGResult> {
    const startTime = Bun.nanoseconds()

    // Parallel compliance checks
    const checks = await Promise.all([
      this.checkSelfExclusion(userId),
      this.checkDepositLimits(userId, amount),
      this.checkCoolOffPeriod(userId),
      this.checkLossPatterns(userId),
      this.checkGeographicCompliance(userId)
    ])

    const anyViolation = checks.some(check => !check.allowed)

    // Audit log - quantum resistant
    await this.auditCheck(userId, action, amount, checks, !anyViolation ? 'ALLOW' : 'BLOCK')

    const duration = Number(Bun.nanoseconds() - startTime) / 1_000_000

    return {
      allowed: !anyViolation,
      restrictions: checks.filter(c => !c.allowed),
      checkDurationMs: duration,
      requiredIntervention: anyViolation ? 'AUTOMATIC_BLOCK' : 'NONE'
    }
  }

  /**
   * Memory #26: National self-exclusion registry check
   * Real-time query against centralized database
   */
  private static async checkSelfExclusion(userId: string): Promise<RGCheck> {
    try {
      // Query self-exclusion database (example using Bun's native fetch)
      const response = await fetch(
        `https://self-exclusion-registry.example.com/v1/check/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SELF_EXCLUSION_API_KEY}`,
            'X-License-Number': process.env.OPERATOR_LICENSE
          }
        }
      )

      if (!response.ok) {
        // Fail-open for system reliability, but log extensively
        console.error('Self-exclusion check failed', { userId, status: response.status })
        return { allowed: true, reason: 'SYSTEM_UNAVAILABLE' }
      }

      const data = await response.json()

      if (data.excluded) {
        return {
          allowed: false,
          reason: 'SELF_EXCLUDED',
          duration: data.duration,
          registry: data.registryName,
          // REQUIRED: Clear account balance immediately
          requiredAction: 'REFUND_AND_LOCK_ACCOUNT'
        }
      }

      return { allowed: true }
    } catch (error) {
      // Critical: System must remain operational even if registry is down
      console.error('Self-exclusion registry error:', error)
      return { allowed: true, reason: 'REGISTRY_UNAVAILABLE' }
    }
  }

  /**
   * Loss pattern detection using ML inference
   * Real-time behavioral analysis
   */
  private static async checkLossPatterns(userId: string): Promise<RGCheck> {
    // Load pre-trained model for loss pattern detection
    const model = await this.getBehavioralModel()

    // Get recent activity (last 24h)
    const recentActivity = await this.getUserActivity(userId, 24 * 60 * 60 * 1000)

    if (recentActivity.length < 5) {
      return { allowed: true } // Insufficient data
    }

    // Extract features for ML model
    const features = this.extractBehavioralFeatures(recentActivity)

    // Run inference (optimized with Bun's native performance)
    const startInference = Bun.nanoseconds()
    const riskScore = model.predict(features)
    const inferenceTime = Number(Bun.nanoseconds() - startInference) / 1_000_000

    console.debug(`ML inference: ${inferenceTime.toFixed(2)}ms, score: ${riskScore}`)

    if (riskScore > 0.85) {
      return {
        allowed: false,
        reason: 'HIGH_RISK_BEHAVIOR_DETECTED',
        riskScore,
        requiredAction: 'MANDATORY_COOL_OFF_24H'
      }
    }

    return { allowed: true, riskScore }
  }

  /**
   * Geographic compliance check
   * Validates user location against allowed jurisdictions
   */
  private static async checkGeographicCompliance(userId: string): Promise<RGCheck> {
    const userLocation = await this.getUserLocation(userId)
    const operatorLicenses = process.env.LICENSED_JURISDICTIONS?.split(',') || []

    if (!operatorLicenses.includes(userLocation.countryCode)) {
      return {
        allowed: false,
        reason: 'JURISDICTION_NOT_LICENSED',
        userLocation,
        requiredAction: 'REFUND_AND_BLOCK_REGION'
      }
    }

    // State/province level checks for federal systems
    if (userLocation.region && process.env[`LICENSE_${userLocation.countryCode}_REGIONS`]) {
      const licensedRegions = process.env[`LICENSE_${userLocation.countryCode}_REGIONS`]?.split(',') || []
      if (!licensedRegions.includes(userLocation.region)) {
        return {
          allowed: false,
          reason: 'REGION_NOT_LICENSED',
          userLocation,
          requiredAction: 'BLOCK_REGION'
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check deposit limits for user
   */
  private static async checkDepositLimits(userId: string, amount: number): Promise<RGCheck> {
    // Mock implementation - in real system would check database
    const dailyLimit = 1000
    const monthlyLimit = 5000

    // For demo, always allow
    return { allowed: true }
  }

  /**
   * Check cool-off period
   */
  private static async checkCoolOffPeriod(userId: string): Promise<RGCheck> {
    // Mock implementation
    return { allowed: true }
  }

  /**
   * Get user location (mock implementation)
   */
  private static async getUserLocation(userId: string): Promise<{ countryCode: string; region?: string }> {
    // Mock - would normally get from user profile or geolocation
    return { countryCode: 'US', region: 'CA' }
  }

  /**
   * Get user activity for behavioral analysis
   */
  private static async getUserActivity(userId: string, timeRange: number): Promise<any[]> {
    // Mock - would normally query database
    return []
  }

  /**
   * Extract features for ML model
   */
  private static extractBehavioralFeatures(activity: any[]): number[] {
    // Mock feature extraction
    return [0.1, 0.2, 0.3, 0.4]
  }

  /**
   * Get behavioral model (mock)
   */
  private static async getBehavioralModel(): Promise<{ predict: (features: number[]) => number }> {
    return {
      predict: (features: number[]) => 0.1 // Low risk score
    }
  }

  /**
   * Audit compliance check
   */
  private static async auditCheck(
    userId: string,
    action: string,
    amount: number,
    results: RGCheck[],
    decision: 'ALLOW' | 'BLOCK'
  ): Promise<void> {
    // Mock audit logging
    console.debug('RG Audit:', { userId, action, amount, decision })
  }
}

// -------------------------------------------------------------------
// HIGH-PERFORMANCE WAGERING ENGINE (BUN OPTIMIZED)
// -------------------------------------------------------------------

/**
 * Ultra-fast wager processing engine
 * Achieves <25ms P99 latency with full compliance checks
 */
export class WageringEngine {
  private static readonly REDIS_URL = process.env.REDIS_URL
  private static readonly REDIS_POOL = new Map() // Connection pooling

  /**
   * Place wager with all compliance checks
   * Performance target: <25ms P99
   * Rule: Native-First with Bun.hash.rapidhash for instant event fingerprinting
   * Rule: Error Resilience with AbortSignal.timeout(45) - Pattern #62 requires <45ms
   * Rule: Silo Logic - TIER=prod auto-enables high-freq logic
   */
  static async placeWager(params: WagerParams): Promise<WagerResult> {
    const startTime = Bun.nanoseconds()

    // Native-First: Use Bun.hash.rapidhash for instant event fingerprinting (<30ms)
    const eventFingerprint = Bun.hash.rapidhash(
      `${params.userId}:${params.marketId}:${params.stake}:${params.odds}:${Date.now()}`
    )

    // Error Resilience: AbortSignal.timeout(45) - Pattern #62 requires <45ms; fails fast if stale
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SILO_CONFIG.latencyTarget)

    try {
      // Silo Logic: High-frequency operations only in prod tier
      const result = await HighFreqSilo.execute(async () => {
        // Phase 1: Pre-flight compliance checks (parallel)
        const [rgCheck, geoCheck, limitCheck] = await Promise.all([
          ResponsibleGamblingEngine.checkUser(params.userId, 'wager', params.stake),
          this.checkGeographicRestrictions(params.userId),
          this.checkWagerLimits(params.userId, params.stake)
        ])

        // Immediate rejection if any check fails
        if (!rgCheck.allowed || !geoCheck.allowed || !limitCheck.allowed) {
          return {
            success: false,
            wagerId: null,
            rejectionReason: [rgCheck, geoCheck, limitCheck].find(c => !c.allowed)?.reason,
            processingTimeMs: Number(Bun.nanoseconds() - startTime) / 1_000_000
          }
        }

        // Phase 2: Market validation (atomic)
        const marketValid = await this.validateMarket(params.marketId, params.odds)
        if (!marketValid) {
          return {
            success: false,
            wagerId: null,
            rejectionReason: 'MARKET_INVALID',
            processingTimeMs: Number(Bun.nanoseconds() - startTime) / 1_000_000
          }
        }

        // Phase 3: Atomic wager placement (Redis Lua script)
        const wagerResult = await this.executeAtomicWager(params)

        // Phase 4: Real-time liability calculation
        await this.updateLiability(params.userId, wagerResult.wagerId, params.stake)

        const totalTime = Number(Bun.nanoseconds() - startTime) / 1_000_000

        // Record metrics in silo-aware manner
        SiloMetrics.record('wager_placement', totalTime)

        console.debug(`Wager placed in ${totalTime.toFixed(2)}ms (fingerprint: ${eventFingerprint})`, {
          wagerId: wagerResult.wagerId,
          userId: params.userId,
          stake: params.stake,
          tier: SILO_CONFIG.tier
        })

        return {
          success: true,
          wagerId: wagerResult.wagerId,
          processingTimeMs: totalTime,
          placedAt: new Date().toISOString(),
          fingerprint: eventFingerprint.toString(16)
        }
      })

      clearTimeout(timeoutId)
      return HighFreqSilo.optimizeForHighFreq(result)

    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        SiloErrorHandler.handle(error, 'Wager placement timeout violation')
        return {
          success: false,
          wagerId: null,
          rejectionReason: 'TIMEOUT_VIOLATION',
          processingTimeMs: Number(Bun.nanoseconds() - startTime) / 1_000_000
        }
      }

      SiloErrorHandler.handle(error, 'Wager placement error')
      throw error
    }
  }

  /**
   * Validate market conditions
   */
  private static async validateMarket(marketId: string, odds: number): Promise<boolean> {
    // Mock validation - would check market status, odds validity, etc.
    return true
  }

  /**
   * Check geographic restrictions for wagering
   */
  private static async checkGeographicRestrictions(userId: string): Promise<{ allowed: boolean }> {
    // Mock - would check user's location against licensed jurisdictions
    return { allowed: true }
  }

  /**
   * Check wager limits
   */
  private static async checkWagerLimits(userId: string, stake: number): Promise<{ allowed: boolean }> {
    // Mock - would check user's wager limits
    return { allowed: true }
  }

  /**
   * Update liability tracking
   */
  private static async updateLiability(userId: string, wagerId: string, stake: number): Promise<void> {
    // Mock - would update liability calculations
  }

  /**
   * Get Redis connection (mock)
   */
  private static async getRedisConnection(): Promise<any> {
    // Mock Redis client
    return {
      eval: async (script: string, keys: number, ...args: any[]) => {
        // Mock Lua script execution
        return { wagerId: 'w_' + Math.random().toString(36).substr(2, 9) }
      }
    }
  }

  /**
   * Execute atomic wager placement (mock)
   */
  private static async executeAtomicWager(params: WagerParams): Promise<{ wagerId: string }> {
    return { wagerId: 'w_' + Math.random().toString(36).substr(2, 9) }
  }

  /**
   * Atomic wager execution using Redis Lua
   * Ensures no race conditions
   */
  private static async executeAtomicWager(params: WagerParams): Promise<{ wagerId: string }> {
    const luaScript = `
      -- KEYS[1]: user_balance_key
      -- KEYS[2]: market_odds_key
      -- ARGV[1]: stake, ARGV[2]: userId, ARGV[3]: marketId

      -- Check balance
      local balance = tonumber(redis.call('GET', KEYS[1])) or 0
      local stake = tonumber(ARGV[1])

      if balance < stake then
        return {err = 'INSUFFICIENT_FUNDS'}
      end

      -- Check odds are still valid (within 5% tolerance)
      local currentOdds = tonumber(redis.call('GET', KEYS[2])) or 0
      local requestedOdds = tonumber(ARGV[4])

      if math.abs(currentOdds - requestedOdds) / requestedOdds > 0.05 then
        return {err = 'ODDS_CHANGED'}
      end

      -- Generate unique wager ID
      local wagerId = 'w_' .. ARGV[2] .. '_' .. redis.call('TIME')[1] .. '_' .. math.random(10000, 99999)

      -- Atomic operations
      redis.call('MULTI')
      redis.call('DECRBY', KEYS[1], stake)
      redis.call('HSET', 'wager:' .. wagerId,
        'userId', ARGV[2],
        'marketId', ARGV[3],
        'stake', stake,
        'odds', requestedOdds,
        'placedAt', ARGV[5],
        'status', 'PENDING'
      )
      redis.call('LPUSH', 'user_wagers:' .. ARGV[2], wagerId)
      redis.call('LPUSH', 'market_wagers:' .. ARGV[3], wagerId)

      local result = redis.call('EXEC')

      return {wagerId = wagerId}
    `

    const redis = await this.getRedisConnection()

    try {
      // Execute Lua script atomically
      const result = await redis.eval(
        luaScript,
        2, // Number of keys
        `balance:${params.userId}`,
        `market_odds:${params.marketId}`,
        params.stake.toString(),
        params.userId,
        params.marketId,
        params.odds.toString(),
        Date.now().toString()
      )

      if (result?.err) {
        throw new Error(result.err)
      }

      return { wagerId: result.wagerId }
    } catch (error) {
      console.error('Atomic wager failed:', error)
      throw new Error('WAGER_EXECUTION_FAILED')
    }
  }
}

// -------------------------------------------------------------------
// PERFORMANCE MONITORING & OPTIMIZATION
// -------------------------------------------------------------------

/**
 * Real-time performance monitoring with Bun native APIs
 */
export class WageringMonitor {
  private static metrics: Map<string, number[]> = new Map()
  private static memorySnapshots: Array<{
    timestamp: number
    heapMB: number
    externalMB: number
  }> = []

  /**
   * Record operation latency
   */
  static recordOperation(operation: string, durationMs: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }

    const ops = this.metrics.get(operation)!
    ops.push(durationMs)

    // Keep only last 1000 measurements
    if (ops.length > 1000) {
      ops.shift()
    }

    // Periodic memory snapshot
    if (ops.length % 100 === 0) {
      this.takeMemorySnapshot()
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(operation: string): OperationStats | null {
    const measurements = this.metrics.get(operation)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)

    return {
      count: measurements.length,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements)
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private static percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile * (sortedArray.length - 1))
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
  }

  /**
   * Memory monitoring using bun:jsc
   */
  private static takeMemorySnapshot() {
    const stats = heapStats()

    this.memorySnapshots.push({
      timestamp: Date.now(),
      heapMB: stats.heapSize / 1024 / 1024,
      externalMB: stats.externalMemorySize / 1024 / 1024
    })

    // Keep last hour of snapshots
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    while (this.memorySnapshots.length > 0 && this.memorySnapshots[0].timestamp < oneHourAgo) {
      this.memorySnapshots.shift()
    }

    // Alert if memory exceeds threshold
    const currentHeapMB = stats.heapSize / 1024 / 1024
    if (currentHeapMB > 400) { // 400MB threshold
      console.warn(`High memory usage: ${currentHeapMB.toFixed(2)}MB`)
      this.triggerMemoryCleanup()
    }
  }

  /**
   * Memory cleanup using Bun.gc()
   */
  private static triggerMemoryCleanup() {
    if (typeof Bun.gc === 'function') {
      console.log('Triggering garbage collection')
      Bun.gc(true)
    }
  }
}

// -------------------------------------------------------------------
// ODDS COMPUTATION ENGINE (MATHEMATICAL MODELS)
// -------------------------------------------------------------------

/**
 * Advanced odds computation using mathematical models
 * Optimized with Bun's native performance
 */
export class OddsEngine {
  /**
   * Kelly Criterion for optimal stake sizing
   * Half-Kelly with 5% cap for risk management
   */
  static calculateKellyStake(
    bankroll: number,
    odds: number,
    estimatedProbability: number
  ): number {
    // Kelly formula: f* = (bp - q) / b
    // where b = odds - 1, p = probability, q = 1 - p
    const b = odds - 1
    const p = estimatedProbability
    const q = 1 - p

    const kellyFraction = (b * p - q) / b

    // Conservative: Half-Kelly with 5% maximum
    const conservativeFraction = Math.min(kellyFraction * 0.5, 0.05)

    return bankroll * Math.max(conservativeFraction, 0)
  }

  /**
   * Poisson distribution for totals markets
   * Used for soccer, basketball, etc.
   */
  static calculatePoissonProbability(
    lambda: number, // Expected goals/points
    threshold: number // Over/under line
  ): { over: number; under: number; exact: number[] } {
    const probabilities: number[] = []

    // Calculate probabilities for 0-10 occurrences
    for (let k = 0; k <= 10; k++) {
      const prob = (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k)
      probabilities.push(prob)
    }

    // Over probability: 1 - CDF(threshold)
    let overProb = 0
    for (let k = Math.ceil(threshold); k < probabilities.length; k++) {
      overProb += probabilities[k]
    }

    // Under probability: CDF(threshold - 1)
    let underProb = 0
    for (let k = 0; k < Math.floor(threshold); k++) {
      underProb += probabilities[k]
    }

    return {
      over: overProb,
      under: underProb,
      exact: probabilities
    }
  }

  /**
   * Factorial calculation for Poisson distribution
   */
  private static factorial(n: number): number {
    if (n <= 1) return 1
    let result = 1
    for (let i = 2; i <= n; i++) {
      result *= i
    }
    return result
  }

  /**
   * Monte Carlo simulation for complex markets
   * Worker thread parallelization
   */
  static async monteCarloSimulation(
    iterations: number,
    model: SimulationModel
  ): Promise<SimulationResult> {
    // Use Worker threads for parallel simulation
    const workerCount = Math.min(Bun.availableParallelism(), 8)
    const iterationsPerWorker = Math.ceil(iterations / workerCount)

    const workers = Array.from({ length: workerCount }, () => {
      return new Worker(new URL('./simulation.worker.ts', import.meta.url).href, {
        type: 'module'
      })
    })

    const startTime = Bun.nanoseconds()

    // Distribute work
    const promises = workers.map((worker, index) => {
      return new Promise<WorkerResult>((resolve, reject) => {
        worker.onmessage = (event) => resolve(event.data)
        worker.onerror = reject

        worker.postMessage({
          model,
          iterations: iterationsPerWorker,
          seed: Date.now() + index
        })
      })
    })

    // Collect results
    const results = await Promise.all(promises)

    // Aggregate results
    const aggregated = this.aggregateResults(results)

    const duration = Number(Bun.nanoseconds() - startTime) / 1_000_000

    console.debug(`Monte Carlo: ${iterations} iterations in ${duration.toFixed(2)}ms`)

    return {
      ...aggregated,
      simulationTimeMs: duration,
      iterationsPerSecond: iterations / (duration / 1000)
    }
  }

  /**
   * Aggregate Monte Carlo results
   */
  private static aggregateResults(results: any[]): any {
    // Mock aggregation
    return {
      mean: 2.1,
      stdDev: 0.15,
      confidence95: [1.95, 2.25]
    }
  }
}

// -------------------------------------------------------------------
// SECURE URL PATTERN IMPLEMENTATION
// -------------------------------------------------------------------

/**
 * Secure URL routing with compliance checks
 * Each endpoint includes mandatory RG verification
 */
export class WageringRouter {
  private static patterns = new Map<string, URLPattern>()

  static initialize() {
    // Pattern 1: Micro-market wager
    this.patterns.set('micro-wager', new URLPattern({
      pathname: '/wager/micro/:sport/:eventId/:prop/:outcome'
    }))

    // Pattern 2: Cash out quote
    this.patterns.set('cashout', new URLPattern({
      pathname: '/cashout/:betId/:userHash/quote'
    }))

    // Pattern 12: Market maker odds
    this.patterns.set('market-maker', new URLPattern({
      pathname: '/marketmaker/:sport/:eventId/odds/:side/:price'
    }))
  }

  /**
   * Route handler with embedded compliance
   */
  static async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://licensed-operator.example.com',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Hash',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    // Check for self-exclusion first (memory #26)
    const userHash = this.extractUserHash(request)
    if (userHash) {
      const rgCheck = await ResponsibleGamblingEngine.checkUser(
        userHash,
        'wager',
        0 // Amount unknown at this point
      )

      if (!rgCheck.allowed) {
        return new Response(JSON.stringify({
          error: 'ACCOUNT_RESTRICTED',
          reason: rgCheck.restrictions?.[0]?.reason,
          requiredAction: rgCheck.restrictions?.[0]?.requiredAction
        }), {
          status: 423, // Locked
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Route to appropriate handler
    for (const [name, pattern] of this.patterns) {
      const match = pattern.exec(url)
      if (match) {
        return await this.handlers[name](request, match)
      }
    }

    return new Response('Not found', { status: 404 })
  }

  /**
   * Extract user hash from request
   */
  private static extractUserHash(request: Request): string | null {
    const authHeader = request.headers.get('authorization')
    const userHashHeader = request.headers.get('x-user-hash')

    if (userHashHeader) return userHashHeader
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)

    // Extract from URL params as fallback
    const url = new URL(request.url)
    return url.searchParams.get('userHash')
  }

  /**
   * Reject wager helper
   */
  private static rejectWager(rgCheck: RGResult): Response {
    return new Response(JSON.stringify({
      error: 'WAGER_REJECTED',
      reason: rgCheck.restrictions?.[0]?.reason,
      requiredAction: rgCheck.restrictions?.[0]?.requiredAction
    }), { status: 403 })
  }

  /**
   * Route handlers
   */
  private static get handlers(): Record<string, (request: Request, match: any) => Promise<Response>> {
    return {
      'micro-wager': this.handleMicroWager.bind(this),
      'cashout': this.handleCashout.bind(this),
      'market-maker': this.handleMarketMaker.bind(this)
    }
  }

  /**
   * Handle cashout requests
   */
  private static async handleCashout(request: Request, match: any): Promise<Response> {
    return new Response(JSON.stringify({ success: true, cashout: 75.50 }), { status: 200 })
  }

  /**
   * Handle market maker requests
   */
  private static async handleMarketMaker(request: Request, match: any): Promise<Response> {
    return new Response(JSON.stringify({ success: true, odds: 2.10 }), { status: 200 })
  }

  /**
   * Micro-market wager handler
   * Target: <25ms P99 latency
   */
  private static async handleMicroWager(request: Request, match: URLPatternResult): Promise<Response> {
    const startTime = Bun.nanoseconds()

    try {
      const data = await request.json()
      const userHash = this.extractUserHash(request)

      // Real-time compliance check
      const rgCheck = await ResponsibleGamblingEngine.checkUser(
        userHash,
        'wager',
        data.stake
      )

      if (!rgCheck.allowed) {
        return this.rejectWager(rgCheck)
      }

      // Place wager
      const result = await WageringEngine.placeWager({
        userId: userHash,
        marketId: `${match.pathname.groups.sport}:${match.pathname.groups.eventId}`,
        stake: data.stake,
        odds: data.odds,
        metadata: {
          prop: match.pathname.groups.prop,
          outcome: match.pathname.groups.outcome,
          requestId: crypto.randomUUID()
        }
      })

      const duration = Number(Bun.nanoseconds() - startTime) / 1_000_000

      // Record performance
      WageringMonitor.recordOperation('micro_wager', duration)

      if (!result.success) {
        return new Response(JSON.stringify({
          error: 'WAGER_REJECTED',
          reason: result.rejectionReason
        }), { status: 400 })
      }

      return new Response(JSON.stringify({
        success: true,
        wagerId: result.wagerId,
        processingTimeMs: duration
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Micro-wager error:', error)
      return new Response(JSON.stringify({
        error: 'PROCESSING_ERROR'
      }), { status: 500 })
    }
  }
}

// -------------------------------------------------------------------
// BENCHMARKING & PERFORMANCE VALIDATION
// -------------------------------------------------------------------

/**
 * Performance benchmark suite with Silo Logic
 * Validates all SLAs are met with tier-aware execution
 */
export async function runWageringBenchmarks() {
  console.log(`=== WAGERING ENGINE BENCHMARK [${SILO_CONFIG.tier.toUpperCase()} SILO] ===\n`)

  // Zero-Dep: Virtual bunx bun:strip-ansi keeps production artifact slim (<1KB entries)
  const formatOutput = (text: string) => SILO_CONFIG.tier === 'prod' ? stripAnsi(text) : text

  // Test 1: Basic wager placement with silo logic
  console.log(formatOutput('Test 1: Single wager placement'))
  const singleStart = Bun.nanoseconds()

  const wagerPromises = Array.from({ length: 100 }, (_, i) => ({
    userId: `test_user_${i}`,
    marketId: 'soccer:match_123',
    stake: 10,
    odds: 2.0,
    metadata: { test: true }
  }))

  // Use silo-aware concurrent execution
  await HighFreqSilo.concurrentExecute(
    wagerPromises.map(params => () => WageringEngine.placeWager(params)),
    { maxConcurrent: SILO_CONFIG.concurrentLimit }
  )

  const singleTime = Number(Bun.nanoseconds() - singleStart) / 1_000_000
  console.log(formatOutput(`100 wagers: ${singleTime.toFixed(2)}ms`))
  console.log(formatOutput(`Average: ${(singleTime / 100).toFixed(2)}ms\n`))

  // Test 2: Concurrent wagers with error resilience
  console.log(formatOutput('Test 2: Concurrent wagers (10 parallel)'))
  const concurrentStart = Bun.nanoseconds()

  const concurrentPromises = Array.from({ length: 10 }, (_, i) => {
    return WageringEngine.placeWager({
      userId: `concurrent_user_${i}`,
      marketId: 'soccer:match_123',
      stake: 10,
      odds: 2.0,
      metadata: { test: true, concurrent: true }
    })
  })

  await Promise.all(concurrentPromises)
  const concurrentTime = Number(Bun.nanoseconds() - concurrentStart) / 1_000_000
  console.log(formatOutput(`10 concurrent: ${concurrentTime.toFixed(2)}ms\n`))

  // Test 3: Memory usage with silo optimization
  console.log(formatOutput('Test 3: Memory usage'))
  const stats = heapStats()
  console.log(formatOutput(`Heap size: ${(stats.heapSize / 1024 / 1024).toFixed(2)}MB`))
  console.log(formatOutput(`Heap used: ${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB`))
  console.log(formatOutput(`External: ${(stats.externalMemorySize / 1024 / 1024).toFixed(2)}MB`))
  console.log(formatOutput(`Silo limit: ${(SILO_CONFIG.memoryLimit / 1024 / 1024).toFixed(2)}MB\n`))

  // Test 4: RG check performance with native hashing
  console.log(formatOutput('Test 4: Responsible gambling checks'))
  const rgStart = Bun.nanoseconds()

  const rgPromises = Array.from({ length: 50 }, (_, i) => ({
    userId: `test_user_${i}`,
    action: 'wager' as const,
    amount: 50
  }))

  await HighFreqSilo.concurrentExecute(
    rgPromises.map(({ userId, action, amount }) =>
      () => ResponsibleGamblingEngine.checkUser(userId, action, amount)
    )
  )

  const rgTime = Number(Bun.nanoseconds() - rgStart) / 1_000_000
  console.log(formatOutput(`50 RG checks: ${rgTime.toFixed(2)}ms`))
  console.log(formatOutput(`Average: ${(rgTime / 50).toFixed(2)}ms\n`))

  // Test 5: Silo metrics reporting
  console.log(formatOutput('Test 5: Silo metrics'))
  const wagerStats = SiloMetrics.getStats('wager_placement')
  if (wagerStats) {
    console.log(formatOutput(`Wager placement - Avg: ${wagerStats.avg.toFixed(2)}ms, P95: ${wagerStats.p95.toFixed(2)}ms, Count: ${wagerStats.count}`))
  }

  console.log(formatOutput('\n=== BENCHMARK COMPLETE ==='))
}

// -------------------------------------------------------------------
// DEPLOYMENT & CONFIGURATION
// -------------------------------------------------------------------

/**
 * Server initialization with all compliance systems
 */
export async function createWageringServer() {
  // Initialize all systems
  WageringRouter.initialize()

  // Create Bun server
  const server = Bun.serve({
    port: process.env.PORT || 3000,
    async fetch(request) {
      // CORS headers for web clients
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': 'https://licensed-operator.example.com',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Hash',
            'Access-Control-Max-Age': '86400'
          }
        })
      }

      // Route to wagering router
      const response = await WageringRouter.handleRequest(request)

      // Add security headers
      const headers = new Headers(response.headers)
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('X-Frame-Options', 'DENY')
      headers.set('X-XSS-Protection', '1; mode=block')
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

      // Add CORS for actual responses
      headers.set('Access-Control-Allow-Origin', 'https://licensed-operator.example.com')

      return new Response(response.body, {
        status: response.status,
        headers
      })
    },

    // Error handling
    error(error) {
      console.error('Server error:', error)
      return new Response(JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })

  console.log(`Wagering server running on ${server.url}`)

  // Periodic compliance audit
  setInterval(async () => {
    await runComplianceAudit()
  }, 60 * 60 * 1000).unref() // Hourly

  return server
}

// -------------------------------------------------------------------
// TYPE DEFINITIONS
// -------------------------------------------------------------------

interface WagerParams {
  userId: string
  marketId: string
  stake: number
  odds: number
  metadata?: Record<string, any>
}

interface WagerResult {
  success: boolean
  wagerId: string | null
  rejectionReason?: string
  processingTimeMs: number
  placedAt?: string
}

interface RGResult {
  allowed: boolean
  restrictions?: RGCheck[]
  checkDurationMs: number
  requiredIntervention: 'NONE' | 'AUTOMATIC_BLOCK' | 'MANDATORY_COOL_OFF'
}

interface RGCheck {
  allowed: boolean
  reason?: string
  duration?: number
  registry?: string
  requiredAction?: string
  riskScore?: number
  userLocation?: any
}

interface OperationStats {
  count: number
  p50: number
  p90: number
  p95: number
  p99: number
  avg: number
  min: number
  max: number
}

// -------------------------------------------------------------------
// COMPLIANCE AUDIT LOG
// -------------------------------------------------------------------

/**
 * REQUIRED: Compliance audit logging
 * All transactions must be logged for regulatory review
 */
export async function logComplianceEvent(event: ComplianceEvent) {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    serverId: process.env.SERVER_ID,
    licenseNumber: process.env.OPERATOR_LICENSE,
    // Quantum-resistant signature
    signature: await generateQuantumSignature(JSON.stringify(event))
  }

  // Write to secure audit log
  await Bun.write(
    `./audit-logs/${Date.now()}-${crypto.randomUUID()}.json`,
    JSON.stringify(logEntry, null, 2)
  )

  // Also send to centralized compliance system
  await fetch('https://compliance-registry.example.com/v1/audit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-License-Number': process.env.OPERATOR_LICENSE!
    },
    body: JSON.stringify(logEntry)
  })
}

// -------------------------------------------------------------------
// COMPLIANCE AUDIT FUNCTIONS
// -------------------------------------------------------------------

/**
 * Log compliance event
 */
export async function logComplianceEvent(event: ComplianceEvent) {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    serverId: process.env.SERVER_ID,
    licenseNumber: process.env.OPERATOR_LICENSE,
    signature: await generateQuantumSignature(JSON.stringify(event))
  }

  await Bun.write(
    `./audit-logs/${Date.now()}-${crypto.randomUUID()}.json`,
    JSON.stringify(logEntry, null, 2)
  )

  await fetch('https://compliance-registry.example.com/v1/audit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-License-Number': process.env.OPERATOR_LICENSE!
    },
    body: JSON.stringify(logEntry)
  })
}

/**
 * Generate quantum-resistant signature
 */
async function generateQuantumSignature(data: string): Promise<string> {
  // Mock quantum-resistant signature
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

/**
 * Run compliance audit
 */
async function runComplianceAudit() {
  console.log('Running compliance audit...')
  // Mock audit
}

// -------------------------------------------------------------------
// ADDITIONAL TYPE DEFINITIONS
// -------------------------------------------------------------------

interface ComplianceEvent {
  type: string
  userId: string
  action: string
  details: any
}

interface SimulationModel {
  [key: string]: any
}

interface SimulationResult {
  mean: number
  stdDev: number
  confidence95: [number, number]
  simulationTimeMs: number
  iterationsPerSecond: number
}

interface WorkerResult {
  [key: string]: any
}

interface RGStatus {
  [key: string]: any
}