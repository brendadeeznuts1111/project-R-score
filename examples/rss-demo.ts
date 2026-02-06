#!/usr/bin/env bun
/**
 * RSS Demo - FactoryWager Enterprise Platform
 * 
 * Demonstrates RSS feed functionality and content
 */

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category?: string;
}

interface RSSFeed {
  title: string;
  description: string;
  link: string;
  lastBuildDate: string;
  items: RSSItem[];
}

/**
 * Generate sample RSS feed data for FactoryWager
 */
function generateSampleRSSFeed(): RSSFeed {
  return {
    title: "FactoryWager Enterprise Platform - RSS Feed",
    description: "Latest updates and releases from the FactoryWager Enterprise Platform",
    link: "https://factory-wager.com",
    lastBuildDate: new Date().toISOString(),
    items: [
      {
        title: "🚀 FactoryWager v5.1.0 Released",
        link: "https://factory-wager.com/releases/v5.1.0",
        description: "Major release with enhanced performance, new AI features, and improved developer experience. Includes the revolutionary RIPGREP v4.0 system.",
        pubDate: "2026-02-06T12:00:00Z",
        guid: "factory-wager-v5.1.0",
        category: "release"
      },
      {
        title: "🤖 AI-Powered Code Analysis Now Available",
        link: "https://factory-wager.com/blog/ai-code-analysis",
        description: "Introducing local Llama integration for intelligent code analysis with purity scoring and transmutation suggestions.",
        pubDate: "2026-02-05T14:30:00Z",
        guid: "ai-code-analysis-launch",
        category: "feature"
      },
      {
        title: "⚡ RIPGREP v4.0 - Enterprise Code Governance",
        link: "https://factory-wager.com/docs/ripgrep-v4",
        description: "Advanced rule-based and AI-driven code analysis with SHA-256 signed audit trails and comprehensive validation.",
        pubDate: "2026-02-04T10:15:00Z",
        guid: "ripgrep-v4-launch",
        category: "feature"
      },
      {
        title: "🔒 Security Update: Critical Vulnerability Patch",
        link: "https://factory-wager.com/security/cve-2026-001",
        description: "Security patch for critical vulnerability in authentication module. All users should update immediately.",
        pubDate: "2026-02-03T16:45:00Z",
        guid: "security-patch-2026-001",
        category: "security"
      },
      {
        title: "📊 Performance Benchmark: 3.5x Speed Improvement",
        link: "https://factory-wager.com/blog/performance-benchmark",
        description: "Latest benchmarks show 3.5x improvement in markdown parsing and 2.8x faster bundle analysis with Bun v1.3.8.",
        pubDate: "2026-02-02T09:00:00Z",
        guid: "performance-benchmark-2026",
        category: "performance"
      },
      {
        title: "🛠️ Developer Tools: Enhanced CLI Experience",
        link: "https://factory-wager.com/docs/cli-enhancements",
        description: "New CLI commands for better developer productivity including organized package.json with 250+ scripts.",
        pubDate: "2026-02-01T11:30:00Z",
        guid: "cli-enhancements-2026",
        category: "developer"
      },
      {
        title: "🌐 Integration: Vercel Partnership Announced",
        link: "https://factory-wager.com/blog/vercel-partnership",
        description: "Strategic partnership with Vercel to provide seamless deployment and enhanced performance for enterprise customers.",
        pubDate: "2026-01-31T13:00:00Z",
        guid: "vercel-partnership",
        category: "company"
      },
      {
        title: "📚 Documentation: Complete Platform Guide",
        link: "https://factory-wager.com/docs/platform-guide",
        description: "Comprehensive documentation covering all platform features with interactive examples and best practices.",
        pubDate: "2026-01-30T15:20:00Z",
        guid: "platform-guide-complete",
        category: "documentation"
      }
    ]
  };
}

/**
 * Display RSS feed in a formatted way
 */
function displayRSSFeed(feed: RSSFeed): void {
  console.log('📡 FactoryWager RSS Feed');
  console.log('═════════════════════════════════════════════════');
  console.log(`📰 ${feed.title}`);
  console.log(`🔗 ${feed.link}`);
  console.log(`📝 ${feed.description}`);
  console.log(`🕐 Last Updated: ${new Date(feed.lastBuildDate).toLocaleString()}`);
  console.log('');
  
  console.log('📋 Latest Updates:');
  console.log('─────────────────────────────────────────────────');
  
  feed.items.forEach((item, index) => {
    const categoryIcon = getCategoryIcon(item.category);
    const pubDate = new Date(item.pubDate).toLocaleDateString();
    
    console.log(`${index + 1}. ${categoryIcon} ${item.title}`);
    console.log(`   📅 ${pubDate} | 🏷️  ${item.category?.toUpperCase() || 'GENERAL'}`);
    console.log(`   🔗 ${item.link}`);
    console.log(`   📝 ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`);
    console.log('');
  });
}

/**
 * Get category icon
 */
function getCategoryIcon(category?: string): string {
  switch (category) {
    case 'release': return '🚀';
    case 'feature': return '✨';
    case 'security': return '🔒';
    case 'performance': return '⚡';
    case 'developer': return '🛠️';
    case 'company': return '🌐';
    case 'documentation': return '📚';
    default: return '📢';
  }
}

/**
 * Show RSS statistics
 */
function showRSSStats(feed: RSSFeed): void {
  console.log('📊 RSS Feed Statistics');
  console.log('═════════════════════════════════════════════════');
  
  const categoryCounts: Record<string, number> = {};
  feed.items.forEach(item => {
    const category = item.category || 'general';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  console.log(`📈 Total Items: ${feed.items.length}`);
  console.log(`🕐 Last Build: ${new Date(feed.lastBuildDate).toLocaleString()}`);
  console.log('');
  
  console.log('📋 Categories:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    const icon = getCategoryIcon(category);
    console.log(`   ${icon} ${category.toUpperCase()}: ${count} items`);
  });
  
  console.log('');
  
  const latestItem = feed.items[0];
  const oldestItem = feed.items[feed.items.length - 1];
  
  console.log('⏰ Timeline:');
  console.log(`   🆕 Latest: ${latestItem.title} (${new Date(latestItem.pubDate).toLocaleDateString()})`);
  console.log(`   📜 Oldest: ${oldestItem.title} (${new Date(oldestItem.pubDate).toLocaleDateString()})`);
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log('📡 RSS Demo - FactoryWager Enterprise Platform');
  console.log('═════════════════════════════════════════════════');
  console.log('');
  console.log('USAGE:');
  console.log('  bun run examples/rss-demo.ts <command>');
  console.log('');
  console.log('COMMANDS:');
  console.log('  feed         Display RSS feed content');
  console.log('  stats        Show RSS feed statistics');
  console.log('  help         Show this help message');
  console.log('');
  console.log('ALIASES:');
  console.log('  bun run rss   Same as "feed" command');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  bun run examples/rss-demo.ts feed');
  console.log('  bun run examples/rss-demo.ts stats');
  console.log('  bun run rss');
  console.log('');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'feed';
  
  try {
    const feed = generateSampleRSSFeed();
    
    switch (command) {
      case 'feed':
      case 'rss':
        displayRSSFeed(feed);
        break;
      case 'stats':
        showRSSStats(feed);
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error executing ${command}:`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { main, displayRSSFeed, showRSSStats, showHelp, generateSampleRSSFeed };
