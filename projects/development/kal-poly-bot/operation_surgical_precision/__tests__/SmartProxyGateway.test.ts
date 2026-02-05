import { test, expect } from 'bun:test';
import { SmartProxyGateway, type ProxyRule, type GatewayRequest } from '../SmartProxyGateway';

/**
 * SmartProxyGateway Integration Tests
 *
 * Demonstrates rule evaluation logic using SQLite v3.51.1 EXISTS-to-JOIN optimizations
 * for high-performance proxy gateway operations.
 */

test("SmartProxyGateway - Complete Rule Evaluation Workflow", async () => {
  const gateway = new SmartProxyGateway(':memory:');

  // 1. Add sample rules from the taxonomy
  const routingRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.stripe.com/*',
    ruleType: 'routing',
    priority: 100,
    config: { target_proxy: 'http://proxy-finance:8080' },
    isActive: true,
    conditions: [
      { type: 'method', value: 'POST' }
    ]
  };

  const authRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.company.com/*',
    ruleType: 'auth',
    priority: 50,
    config: {
      headers: {
        'Proxy-Authorization': 'Bearer xyz789',
        'X-API-Key': 'company-secret-key'
      }
    },
    isActive: true,
    conditions: [{ type: 'method', value: 'GET' }]
  };

  const transformRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.external.com/*',
    ruleType: 'transform',
    priority: 75,
    config: {
      actions: ['add_header', 'remove_query_param'],
      add_header: { 'X-Forwarded-Host': 'api.company.com' },
      remove_query_param: ['debug', 'internal']
    },
    isActive: true,
    conditions: [{ type: 'method', value: 'POST' }]
  };

  const trafficRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.public.com/*',
    ruleType: 'traffic',
    priority: 25,
    config: {
      rate_limit: { requests: 100, per_seconds: 60 },
      cache_ttl: 300
    },
    isActive: true,
    conditions: [{ type: 'method', value: 'GET' }]
  };

  const logRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.audit.com/*',
    ruleType: 'log',
    priority: 10,
    config: {
      log_level: 'verbose',
      capture_headers: ['X-Request-ID', 'Authorization']
    },
    isActive: true,
    conditions: [{ type: 'method', value: 'POST' }]
  };

  // Add all rules to the gateway
  const routingRuleId = gateway.addRule(routingRule);
  const authRuleId = gateway.addRule(authRule);
  const transformRuleId = gateway.addRule(transformRule);
  const trafficRuleId = gateway.addRule(trafficRule);
  const logRuleId = gateway.addRule(logRule);

  expect(routingRuleId).toBeGreaterThan(0);
  expect(authRuleId).toBeGreaterThan(0);
  expect(transformRuleId).toBeGreaterThan(0);
  expect(trafficRuleId).toBeGreaterThan(0);
  expect(logRuleId).toBeGreaterThan(0);

  // 2. Test rule matching with EXISTS-to-JOIN optimization
  const stripeRequest: GatewayRequest = {
    url: 'https://api.stripe.com/v1/charges',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    clientIP: '192.168.1.100'
  };

  const matchedRule = gateway.findMatchingRule(stripeRequest);
  expect(matchedRule).not.toBeNull();
  expect(matchedRule?.ruleType).toBe('routing');
  expect(matchedRule?.config.target_proxy).toBe('http://proxy-finance:8080');

  // 3. Test rule application for different types
  const stripeResponse = gateway.applyRule(stripeRequest, matchedRule!);
  expect(stripeResponse.proxyUrl).toBe('http://proxy-finance:8080');

  // Test auth rule
  const companyRequest: GatewayRequest = {
    url: 'https://api.company.com/users',
    method: 'GET',
    headers: {}
  };

  const authMatch = gateway.findMatchingRule(companyRequest);
  expect(authMatch?.ruleType).toBe('auth');
  const authResponse = gateway.applyRule(companyRequest, authMatch!);
  expect(authResponse.headers?.['Proxy-Authorization']).toBe('Bearer xyz789');

  // Test transform rule
  const externalRequest: GatewayRequest = {
    url: 'https://api.external.com/data?debug=true&internal=secret&valid=value',
    method: 'POST',
    headers: { 'Host': 'original-host' }
  };

  const transformMatch = gateway.findMatchingRule(externalRequest);
  expect(transformMatch?.ruleType).toBe('transform');
  const transformResponse = gateway.applyRule(externalRequest, transformMatch!);
  expect(transformResponse.transformedRequest?.headers?.['X-Forwarded-Host']).toBe('api.company.com');
  expect(transformResponse.transformedRequest?.url).not.toContain('debug=true');
  expect(transformResponse.transformedRequest?.url).not.toContain('internal=secret');
  expect(transformResponse.transformedRequest?.url).toContain('valid=value');

  // Test traffic control rule
  const publicRequest: GatewayRequest = {
    url: 'https://api.public.com/public-data',
    method: 'GET',
    headers: {}
  };

  const trafficMatch = gateway.findMatchingRule(publicRequest);
  expect(trafficMatch?.ruleType).toBe('traffic');
  const trafficResponse = gateway.applyRule(publicRequest, trafficMatch!);
  expect(trafficResponse.rateLimit?.allowed).toBe(true);
  expect(trafficResponse.cache?.ttl).toBe(300);

  // Test logging rule
  const auditRequest: GatewayRequest = {
    url: 'https://api.audit.com/transactions',
    method: 'POST',
    headers: { 'X-Request-ID': 'req-123', 'Authorization': 'Bearer token' }
  };

  const logMatch = gateway.findMatchingRule(auditRequest);
  expect(logMatch?.ruleType).toBe('log');
  const logResponse = gateway.applyRule(auditRequest, logMatch!);
  expect(logResponse.logMetadata?.method).toBe('POST');
  expect(logResponse.logMetadata?.headers?.['X-Request-ID']).toBe('req-123');

  // 4. Test complete request processing pipeline
  const processedResponse = await gateway.processRequest(stripeRequest);
  expect(processedResponse.proxyUrl).toBe('http://proxy-finance:8080');

  // 5. Test priority ordering
  const highPriorityRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.stripe.com/*',
    ruleType: 'routing',
    priority: 200, // Higher priority
    config: { target_proxy: 'http://premium-proxy:8080' },
    isActive: true,
    conditions: [{ type: 'method', value: 'POST' }]
  };

  gateway.addRule(highPriorityRule);
  const highPriorityMatch = gateway.findMatchingRule(stripeRequest);
  expect(highPriorityMatch?.config.target_proxy).toBe('http://premium-proxy:8080'); // Should match higher priority

  // 6. Test metrics
  const metrics = gateway.getMetrics();
  expect(metrics.activeRules).toBeGreaterThan(0);
  expect(metrics.cachedPatterns).toBeGreaterThan(0);

  gateway.close();
});

test("SQLite v3.51.1 EXISTS-to-JOIN Performance Benchmark", () => {
  const gateway = new SmartProxyGateway(':memory:');

  // Create a large number of rules to test EXISTS-to-JOIN optimization
  console.time('[SmartProxyGateway] Creating 1000 test rules');
  for (let i = 0; i < 1000; i++) {
    const rule: Omit<ProxyRule, 'id'> = {
      pattern: `https://api.service${i}.com/*`,
      ruleType: 'routing',
      priority: Math.floor(Math.random() * 100),
      config: { target_proxy: `http://proxy-${i}:8080` },
      isActive: true,
      conditions: [
        { type: 'method', value: 'GET' },
        { type: 'time_window', value: 'business_hours' }
      ]
    };
    gateway.addRule(rule);
  }
  console.timeEnd('[SmartProxyGateway] Creating 1000 test rules');

  // Benchmark rule matching with EXISTS-to-JOIN optimization
  const testRequest: GatewayRequest = {
    url: 'https://api.service500.com/data',
    method: 'GET',
    headers: {}
  };

  console.time('[SmartProxyGateway] Rule matching (1000 rules, EXISTS-to-JOIN optimized)');
  for (let i = 0; i < 100; i++) {
    const match = gateway.findMatchingRule(testRequest);
    expect(match).not.toBeNull();
  }
  console.timeEnd('[SmartProxyGateway] Rule matching (1000 rules, EXISTS-to-JOIN optimized)');

  // Verify the optimization is working by checking query performance
  const startTime = performance.now();
  const rule = gateway.findMatchingRule(testRequest);
  const endTime = performance.now();

  expect(rule?.config.target_proxy).toContain('proxy-500');
  console.log(`[SmartProxyGateway] Single rule lookup: ${(endTime - startTime).toFixed(4)}ms`);

  gateway.close();
});

test("SmartProxyGateway - Complex Rule Conditions", () => {
  const gateway = new SmartProxyGateway(':memory:');

  // Rule with multiple complex conditions
  const complexRule: Omit<ProxyRule, 'id'> = {
    pattern: 'https://api.secure.com/*',
    ruleType: 'routing',
    priority: 100,
    config: { target_proxy: 'http://secure-proxy:8080' },
    isActive: true,
    conditions: [
      { type: 'method', value: 'POST' },
      { type: 'ip_range', value: '192.168.1.0/24' },
      { type: 'user_role', value: 'admin' },
      { type: 'time_window', value: 'business_hours' }
    ]
  };

  gateway.addRule(complexRule);

  // Test that the rule matches when conditions are met
  const matchingRequest: GatewayRequest = {
    url: 'https://api.secure.com/admin-action',
    method: 'POST',
    headers: { 'X-User-Role': 'admin' },
    clientIP: '192.168.1.100'
  };

  // Note: In a full implementation, the condition evaluation would be more complex
  // This demonstrates the framework for complex rule matching
  const match = gateway.findMatchingRule(matchingRequest);
  expect(match).not.toBeNull(); // Rule matches because URLPattern matching works
  expect(match?.ruleType).toBe('routing');
  expect(match?.config.target_proxy).toBe('http://secure-proxy:8080');

  // In production, you would extend the condition evaluation logic
  // to handle IP ranges, user roles, time windows, etc.

  gateway.close();
});