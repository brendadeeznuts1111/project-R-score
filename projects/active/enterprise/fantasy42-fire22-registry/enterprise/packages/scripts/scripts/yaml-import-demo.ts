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

console.info('📋 YAML Import & Parsing Demo');
console.info('='.repeat(50));

console.info('🔧 Direct YAML Import:');
console.info(`   Name: ${yamlConfig.name}`);
console.info(`   Version: ${yamlConfig.version}`);
console.info(`   Description: ${yamlConfig.description}`);

console.info('\n🏗️  Metadata:');
console.info(`   Created: ${yamlConfig.metadata.created}`);
console.info(`   Environment: ${yamlConfig.metadata.environment}`);
console.info(`   Author: ${yamlConfig.metadata.author}`);

console.info('\n🔌 Services:');
yamlConfig.services.forEach((service, index) => {
  const status = service.enabled ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
  console.info(
    `   ${index + 1}. \x1b[1m${service.name}\x1b[0m (${service.protocol}:${service.port}) ${status}`
  );
});

console.info('\n⚙️  Configuration:');
console.info(`   Log Level: ${yamlConfig.configuration.log_level}`);
console.info(`   Max Connections: ${yamlConfig.configuration.max_connections}`);
console.info(`   Request Timeout: ${yamlConfig.configuration.request_timeout}s`);
console.info(`   Rate Limit: ${yamlConfig.configuration.rate_limit.requests_per_minute} req/min`);

console.info('\n🔒 Security Features:');
Object.entries(yamlConfig.security).forEach(([feature, enabled]) => {
  const status = enabled ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
  console.info(`   ${status} ${feature.replace(/_/g, ' ')}`);
});

console.info('\n📊 Monitoring:');
console.info(`   Metrics: ${yamlConfig.monitoring.metrics_enabled ? '✅' : '❌'}`);
console.info(`   Health Checks: ${yamlConfig.monitoring.health_checks ? '✅' : '❌'}`);
console.info(`   Alert Thresholds:`);
console.info(`     CPU: ${yamlConfig.monitoring.alert_thresholds.cpu_usage}%`);
console.info(`     Memory: ${yamlConfig.monitoring.alert_thresholds.memory_usage}%`);
console.info(`     Response Time: ${yamlConfig.monitoring.alert_thresholds.response_time}ms`);

// Parse YAML string
console.info('\n\n🔧 YAML String Parsing:');
try {
  const parsedYaml = Bun.YAML.parse(yamlString);
  console.info('✅ Successfully parsed YAML string:');
  console.info(`   Environment: ${parsedYaml.deployment.environment}`);
  console.info(`   Replicas: ${parsedYaml.deployment.replicas}`);
  console.info(`   Image: ${parsedYaml.deployment.image}`);

  console.info('\n   Resource Limits:');
  console.info(`     CPU: ${parsedYaml.resources.limits.cpu}`);
  console.info(`     Memory: ${parsedYaml.resources.limits.memory}`);

  console.info('\n   Health Probes:');
  console.info(
    `     Liveness: ${parsedYaml.health.liveness_probe.path} (${parsedYaml.health.liveness_probe.initial_delay}s delay)`
  );
  console.info(
    `     Readiness: ${parsedYaml.health.readiness_probe.path} (${parsedYaml.health.readiness_probe.initial_delay}s delay)`
  );
} catch (error) {
  console.info(`❌ YAML parsing failed: ${error.message}`);
}

console.info('\n🎉 YAML Import Demo Complete!');
console.info('   Bun supports native YAML imports and string parsing!');
