#!/usr/bin/env bun
// tools/har-analysis.ts — HAR performance analysis with documentation-aware categorization
//
// Usage (standalone):
//   bun tools/har-analysis.ts <file.har|->
//
// Usage (imported):
//   import { DocumentationAwarePerformanceAnalyzer } from './har-analysis';
//   const analyzer = new DocumentationAwarePerformanceAnalyzer();
//   const result = analyzer.analyzeWithDocsContext(har, url);

import {
  DocumentationProvider,
  DocumentationCategory,
  UrlType,
  UtilityFunctionCategory,
} from '../lib/docs/constants/domains';

// --- Interfaces ---

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PerformanceIssue {
  type: string;
  severity: Priority;
  details: string;
  fix: string;
}

export interface DocumentationRecommendation {
  type: string;
  title: string;
  description: string;
  category: DocumentationCategory;
  priority: Priority;
}

export interface DocumentationGap {
  category: DocumentationCategory;
  gap: string;
  priority: Priority;
}

export interface BunPerformanceMetrics {
  ttfb: number;
  totalTransfer: number;
  totalSize: number;
  compressionRatio: number;
  cacheHitRate: number;
  slowRequests: number;
  totalRequests: number;
  domains: number;
  utilityCategories: UtilityFunctionCategory[];
}

export interface AnalysisResult {
  provider: DocumentationProvider;
  category: DocumentationCategory;
  urlType: UrlType;
  issues: PerformanceIssue[];
  recommendations: DocumentationRecommendation[];
  documentationGaps: DocumentationGap[];
  bunSpecific: BunPerformanceMetrics;
  actions: string[];
}

// --- Analyzer ---

export class DocumentationAwarePerformanceAnalyzer {
  public analyzeWithDocsContext(har: any, url: string): AnalysisResult {
    const provider = this.determineProvider(url);
    const category = this.determineCategory(url, har);

    return {
      provider,
      category,
      urlType: this.determineUrlType(url),
      issues: this.findPerformanceIssues(har, url),
      recommendations: this.generateRecommendations(har, provider, category),
      documentationGaps: this.findDocumentationGaps(har, provider),
      bunSpecific: this.analyzeBunPerformance(har, url),
      actions: this.generateActions(har, provider),
    };
  }

  determineProvider(url: string): DocumentationProvider {
    const hostname = new URL(url).hostname;

    if (hostname === "bun.sh" || hostname === "bun.com" || hostname.endsWith(".bun.sh"))
      return DocumentationProvider.BUN_OFFICIAL;
    if (hostname === "github.com" || hostname.endsWith(".github.com"))
      return DocumentationProvider.GITHUB;
    if (hostname === "npmjs.com" || hostname === "www.npmjs.com" || hostname === "npm.im")
      return DocumentationProvider.NPM;
    if (hostname === "developer.mozilla.org")
      return DocumentationProvider.MDN_WEB_DOCS;
    if (hostname === "nodejs.org" || hostname.endsWith(".nodejs.org"))
      return DocumentationProvider.NODE_JS;

    return DocumentationProvider.COMMUNITY;
  }

  private determineCategory(url: string, har: any): DocumentationCategory {
    const pathname = new URL(url).pathname;

    if (pathname.startsWith("/docs")) return DocumentationCategory.API_REFERENCE;
    if (pathname.startsWith("/guides")) return DocumentationCategory.GUIDE;
    if (pathname.startsWith("/blog")) return DocumentationCategory.COMMUNITY_RESOURCES;
    if (pathname === "/") return DocumentationCategory.WEBSITE;

    return DocumentationCategory.WEBSITE;
  }

