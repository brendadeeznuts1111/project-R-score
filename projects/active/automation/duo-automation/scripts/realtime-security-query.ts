#!/usr/bin/env bun
// scripts/realtime-security-query.ts - Real-time security configuration query
import { SecurityMetricEnhancer } from '../types/enhance-metric';
import type { PerfMetric } from '../types/perf-metric';

async function demonstrateRealtimeSecurityQuery() {
  console.info('🔒 Real-time Security Configuration Query');
  console.info('==========================================\n');
  
  // Simulate the telemetry endpoint response
  const telemetryData: PerfMetric[] = [
    {
      category: "Security",
      type: "configuration",
      topic: "Path Hardening",
      subCat: "Initialization",
      id: "getScopedKey",
      value: "ENABLED",
      pattern: "security_pattern",
      locations: "1",
      impact: "high",
      properties: {
        scope: "v37-scope",
        endpoint: "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
        validation: "strict",
        traversal: "blocked"
      }
    },
    {
      category: "Security",
      type: "validation",
      topic: "R2 Hardening",
      subCat: "Path Validation",
      id: "STRICT",
      value: "ENFORCED",
      pattern: "security_pattern",
      locations: "1",
      impact: "high",
      properties: {
        checksum: "sha256",
        encryption: "aes256",
        access: "scoped"
      }
    },
    {
      category: "Security",
      type: "configuration",
      topic: "Access Control",
      subCat: "Authorization",
      id: "RBAC",
      value: "ACTIVE",
      pattern: "auth_pattern",
      locations: "1",
      impact: "medium",
      properties: {
        roles: "admin,user,viewer",
        permissions: "read,write,execute",
        mfa: "required"
      }
    }
  ];
  
  // Filter security metrics (equivalent to jq filter)
  const securityMetrics = telemetryData.filter(m => m.category === "Security");
  
  console.info('📊 Live Security Configurations:');
  const securityEnhancer = SecurityMetricEnhancer.create();
  const enhancedSecurityMetrics = securityEnhancer.enhanceMetrics(securityMetrics);
  console.info(Bun.inspect.table(enhancedSecurityMetrics, { colors: true }));
  
  console.info('\n🎯 Query Analysis:');
  console.info(`• Total Security Features: ${securityMetrics.length}`);
  console.info(`• Enabled Features: ${securityMetrics.filter(m => m.value === "ENABLED" || m.value === "ENFORCED" || m.value === "ACTIVE").length}`);
  console.info(`• Security Categories: ${[...new Set(securityMetrics.map(m => m.type))].join(", ")}`);
  console.info(`• Implementation Locations: ${[...new Set(securityMetrics.map(m => m.locations))].join(", ")}`);
  
  console.info('\n🚀 One-Liner Query Examples:');
  console.info('# View all security configurations in real-time');
  console.info('curl -H "Authorization: Bearer ${NPM_TOKEN}" \\');
  console.info('  https://duo-npm-registry.utahj4754.workers.dev/-/metrics | \\');
  console.info('  jq \'.[] | select(.category == "Security")\' | \\');
  console.info('  bun -e \'console.info(Bun.inspect.table(JSON.parse(Bun.file(Bun.stdin).text()), {colors:true}))\'');
  
  console.info('\n# Find all ENABLED security features');
  console.info('bun -e \'console.info(Bun.inspect.table(JSON.parse(await Bun.file("./perf-metrics.json").text()).filter(m => m.category === "Security" && m.value === "ENABLED"), {colors:true}))\'');
  
  console.info('\n✅ Real-time telemetry system operational!');
}

demonstrateRealtimeSecurityQuery().catch(console.error);
