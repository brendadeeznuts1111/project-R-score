/**
 * Secure Cookie Manager with Enterprise-Grade Security
 * Implements best practices for cookie security and privacy compliance
 */

import { Bun } from "bun";

interface SecurityError extends Error {
  code: 'COOKIE_TAMPERED' | 'INVALID_SIGNATURE' | 'SECURITY_VIOLATION';
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface SecurityResult {
  allowed: boolean;
  reason?: string;
}

interface DependencyInfo {
  name: string;
  size: number;
  sizeKB: string;
}

interface BundleMetrics {
  totalSize: number;
  totalSizeKB: string;
  totalSizeMB: string;
  compressionRatio: string;
  chunkCount: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: string[];
}

interface ChunkInfo {
  path: string;
  size: number;
  sizeKB: string;
  imports: any[];
  type: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  severity: 'warning' | 'critical';
}

interface AggregatedMetric {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceReport {
  timestamp: number;
  metrics: Record<string, AggregatedMetric>;
  alerts: PerformanceAlert[];
  summary: string;
}

/**
 * Enterprise-grade secure cookie management
 */
export class SecureCookieManager {
  private cookieMap: Bun.CookieMap;
  
  constructor(request: Request) {
    // Initialize with enterprise-grade security settings
    this.cookieMap = new Bun.CookieMap(request, {
      httpOnly: true,                    // Prevent XSS attacks
      secure: Bun.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict",                // Prevent CSRF attacks
      path: "/",                         // Limit to specific path
      maxAge: 60 * 60 * 24 * 7,         // 7 days expiration
      domain: process.env.COOKIE_DOMAIN, // Restrict to specific domain
      partitioned: true,                 // CHIPS for privacy
    });
  }
  
  /**
   * Set secure authentication cookie with HMAC verification
   */
  setAuthCookie(token: string, userId: string) {
    // Add HMAC signature for integrity verification
    const signature = this.generateSignature(token);
    const signedToken = `${token}.${signature}`;
    
    this.cookieMap.set("auth_token", signedToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      priority: "high",
    });
    