  private determineUrlType(url: string): UrlType {
    const u = new URL(url);

    if (u.pathname.startsWith("/docs") || u.pathname.startsWith("/api"))
      return UrlType.DOCUMENTATION;
    if (u.hostname === "github.com" || u.hostname.endsWith(".github.com"))
      return UrlType.REPOSITORY;
    if (u.hostname === "npmjs.com" || u.hostname === "www.npmjs.com")
      return UrlType.PACKAGE;
    if (u.hostname.startsWith("cdn.") || u.hostname === "cdn.jsdelivr.net" || u.hostname.endsWith(".jsdelivr.net") || u.hostname === "unpkg.com")
      return UrlType.CDN;
    if (u.pathname === "/" || u.pathname === "")
      return UrlType.MARKETING;

    return UrlType.UNKNOWN;
  }

  findPerformanceIssues(har: any, url: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const entries = har.log.entries as any[];
    const pageDomain = new URL(url).hostname;

    // TTFB check
    const docEntry = entries.find((e: any) => {
      try { return new URL(e.request.url).hostname === pageDomain && new URL(e.request.url).pathname === "/"; }
      catch { return false; }
    });
    if (docEntry) {
      const t = docEntry.timings;
      const ttfb = Math.max(0, t.blocked) + Math.max(0, t.dns) + Math.max(0, t.connect) +
        Math.max(0, t.ssl) + Math.max(0, t.send) + Math.max(0, t.wait);
      if (ttfb > 2000) {
        issues.push({
          type: "TTFB",
          severity: "CRITICAL",
          details: `Main document TTFB: ${(ttfb / 1000).toFixed(2)}s (target: <200ms)`,
          fix: "Use Bun.serve() with precompressed responses and edge caching",
        });
      } else if (ttfb > 500) {
        issues.push({
          type: "TTFB",
          severity: "HIGH",
          details: `Main document TTFB: ${ttfb.toFixed(0)}ms (target: <200ms)`,
          fix: "Consider CDN edge deployment or response caching",
        });
      }
    }

    // Cache hit rate
    let cacheHits = 0;
    for (const e of entries) {
      const headers = e.response.headers || [];
      const cfCache = headers.find((h: any) => h.name.toLowerCase() === "cf-cache-status")?.value;
      const xCache = headers.find((h: any) => h.name.toLowerCase() === "x-cache")?.value;
      if (cfCache === "HIT" || xCache?.toLowerCase().includes("hit")) cacheHits++;
    }
    const hitRate = entries.length > 0 ? cacheHits / entries.length : 0;
    if (hitRate < 0.3 && entries.length > 5) {
      issues.push({
        type: "CACHING",
        severity: hitRate < 0.1 ? "CRITICAL" : "HIGH",
        details: `Cache hit rate: ${(hitRate * 100).toFixed(0)}% (target: >80%)`,
        fix: "Implement proper CDN caching strategy with long-lived cache headers",
      });
    }

    // Compression check
    const totalTransfer = entries.reduce((s: number, e: any) => s + (e.response._transferSize ?? e.response.content.size), 0);
    const totalSize = entries.reduce((s: number, e: any) => s + e.response.content.size, 0);
    const ratio = totalSize > 0 ? (1 - totalTransfer / totalSize) : 0;
    if (ratio < 0.3 && totalSize > 100_000) {
      issues.push({
        type: "COMPRESSION",
        severity: ratio < 0.1 ? "CRITICAL" : "MEDIUM",
        details: `Overall compression: ${(ratio * 100).toFixed(0)}% savings (target: >60%)`,
        fix: "Enable Brotli and Zstd compression for text assets",
      });
    }

    // Transfer size check
    if (totalTransfer > 5 * 1024 * 1024) {
      issues.push({
        type: "ASSET_OPTIMIZATION",
        severity: totalTransfer > 20 * 1024 * 1024 ? "CRITICAL" : "HIGH",
        details: `Total transfer: ${(totalTransfer / 1024 / 1024).toFixed(1)}MB (target: <2MB)`,
        fix: "Use modern video formats (AV1) with lazy loading, audit asset necessity",
      });
    }

    // Slow requests
    const slowCount = entries.filter((e: any) => e.time > 1000).length;
    if (slowCount > 5) {
      issues.push({
        type: "SLOW_REQUESTS",
        severity: "HIGH",
        details: `${slowCount} requests over 1s`,
        fix: "Implement connection pooling, preloading, or lazy loading",
      });
    }

    return issues;
  }

