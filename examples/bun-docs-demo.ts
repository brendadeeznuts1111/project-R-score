#!/usr/bin/env bun
/**
 * Demo script for the Bun Documentation System
 * Shows how to use the enhanced documentation fetcher with caching
 */

import { EnhancedDocsFetcher } from '../lib/docs/index-fetcher-enhanced'
import { ChromeAppManager } from '../lib/cli/chrome-integration'
import { ScannerWithDocs } from '../tools/scanner-integration'

async function demoDocsSystem() {
  console.info('🚀 Bun Documentation System Demo')
  console.info('=' .repeat(50))

  // Initialize components
  const fetcher = new EnhancedDocsFetcher({
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    offlineMode: false
  })
  
  const chromeManager = new ChromeAppManager({
    appName: 'Bun Documentation Demo',
    showNavigation: true,
    showColorInTitle: true
  })

  // Demo 1: Search for APIs
  console.info('\n📚 Demo 1: Search for APIs')
  console.info('-' .repeat(30))
  
  const searchResults = await fetcher.search('buffer')
  console.info(`Found ${searchResults.length} results for "buffer":`)
  searchResults.forEach((result, i) => {
    console.info(`  ${i + 1}. ${result.topic} (${result.category})`)
    console.info(`     APIs: ${result.apis.join(', ')}`)
  })

  // Demo 2: Get specific API documentation
  console.info('\n📖 Demo 2: Get Specific API Documentation')
  console.info('-' .repeat(45))
  
  const semverDoc = await fetcher.getApiDoc('Bun.semver.satisfies')
  console.info(`SemVer documentation: ${semverDoc}`)

  // Demo 3: Cache statistics
  console.info('\n💾 Demo 3: Cache Statistics')
  console.info('-' .repeat(30))
  
  const cacheStats = (fetcher as any).cache.getStats()
  console.info('Cache info:', cacheStats)

  // Demo 4: Chrome app integration
  console.info('\n🌐 Demo 4: Chrome App Integration')
  console.info('-' .repeat(35))
  
  console.info('Creating Chrome app...')
  const appResult = await chromeManager.createApp('com')
  console.info(`Result: ${appResult.message}`)

  // Demo 5: Scanner integration
  console.info('\n🔍 Demo 5: Scanner Integration')
  console.info('-' .repeat(30))
  
  const scanner = new ScannerWithDocs()
  const scanResult = await scanner.scanWithDocumentation('demo-project')
  console.info('Scanner completed with documentation integration')

  console.info('\n✅ Demo completed!')
  console.info('\nAvailable commands:')
  console.info('  bun run docs:search "query"')
  console.info('  bun run docs:open "semver" --app')
  console.info('  bun run docs:index')
  console.info('  bun run docs:cache')
  console.info('  bun run docs:install')
}

// Run demo if executed directly
if (import.meta.main) {
  demoDocsSystem().catch(console.error)
}

export { demoDocsSystem }