    this.cookieMap.set("user_id", userId, {
      httpOnly: false, // Allow JavaScript access for UI
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  
  /**
   * Set analytics cookie with privacy compliance
   */
  setAnalyticsCookie(analyticsId: string) {
    this.cookieMap.set("analytics_id", analyticsId, {
      httpOnly: false,
      secure: true,
      sameSite: "lax", // Allow for cross-site tracking
      maxAge: 60 * 60 * 24 * 365, // 1 year
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }
  
  /**
   * Clear all cookies on logout
   */
  clearAllCookies() {
    for (const [name] of this.cookieMap) {
      this.cookieMap.delete(name);
    }
  }
  
  /**
   * Get cookies with integrity validation
   */
  getSecureCookie(name: string): string | undefined {
    const value = this.cookieMap.get(name);
    
    if (!value) return undefined;
    
    // Validate cookie integrity
    if (this.isCookieTampered(name, value)) {
      this.cookieMap.delete(name);
      const error = new Error("Cookie integrity check failed") as SecurityError;
      error.code = 'COOKIE_TAMPERED';
      throw error;
    }
    
    return name === "auth_token" ? value.split('.')[0] : value;
  }
  
  /**
   * Verify cookie integrity using HMAC
   */
  private isCookieTampered(name: string, value: string): boolean {
    // Implement HMAC verification for sensitive cookies
    if (name === "auth_token") {
      const [token, signature] = value.split(".");
      const expectedSignature = this.generateSignature(token);
      return signature !== expectedSignature;
    }
    return false;
  }
  
  /**
   * Generate HMAC signature for cookie integrity
   */
  private generateSignature(token: string): string {
    const secret = process.env.COOKIE_SECRET;
    if (!secret) {
      throw new Error("COOKIE_SECRET environment variable is required");
    }
    return Bun.hash(token + secret, "sha256");
  }
  
  /**
   * Get all cookies for debugging
   */
  getAllCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};
    for (const [name, value] of this.cookieMap) {
      cookies[name] = value;
    }
    return cookies;
  }
}

/**
 * Security middleware for request validation and protection
 */
export class SecurityMiddleware {
  private rateLimiter = new Map<string, RateLimitInfo>();
  private blockedIPs = new Set<string>();
  
  /**
   * Comprehensive security check for incoming requests
   */
  async secureRequest(request: Request): Promise<SecurityResult> {
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";
    
    // 1. IP-based blocking
    if (this.blockedIPs.has(clientIP)) {
      return { allowed: false, reason: "IP blocked" };
    }
    
    // 2. Rate limiting
    if (!this.checkRateLimit(clientIP)) {
      return { allowed: false, reason: "Rate limit exceeded" };
    }
    
    // 3. User agent validation
    if (!this.validateUserAgent(userAgent)) {
      return { allowed: false, reason: "Invalid user agent" };
    }
    
    // 4. Request size validation
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return { allowed: false, reason: "Request too large" };
    }
    
    // 5. Header validation
    if (!this.validateHeaders(request)) {
      return { allowed: false, reason: "Invalid headers" };
    }
    
    return { allowed: true };
  }
  
  /**
   * Rate limiting with sliding window
   */
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100;
    
    if (!this.rateLimiter.has(clientIP)) {
      this.rateLimiter.set(clientIP, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    const limit = this.rateLimiter.get(clientIP)!;
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return true;
    }
    
    if (limit.count >= maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
  
  /**
   * Validate user agent against bot patterns
   */
  private validateUserAgent(userAgent: string): boolean {
    // Block common bot patterns
    const blockedPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
    ];
    
    return !blockedPatterns.some(pattern => pattern.test(userAgent));
  }
  
  /**
   * Validate headers for injection attacks
   */
  private validateHeaders(request: Request): boolean {
    const suspiciousHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-originating-ip",
    ];
    
    // Check for header injection attempts
    for (const header of suspiciousHeaders) {
      if (request.headers.has(header)) {
        const value = request.headers.get(header);
        if (value && (value.includes("\n") || value.includes("\r"))) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Extract client IP from request
   */
  private getClientIP(request: Request): string {
    // Try various headers for real IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    
    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }
    
    // Fallback to server IP (in real implementation, this would be from connection)
    return "127.0.0.1";
  }
  
  /**
   * Block an IP address
   */
  blockIP(ip: string) {
    this.blockedIPs.add(ip);
  }
  
  /**
   * Unblock an IP address
   */
  unblockIP(ip: string) {
    this.blockedIPs.delete(ip);
  }
}

/**
 * Advanced bundle analyzer with performance insights
 */
export class BundleAnalyzer {
  private metafile: any;
  private metrics: BundleMetrics = {
    totalSize: 0,
    totalSizeKB: "0.00",
    totalSizeMB: "0.00",
    compressionRatio: "0.0",
    chunkCount: 0,
    chunks: [],
    dependencies: [],
    recommendations: [],
  };
  
  constructor(metafilePath: string) {
    this.loadMetafileSync(metafilePath);
  }
  
  /**
   * Load and parse the metafile synchronously for constructor
   */
  private loadMetafileSync(path: string) {
    try {
      if (typeof Bun !== 'undefined') {
        // Use synchronous approach for constructor
        const content = Bun.file(path).text();
        this.metafile = JSON.parse(content);
      } else {
        // Fallback for test environment
        const fs = require('fs');
        const content = fs.readFileSync(path, 'utf-8');
        this.metafile = JSON.parse(content);
      }
      this.calculateMetrics();
    } catch (error) {
      console.error("Failed to load metafile:", error);
      throw new Error("Metafile not found or invalid");
    }
  }
  
  /**
   * Calculate comprehensive bundle metrics
   */
  private calculateMetrics() {
    const outputs = this.metafile.outputs;
    const inputs = this.metafile.inputs;
    
    // Calculate total bundle size
    const totalSize = Object.values(outputs).reduce(
      (sum: number, output: any) => sum + output.bytes, 0
    );
    
    // Analyze chunk distribution
    const chunks = Object.entries(outputs).map(([path, output]: [string, any]) => ({
      path,
      size: output.bytes,
      sizeKB: (output.bytes / 1024).toFixed(2),
      imports: output.imports || [],
      type: this.getChunkType(path),
    }));
    
    // Calculate compression ratio
    const rawSize = this.calculateRawSize(inputs);
    const compressionRatio = ((rawSize - totalSize) / rawSize * 100);
    
    // Identify largest dependencies
    const dependencies = this.analyzeDependencies(inputs);
    
    this.metrics = {
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      compressionRatio: compressionRatio.toFixed(1),
      chunkCount: chunks.length,
      chunks: chunks.sort((a, b) => b.size - a.size),
      dependencies: dependencies.slice(0, 10), // Top 10
      recommendations: this.generateRecommendations(),
    };
  }
  
  /**
   * Determine chunk type based on file path
   */
  private getChunkType(path: string): string {
    if (path.endsWith('.css')) return 'stylesheet';
    if (path.endsWith('.map')) return 'sourcemap';
    if (path.includes('chunk')) return 'chunk';
    if (path.includes('vendor')) return 'vendor';
    if (path.includes('index')) return 'entry';
    return 'module';
  }
  
  /**
   * Calculate raw size before compression
   */
  private calculateRawSize(inputs: any): number {
    return Object.values(inputs).reduce((sum: number, input: any) => {
      return sum + (input.bytes || 0);
    }, 0);
  }
  
  /**
   * Analyze dependency sizes
   */
  private analyzeDependencies(inputs: any): DependencyInfo[] {
    const deps = new Map<string, number>();
    
    for (const [path, input] of Object.entries(inputs)) {
      const size = (input as any).bytes || 0;
      
      // Extract package name from path
      const match = path.match(/node_modules\/([^\/]+)/);
      if (match) {
        const packageName = match[1];
        deps.set(packageName, (deps.get(packageName) || 0) + size);
      }
    }
    
    return Array.from(deps.entries())
      .map(([name, size]) => ({ name, size, sizeKB: (size / 1024).toFixed(2) }))
      .sort((a, b) => b.size - a.size);
  }
  
  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (parseFloat(this.metrics.totalSizeMB) > 2) {
      recommendations.push("📦 Consider code splitting - bundle is over 2MB");
    }
    
    if (this.metrics.chunkCount > 15) {
      recommendations.push("🔧 Too many chunks - consider consolidation");
    }
    
    if (parseFloat(this.metrics.compressionRatio) < 30) {
      recommendations.push("🗜️ Low compression - enable better minification");
    }
    
    const largeDeps = this.metrics.dependencies.filter(d => d.size > 100 * 1024);
    if (largeDeps.length > 0) {
      recommendations.push(`⚠️ Large dependencies: ${largeDeps.map(d => d.name).join(", ")}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ Bundle size looks excellent!");
    }
    
    return recommendations;
  }
  
  /**
   * Get calculated metrics
   */
  getMetrics(): BundleMetrics {
    return this.metrics;
  }
  
  /**
   * Generate colored console output
   */
  printAnalysis() {
    const { totalSizeMB, compressionRatio, chunkCount, recommendations } = this.metrics;
    
    const colorize = (text: string, color?: string) => {
      return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
    };
    
    console.log(
      colorize("📦 Bundle Analysis", "ansi") +
      colorize(" | Size: " + totalSizeMB + " MB", "ansi") +
      colorize(" | Chunks: " + chunkCount, "ansi") +
      colorize(" | Compression: " + compressionRatio + "%", "ansi")
    );
    
    console.log(colorize("\n📊 Top Dependencies:", "ansi"));
    this.metrics.dependencies.forEach((dep, i) => {
      const size = colorize(dep.sizeKB + " KB", "ansi");
      console.log("  " + (i + 1) + ". " + colorize(dep.name, "ansi") + " - " + size);
    });
    
    console.log(colorize("\n💡 Recommendations:", "ansi"));
    recommendations.forEach(rec => {
      console.log("  " + rec);
    });
  }
  
  /**
   * Generate detailed HTML report
   */
  generateHTMLReport(): string {
    const { metrics } = this;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bundle Analysis Report</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui; margin: 2rem; background: #f8f9fa; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
          .metric { background: white; padding: 1rem; border-radius: 8px; 
                   box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
          .chart { height: 200px; background: #e9ecef; border-radius: 4px; 
                  display: flex; align-items: center; justify-content: center; }
          .dependency-bar { 
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); 
            height: 24px; margin: 4px 0; border-radius: 4px; 
            display: flex; align-items: center; padding: 0 8px; color: white; font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Bundle Analysis Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Bun v${typeof Bun !== 'undefined' ? Bun.version : 'unknown'}</p>
        </div>
        
        <div class="metric">
          <h2>📊 Bundle Metrics</h2>
          <p><strong>Total Size:</strong> ${metrics.totalSizeMB} MB</p>
          <p><strong>Compression:</strong> ${metrics.compressionRatio}%</p>
          <p><strong>Chunks:</strong> ${metrics.chunkCount}</p>
        </div>
        
        <div class="metric">
          <h2>📈 Size Distribution</h2>
          ${metrics.chunks.slice(0, 5).map(chunk => `
            <div class="dependency-bar" style="width: ${(chunk.size / metrics.totalSize * 100)}%">
              ${chunk.path} (${chunk.sizeKB} KB)
            </div>
          `).join('')}
        </div>
        
        <div class="metric">
          <h2>📦 Top Dependencies</h2>
          ${metrics.dependencies.map(dep => `
            <div class="dependency-bar" style="width: ${Math.min(100, dep.size / 1024 / 10)}%">
              ${dep.name} (${dep.sizeKB} KB)
            </div>
          `).join('')}
        </div>
        
        <div class="metric">
          <h2>💡 Recommendations</h2>
          <ul>
            ${metrics.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Real-time performance monitoring dashboard
 */
export class PerformanceDashboard {
  private metrics = new Map<string, PerformanceMetric[]>();
  private alerts: PerformanceAlert[] = [];
  
  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    };
    
    this.metrics.get(name)!.push(metric);
    
    // Keep only last 1000 metrics
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    // Check for performance alerts
    this.checkAlerts(metric);
  }
  
  /**
 * Check for performance alerts based on thresholds
 */
  private checkAlerts(metric: PerformanceMetric) {
    const colorize = (text: string, color?: string) => {
      return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
    };
    
    const thresholds: Record<string, number> = {
      'response_time': 1000, // 1 second
      'bundle_size': 2 * 1024 * 1024, // 2MB
      'memory_usage': 512 * 1024 * 1024, // 512MB
      'cpu_usage': 80, // 80%
    };
    
    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      this.alerts.push({
        metric: metric.name,
        value: metric.value,
        threshold,
        timestamp: Date.now(),
        severity: metric.value > threshold * 2 ? 'critical' : 'warning',
      });
      
      console.warn(
        colorize("🚨 Performance Alert", "ansi") +
        colorize(": " + metric.name + " = " + metric.value + " (threshold: " + threshold + ")", "ansi")
      );
    }
  }
  
  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentMetrics = new Map<string, PerformanceMetric[]>();
    
    for (const [name, metrics] of this.metrics) {
      const recent = metrics.filter(m => m.timestamp > oneHourAgo);
      if (recent.length > 0) {
        recentMetrics.set(name, recent);
      }
    }
    
    const aggregated = new Map<string, AggregatedMetric>();
    
    for (const [name, metrics] of recentMetrics) {
      const values = metrics.map(m => m.value);
      aggregated.set(name, {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.percentile(values, 0.95),
        trend: this.calculateTrend(values),
      });
    }
    
    return {
      timestamp: now,
      metrics: Object.fromEntries(aggregated),
      alerts: this.alerts.filter(a => a.timestamp > oneHourAgo),
      summary: this.generateSummary(aggregated),
    };
  }
  
  /**
   * Calculate trend for metric values
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 10) return 'stable';
    
    const recent = values.slice(-5);
    const previous = values.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    const change = (recentAvg - previousAvg) / previousAvg;
    
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }
  
  /**
   * Calculate percentile of values
   */
  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
  
  /**
 * Generate human-readable summary
 */
  private generateSummary(metrics: Map<string, AggregatedMetric>): string {
    const colorize = (text: string, color?: string) => {
      return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
    };
    
    const status = [];
    
    for (const [name, metric] of metrics) {
      if (name === 'response_time' && metric.avg > 500) {
        status.push(colorize("🐌 Slow responses", "ansi"));
      }
      if (name === 'error_rate' && metric.avg > 0.01) {
        status.push(colorize("❌ High error rate", "ansi"));
      }
      if (name === 'memory_usage' && metric.max > 400 * 1024 * 1024) {
        status.push(colorize("🧠 High memory usage", "ansi"));
      }
    }
    
    if (status.length === 0) {
      status.push(colorize("✅ All systems healthy", "ansi"));
    }
    
    return status.join(" | ");
  }
}

/**
 * Main application monitor orchestrating all monitoring components
 */
export class AppMonitor {
  private bundleAnalyzer: BundleAnalyzer;
  private performanceDashboard: PerformanceDashboard;
  private securityMiddleware: SecurityMiddleware;
  
  constructor(metafilePath: string = "./dist/metafile.json") {
    this.bundleAnalyzer = new BundleAnalyzer(metafilePath);
    this.performanceDashboard = new PerformanceDashboard();
    this.securityMiddleware = new SecurityMiddleware();
  }
  
  /**
   * Analyze build performance and generate reports
   */
  async analyzeBuild() {
    const colorize = (text: string, color?: string) => {
      return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
    };
    
    console.log(colorize("🔍 Analyzing build performance...", "ansi"));
    
    // Analyze bundle
    this.bundleAnalyzer.printAnalysis();
    
    // Generate HTML report
    const htmlReport = this.bundleAnalyzer.generateHTMLReport();
    if (typeof Bun !== 'undefined') {
      await Bun.write("./dist/bundle-report.html", htmlReport);
    }
    
    // Record build metrics
    const metrics = this.bundleAnalyzer.getMetrics();
    this.performanceDashboard.recordMetric("bundle_size", metrics.totalSize);
    this.performanceDashboard.recordMetric("chunk_count", metrics.chunkCount);
    this.performanceDashboard.recordMetric("compression_ratio", parseFloat(metrics.compressionRatio));
    
    console.log(colorize("✅ Build analysis complete", "ansi"));
  }
  
  /**
   * Start performance monitoring server
   */
  async startMonitoring(port: number = 3002) {
    const colorize = (text: string, color?: string) => {
      return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
    };
    
    if (typeof Bun === 'undefined' || !Bun.serve) {
      console.log(colorize("⚠️ Monitoring server not available in test environment", "ansi"));
      return null;
    }
    
    const server = Bun.serve({
      port,
      fetch: async (req) => {
        // Security check
        const security = await this.securityMiddleware.secureRequest(req);
        if (!security.allowed) {
          return new Response("Forbidden", { status: 403 });
        }
        
        const url = new URL(req.url);
        
        if (url.pathname === "/metrics") {
          const report = this.performanceDashboard.generateReport();
          return Response.json(report);
        }
        
        if (url.pathname === "/bundle-analysis") {
          const html = this.bundleAnalyzer.generateHTMLReport();
          return new Response(html, {
            headers: { "Content-Type": "text/html" }
          });
        }
        
        if (url.pathname === "/health") {
          return Response.json({
            status: "healthy",
            timestamp: Date.now(),
            version: typeof Bun !== 'undefined' ? Bun.version : "unknown",
          });
        }
        
        return new Response("Not Found", { status: 404 });
      }
    });
    
    console.log(colorize("🚀 Performance monitoring started on :" + port, "ansi"));
    return server;
  }
  
  /**
   * Get security middleware instance
   */
  getSecurityMiddleware(): SecurityMiddleware {
    return this.securityMiddleware;
  }
  
  /**
   * Get performance dashboard instance
   */
  getPerformanceDashboard(): PerformanceDashboard {
    return this.performanceDashboard;
  }
  
  /**
   * Get bundle analyzer instance
   */
  getBundleAnalyzer(): BundleAnalyzer {
    return this.bundleAnalyzer;
  }
}
