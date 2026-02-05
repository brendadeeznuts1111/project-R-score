# Bun Documentation System

A comprehensive system that integrates Bun documentation index with local caching, Chrome web apps, and scanner functionality.

## 🚀 Features

- **Smart Caching**: TTL-based cache with automatic fallback
- **Rate Limiting**: Built-in protection with exponential backoff
- **Offline Mode**: Full offline support with fallback data
- **Multi-Domain**: Automatic .sh/.com domain handling
- **Chrome Integration**: Create/launch Chrome web apps
- **Scanner Integration**: Built-in documentation references
- **CLI Interface**: Easy command-line access

## 📁 Project Structure

```
lib/docs/
├── cache-manager.ts              # Smart caching system
└── index-fetcher-enhanced.ts     # Enhanced documentation fetcher

lib/
└── chrome-integration.ts         # Chrome app management

cli/
└── docs-cli.ts                   # Command-line interface

scanner-integration.ts            # Scanner with documentation

scripts/
└── install-bun-docs.sh           # Installation script

examples/
└── bun-docs-demo.ts              # Demo and examples
```

## 🛠️ Installation

### Quick Install
```bash
bun run docs:install
```

### Manual Install
```bash
# Build CLI
bun build ./cli/docs-cli.ts --outfile ~/.local/bin/bun-docs --target bun
chmod +x ~/.local/bin/bun-docs

# Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
```

## 📚 Usage

### Command Line Interface

#### Search Documentation
```bash
# Search for APIs
bun run docs:search "http server"
bun run docs:search "buffer" --sh

# Using installed CLI
bun-docs search "semver"
```

#### Open Documentation
```bash
# Open in regular browser
bun run docs:open "yaml"

# Open in Chrome app mode
bun run docs:open "semver" --app

# Use .sh domain
bun run docs:open "compression" --sh --app
```

#### Manage Cache
```bash
# Update local index
bun run docs:index

# Show cache statistics
bun run docs:cache
```

#### Chrome App Integration
```bash
# Create Chrome app
bun run docs:app
bun run docs:app --sh
```

### Programmatic Usage

#### Basic Documentation Fetching
```typescript
import { EnhancedDocsFetcher } from './lib/docs/index-fetcher-enhanced'

const fetcher = new EnhancedDocsFetcher({
  ttl: 6 * 60 * 60 * 1000, // 6 hours
  offlineMode: false
})

// Search for APIs
const results = await fetcher.search('buffer')
console.log(results)

// Get specific API documentation
const semverDoc = await fetcher.getApiDoc('Bun.semver.satisfies')
console.log(semverDoc)
```

#### Cache Management
```typescript
import { DocsCacheManager } from './lib/docs/cache-manager'

const cache = new DocsCacheManager({
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 1000,
  offlineMode: false
})

// Get cached data
const data = await cache.get('key')

// Set cache data
await cache.set('key', data)

// Fetch with caching
const response = await cache.fetchWithCache('https://api.example.com')
```

#### Chrome App Integration
```typescript
import { ChromeAppManager } from './lib/chrome-integration'

const chromeManager = new ChromeAppManager({
  appName: 'My Bun Docs',
  showNavigation: true,
  showColorInTitle: true
})

// Create Chrome app
const result = await chromeManager.createApp('com')

// Open documentation
await chromeManager.openDocs('semver', 'com', true) // app mode
```

#### Scanner Integration
```typescript
import { ScannerWithDocs } from './scanner-integration'

const scanner = new ScannerWithDocs()

// Scan with documentation integration
const result = await scanner.scanWithDocumentation(
  'my-project',
  'my-r2-bucket'
)
```

## 🔧 Configuration

### Cache Configuration
```typescript
interface CacheConfig {
  ttl: number        // Cache TTL in milliseconds
  maxSize: number    // Maximum cache entries
  offlineMode: boolean // Enable offline mode
}
```

### Chrome App Configuration
```typescript
interface ChromeAppConfig {
  appName: string           // App name
  appUrl: string           // Base URL
  iconPath?: string        // Custom icon path
  showNavigation: boolean  // Show navigation
  showColorInTitle: boolean // Show color in title
}
```

## 📊 Cache System

The system uses a smart caching mechanism with:

- **TTL-based expiration**: Automatically expires old entries
- **LRU eviction**: Removes oldest entries when max size reached
- **Rate limiting**: Protects against excessive API calls
- **Offline fallback**: Uses cached data when network unavailable
- **Persistent storage**: Saves cache to disk for persistence

### Cache Statistics
```bash
bun run docs:cache
```

Output:
```
Cache Statistics:
  Size: 45/1000
  TTL: 360 minutes
  Directory: /Users/user/.cache/bun-docs
  Offline Mode: false
```

## 🌐 Domain Support

The system supports both Bun documentation domains:

- **bun.sh**: Official documentation domain
- **bun.com**: Alternative documentation domain

Use the `--sh` flag to prefer the .sh domain:
```bash
bun-docs search "server" --sh
bun-docs open "semver" --sh --app
```

## 🔍 Search Features

The search system supports:

- **Topic matching**: Search by documentation topics
- **API name matching**: Search by specific API names
- **Category filtering**: Search by API categories
- **Fuzzy matching**: Partial string matching

### Search Examples
```bash
# Search by topic
bun-docs search "http server"

# Search by API name
bun-docs search "Bun.serve"

# Search by category
bun-docs search "networking"

# Partial matching
bun-docs search "buff"  # Finds "buffer"
```

## 📱 Platform Support

### macOS
- AppleScript integration for Chrome app creation
- Native `open` command support
- App mode with `--args --app`

### Linux
- Desktop entry creation (.desktop files)
- Chrome/Chromium app mode support
- Icon integration

### Windows
- Basic browser opening support
- Fallback to system default browser

## 🚀 Performance Optimizations

- **Parallel fetching**: Fetch from multiple domains simultaneously
- **Intelligent caching**: Minimize network requests
- **Compression support**: Built-in Zstandard compression
- **Buffer optimization**: Fast binary data handling
- **Rate limiting**: Prevent API abuse

## 🛡️ Security Features

- **User-Agent identification**: Proper API identification
- **Request validation**: Input sanitization
- **Rate limiting**: Abuse prevention
- **Secure caching**: Safe data persistence
- **Error handling**: Graceful failure modes

## 📈 Monitoring and Debugging

### Enable Debug Logging
```typescript
const fetcher = new EnhancedDocsFetcher({
  debug: true  // Enable detailed logging
})
```

### Cache Debugging
```bash
# View cache contents
ls ~/.cache/bun-docs/

# View cache data
cat ~/.cache/bun-docs/index.json

# Clear cache
rm -rf ~/.cache/bun-docs/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Tools

- **Wiki Generator**: `bun run wiki:generate`
- **MCP Integration**: `bun run mcp:bun`
- **URL Validation**: `bun run url:validate`
- **Documentation Demo**: `bun run docs:demo`

## 📞 Support

For issues and questions:

1. Check the demo: `bun run docs:demo`
2. Review cache stats: `bun run docs:cache`
3. Update index: `bun run docs:index`
4. Consult the documentation

---

*Generated by Bun Documentation System*
