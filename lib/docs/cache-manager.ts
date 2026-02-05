export interface CacheConfig {
  ttl: number // milliseconds
  maxSize: number
  offlineMode: boolean
}

export class DocsCacheManager {
  private cache: Map<string, { data: any; timestamp: number }>
  private config: CacheConfig
  private cacheDir: string

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      offlineMode: false,
      ...config
    }
    
    this.cache = new Map()
    this.cacheDir = this.getCacheDir()
    this.initCacheStorage()
  }

  private getCacheDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE
    const baseDir = home ? `${home}/.cache/bun-docs` : '/tmp/bun-docs'
    
    // Create directory if it doesn't exist
    try {
      Bun.$`mkdir -p ${baseDir}`.quiet()
    } catch {}
    
    return baseDir
  }

  private async initCacheStorage() {
    try {
      const cacheFile = Bun.file(`${this.cacheDir}/index.json`)
      if (await cacheFile.exists()) {
        const content = await cacheFile.json()
        Object.entries(content).forEach(([key, value]: [string, any]) => {
          this.cache.set(key, value)
        })
      }
    } catch {}
  }

  async saveCache() {
    const cacheData = Object.fromEntries(this.cache.entries())
    await Bun.write(
      `${this.cacheDir}/index.json`,
      JSON.stringify(cacheData, null, 2)
    )
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  async set(key: string, data: any): Promise<void> {
    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0]
      if (oldestKey) this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    await this.saveCache()
  }

  async fetchWithCache<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const cacheKey = `fetch:${url}` 
    
    // Try cache first
    if (!this.config.offlineMode) {
      const cached = await this.get<T>(cacheKey)
      if (cached) return cached
    }
    
    // Rate limiting protection
    await this.rateLimitProtection()
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Bun-Docs-Indexer/1.0',
          ...options?.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Cache successful response
      await this.set(cacheKey, data)
      
      return data
    } catch (error) {
      // Fallback to cache even if expired
      const cached = await this.get<T>(cacheKey)
      if (cached) {
        console.warn(`Using cached data for ${url}:`, error.message)
        return cached
      }
      
      throw error
    }
  }

  private async rateLimitProtection(): Promise<void> {
    const lastRequestKey = 'last_request'
    const lastRequest = await this.get<number>(lastRequestKey)
    
    if (lastRequest) {
      const timeSinceLast = Date.now() - lastRequest
      const minDelay = 1000 // 1 second between requests
      
      if (timeSinceLast < minDelay) {
        await Bun.sleep(minDelay - timeSinceLast)
      }
    }
    
    await this.set(lastRequestKey, Date.now())
  }

  clear(): void {
    this.cache.clear()
    Bun.$`rm -f ${this.cacheDir}/index.json`.quiet()
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      offlineMode: this.config.offlineMode,
      cacheDir: this.cacheDir
    }
  }
}
