#!/usr/bin/env bun
/**
 * Demo script for the Bun Documentation System
 * Shows how to use the enhanced documentation fetcher with caching
 */

import { EnhancedDocsFetcher } from '../lib/docs/index-fetcher-enhanced'
import { ChromeAppManager } from '../lib/cli/chrome-integration'
import { ScannerWithDocs } from '../scanner-integration'

async function demoDocsSystem() {
  console.log('🚀 Bun Documentation System Demo')
  console.log('=' .repeat(50))

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
  console.log('\n📚 Demo 1: Search for APIs')
  console.log('-' .repeat(30))
  
  const searchResults = await fetcher.search('buffer')
  console.log(`Found ${searchResults.length} results for "buffer":`)
  searchResults.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.topic} (${result.category})`)
    console.log(`     APIs: ${result.apis.join(', ')}`)
  })

  // Demo 2: Get specific API documentation
  console.log('\n📖 Demo 2: Get Specific API Documentation')
  console.log('-' .repeat(45))
  
  const semverDoc = await fetcher.getApiDoc('Bun.semver.satisfies')
  console.log(`SemVer documentation: ${semverDoc}`)

  // Demo 3: Cache statistics
  console.log('\n💾 Demo 3: Cache Statistics')
  console.log('-' .repeat(30))
  
  const cacheStats = (fetcher as any).cache.getStats()
  console.log('Cache info:', cacheStats)

  // Demo 4: Chrome app integration
  console.log('\n🌐 Demo 4: Chrome App Integration')
  console.log('-' .repeat(35))
  
  console.log('Creating Chrome app...')
  const appResult = await chromeManager.createApp('com')
  console.log(`Result: ${appResult.message}`)

  // Demo 5: Scanner integration
  console.log('\n🔍 Demo 5: Scanner Integration')
  console.log('-' .repeat(30))
  
  const scanner = new ScannerWithDocs()
  const scanResult = await scanner.scanWithDocumentation('demo-project')
  console.log('Scanner completed with documentation integration')

  console.log('\n✅ Demo completed!')
  console.log('\nAvailable commands:')
  console.log('  bun run docs:search "query"')
  console.log('  bun run docs:open "semver" --app')
  console.log('  bun run docs:index')
  console.log('  bun run docs:cache')
  console.log('  bun run docs:install')
}

// Run demo if executed directly
if (import.meta.main) {
  demoDocsSystem().catch(console.error)
}

export { demoDocsSystem }
