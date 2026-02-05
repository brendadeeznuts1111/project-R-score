#!/usr/bin/env bun
import { EnhancedDocsFetcher } from '../lib/docs/index-fetcher-enhanced'
import { ChromeAppManager } from '../lib/chrome-integration'

class DocsCLI {
  private fetcher: EnhancedDocsFetcher
  private chromeManager: ChromeAppManager
  
  constructor() {
    this.fetcher = new EnhancedDocsFetcher({
      ttl: 6 * 60 * 60 * 1000, // 6 hours
      offlineMode: false
    })
    
    this.chromeManager = new ChromeAppManager({
      appName: 'Bun Documentation',
      appUrl: 'https://bun.com/docs'
    })
  }

  async handleCommand(args: string[]) {
    const command = args[0]
    
    switch (command) {
      case 'search':
        await this.search(args.slice(1))
        break
        
      case 'open':
        await this.open(args.slice(1))
        break
        
      case 'index':
        await this.updateIndex()
        break
        
      case 'cache':
        await this.cacheInfo()
        break
        
      case 'app':
        await this.createChromeApp(args.slice(1))
        break
        
      default:
        this.showHelp()
        break
    }
  }
  
  private async search(queries: string[]) {
    const query = queries.join(' ')
    const domain = queries.includes('--sh') ? 'sh' : 'com'
    
    const results = await this.fetcher.search(query, domain)
    
    if (results.length === 0) {
      console.log('No results found')
      return
    }
    
    console.log(`Found ${results.length} results:\n`)
    
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.topic}`)
      console.log(`   APIs: ${result.apis.join(', ')}`)
      console.log(`   Category: ${result.category}`)
      console.log(`   bun.sh: ${result.domains.sh}`)
      console.log(`   bun.com: ${result.domains.com}`)
      console.log()
    })
  }
  
  private async open(queries: string[]) {
    const query = queries.filter(q => !q.startsWith('--')).join(' ')
    const domain = queries.includes('--sh') ? 'sh' : 'com'
    const appMode = queries.includes('--app')
    
    await this.chromeManager.openDocs(query, domain, appMode)
  }
  
  private async updateIndex() {
    console.log('Updating documentation index...')
    await this.fetcher.updateFallbackData()
    console.log('✅ Index updated')
  }
  
  private async cacheInfo() {
    const stats = (this.fetcher as any).cache.getStats()
    console.log('Cache Statistics:')
    console.log(`  Size: ${stats.size}/${stats.maxSize}`)
    console.log(`  TTL: ${stats.ttl / 1000 / 60} minutes`)
    console.log(`  Directory: ${stats.cacheDir}`)
    console.log(`  Offline Mode: ${stats.offlineMode}`)
  }
  
  private async createChromeApp(args: string[]) {
    const domain = args.includes('--sh') ? 'sh' : 'com'
    const result = await this.chromeManager.createApp(domain)
    console.log(result.message)
  }
  
  private showHelp() {
    console.log(`
Bun Documentation CLI
Usage: bun docs <command> [options]

Commands:
  search <query> [--sh]      Search documentation
  open <query> [--sh] [--app] Open docs in Chrome (optionally as app)
  index                      Update local index cache
  cache                      Show cache statistics
  app [--sh]                Create Chrome app for docs

Examples:
  bun docs search "http server"
  bun docs open semver --app
  bun docs open yaml --sh
  bun docs index
    `)
  }
}

// Main execution
if (import.meta.main) {
  const cli = new DocsCLI()
  await cli.handleCommand(process.argv.slice(2))
}
