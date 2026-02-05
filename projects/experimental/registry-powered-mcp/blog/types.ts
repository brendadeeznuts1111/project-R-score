// blog/types.ts - Type definitions for blog system
export interface BlogPost {
  slug: string;
  title: string;
  category: 'performance' | 'security' | 'releases' | 'federation';
  excerpt: string;
  content: string;
  publishedAt: Date;
  author: string;
  tags: string[];
  performanceMetrics?: PerformanceMetrics;
  securityImpact?: SecurityImpact;
  rssPriority: number; // 1-10 for feed ordering
  canonicalUrl?: string;
  featured?: boolean;
}

export interface PerformanceMetrics {
  bundleSize?: number;
  latency?: number;
  throughput?: number;
  optimization?: string;
  baseline?: string;
}

export interface SecurityImpact {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cve?: string;
  affectedVersions?: string[];
  mitigation?: string;
}

export interface BlogConfig {
  title: string;
  description: string;
  url: string;
  author: string;
  rss: {
    filename: string;
    itemCount: number;
  };
  categories: {
    performance: { name: string; description: string };
    security: { name: string; description: string };
    releases: { name: string; description: string };
    federation: { name: string; description: string };
  };
}