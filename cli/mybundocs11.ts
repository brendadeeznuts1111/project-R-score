#!/usr/bin/env bun
/**
 * MYBUNDOCS11 - Chrome App Manager for Bun Documentation
 * A dedicated Chrome app for accessing Bun documentation
 */

import { ChromeAppManager } from '../lib/chrome-app-manager'

class MYBUNDOCS11 {
  private manager: ChromeAppManager
  
  constructor() {
    this.manager = new ChromeAppManager({
      appName: 'MYBUNDOCS11',
      appUrl: 'https://bun.com/docs',
      windowSize: { width: 1400, height: 900 },
      position: { x: 50, y: 50 },
      showNavigation: true,
      showColorInTitle: true
    })
  }

  async handleCommand(args: string[]) {
    const command = args[0] || 'help'
    
    switch (command) {
      case 'create':
        await this.createApp(args.slice(1))
        break
        
      case 'launch':
        await this.launch(args.slice(1))
        break
        
      case 'open':
        await this.open(args.slice(1))
        break
        
      case 'info':
        this.showInfo()
        break
        
      case 'help':
      default:
        this.showHelp()
        break
    }
  }
  
  private async createApp(args: string[]) {
    console.log('🔧 Creating MYBUNDOCS11 Chrome App...')
    
    const domain = args.includes('--sh') ? 'sh' : 'com'
    const result = await this.manager.createApp(domain)
    
    if (result.success) {
      console.log('✅', result.message)
      console.log('\n🎉 MYBUNDOCS11 Chrome app created successfully!')
      console.log('💡 Use "bun run mybundocs11 launch" to start the app')
    } else {
      console.error('❌', result.message)
    }
  }
  
  private async launch(args: string[]) {
    const domain = args.includes('--sh') ? 'sh' : 'com'
    
    console.log('🚀 Launching MYBUNDOCS11...')
    await this.manager.launchMYBUNDOCS11(domain)
  }
  
  private async open(args: string[]) {
    const query = args.filter(arg => !arg.startsWith('--')).join(' ')
    const domain = args.includes('--sh') ? 'sh' : 'com'
    
    if (!query) {
      console.log('❌ Please specify a search query')
      console.log('💡 Example: bun run mybundocs11 open semver')
      return
    }
    
    console.log(`📖 Opening "${query}" in MYBUNDOCS11...`)
    await this.manager.openDocsInMYBUNDOCS11(query, domain)
  }
  
  private showInfo() {
    const info = this.manager.getAppInfo()
    
    console.log('📱 MYBUNDOCS11 App Information')
    console.log('=' .repeat(40))
    console.log(`Name: ${info.name}`)
    console.log(`URL: ${info.url}`)
    console.log(`Platform: ${info.platform}`)
    console.log(`Window Size: ${info.windowSize?.width}x${info.windowSize?.height}`)
    console.log(`Position: ${info.position?.x},${info.position?.y}`)
    console.log('\n🔧 Features:')
    Object.entries(info.features).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`)
    })
  }
  
  private showHelp() {
    console.log(`
🦌 MYBUNDOCS11 - Bun Documentation Chrome App
Usage: bun run mybundocs11 <command> [options]

Commands:
  create [--sh]           Create MYBUNDOCS11 Chrome app
  launch [--sh]           Launch MYBUNDOCS11 app
  open <query> [--sh]     Search and open specific docs
  info                    Show app information
  help                    Show this help

Options:
  --sh                    Use bun.sh domain (default: bun.com)

Examples:
  bun run mybundocs11 create          # Create Chrome app
  bun run mybundocs11 launch          # Launch app
  bun run mybundocs11 open semver     # Open semver docs
  bun run mybundocs11 open "http server" --sh  # Search .sh domain

Features:
  🚀 Dedicated Chrome app window
  📱 Custom window size and position
  🔍 Integrated search functionality
  🌐 Multi-domain support (.sh/.com)
  💾 Persistent app configuration
    `)
  }
}

// Main execution
if (import.meta.main) {
  const app = new MYBUNDOCS11()
  await app.handleCommand(process.argv.slice(2))
}