  generateRecommendations(
    har: any,
    provider: DocumentationProvider,
    category: DocumentationCategory,
  ): DocumentationRecommendation[] {
    const recs: DocumentationRecommendation[] = [];

    if (provider === DocumentationProvider.BUN_OFFICIAL) {
      recs.push({
        type: "DOCUMENTATION_IMPROVEMENT",
        title: "Add performance section to Bun documentation",
        description: "Document how to optimize Bun applications for production",
        category: DocumentationCategory.GUIDE,
        priority: "HIGH",
      });
    }

    const entries = har.log.entries as any[];
    const slowRequests = entries.filter((e: any) => e.time > 1000);
    if (slowRequests.length > 0) {
      recs.push({
        type: "PERFORMANCE_FIX",
        title: `Fix ${slowRequests.length} slow requests (>1s)`,
        description: "Implement caching, compression, and CDN strategies",
        category: DocumentationCategory.RUNTIME,
        priority: "CRITICAL",
      });
    }

    // Check for uncompressed text assets
    let uncompressedText = 0;
    for (const e of entries) {
      const mime = e.response.content.mimeType || "";
      const enc = e.response.headers?.find((h: any) => h.name.toLowerCase() === "content-encoding")?.value;
      if ((mime.includes("javascript") || mime.includes("css") || mime.includes("html")) && !enc) {
        uncompressedText++;
      }
    }
    if (uncompressedText > 0) {
      recs.push({
        type: "COMPRESSION",
        title: `Enable compression for ${uncompressedText} text asset(s)`,
        description: "Brotli typically achieves 70%+ savings on text assets",
        category: DocumentationCategory.API,
        priority: "HIGH",
      });
    }

    // Check for missing cache headers on static assets
    let noCacheAssets = 0;
    for (const e of entries) {
      const mime = e.response.content.mimeType || "";
      if (mime.includes("image") || mime.includes("font") || mime.includes("css") || mime.includes("javascript")) {
        const cc = e.response.headers?.find((h: any) => h.name.toLowerCase() === "cache-control")?.value || "";
        if (!cc.includes("max-age") && !cc.includes("immutable")) noCacheAssets++;
      }
    }
    if (noCacheAssets > 3) {
      recs.push({
        type: "CACHING",
        title: `Add cache headers to ${noCacheAssets} static assets`,
        description: "Use Cache-Control: public, max-age=31536000, immutable for hashed assets",
        category: DocumentationCategory.RUNTIME,
        priority: "MEDIUM",
      });
    }

    return recs;
  }

  private findDocumentationGaps(har: any, provider: DocumentationProvider): DocumentationGap[] {
    const gaps: DocumentationGap[] = [];

    if (provider === DocumentationProvider.BUN_OFFICIAL) {
      const entries = har.log.entries as any[];
      const docEntry = entries[0];
      if (docEntry) {
        const t = docEntry.timings;
        const ttfb = Math.max(0, t.blocked) + Math.max(0, t.dns) + Math.max(0, t.connect) +
          Math.max(0, t.ssl) + Math.max(0, t.send) + Math.max(0, t.wait);
        if (ttfb > 500) {
          gaps.push({
            category: DocumentationCategory.RUNTIME,
            gap: "No documentation on optimizing TTFB for Bun.serve()",
            priority: "HIGH",
          });
        }
      }

      const totalTransfer = entries.reduce((s: number, e: any) => s + (e.response._transferSize ?? e.response.content.size), 0);
      if (totalTransfer > 2 * 1024 * 1024) {
        gaps.push({
          category: DocumentationCategory.API,
          gap: "Missing examples for implementing CDN caching",
          priority: "MEDIUM",
        });
      }

      gaps.push({
        category: DocumentationCategory.GUIDE,
        gap: "No performance optimization guide for production",
        priority: "HIGH",
      });
    }

    return gaps;
  }

