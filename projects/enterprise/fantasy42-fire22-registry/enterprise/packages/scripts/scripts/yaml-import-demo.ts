#!/usr/bin/env bun
/**
 * YAML Import and Parsing Demo
 * Demonstrating Bun.YAML.parse with file imports
 */

// Import YAML file directly (Bun supports this natively)
import yamlConfig from '../fire22-runtime-config.yaml';

// Also demonstrate parsing YAML strings
const yamlString = `
deployment:
  environment: "production"
  replicas: 3
  image: "fire22/api:v2.0.0"

resources:
  limits:
    cpu: "1000m"
    memory: "1Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

health:
  liveness_probe:
    path: "/health"
    port: 3000
    initial_delay: 30
  readiness_probe:
    path: "/ready"
    port: 3000
    initial_delay: 5
`;

console.log('📋 YAML Import & Parsing Demo');
console.log('='.repeat(50));

console.log('🔧 Direct YAML Import:');
console.log(`   Name: ${yamlConfig.name}`);
console.log(`   Version: ${yamlConfig.version}`);
console.log(`   Description: ${yamlConfig.description}`);

console.log('\n🏗️  Metadata:');
console.log(`   Created: ${yamlConfig.metadata.created}`);
console.log(`   Environment: ${yamlConfig.metadata.environment}`);
console.log(`   Author: ${yamlConfig.metadata.author}`);

console.log('\n🔌 Services:');
yamlConfig.services.forEach((service, index) => {
  const status = service.enabled ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
  console.log(
    `   ${index + 1}. \x1b[1m${service.name}\x1b[0m (${service.protocol}:${service.port}) ${status}`
  );
});

console.log('\n⚙️  Configuration:');
console.log(`   Log Level: ${yamlConfig.configuration.log_level}`);
console.log(`   Max Connections: ${yamlConfig.configuration.max_connections}`);
console.log(`   Request Timeout: ${yamlConfig.configuration.request_timeout}s`);
console.log(`   Rate Limit: ${yamlConfig.configuration.rate_limit.requests_per_minute} req/min`);

console.log('\n🔒 Security Features:');
Object.entries(yamlConfig.security).forEach(([feature, enabled]) => {
  const status = enabled ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
  console.log(`   ${status} ${feature.replace(/_/g, ' ')}`);
});

console.log('\n📊 Monitoring:');
console.log(`   Metrics: ${yamlConfig.monitoring.metrics_enabled ? '✅' : '❌'}`);
console.log(`   Health Checks: ${yamlConfig.monitoring.health_checks ? '✅' : '❌'}`);
console.log(`   Alert Thresholds:`);
console.log(`     CPU: ${yamlConfig.monitoring.alert_thresholds.cpu_usage}%`);
console.log(`     Memory: ${yamlConfig.monitoring.alert_thresholds.memory_usage}%`);
console.log(`     Response Time: ${yamlConfig.monitoring.alert_thresholds.response_time}ms`);

// Parse YAML string
console.log('\n\n🔧 YAML String Parsing:');
try {
  const parsedYaml = Bun.YAML.parse(yamlString);
  console.log('✅ Successfully parsed YAML string:');
  console.log(`   Environment: ${parsedYaml.deployment.environment}`);
  console.log(`   Replicas: ${parsedYaml.deployment.replicas}`);
  console.log(`   Image: ${parsedYaml.deployment.image}`);

  console.log('\n   Resource Limits:');
  console.log(`     CPU: ${parsedYaml.resources.limits.cpu}`);
  console.log(`     Memory: ${parsedYaml.resources.limits.memory}`);

  console.log('\n   Health Probes:');
  console.log(
    `     Liveness: ${parsedYaml.health.liveness_probe.path} (${parsedYaml.health.liveness_probe.initial_delay}s delay)`
  );
  console.log(
    `     Readiness: ${parsedYaml.health.readiness_probe.path} (${parsedYaml.health.readiness_probe.initial_delay}s delay)`
  );
} catch (error) {
  console.log(`❌ YAML parsing failed: ${error.message}`);
}

console.log('\n🎉 YAML Import Demo Complete!');
console.log('   Bun supports native YAML imports and string parsing!');
