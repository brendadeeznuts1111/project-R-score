import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  resolveScopeFromRequest,
  getMatrixRule,
  normalizePlatform,
  extractPlatformFromUA,
  createScopeOverrideCookie,
  parseScopeOverrideCookie,
  clearScopeOverrideCookie,
  validateScopeContext,
  migrateScope,
  generateScopeReport,
  detectEnvironment,
  isProductionEnvironment,
  isDevelopmentEnvironment,
  isTestingEnvironment,
  SCOPING_MATRIX,
  getAllScopes,
  getScopesByLevel,
  getScopesWithFeature,
  getScopesByDomain,
  type ScopeContext,
  type ScopingRule
} from '../config/scope.config';

describe('Scope Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    delete Bun.env.HOST;
    delete Bun.env.PLATFORM_OVERRIDE;
    delete Bun.env.NODE_ENV;
  });
  
  afterEach(() => {
    // Clean up environment
    delete Bun.env.HOST;
    delete Bun.env.PLATFORM_OVERRIDE;
    delete Bun.env.NODE_ENV;
  });
  
  describe('SCOPING_MATRIX', () => {
    it('should have valid scope definitions', () => {
      expect(SCOPING_MATRIX.length).toBeGreaterThan(0);
      
      SCOPING_MATRIX.forEach(scope => {
        expect(scope.detectedScope).toBeDefined();
        expect(scope.servingDomain).toBeDefined();
        expect(scope.platform).toBeDefined();
        expect(Array.isArray(scope.featureFlags)).toBe(true);
        expect(scope.connectionConfig).toBeDefined();
        expect(scope.security).toBeDefined();
        expect(scope.compliance).toBeDefined();
      });
    });
    
    it('should have unique scope combinations', () => {
      const combinations = SCOPING_MATRIX.map(s => `${s.servingDomain}:${s.platform}`);
      const uniqueCombinations = new Set(combinations);
      
      expect(combinations.length).toBe(uniqueCombinations.size);
    });
    
    it('should include required scope types', () => {
      const scopeTypes = SCOPING_MATRIX.map(s => s.detectedScope);
      
      expect(scopeTypes).toContain('ENTERPRISE');
      expect(scopeTypes).toContain('DEVELOPMENT');
      expect(scopeTypes).toContain('LOCAL_SANDBOX');
      expect(scopeTypes).toContain('GLOBAL');
    });
  });
  
  describe('resolveScopeFromRequest', () => {
    it('should resolve scope from request headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'host': 'apple.factory-wager.com',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const context = resolveScopeFromRequest(request);
      
      expect(context.domain).toBe('apple.factory-wager.com');
      expect(context.platform).toBe('macOS');
      expect(context.scope.detectedScope).toBe('ENTERPRISE');
      expect(context.overridden).toBe(false);
      expect(context.resolvedAt).toBeInstanceOf(Date);
    });
    
    it('should resolve scope from environment variables', () => {
      Bun.env.HOST = 'dev.factory-wager.com';
      Bun.env.PLATFORM_OVERRIDE = 'macOS'; // Use macOS instead of linux
      
      const request = new Request('http://localhost');
      const context = resolveScopeFromRequest(request);
      
      expect(context.domain).toBe('dev.factory-wager.com');
      expect(context.platform).toBe('macOS');
      expect(context.scope.detectedScope).toBe('DEVELOPMENT');
      expect(context.overridden).toBe(false);
      
      delete Bun.env.HOST;
      delete Bun.env.PLATFORM_OVERRIDE;
    });
    
    it('should resolve localhost to LOCAL_SANDBOX', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const context = resolveScopeFromRequest(request);
      
      expect(context.domain).toBe('localhost');
      expect(context.scope.detectedScope).toBe('LOCAL_SANDBOX');
      expect(context.overridden).toBe(false);
    });
    
    it('should handle scope override cookie', () => {
      const cookieValue = 'dev.factory-wager.com:macOS:DEVELOPMENT';
      const request = new Request('http://localhost', {
        headers: {
          'cookie': `duoplus-scope-override=${cookieValue}`
        }
      });
      
      const context = resolveScopeFromRequest(request);
      
      expect(context.domain).toBe('dev.factory-wager.com');
      expect(context.platform).toBe('macOS');
      expect(context.scope.detectedScope).toBe('DEVELOPMENT');
      expect(context.overridden).toBe(true);
    });
    
    it('should throw error for unknown domain/platform combination', () => {
      // Clear any environment variables that might interfere
      delete Bun.env.HOST;
      
      const request = new Request('http://unknown.example.com', {
        headers: {
          'host': 'unknown.example.com',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(() => resolveScopeFromRequest(request)).toThrow('No scope found for unknown.example.com/macOS');
    });
    
    it('should handle invalid cookie format gracefully', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cookie': 'duoplus-scope-override=invalid-format'
        }
      });
      
      const context = resolveScopeFromRequest(request);
      expect(context.overridden).toBe(false);
    });
  });
  
  describe('getMatrixRule', () => {
    it('should find exact domain/platform match', () => {
      const rule = getMatrixRule('apple.factory-wager.com', 'macOS');
      
      expect(rule).toBeDefined();
      expect(rule!.detectedScope).toBe('ENTERPRISE');
      expect(rule!.servingDomain).toBe('apple.factory-wager.com');
      expect(rule!.platform).toBe('macOS');
    });
    
    it('should return undefined for non-existent combination', () => {
      const rule = getMatrixRule('nonexistent.com', 'unknown');
      
      expect(rule).toBeUndefined();
    });
  });
  
  describe('normalizePlatform', () => {
    it('should normalize platform names', () => {
      expect(normalizePlatform('darwin')).toBe('macOS');
      expect(normalizePlatform('win32')).toBe('Windows');
      expect(normalizePlatform('linux')).toBe('linux');
      expect(normalizePlatform('android')).toBe('Android');
      expect(normalizePlatform('ios')).toBe('iOS');
    });
    
    it('should return original platform for unknown values', () => {
      expect(normalizePlatform('unknown')).toBe('unknown');
    });
  });
  
  describe('extractPlatformFromUA', () => {
    it('should extract macOS from User-Agent', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      expect(extractPlatformFromUA(ua)).toBe('macOS');
    });
    
    it('should extract Windows from User-Agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(extractPlatformFromUA(ua)).toBe('Windows');
    });
    
    it('should extract Linux from User-Agent', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      expect(extractPlatformFromUA(ua)).toBe('linux');
    });
    
    it('should return process.platform for invalid User-Agent', () => {
      expect(extractPlatformFromUA(undefined)).toBe(process.platform);
      expect(extractPlatformFromUA('')).toBe(process.platform);
    });
  });
  
  describe('Cookie Management', () => {
    it('should create scope override cookie', () => {
      const cookie = createScopeOverrideCookie('test.com', 'macOS', 'DEVELOPMENT');
      
      expect(cookie).toContain('duoplus-scope-override=test.com%3AmacOS%3ADEVELOPMENT');
      expect(cookie).toContain('Max-Age=3600');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=strict');
    });
    
    it('should create secure cookie in production', () => {
      Bun.env.NODE_ENV = 'production';
      
      const cookie = createScopeOverrideCookie('test.com', 'macOS', 'DEVELOPMENT');
      
      expect(cookie).toContain('Secure');
      
      delete Bun.env.NODE_ENV;
    });
    
    it('should parse scope override cookie', () => {
      const cookieHeader = 'duoplus-scope-override=test.com:macOS:DEVELOPMENT:testing';
      const parsed = parseScopeOverrideCookie(cookieHeader);
      
      expect(parsed).toEqual({
        domain: 'test.com',
        platform: 'macOS',
        scopeId: 'DEVELOPMENT',
        purpose: 'testing'
      });
    });
    
    it('should return null for invalid cookie', () => {
      expect(parseScopeOverrideCookie('')).toBeNull();
      expect(parseScopeOverrideCookie('invalid')).toBeNull();
    });
    
    it('should create clear cookie', () => {
      const clearCookie = clearScopeOverrideCookie();
      
      expect(clearCookie).toContain('duoplus-scope-override=');
      expect(clearCookie).toContain('Max-Age=0');
    });
  });
  
  describe('validateScopeContext', () => {
    it('should validate valid scope context', () => {
      const context: ScopeContext = {
        domain: 'apple.factory-wager.com',
        platform: 'macOS',
        scope: SCOPING_MATRIX[0], // ENTERPRISE scope
        overridden: false,
        resolvedAt: new Date()
      };
      
      const result = validateScopeContext(context);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect missing required fields', () => {
      const context = {
        domain: '',
        platform: '',
        scope: null as any,
        overridden: false,
        resolvedAt: new Date()
      };
      
      const result = validateScopeContext(context);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Domain is required');
      expect(result.errors).toContain('Platform is required');
      expect(result.errors).toContain('Scope is required');
    });
    
    it('should detect domain mismatches', () => {
      const context: ScopeContext = {
        domain: 'different.com',
        platform: 'macOS',
        scope: SCOPING_MATRIX[0], // ENTERPRISE scope (apple.factory-wager.com)
        overridden: false,
        resolvedAt: new Date()
      };
      
      const result = validateScopeContext(context);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Domain mismatch: context domain (different.com) != scope domain (apple.factory-wager.com)'
      );
    });
    
    it('should detect invalid security levels', () => {
      const invalidScope = {
        ...SCOPING_MATRIX[0],
        security: { ...SCOPING_MATRIX[0].security, level: 'INVALID' as any }
      };
      
      const context: ScopeContext = {
        domain: 'apple.factory-wager.com',
        platform: 'macOS',
        scope: invalidScope,
        overridden: false,
        resolvedAt: new Date()
      };
      
      const result = validateScopeContext(context);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid security level: INVALID');
    });
  });
  
  describe('Scope Migration', () => {
    it('should create migration plan', () => {
      const fromScope = SCOPING_MATRIX.find(s => s.detectedScope === 'LOCAL_SANDBOX')!;
      const toScope = SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!;
      
      const plan = migrateScope(fromScope, toScope);
      
      expect(plan.from).toBe('LOCAL_SANDBOX');
      expect(plan.to).toBe('ENTERPRISE');
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedTime).toBeGreaterThan(0);
    });
    
    it('should identify security level changes', () => {
      const fromScope = SCOPING_MATRIX.find(s => s.detectedScope === 'LOCAL_SANDBOX')!; // BASIC
      const toScope = SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!; // ENTERPRISE
      
      const plan = migrateScope(fromScope, toScope);
      
      expect(plan.steps).toContain('Update security level: BASIC → ENTERPRISE');
      expect(plan.risks).toContain('Enterprise security requires additional configuration');
    });
    
    it('should identify feature changes', () => {
      const fromScope = SCOPING_MATRIX.find(s => s.detectedScope === 'LOCAL_SANDBOX')!;
      const toScope = SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!;
      
      const plan = migrateScope(fromScope, toScope);
      
      expect(plan.steps.some(step => step.includes('Add features'))).toBe(true);
    });
  });
  
  describe('Scope Analytics', () => {
    it('should generate comprehensive scope report', () => {
      const report = generateScopeReport();
      
      expect(report.totalScopes).toBe(SCOPING_MATRIX.length);
      expect(report.scopesByLevel).toBeDefined();
      expect(report.scopesByDomain).toBeDefined();
      expect(report.featureUsage).toBeDefined();
      expect(report.complianceCoverage).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
    
    it('should count scopes by security level', () => {
      const report = generateScopeReport();
      
      expect(report.scopesByLevel['BASIC']).toBeGreaterThan(0);
      expect(report.scopesByLevel['STANDARD']).toBeGreaterThan(0);
      expect(report.scopesByLevel['ENTERPRISE']).toBeGreaterThan(0);
    });
    
    it('should track feature usage', () => {
      const report = generateScopeReport();
      
      expect(Object.keys(report.featureUsage).length).toBeGreaterThan(0);
      expect(report.featureUsage['PREMIUM']).toBeGreaterThan(0);
    });
    
    it('should track compliance coverage', () => {
      const report = generateScopeReport();
      
      expect(Object.keys(report.complianceCoverage).length).toBeGreaterThan(0);
      expect(report.complianceCoverage['SOC2']).toBeGreaterThan(0);
    });
  });
  
  describe('Environment Detection', () => {
    it('should detect production environment', () => {
      Bun.env.NODE_ENV = 'production';
      expect(detectEnvironment()).toBe('production');
      expect(isProductionEnvironment()).toBe(true);
      expect(isDevelopmentEnvironment()).toBe(false);
      
      delete Bun.env.NODE_ENV;
    });
    
    it('should detect development environment', () => {
      Bun.env.NODE_ENV = 'development';
      expect(detectEnvironment()).toBe('development');
      expect(isDevelopmentEnvironment()).toBe(true);
      expect(isProductionEnvironment()).toBe(false);
      
      delete Bun.env.NODE_ENV;
    });
    
    it('should detect testing environment', () => {
      Bun.env.NODE_ENV = 'testing';
      expect(detectEnvironment()).toBe('testing');
      expect(isTestingEnvironment()).toBe(true);
      
      delete Bun.env.NODE_ENV;
    });
    
    it('should detect environment from host', () => {
      Bun.env.HOST = 'prod.example.com';
      expect(detectEnvironment()).toBe('production');
      
      Bun.env.HOST = 'dev.example.com';
      expect(detectEnvironment()).toBe('development');
      
      Bun.env.HOST = 'localhost';
      expect(detectEnvironment()).toBe('local');
      
      delete Bun.env.HOST;
    });
  });
  
  describe('Utility Functions', () => {
    it('should get all scopes', () => {
      const allScopes = getAllScopes();
      
      expect(allScopes).toEqual(SCOPING_MATRIX);
      expect(allScopes.length).toBe(SCOPING_MATRIX.length);
    });
    
    it('should get scopes by security level', () => {
      const enterpriseScopes = getScopesByLevel('ENTERPRISE');
      
      expect(enterpriseScopes.every(s => s.security.level === 'ENTERPRISE')).toBe(true);
      expect(enterpriseScopes.length).toBeGreaterThan(0);
    });
    
    it('should get scopes with specific feature', () => {
      const premiumScopes = getScopesWithFeature('PREMIUM');
      
      expect(premiumScopes.every(s => s.featureFlags.includes('PREMIUM'))).toBe(true);
      expect(premiumScopes.length).toBeGreaterThan(0);
    });
    
    it('should get scopes by domain', () => {
      const localScopes = getScopesByDomain('localhost');
      
      expect(localScopes.every(s => s.servingDomain === 'localhost')).toBe(true);
      expect(localScopes.length).toBeGreaterThan(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle malformed User-Agent strings', () => {
      const malformedUAs = [
        '',
        'Mozilla/5.0',
        '()',
        'Mozilla/5.0 ()',
        'Invalid User-Agent'
      ];
      
      malformedUAs.forEach(ua => {
        expect(extractPlatformFromUA(ua)).toBe(process.platform);
      });
    });
    
    it('should handle empty request headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      expect(() => resolveScopeFromRequest(request)).not.toThrow();
    });
    
    it('should handle scope migration with identical scopes', () => {
      const scope = SCOPING_MATRIX[0];
      const plan = migrateScope(scope, scope);
      
      expect(plan.from).toBe(plan.to);
      expect(plan.steps.length).toBe(0);
      expect(plan.risks.length).toBe(0);
    });
    
    it('should handle validation with empty scope context', () => {
      const emptyContext = {} as ScopeContext;
      const result = validateScopeContext(emptyContext);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Performance', () => {
    it('should resolve scopes quickly', () => {
      const request = new Request('http://apple.factory-wager.com', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        resolveScopeFromRequest(request);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      expect(avgTime).toBeLessThan(5); // Should be under 5ms per resolution
    });
    
    it('should generate reports efficiently', () => {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        generateScopeReport();
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      expect(avgTime).toBeLessThan(10); // Should be under 10ms per report
    });
  });
});