  analyzeBunPerformance(har: any, url: string): BunPerformanceMetrics {
    const entries = har.log.entries as any[];
    const pageDomain = new URL(url).hostname;
    const domains = new Set<string>();
    let totalTransfer = 0, totalSize = 0, cacheHits = 0;

    const docEntry = entries.find((e: any) => {
      try { return new URL(e.request.url).hostname === pageDomain && new URL(e.request.url).pathname === "/"; }
      catch { return false; }
    });
    const t = docEntry?.timings;
    const ttfb = t
      ? Math.max(0, t.blocked) + Math.max(0, t.dns) + Math.max(0, t.connect) +
        Math.max(0, t.ssl) + Math.max(0, t.send) + Math.max(0, t.wait)
      : 0;

    for (const e of entries) {
      try { domains.add(new URL(e.request.url).hostname); } catch {}
      totalTransfer += e.response._transferSize ?? e.response.content.size;
      totalSize += e.response.content.size;
      const headers = e.response.headers || [];
      const cfCache = headers.find((h: any) => h.name.toLowerCase() === "cf-cache-status")?.value;
      const xCache = headers.find((h: any) => h.name.toLowerCase() === "x-cache")?.value;
      if (cfCache === "HIT" || xCache?.toLowerCase().includes("hit")) cacheHits++;
    }

    // Determine relevant utility categories
    const utilityCategories: UtilityFunctionCategory[] = [];
    if (totalTransfer > 5 * 1024 * 1024) utilityCategories.push(UtilityFunctionCategory.FILE_SYSTEM);
    if (entries.length > 10) utilityCategories.push(UtilityFunctionCategory.NETWORKING);
    if (ttfb > 1000) utilityCategories.push(UtilityFunctionCategory.PROCESS);

    return {
      ttfb,
      totalTransfer,
      totalSize,
      compressionRatio: totalSize > 0 ? (1 - totalTransfer / totalSize) : 0,
      cacheHitRate: entries.length > 0 ? cacheHits / entries.length : 0,
      slowRequests: entries.filter((e: any) => e.time > 1000).length,
      totalRequests: entries.length,
      domains: domains.size,
      utilityCategories,
    };
  }

  private generateActions(har: any, provider: DocumentationProvider): string[] {
    const actions: string[] = [];
    const entries = har.log.entries as any[];
    const metrics = this.analyzeBunPerformance(har, har.log.pages?.[0]?.title || "https://unknown");

    if (metrics.ttfb > 500) actions.push("Implement edge caching to reduce TTFB");
    if (metrics.cacheHitRate < 0.5) actions.push("Add performance monitoring to documentation");
    if (metrics.compressionRatio < 0.3) actions.push("Enable Brotli/Zstd compression for text assets");
    if (metrics.totalTransfer > 10 * 1024 * 1024) actions.push("Add video compression to build pipeline");
    if (metrics.slowRequests > 5) actions.push("Implement lazy loading for below-fold assets");

    if (provider === DocumentationProvider.BUN_OFFICIAL) {
      actions.push("Create optimization guide for Bun applications");
    }

    return actions;
  }
}

// --- Formatted output ---

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const priorityIcon: Record<Priority, string> = {
  CRITICAL: "\x1b[31m\u2718\x1b[0m",
  HIGH: "\x1b[33m\u2718\x1b[0m",
  MEDIUM: "\x1b[36m\u25CB\x1b[0m",
  LOW: "\x1b[90m\u25CB\x1b[0m",
};

const priorityColor: Record<Priority, string> = {
  CRITICAL: "\x1b[31m",
  HIGH: "\x1b[33m",
  MEDIUM: "\x1b[36m",
  LOW: "\x1b[90m",
};

