#!/usr/bin/env bun

/**
 * Bun Cookie Inspector v3.0 - Complete Property Analysis
 * 
 * Comprehensive cookie analysis, validation, and inspection system
 * Integrated with our validation platform and unified telemetry
 */

import { Cookie, SecureCookieOptions } from './bun-cookies-complete-v2';
import { CookieValidator, ValidationResult } from './cookie-validator';

// Define CookieOptions interface for compatibility
interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: Date | number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
  partitioned?: boolean;
  maxAge?: number;
}

// 🎯 ENHANCED COOKIE ANALYZER
export class CookieInspector {
  
  // 📊 COMPREHENSIVE VALIDATION (Integrates with our validation system)
  static validateCookie(cookie: Cookie): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
    validationDetails: ValidationResult;
  } {
    // Use our comprehensive validation system
    const validationDetails = CookieValidator.validateCookie({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      partitioned: cookie.partitioned,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly
    });

    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Convert validation results to legacy format
    validationDetails.errors.forEach(error => {
      issues.push(`${error.property}: ${error.message}`);
    });

    validationDetails.warnings.forEach(warning => {
      warnings.push(`${warning.property}: ${warning.message}`);
    });

    // Add additional inspector-specific checks
    this.validateSecurityPosture(cookie, issues, warnings, recommendations);
    this.validatePerformanceImpact(cookie, warnings, recommendations);
    this.validatePrivacyCompliance(cookie, warnings, recommendations);

    return {
      isValid: validationDetails.valid,
      issues,
      warnings,
      recommendations,
      validationDetails
    };
  }

  // 🔍 ADDITIONAL SECURITY POSTURE VALIDATION
  private static validateSecurityPosture(
    cookie: Cookie, 
    issues: string[], 
    warnings: string[], 
    recommendations: string[]
  ): void {
    // Check for sensitive data patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /auth/i,
      /session/i
    ];

    const hasSensitiveData = sensitivePatterns.some(pattern => 
      pattern.test(cookie.name) || pattern.test(cookie.value)
    );

    if (hasSensitiveData && !cookie.httpOnly) {
      issues.push('Cookie with sensitive data must have httpOnly=true');
    }

    if (hasSensitiveData && !cookie.secure) {
      issues.push('Cookie with sensitive data must have secure=true');
    }

    if (hasSensitiveData && cookie.sameSite !== 'strict') {
      recommendations.push('Consider sameSite=strict for sensitive cookies');
    }

    // Check for long-lived sensitive cookies
    if (hasSensitiveData && cookie.maxAge && cookie.maxAge > 60 * 60 * 24) {
      warnings.push('Sensitive cookie with long lifespan (>24 hours)');
    }
  }

  // ⚡ PERFORMANCE IMPACT VALIDATION
  private static validatePerformanceImpact(
    cookie: Cookie, 
    warnings: string[], 
    recommendations: string[]
  ): void {
    const totalSize = cookie.name.length + cookie.value.length;
    
    if (totalSize > 1024) {
      warnings.push(`Large cookie (${totalSize} bytes) may impact performance`);
    }

    if (totalSize > 2048) {
      recommendations.push('Consider reducing cookie size or using server-side storage');
    }

    // Check for subdomain impact
    if (cookie.domain && cookie.domain.startsWith('.')) {
      warnings.push('Domain-scoped cookies sent to all subdomains - performance impact');
    }

    // Check for path impact
    if (cookie.path === '/') {
      warnings.push('Root path cookie sent to all requests - consider specific path');
    }
  }

  // 🔒 PRIVACY COMPLIANCE VALIDATION
  private static validatePrivacyCompliance(
    cookie: Cookie, 
    warnings: string[], 
    recommendations: string[]
  ): void {
    // Check for tracking identifiers
    const trackingPatterns = [
      /ga_/i,
      /fb_/i,
      /_gid/i,
      /_ga/i,
      /analytics/i,
      /tracking/i,
      /pixel/i,
      /ad_/i
    ];

    const isTrackingCookie = trackingPatterns.some(pattern => 
      pattern.test(cookie.name)
    );

    if (isTrackingCookie && !cookie.sameSite) {
      recommendations.push('Tracking cookies should specify sameSite attribute');
    }

    if (isTrackingCookie && cookie.maxAge && cookie.maxAge > 60 * 60 * 24 * 365) {
      warnings.push('Tracking cookie with very long lifespan (>1 year)');
    }

    // Check for consent requirements
    if (isTrackingCookie && !cookie.secure) {
      recommendations.push('Consider secure=true for tracking cookies');
    }
  }

  // 📈 ENHANCED COOKIE METRICS ANALYZER
  static analyzeCookies(cookies: Cookie[]): {
    totalCookies: number;
    totalSize: number;
    securityScore: number;
    performanceScore: number;
    privacyScore: number;
    compliance: {
      gdpr: boolean;
      ccpa: boolean;
      hipaa: boolean;
      pciDss: boolean;
    };
    categories: {
      session: number;
      authentication: number;
      analytics: number;
      preferences: number;
      advertising: number;
      functional: number;
    };
    recommendations: string[];
    validationSummary: {
      valid: number;
      invalid: number;
      warnings: number;
    };
  } {
    let totalSize = 0;
    let secureCount = 0;
    let httpOnlyCount = 0;
    let sameSiteStrictCount = 0;
    
    const categories = {
      session: 0,
      authentication: 0,
      analytics: 0,
      preferences: 0,
      advertising: 0,
      functional: 0
    };

    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    for (const cookie of cookies) {
      totalSize += cookie.name.length + cookie.value.length;
      
      if (cookie.secure) secureCount++;
      if (cookie.httpOnly) httpOnlyCount++;
      if (cookie.sameSite === 'strict') sameSiteStrictCount++;
      
      // Categorize by name patterns
      this.categorizeCookie(cookie, categories);
      
      // Validate and count
      const validation = this.validateCookie(cookie);
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
      warningCount += validation.warnings.length;
    }

    const securityScore = Math.round(
      ((secureCount + httpOnlyCount + sameSiteStrictCount) / (cookies.length * 3)) * 100
    );

    const performanceScore = Math.round(Math.max(0, 100 - (totalSize / 100))); // Penalize large cookies
    
    const privacyScore = Math.round(
      ((httpOnlyCount + (cookies.filter(c => c.sameSite !== 'none').length)) / (cookies.length * 2)) * 100
    );

    return {
      totalCookies: cookies.length,
      totalSize,
      securityScore,
      performanceScore,
      privacyScore,
      compliance: this.checkCompliance(cookies),
      categories,
      recommendations: this.generateRecommendations(cookies),
      validationSummary: {
        valid: validCount,
        invalid: invalidCount,
        warnings: warningCount
      }
    };
  }

  private static categorizeCookie(cookie: Cookie, categories: any): void {
    const name = cookie.name.toLowerCase();
    
    if (name.includes('session') || name.includes('sess')) {
      categories.session++;
    } else if (name.includes('token') || name.includes('auth') || name.includes('jwt')) {
      categories.authentication++;
    } else if (name.includes('analytics') || name.includes('ga_') || name.includes('_ga')) {
      categories.analytics++;
    } else if (name.includes('pref') || name.includes('theme') || name.includes('lang')) {
      categories.preferences++;
    } else if (name.includes('ad') || name.includes('track') || name.includes('fb_')) {
      categories.advertising++;
    } else {
      categories.functional++;
    }
  }

  private static checkCompliance(cookies: Cookie[]): {
    gdpr: boolean;
    ccpa: boolean;
    hipaa: boolean;
    pciDss: boolean;
  } {
    const hasAdvertisingCookies = cookies.some(c => 
      c.name.toLowerCase().includes('ad') || 
      c.name.toLowerCase().includes('track')
    );
    
    const hasSensitiveData = cookies.some(c => 
      c.name.toLowerCase().includes('ssn') ||
      c.name.toLowerCase().includes('medical') ||
      c.name.toLowerCase().includes('credit')
    );

    const hasAuthenticationCookies = cookies.some(c => 
      c.name.toLowerCase().includes('auth') ||
      c.name.toLowerCase().includes('token')
    );

    const allSecure = cookies.every(c => c.secure);
    const allHttpOnly = cookies.every(c => c.httpOnly);
    const allStrictSameSite = cookies.every(c => c.sameSite === 'strict');

    return {
      gdpr: !hasAdvertisingCookies || (allSecure && allHttpOnly && (allStrictSameSite || cookies.every(c => c.sameSite === 'lax'))),
      ccpa: !hasAdvertisingCookies || allSecure,
      hipaa: !hasSensitiveData || (allSecure && allHttpOnly && allStrictSameSite),
      pciDss: !hasAuthenticationCookies || (allSecure && allHttpOnly && allStrictSameSite)
    };
  }

  private static generateRecommendations(cookies: Cookie[]): string[] {
    const recommendations: string[] = [];
    
    // Security recommendations
    const insecureCookies = cookies.filter(c => !c.secure);
    if (insecureCookies.length > 0) {
      recommendations.push(`Set secure=true for ${insecureCookies.length} cookies`);
    }
    
    const nonHttpOnly = cookies.filter(c => !c.httpOnly);
    if (nonHttpOnly.length > 0) {
      recommendations.push(`Set httpOnly=true for ${nonHttpOnly.length} cookies`);
    }
    
    // Performance recommendations
    const largeCookies = cookies.filter(c => 
      c.name.length + c.value.length > 1024
    );
    if (largeCookies.length > 0) {
      recommendations.push(`Reduce size of ${largeCookies.length} cookies over 1KB`);
    }
    
    // Organization recommendations
    if (cookies.length > 20) {
      recommendations.push('Consider reducing total number of cookies (currently ' + cookies.length + ')');
    }

    // SameSite recommendations
    const noSameSite = cookies.filter(c => !c.sameSite);
    if (noSameSite.length > 0) {
      recommendations.push(`Set sameSite attribute for ${noSameSite.length} cookies`);
    }
    
    return recommendations;
  }

  // 🔧 ENHANCED COOKIE BUILDER UTILITY
  static createCookieBuilder() {
    return new CookieBuilder();
  }

  // 📊 REAL-TIME COOKIE MONITORING
  static createCookieMonitor() {
    return new CookieMonitor();
  }

  // 🔍 ADVANCED SEARCH AND FILTERING
  static findCookies(cookies: Cookie[], filters: {
    name?: RegExp;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
    category?: string;
    minSize?: number;
    maxSize?: number;
  }): Cookie[] {
    return cookies.filter(cookie => {
      if (filters.name && !filters.name.test(cookie.name)) return false;
      if (filters.domain && cookie.domain !== filters.domain) return false;
      if (filters.secure !== undefined && cookie.secure !== filters.secure) return false;
      if (filters.httpOnly !== undefined && cookie.httpOnly !== filters.httpOnly) return false;
      if (filters.sameSite && cookie.sameSite !== filters.sameSite) return false;
      
      const size = cookie.name.length + cookie.value.length;
      if (filters.minSize && size < filters.minSize) return false;
      if (filters.maxSize && size > filters.maxSize) return false;
      
      if (filters.category) {
        const category = this.categorizeSingle(cookie);
        if (category !== filters.category) return false;
      }
      
      return true;
    });
  }

  private static categorizeSingle(cookie: Cookie): string {
    const name = cookie.name.toLowerCase();
    
    if (name.includes('session') || name.includes('sess')) return 'session';
    if (name.includes('token') || name.includes('auth') || name.includes('jwt')) return 'authentication';
    if (name.includes('analytics') || name.includes('ga_') || name.includes('_ga')) return 'analytics';
    if (name.includes('pref') || name.includes('theme') || name.includes('lang')) return 'preferences';
    if (name.includes('ad') || name.includes('track') || name.includes('fb_')) return 'advertising';
    
    return 'functional';
  }
}

