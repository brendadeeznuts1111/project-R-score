/**
 * 🚀 URLPattern Security Plugin - Live Demo
 * Shows the plugin in action with real security analysis
 */

import { parse as parseYaml } from 'bun:yaml';

// Simulate the plugin's core analysis logic
function analyzePattern(pattern: string): { risk: string, issues: string[] } {
  const issues: string[] = [];
  
  if (pattern.includes('localhost') || pattern.includes('127.0.0.1') || pattern.includes('192.168.')) {
    issues.push('SSRF Potential');
  }
  
  if (pattern.startsWith('https://') && pattern.includes(':service') || pattern.includes('redirect')) {
    issues.push('Open Redirect');
  }
  
  if (pattern.includes('${') || pattern.includes('eval(')) {
    issues.push('Injection Potential');
  }
  
  const risk = issues.some(i => i.includes('SSRF')) ? 'CRITICAL' : 
               issues.length > 0 ? 'HIGH' : 'LOW';
  
  return { risk, issues };
}

// Demo: Analyze a real config file
const yamlContent = `
api:
  registry: "/registry/:pkg/*"
  webhook: "https://webhooks/:service"
  internal: "http://localhost:3000/*"
  
security:
  allowed:
    - "https://api.example.com/*"
    - "http://192.168.1.1/*"
    - "https://redirect/:target"
`;

console.log('🔒 URLPattern Security Plugin - Live Demo');
console.log('='.repeat(60));
console.log('\n📄 Analyzing config with security violations...\n');

const config = parseYaml(yamlContent);
const patterns: any[] = [];

function extractPatterns(obj: any, keyPath = '') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;
    
    if (typeof value === 'string' && (value.includes(':') || value.includes('*') || value.startsWith('http') || value.startsWith('/'))) {
      patterns.push({ pattern: value, keyPath: currentPath });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractPatterns(value, currentPath);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && (item.includes(':') || item.includes('*') || item.startsWith('http') || item.startsWith('/'))) {
          patterns.push({ pattern: item, keyPath: `${currentPath}[${index}]` });
        }
      });
    }
  }
}

extractPatterns(config);

patterns.forEach(p => {
  const analysis = analyzePattern(p.pattern);
  const icon = analysis.risk === 'CRITICAL' ? '🚨' : analysis.risk === 'HIGH' ? '⚠️' : '✅';
  console.log(`${icon} ${p.keyPath}: ${p.pattern}`);
  if (analysis.issues.length > 0) {
    console.log(`   → ${analysis.issues.join(', ')}`);
  }
});

console.log('\n📊 Summary:');
console.log(`   Total patterns: ${patterns.length}`);
console.log(`   Critical: ${patterns.filter(p => analyzePattern(p.pattern).risk === 'CRITICAL').length}`);
console.log(`   High: ${patterns.filter(p => analyzePattern(p.pattern).risk === 'HIGH').length}`);
console.log(`   Low: ${patterns.filter(p => analyzePattern(p.pattern).risk === 'LOW').length}`);

console.log('\n✅ Plugin would FAIL build due to critical SSRF violations');
console.log('   Build output: AggregateError with detailed file/key paths');