export function printAnalysis(result: AnalysisResult, url: string) {
  const m = result.bunSpecific;

  console.log(`\n\x1b[1m  Performance Analysis with Documentation Context\x1b[0m`);
  console.log("  " + "=".repeat(49));
  console.log();
  console.log(`  Provider: \x1b[32m${result.provider.toUpperCase()}\x1b[0m`);
  console.log(`  Category: ${result.category.toUpperCase()} (${result.urlType})`);
  console.log(`  Type: ${result.urlType.toUpperCase()}`);

  // Critical Performance Issues
  if (result.issues.length > 0) {
    console.log(`\n  \x1b[1mCritical Performance Issues:\x1b[0m`);
    for (let i = 0; i < result.issues.length; i++) {
      const issue = result.issues[i];
      const prefix = i < result.issues.length - 1 ? "\u251C\u2500\u2500" : "\u2514\u2500\u2500";
      console.log(`  ${prefix} ${issue.type}: ${issue.details} ${priorityIcon[issue.severity]}`);
    }
  }

  // Documentation Gaps
  if (result.documentationGaps.length > 0) {
    console.log(`\n  \x1b[1mDocumentation Gaps Identified:\x1b[0m`);
    for (let i = 0; i < result.documentationGaps.length; i++) {
      const gap = result.documentationGaps[i];
      console.log(`  ${i + 1}. ${gap.category}: ${gap.gap}`);
    }
  }

  // Recommended Documentation Updates
  if (result.recommendations.length > 0) {
    console.log(`\n  \x1b[1mRecommended Documentation Updates:\x1b[0m`);
    for (const rec of result.recommendations) {
      console.log(`  - [${rec.category.toUpperCase()}] ${rec.title}`);
    }
  }

  // Quick Wins
  const quickWins: string[] = [];
  if (m.compressionRatio < 0.5) quickWins.push(`Enable Brotli compression (potential: 70%+ savings)`);
  if (m.cacheHitRate < 0.5) quickWins.push(`Implement CDN caching (potential: 90%+ cache hit rate)`);
  if (m.totalTransfer > 10 * 1024 * 1024) quickWins.push(`Optimize large assets (potential: 50% size reduction)`);
  if (m.ttfb > 500) quickWins.push(`Add edge caching (potential: <200ms TTFB)`);

  if (quickWins.length > 0) {
    console.log(`\n  \x1b[1mQuick Wins:\x1b[0m`);
    for (let i = 0; i < quickWins.length; i++) {
      console.log(`  ${i + 1}. ${quickWins[i]}`);
    }
  }

  // Actions
  if (result.actions.length > 0) {
    console.log(`\n  \x1b[1mActions:\x1b[0m`);
    for (const action of result.actions) {
      console.log(`  \x1b[90m-\x1b[0m ${action}`);
    }
  }

  // Metrics summary
  console.log(`\n  \x1b[1mMetrics:\x1b[0m`);
  console.log(`  TTFB: ${fmtMs(m.ttfb)}  Transfer: ${fmtBytes(m.totalTransfer)}  Size: ${fmtBytes(m.totalSize)}`);
  console.log(`  Compression: ${(m.compressionRatio * 100).toFixed(0)}%  Cache hits: ${(m.cacheHitRate * 100).toFixed(0)}%  Slow: ${m.slowRequests}/${m.totalRequests}  Domains: ${m.domains}`);

  console.log();
}

// --- CLI ---

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: bun tools/har-analysis.ts <file.har|->");
    process.exit(1);
  }

  const raw = file === "-"
    ? await new Response(Bun.stdin.stream()).text()
    : await Bun.file(file).text();
  const har = JSON.parse(raw);
  const url = har.log.pages?.[0]?.title || har.log.entries?.[0]?.request.url || "";

  if (!url) {
    console.error("Cannot determine page URL from HAR");
    process.exit(1);
  }

  const analyzer = new DocumentationAwarePerformanceAnalyzer();
  const result = analyzer.analyzeWithDocsContext(har, url);
  printAnalysis(result, url);
}