// 🛠️ ENHANCED FLUENT COOKIE BUILDER
class CookieBuilder {
  private name: string = '';
  private value: string = '';
  private options: CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const
  };

  constructor() {}

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withValue(value: string | object): this {
    this.value = typeof value === 'string' ? value : JSON.stringify(value);
    return this;
  }

  withDomain(domain: string): this {
    this.options.domain = domain;
    return this;
  }

  withPath(path: string): this {
    this.options.path = path;
    return this;
  }

  withExpires(date: Date): this {
    this.options.expires = date;
    return this;
  }

  withMaxAge(seconds: number): this {
    this.options.maxAge = seconds;
    return this;
  }

  withSecure(secure: boolean = true): this {
    this.options.secure = secure;
    return this;
  }

  withSameSite(sameSite: 'strict' | 'lax' | 'none'): this {
    this.options.sameSite = sameSite;
    return this;
  }

  withPartitioned(partitioned: boolean = true): this {
    this.options.partitioned = partitioned;
    return this;
  }

  withHttpOnly(httpOnly: boolean = true): this {
    this.options.httpOnly = httpOnly;
    return this;
  }

  // SPECIALIZED BUILDERS WITH VALIDATION
  asSessionCookie(): this {
    return this
      .withHttpOnly(true)
      .withSecure(true)
      .withSameSite('strict')
      .withMaxAge(60 * 60 * 24 * 7); // 1 week
  }

  asAnalyticsCookie(): this {
    return this
      .withHttpOnly(false) // Allow JS access
      .withSecure(true)
      .withSameSite('lax')
      .withMaxAge(60 * 60 * 24 * 365); // 1 year
  }

  asPreferenceCookie(): this {
    return this
      .withHttpOnly(false)
      .withSecure(true)
      .withSameSite('lax')
      .withMaxAge(60 * 60 * 24 * 365 * 2); // 2 years
  }

  asAuthenticationCookie(): this {
    return this
      .withHttpOnly(true)
      .withSecure(true)
      .withSameSite('strict')
      .withMaxAge(60 * 60 * 24); // 24 hours
  }

  // BUILD WITH VALIDATION
  build(): { cookie: Cookie; validation: ValidationResult } {
    if (!this.name) {
      throw new Error('Cookie name is required');
    }
    
    const cookie = new Cookie(this.name, this.value, this.options);
    
    // Validate using our validation system
    const validation = CookieValidator.validateCookie({
      name: this.name,
      value: this.value,
      domain: this.options.domain,
      path: this.options.path,
      expires: this.options.expires,
      secure: this.options.secure,
      sameSite: this.options.sameSite,
      partitioned: this.options.partitioned,
      maxAge: this.options.maxAge,
      httpOnly: this.options.httpOnly
    } as any);

    if (!validation.valid) {
      throw new Error(`Cookie validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return { cookie, validation };
  }
}

// 📊 REAL-TIME COOKIE MONITOR
export class CookieMonitor {
  private metrics: Map<string, number> = new Map();
  private alerts: Array<{ timestamp: Date; message: string; severity: 'info' | 'warning' | 'error' }> = [];

  trackCookieAccess(cookieName: string, action: 'get' | 'set' | 'delete'): void {
    const key = `${cookieName}:${action}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
    
    // Check for unusual patterns
    const accessCount = this.metrics.get(key) || 0;
    if (accessCount > 100) {
      this.alerts.push({
        timestamp: new Date(),
        message: `High access frequency detected: ${cookieName} (${action} ${accessCount} times)`,
        severity: 'warning'
      });
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getAlerts(): Array<{ timestamp: Date; message: string; severity: 'info' | 'warning' | 'error' }> {
    return this.alerts.slice(-50); // Return last 50 alerts
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

// 📊 ENHANCED COOKIE SERIALIZATION FORMAT
export class CookieSerializer {
  
  // 🍪 COOKIE TO JSON (Enhanced with validation)
  static toJSON(cookie: Cookie): Record<string, any> {
    const validation = CookieInspector.validateCookie(cookie);
    
    return {
      name: cookie.name,
      value: cookie.value.length > 50 ? `${cookie.value.substring(0, 47)}...` : cookie.value,
      valueLength: cookie.value.length,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ? new Date(cookie.expires).toISOString() : 'Session',
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      partitioned: cookie.partitioned,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly,
      estimatedSize: cookie.name.length + cookie.value.length,
      category: this.categorize(cookie),
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        warnings: validation.warnings,
        recommendations: validation.recommendations
      },
      securityScore: this.calculateSecurityScore(cookie),
      performanceImpact: this.assessPerformanceImpact(cookie)
    };
  }

  private static categorize(cookie: Cookie): string {
    return CookieInspector['categorizeSingle'](cookie);
  }

  private static calculateSecurityScore(cookie: Cookie): number {
    let score = 0;
    const maxScore = 100;
    
    if (cookie.secure) score += 30;
    if (cookie.httpOnly) score += 30;
    if (cookie.sameSite === 'strict') score += 25;
    else if (cookie.sameSite === 'lax') score += 15;
    else if (cookie.sameSite === 'none' && cookie.secure) score += 20;
    
    if (cookie.partitioned && cookie.secure) score += 15;
    
    return Math.min(score, maxScore);
  }

  private static assessPerformanceImpact(cookie: Cookie): 'low' | 'medium' | 'high' {
    const size = cookie.name.length + cookie.value.length;
    
    if (size > 2048) return 'high';
    if (size > 1024) return 'medium';
    return 'low';
  }

  // 🔄 COOKIE TO HEADER STRING (Enhanced)
  static toHeaderString(cookie: Cookie): string {
    const parts = [`${cookie.name}=${cookie.value}`];
    
    if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
    if (cookie.path) parts.push(`Path=${cookie.path}`);
    if (cookie.expires) parts.push(`Expires=${new Date(cookie.expires).toUTCString()}`);
    if (cookie.maxAge) parts.push(`Max-Age=${cookie.maxAge}`);
    if (cookie.secure) parts.push('Secure');
    if (cookie.httpOnly) parts.push('HttpOnly');
    if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
    if (cookie.partitioned) parts.push('Partitioned');
    
    return parts.join('; ');
  }

  // 📦 COOKIE TO DATAVIEW (Enhanced Binary Format)
  static toDataView(cookie: Cookie): DataView {
    const nameBytes = new TextEncoder().encode(cookie.name);
    const valueBytes = new TextEncoder().encode(cookie.value);
    const domainBytes = cookie.domain ? new TextEncoder().encode(cookie.domain) : new Uint8Array(0);
    const pathBytes = cookie.path ? new TextEncoder().encode(cookie.path) : new Uint8Array(0);
    
    // Enhanced header: 48 bytes
    // Data: variable length
    const totalSize = 48 + nameBytes.length + valueBytes.length + domainBytes.length + pathBytes.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Enhanced header
    view.setUint32(offset, 0x434F4B45); // "COOK" magic number
    offset += 4;
    view.setUint8(offset++, 0x02); // Version 2 (enhanced)
    view.setUint16(offset, nameBytes.length, true);
    offset += 2;
    view.setUint16(offset, valueBytes.length, true);
    offset += 2;
    view.setUint16(offset, domainBytes.length, true);
    offset += 2;
    view.setUint16(offset, pathBytes.length, true);
    offset += 2;
    
    // Enhanced flags (2 bytes)
    let flags = 0;
    if (cookie.secure) flags |= 0x01;
    if (cookie.httpOnly) flags |= 0x02;
    if (cookie.partitioned) flags |= 0x04;
    view.setUint16(offset, flags, true);
    offset += 2;
    
    // SameSite (1 byte)
    const sameSiteMap = { 'strict': 0, 'lax': 1, 'none': 2 };
    view.setUint8(offset++, sameSiteMap[cookie.sameSite] || 1);
    
    // Security score and performance impact
    view.setUint8(offset++, this.calculateSecurityScore(cookie));
    view.setUint8(offset++, this.assessPerformanceImpact(cookie) === 'high' ? 2 : this.assessPerformanceImpact(cookie) === 'medium' ? 1 : 0);
    
    // Numeric values
    if (cookie.expires) {
      view.setBigUint64(offset, BigInt(cookie.expires.getTime()), true);
    } else {
      view.setBigUint64(offset, 0n, true);
    }
    offset += 8;
    
    if (cookie.maxAge) {
      view.setUint32(offset, cookie.maxAge, true);
    } else {
      view.setUint32(offset, 0, true);
    }
    offset += 4;
    
    // Creation timestamp
    view.setBigUint64(offset, BigInt(Date.now()), true);
    offset += 8;
    
    // Reserved (8 bytes)
    offset += 8;
    
    // String data
    new Uint8Array(buffer, offset, nameBytes.length).set(nameBytes);
    offset += nameBytes.length;
    new Uint8Array(buffer, offset, valueBytes.length).set(valueBytes);
    offset += valueBytes.length;
    new Uint8Array(buffer, offset, domainBytes.length).set(domainBytes);
    offset += domainBytes.length;
    new Uint8Array(buffer, offset, pathBytes.length).set(pathBytes);
    
    return view;
  }

  // 📄 DATAVIEW TO COOKIE (Enhanced)
  static fromDataView(view: DataView): Cookie | null {
    try {
      const magic = view.getUint32(0);
      if (magic !== 0x434F4B45) return null;
      
      let offset = 4;
      const version = view.getUint8(offset++);
      if (version !== 0x02) return null; // Enhanced version
      
      const nameLen = view.getUint16(offset, true);
      offset += 2;
      const valueLen = view.getUint16(offset, true);
      offset += 2;
      const domainLen = view.getUint16(offset, true);
      offset += 2;
      const pathLen = view.getUint16(offset, true);
      offset += 2;
      
      const flags = view.getUint16(offset, true);
      offset += 2;
      const secure = (flags & 0x01) !== 0;
      const httpOnly = (flags & 0x02) !== 0;
      const partitioned = (flags & 0x04) !== 0;
      
      const sameSiteValue = view.getUint8(offset++);
      const sameSiteMap = ['strict', 'lax', 'none'];
      const sameSite = sameSiteMap[sameSiteValue] as 'strict' | 'lax' | 'none';
      
      // Skip security score and performance impact
      offset += 2;
      
      const expires = Number(view.getBigUint64(offset, true));
      offset += 8;
      const maxAge = view.getUint32(offset, true);
      offset += 4;
      
      // Skip creation timestamp
      offset += 8;
      
      offset += 8; // Skip reserved
      
      // Read strings
      const nameBytes = new Uint8Array(view.buffer, offset, nameLen);
      offset += nameLen;
      const name = new TextDecoder().decode(nameBytes);
      
      const valueBytes = new Uint8Array(view.buffer, offset, valueLen);
      offset += valueLen;
      const value = new TextDecoder().decode(valueBytes);
      
      let domain: string | null = null;
      if (domainLen > 0) {
        const domainBytes = new Uint8Array(view.buffer, offset, domainLen);
        offset += domainLen;
        domain = new TextDecoder().decode(domainBytes);
      }
      
      let path = '/';
      if (pathLen > 0) {
        const pathBytes = new Uint8Array(view.buffer, offset, pathLen);
        path = new TextDecoder().decode(pathBytes);
      }
      
      return new Cookie(name, value, {
        domain,
        path,
        expires: expires > 0 ? new Date(expires) : undefined,
        secure,
        sameSite,
        partitioned,
        maxAge: maxAge > 0 ? maxAge : undefined,
        httpOnly
      });
    } catch (error) {
      console.error('Failed to deserialize cookie:', error);
      return null;
    }
  }
}

// 📊 ENHANCED COOKIE COMPARISON UTILITY
export class CookieComparator {
  
  static compare(cookie1: Cookie, cookie2: Cookie): {
    sameValue: boolean;
    sameAttributes: boolean;
    differences: Array<{ property: string; value1: any; value2: any }>;
    securityImpact: 'none' | 'low' | 'medium' | 'high';
  } {
    const properties: Array<keyof Cookie> = [
      'name', 'value', 'domain', 'path', 'expires', 
      'secure', 'sameSite', 'partitioned', 'maxAge', 'httpOnly'
    ];
    
    const differences: Array<{ property: string; value1: any; value2: any }> = [];
    
    for (const prop of properties) {
      const val1 = (cookie1 as any)[prop];
      const val2 = (cookie2 as any)[prop];
      
      // Special handling for undefined vs null
      if (val1 !== val2 && !(val1 == null && val2 == null)) {
        differences.push({
          property: prop,
          value1: val1,
          value2: val2
        });
      }
    }

    // Assess security impact
    const securityDifferences = differences.filter(d => 
      ['secure', 'httpOnly', 'sameSite'].includes(d.property)
    );
    
    let securityImpact: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (securityDifferences.length > 0) {
      if (securityDifferences.some(d => d.property === 'secure')) {
        securityImpact = 'high';
      } else if (securityDifferences.some(d => d.property === 'httpOnly')) {
        securityImpact = 'medium';
      } else {
        securityImpact = 'low';
      }
    }
    
    return {
      sameValue: cookie1.value === cookie2.value,
      sameAttributes: differences.length === 0,
      differences,
      securityImpact
    };
  }
  
  static findDuplicates(cookies: Cookie[]): Array<{
    name: string;
    count: number;
    instances: Cookie[];
    conflicts: Array<{ property: string; values: any[] }>;
  }> {
    const groups = new Map<string, Cookie[]>();
    
    for (const cookie of cookies) {
      if (!groups.has(cookie.name)) {
        groups.set(cookie.name, []);
      }
      groups.get(cookie.name)!.push(cookie);
    }
    
    const duplicates: Array<{ name: string; count: number; instances: Cookie[]; conflicts: Array<{ property: string; values: any[] }> }> = [];
    
    for (const [name, instances] of groups.entries()) {
      if (instances.length > 1) {
        // Find conflicts
        const conflicts: Array<{ property: string; values: any[] }> = [];
        const properties: Array<keyof Cookie> = ['domain', 'path', 'secure', 'httpOnly', 'sameSite'];
        
        for (const prop of properties) {
          const values = instances.map(c => (c as any)[prop]).filter((v, i, a) => a.indexOf(v) === i);
          if (values.length > 1) {
            conflicts.push({ property: prop, values });
          }
        }
        
        duplicates.push({ name, count: instances.length, instances, conflicts });
      }
    }
    
    return duplicates;
  }
}

// 🚀 ENHANCED DEMONSTRATION
export function demonstrateCookieInspector() {
  console.log('🍪 BUN COOKIE INSPECTOR v3.0 - ENHANCED');
  console.log('='.repeat(60));
  
  // Example cookie with comprehensive analysis
  const cookie = new Cookie('session_id', 'abc123def456789', {
    domain: 'example.com',
    path: '/',
    expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    secure: true,
    sameSite: 'strict',
    partitioned: false,
    maxAge: 3600,
    httpOnly: true
  });
  
  console.log('🔍 Comprehensive Analysis:');
  console.log('-'.repeat(40));
  const analysis = CookieInspector.validateCookie(cookie);
  console.log(`Valid: ${analysis.isValid ? '✅' : '❌'}`);
  console.log(`Issues: ${analysis.issues.length}`);
  console.log(`Warnings: ${analysis.warnings.length}`);
  console.log(`Recommendations: ${analysis.recommendations.length}`);
  
  if (analysis.issues.length > 0) {
    console.log('\n🚨 Issues:');
    analysis.issues.forEach(issue => console.log(`  ❌ ${issue}`));
  }
  
  if (analysis.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    analysis.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }
  
  console.log('\n📊 JSON Representation:');
  console.log('-'.repeat(40));
  const jsonRep = CookieSerializer.toJSON(cookie);
  console.log(JSON.stringify(jsonRep, null, 2));
  
  console.log('\n🔧 Fluent Builder with Validation:');
  console.log('-'.repeat(40));
  try {
    const builtCookie = CookieInspector.createCookieBuilder()
      .withName('user_prefs')
      .withValue({ theme: 'dark', language: 'en' })
      .asPreferenceCookie()
      .build();
    
    console.log(`✅ Built cookie: ${builtCookie.cookie.name}`);
    console.log(`Validation: ${builtCookie.validation.valid ? 'Valid' : 'Invalid'}`);
  } catch (error) {
    console.log(`❌ Build failed: ${error}`);
  }
  
  console.log('\n📈 Multi-Cookie Analysis:');
  console.log('-'.repeat(40));
  const cookies = [
    cookie,
    new Cookie('analytics_id', 'GA12345', { secure: true, sameSite: 'lax' }),
    new Cookie('theme', 'dark', { secure: false, httpOnly: false })
  ];
  
  const metrics = CookieInspector.analyzeCookies(cookies);
  console.log(`Total cookies: ${metrics.totalCookies}`);
  console.log(`Total size: ${metrics.totalSize} bytes`);
  console.log(`Security score: ${metrics.securityScore}%`);
  console.log(`Performance score: ${metrics.performanceScore}%`);
  console.log(`Privacy score: ${metrics.privacyScore}%`);
  console.log(`Valid cookies: ${metrics.validationSummary.valid}/${metrics.totalCookies}`);
}

// 🔐 MUST-DO Security Practices
export class SecureCookiePro {
  static createUnbreakableSession(userId: string): Cookie {
    return new Cookie(
      '__Host-session', // Prefix protects against domain spoofing
      crypto.randomUUID(),
      {
        // ✅ MUST HAVE for sessions
        secure: true,           // HTTPS only
        httpOnly: true,         // No JavaScript access
        sameSite: 'strict',     // Prevent CSRF
        path: '/',              // Required for __Host-
        
        // ✅ SHOULD HAVE
        maxAge: 60 * 15,        // 15 minutes (short sessions)
        partitioned: false,     // Keep server-side sessions
        
        // ❌ NEVER DO for sessions
        // domain: 'example.com'  // Breaks __Host- protection
      }
    );
  }
  
  // 🔄 Session Refresh Pattern
  static refreshSession(sessionCookie: Cookie): Cookie {
    // Don't extend indefinitely - use sliding window
    const newMaxAge = Math.min(
      sessionCookie.maxAge || 900, // Current or 15min default
      3600 // Never exceed 1 hour total
    );
    
    return new Cookie(
      sessionCookie.name,
      sessionCookie.value,
      { ...sessionCookie, maxAge: newMaxAge }
    );
  }

  // 🛡️ Create Secure Authentication Cookie
  static createSecureAuth(token: string, userId: string): Cookie {
    return new Cookie(
      '__Host-auth',
      token,
      {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 30, // 30 minutes for auth
        partitioned: false
      }
    );
  }

  // 🔒 Create CSRF Protection Cookie
  static createCSRFToken(): Cookie {
    return new Cookie(
      '__Host-csrf',
      crypto.randomUUID(),
      {
        secure: true,
        httpOnly: false, // JavaScript needs to read this
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 2 // 2 hours
      }
    );
  }

  // 📊 Create Analytics Cookie (GDPR Compliant)
  static createAnalyticsCookie(sessionId: string): Cookie {
    return new Cookie(
      '_ga_analytics',
      sessionId,
      {
        secure: true,
        httpOnly: false, // JavaScript needs access
        sameSite: 'lax', // Allow cross-site for analytics
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        partitioned: true // CHIPS API for privacy
      }
    );
  }

  // 🎯 Create Preference Cookie
  static createPreferenceCookie(preferences: Record<string, any>): Cookie {
    return new Cookie(
      'prefs',
      JSON.stringify(preferences),
      {
        secure: true,
        httpOnly: false, // JavaScript needs access
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365 * 2 // 2 years
      }
    );
  }

  // 🔍 Security Validation Method
  static validateSecurity(cookie: Cookie): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check __Host- prefix requirements
    if (cookie.name.startsWith('__Host-')) {
      if (!cookie.secure) issues.push('__Host- cookies must have secure=true');
      if (cookie.path !== '/') issues.push('__Host- cookies must have path="/"');
      if (cookie.domain !== null && cookie.domain !== undefined) {
        issues.push('__Host- cookies must not have domain set');
      }
    }

    // Check __Secure- prefix requirements
    if (cookie.name.startsWith('__Secure-')) {
      if (!cookie.secure) issues.push('__Secure- cookies must have secure=true');
    }

    // Session-specific security
    if (cookie.name.includes('session')) {
      if (!cookie.httpOnly) recommendations.push('Session cookies should use httpOnly=true');
      if (cookie.sameSite !== 'strict') recommendations.push('Session cookies should use sameSite=strict');
      if (cookie.maxAge && cookie.maxAge > 3600) recommendations.push('Session cookies should expire within 1 hour');
    }

    // Auth-specific security
    if (cookie.name.includes('auth') || cookie.name.includes('token')) {
      if (!cookie.httpOnly) issues.push('Authentication cookies must use httpOnly=true');
      if (!cookie.secure) issues.push('Authentication cookies must use secure=true');
      if (cookie.sameSite !== 'strict') recommendations.push('Authentication cookies should use sameSite=strict');
    }

    // CSRF token security
    if (cookie.name.includes('csrf')) {
      if (!cookie.secure) issues.push('CSRF tokens must use secure=true');
      if (cookie.httpOnly) recommendations.push('CSRF tokens should be accessible to JavaScript');
    }

    // Analytics privacy
    if (cookie.name.includes('analytics') || cookie.name.startsWith('_ga')) {
      if (!cookie.secure) recommendations.push('Analytics cookies should use secure=true');
      if (cookie.maxAge && cookie.maxAge > 60 * 60 * 24 * 365) {
        recommendations.push('Consider shorter expiration for analytics cookies (GDPR compliance)');
      }
    }

    return {
      isSecure: issues.length === 0,
      issues,
      recommendations
    };
  }

  // 🚨 Security Audit Method
  static auditCookies(cookies: Cookie[]): {
    totalCookies: number;
    secureCookies: number;
    insecureCookies: number;
    criticalIssues: string[];
    recommendations: string[];
    complianceScore: number;
  } {
    let secureCookies = 0;
    let insecureCookies = 0;
    const criticalIssues: string[] = [];
    const allRecommendations: string[] = [];

    cookies.forEach(cookie => {
      const validation = this.validateSecurity(cookie);
      
      if (cookie.secure && cookie.httpOnly) {
        secureCookies++;
      } else {
        insecureCookies++;
      }

      criticalIssues.push(...validation.issues);
      allRecommendations.push(...validation.recommendations);
    });

    const complianceScore = Math.round((secureCookies / cookies.length) * 100);

    return {
      totalCookies: cookies.length,
      secureCookies,
      insecureCookies,
      criticalIssues: [...new Set(criticalIssues)], // Remove duplicates
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      complianceScore
    };
  }
}

// 🎯 EXPORT ALL UTILITIES
export {
  CookieInspector as Inspector,
  CookieSerializer as Serializer,
  CookieComparator as Comparator,
  CookieBuilder
};

// 🚀 RUN DEMO IF EXECUTED DIRECTLY
if (import.meta.main) {
  demonstrateCookieInspector();
}
