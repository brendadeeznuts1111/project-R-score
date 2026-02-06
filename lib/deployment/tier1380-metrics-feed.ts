/**
 * Tier-1380 Metrics RSS Feed Generator
 *
 * Provides RSS feed and endpoint push for R-Score metrics to Tier-1380 dashboard.
 */

import { type Serve } from 'bun';

export interface MetricPayload {
  timestamp: number;
  version: string;
  rscore: {
    current: number;
    projected: number;
    components: {
      p_ratio: number;
      m_impact: number;
      e_elimination: number;
      s_hardening: number;
    };
  };
  performance: {
    latency_ms: number;
    throughput_rps: number;
    memory_utilization: number;
  };
  git: {
    commit: string;
    tag: string;
    branch: string;
  };
}

export class Tier1380MetricsFeed {
  private metrics: MetricPayload[] = [];
  private readonly maxHistory = 1000;

  push(metric: MetricPayload): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }
  }

  toRSS(): string {
    const now = new Date().toUTCString();
    const items = this.metrics
      .slice(-50)
      .map(
        m => `
    <item>
      <title>R-Score ${m.rscore.current} @ ${m.git.tag}</title>
      <link>https://factorywager.io/metrics/${m.git.commit}</link>
      <pubDate>${new Date(m.timestamp).toUTCString()}</pubDate>
      <guid isPermaLink="false">${m.git.commit}-${m.timestamp}</guid>
      <description><![CDATA[
        R-Score: ${m.rscore.current} → ${m.rscore.projected}
        P_ratio: ${m.rscore.components.p_ratio}
        M_impact: ${m.rscore.components.m_impact}
        S_hardening: ${m.rscore.components.s_hardening}
        Latency: ${m.performance.latency_ms}ms
      ]]></description>
      <category>performance</category>
      <category>rscore</category>
    </item>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tier-1380 R-Score Metrics</title>
    <link>https://factorywager.io/metrics</link>
    <description>Real-time R-Score performance metrics feed</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://factorywager.io/metrics/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
  }

  async pushToEndpoint(endpoint: string, secret: string): Promise<Response> {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) {
      throw new Error('No metrics to push');
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tier1380-Secret': secret,
        'X-RScore-Version': latest.version,
      },
      body: JSON.stringify(latest),
    });
  }

  serve(port = 1380): ReturnType<Serve> {
    return Bun.serve({
      port,
      fetch: req => {
        const url = new URL(req.url);
        if (url.pathname === '/metrics/rss.xml') {
          return new Response(this.toRSS(), {
            headers: { 'Content-Type': 'application/rss+xml' },
          });
        }
        if (url.pathname === '/metrics/json') {
          return Response.json(this.metrics.slice(-100));
        }
        return new Response('Not found', { status: 404 });
      },
    });
  }

  getLatest(): MetricPayload | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  getHistory(limit = 100): MetricPayload[] {
    return this.metrics.slice(-limit);
  }
}

// Singleton export
export const metricsFeed = new Tier1380MetricsFeed();

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
