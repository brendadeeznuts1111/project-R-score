#!/usr/bin/env bun

/**
 * 🎯 Interactive Documentation Explorer
 *
 * Enhanced with fuzzy search, interactive selection, and live updates
 */

import { EnhancedDocsFetcher, BunApiIndex } from './index-fetcher-enhanced'
import { ChromeAppManager } from '../cli/chrome-integration'

export interface InteractiveConfig {
  maxResults: number
  showCategories: boolean
  liveSearch: boolean
  autoOpen: boolean
  theme: 'dark' | 'light' | 'auto'
}

export class InteractiveDocsExplorer {
  private fetcher: EnhancedDocsFetcher
  private chromeManager: ChromeAppManager
  private config: InteractiveConfig

  constructor(config: Partial<InteractiveConfig> = {}) {
    this.fetcher = new EnhancedDocsFetcher({
      ttl: 6 * 60 * 60 * 1000,
      offlineMode: false
    })

    this.chromeManager = new ChromeAppManager({
      appName: 'Bun Interactive Docs',
      appUrl: 'https://bun.com/docs'
    })

    this.config = {
      maxResults: 10,
      showCategories: true,
      liveSearch: true,
      autoOpen: false,
      theme: 'auto',
      ...config
    }
  }

  async interactiveSearch(query: string = '', domain: 'sh' | 'com' = 'com') {
    console.log('🎯 Interactive Bun Documentation Explorer')
    console.log('='.repeat(50))
    console.log()

    if (!query) {
      query = await this.prompt('Enter search query (or "help" for commands): ')
    }

    if (query.toLowerCase() === 'help') {
      this.showHelp()
      return
    }

    if (query.toLowerCase() === 'categories') {
      await this.showCategories(domain)
      return
    }

    if (query.toLowerCase() === 'recent') {
      await this.showRecent()
      return
    }

    const results = await this.fetcher.search(query, domain)

    if (results.length === 0) {
      console.log(`❌ No results found for "${query}"`)
      console.log('💡 Try: "buffer", "http", "yaml", "semver", "websocket"')
      return
    }

    const limited = results.slice(0, this.config.maxResults)
    console.log(`🔍 Found ${results.length} results for "${query}"`)
    console.log()

    // Display results with numbers
    this.displayResults(limited, domain)

    // Interactive selection
    if (limited.length > 1) {
      const choice = await this.prompt('Select a result (number or "q" to quit): ')
      if (choice.toLowerCase() === 'q') return

      const index = parseInt(choice) - 1
      if (index >= 0 && index < limited.length) {
        await this.openResult(limited[index], domain)
      } else {
        console.log('❌ Invalid selection')
      }
    } else if (limited.length === 1 && this.config.autoOpen) {
      await this.openResult(limited[0], domain)
    }
  }

  private displayResults(results: BunApiIndex[], domain: 'sh' | 'com') {
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${this.style(result.topic, 'primary')}`)
      console.log(`   APIs: ${result.apis.join(', ')}`)

      if (this.config.showCategories) {
        console.log(`   Category: ${this.style(result.category, 'accent')}`)
      }

      console.log(`   URL: ${result.domains[domain]}`)
      console.log()
    })
  }

  private async openResult(result: BunApiIndex, domain: 'sh' | 'com') {
    const appMode = await this.confirm('Open in Chrome app mode? (y/n): ')
    const url = result.domains[domain]

    console.log(`🚀 Opening: ${url}`)
    await this.chromeManager.openInChrome(url, appMode)

    // Save to recent
    await this.saveToRecent(result, domain)
  }

  async showCategories(domain: 'sh' | 'com' = 'com') {
    const index = await this.fetcher.fetchIndex(domain)
    const categories = [...new Set(index.map(item => item.category))]

    console.log('📂 Available Categories:')
    console.log('='.repeat(30))

    categories.forEach((category, i) => {
      console.log(`${i + 1}. ${this.style(category, 'primary')}`)
    })

    console.log()
    const choice = await this.prompt('Select category (number or name): ')

    if (choice.match(/^\d+$/)) {
      const index = parseInt(choice) - 1
      if (index >= 0 && index < categories.length) {
        await this.showCategoryContents(categories[index], domain)
      }
    } else {
      await this.showCategoryContents(choice, domain)
    }
  }

  private async showCategoryContents(category: string, domain: 'sh' | 'com') {
    const index = await this.fetcher.fetchIndex(domain)
    const results = index.filter(item => item.category === category)

    if (results.length === 0) {
      console.log(`❌ No APIs found in category "${category}"`)
      return
    }

    console.log(`📂 ${category.toUpperCase()} APIs (${results.length})`)
    console.log('='.repeat(40))

    this.displayResults(results.slice(0, this.config.maxResults), domain)
  }

  async showRecent() {
    const recent = await this.loadRecent()

    if (recent.length === 0) {
      console.log('📭 No recent searches')
      console.log('💡 Use the search command to build history')
      return
    }

    console.log('🕒 Recent Searches:')
    console.log('='.repeat(20))

    recent.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. ${this.style(item.topic, 'primary')} (${item.domain})`)
      console.log(`   Searched: ${new Date(item.timestamp).toLocaleString()}`)
      console.log()
    })

    const choice = await this.prompt('Re-open a result (number or "q"): ')
    if (choice.toLowerCase() !== 'q') {
      const index = parseInt(choice) - 1
      if (index >= 0 && index < recent.length) {
        const item = recent[index]
        await this.chromeManager.openInChrome(item.url)
      }
    }
  }

  private async prompt(message: string): Promise<string> {
    process.stdout.write(message)
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim())
      })
    })
  }

  private async confirm(message: string): Promise<boolean> {
    const answer = await this.prompt(message)
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
  }

  private style(text: string, style: 'primary' | 'accent' | 'muted'): string {
    // Simple ANSI styling
    switch (style) {
      case 'primary': return `\x1b[36m${text}\x1b[0m`
      case 'accent': return `\x1b[35m${text}\x1b[0m`
      case 'muted': return `\x1b[90m${text}\x1b[0m`
      default: return text
    }
  }

  private async saveToRecent(result: BunApiIndex, domain: 'sh' | 'com') {
    const recentKey = 'recent_searches'
    const recent = await this.fetcher.cache.get<any[]>(recentKey) || []

    recent.unshift({
      topic: result.topic,
      url: result.domains[domain],
      domain,
      timestamp: Date.now(),
      apis: result.apis,
      category: result.category
    })

    // Keep only last 50
    const limited = recent.slice(0, 50)
    await this.fetcher.cache.set(recentKey, limited)
  }

  private async loadRecent() {
    return await this.fetcher.cache.get<any[]>('recent_searches') || []
  }

  private showHelp() {
    console.log(`
🎯 Interactive Bun Documentation Explorer

Commands:
  <query>              Search for APIs (e.g., "buffer", "http")
  categories           Browse by category
  recent               Show recent searches
  help                 Show this help

Examples:
  buffer               Search for Buffer APIs
  http                 Search for HTTP APIs
  yaml                 Search for YAML APIs
  websocket            Search for WebSocket APIs

Navigation:
  • Use numbers to select results
  • Press Enter for auto-selection (single result)
  • Type 'q' to quit
  • Use --sh flag for bun.sh domain

Tips:
  • Results open in Chrome (choose app mode for cleaner view)
  • Recent searches are saved automatically
  • Offline mode works with cached data
    `)
  }
}