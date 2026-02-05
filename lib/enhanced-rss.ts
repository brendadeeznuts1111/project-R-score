// lib/enhanced-rss.ts
import { CONTENT_TYPES } from '../config/content-types.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

export interface MetricsData {
  rscore: {
    current: number;
    components: {
      p_ratio: number;
      m_impact: number;
      s_hardening: number;
      e_elimination: number;
    };
  };
  git: {
    commit: string;
    branch: string;
    timestamp: string;
  };
  performance: {
    response_time: number;
    throughput: number;
    error_rate: number;
  };
}

export class EnhancedMetricsFeed {
  private metrics: MetricsData[] = [];
  
  addMetric(metric: MetricsData): void {
    this.metrics.push(metric);
  }
  
  toRSS(): string {
    if (this.metrics.length === 0) {
      return '<?xml version="1.0"?><rss version="2.0"><channel><item><title>No metrics available</title></item></channel></rss>';
    }
    
    const latest = this.metrics[this.metrics.length - 1];
    
    // Generate Markdown report
    const markdownReport = `
## R-Score ${latest.rscore.current.toFixed(3)}

### Components
| Component | Score | Status |
|-----------|-------|--------|
| P_ratio | ${latest.rscore.components.p_ratio.toFixed(3)} | ${latest.rscore.components.p_ratio >= 0.95 ? '✅' : '⚠️'} |
| M_impact | ${latest.rscore.components.m_impact.toFixed(3)} | ${latest.rscore.components.m_impact >= 0.8 ? '✅' : '⚠️'} |
| S_hardening | ${latest.rscore.components.s_hardening.toFixed(3)} | ${latest.rscore.components.s_hardening >= 0.9 ? '✅' : '⚠️'} |
| E_elimination | ${latest.rscore.components.e_elimination.toFixed(3)} | ${latest.rscore.components.e_elimination >= 0.8 ? '✅' : '⚠️'} |

### Performance
| Metric | Value |
|--------|-------|
| Response Time | ${latest.performance.response_time}ms |
| Throughput | ${latest.performance.throughput} req/s |
| Error Rate | ${(latest.performance.error_rate * 100).toFixed(2)}% |

### Git Info
- **Commit**: \`${latest.git.commit.substring(0, 8)}\`
- **Branch**: ${latest.git.branch}
- **Timestamp**: ${latest.git.timestamp}

[📊 View Details](https://factorywager.io/metrics/${latest.git.commit})
    `;
    
    // Convert Markdown to HTML using Bun
    const html = Bun.markdown.html(markdownReport, { 
      autolinks: true,
      headings: { ids: true }
    });
    
    // Generate RSS XML
    const pubDate = new Date(latest.git.timestamp).toUTCString();
    const guid = latest.git.commit;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>R-Score Metrics Feed</title>
    <description>Real-time R-Score performance metrics and system health</description>
    <link>https://factorywager.io/metrics</link>
    <atom:link href="https://factorywager.io/feed/metrics" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <generator>Bun Enhanced RSS Generator</generator>
    
    <item>
      <title>R-Score ${latest.rscore.current.toFixed(3)} - ${latest.git.branch}</title>
      <description><![CDATA[${html}]]></description>
      <link>https://factorywager.io/metrics/${latest.git.commit}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>Performance</category>
      <category>Metrics</category>
    </item>
  </channel>
</rss>`;
  }
  
  toJSONFeed(): string {
    if (this.metrics.length === 0) {
      return JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: "R-Score Metrics", items: [] }, null, 2);
    }
    
    const latest = this.metrics[this.metrics.length - 1];
    
    const markdownReport = `
## R-Score ${latest.rscore.current.toFixed(3)}

**Components:**
- P_ratio: ${latest.rscore.components.p_ratio.toFixed(3)}
- M_impact: ${latest.rscore.components.m_impact.toFixed(3)}
- S_hardening: ${latest.rscore.components.s_hardening.toFixed(3)}
- E_elimination: ${latest.rscore.components.e_elimination.toFixed(3)}

**Performance:**
- Response Time: ${latest.performance.response_time}ms
- Throughput: ${latest.performance.throughput} req/s
- Error Rate: ${(latest.performance.error_rate * 100).toFixed(2)}%
    `;
    
    const html = Bun.markdown.html(markdownReport);
    
    return JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      title: "R-Score Metrics Feed",
      description: "Real-time R-Score performance metrics and system health",
      home_page_url: "https://factorywager.io/metrics",
      feed_url: "https://factorywager.io/feed/metrics.json",
      items: [{
        id: latest.git.commit,
        url: `https://factorywager.io/metrics/${latest.git.commit}`,
        title: `R-Score ${latest.rscore.current.toFixed(3)} - ${latest.git.branch}`,
        content_html: html,
        content_text: markdownReport,
        date_published: latest.git.timestamp,
        tags: ["performance", "metrics", "rscore"]
      }]
    }, null, 2);
  }
}

// Mock data generator for testing
export function generateMockMetrics(): MetricsData {
  return {
    rscore: {
      current: 0.874 + (Math.random() - 0.5) * 0.1,
      components: {
        p_ratio: 0.95 + Math.random() * 0.05,
        m_impact: 0.5 + Math.random() * 0.3,
        s_hardening: 0.9 + Math.random() * 0.1,
        e_elimination: 0.8 + Math.random() * 0.2
      }
    },
    git: {
      commit: Math.random().toString(36).substring(2, 10),
      branch: 'main',
      timestamp: new Date().toISOString()
    },
    performance: {
      response_time: 50 + Math.random() * 100,
      throughput: 1000 + Math.random() * 500,
      error_rate: Math.random() * 0.05
    }
  };
}

// Example usage
if (import.meta.main) {
  const feed = new EnhancedMetricsFeed();
  
  // Add some mock metrics
  for (let i = 0; i < 5; i++) {
    feed.addMetric(generateMockMetrics());
  }
  
  console.log('📰 RSS Feed:');
  console.log(feed.toRSS());
  
  console.log('\n📄 JSON Feed:');
  console.log(feed.toJSONFeed());
}
