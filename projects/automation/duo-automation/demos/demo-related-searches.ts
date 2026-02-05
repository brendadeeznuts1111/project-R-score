#!/usr/bin/env bun

/**
 * Related Search Demonstrations
 * Shows the suggested related searches from the cross-reference system
 */

console.log('🔗 Related Search Demonstrations');
console.log('=================================\n');

// Enhanced data for related searches
const relatedSearchData = {
  'security audit': {
    matrix: [
      {
        scope: 'PRODUCTION',
        features: ['Full Audit Logging', 'Security Audits', 'Compliance Reporting'],
        standards: ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI DSS']
      },
      {
        scope: 'ENTERPRISE', 
        features: ['Audit Logging', 'Security Reviews', 'Risk Assessment'],
        standards: ['SOC 2', 'HIPAA', 'PCI DSS']
      }
    ],
    documentation: [
      {
        title: 'Security Audit Framework',
        file: './docs/SECURITY_AUDIT_FRAMEWORK.md',
        description: 'Comprehensive security audit procedures and compliance validation'
      },
      {
        title: 'Audit Trail System',
        file: './docs/AUDIT_TRAIL_COMPLETE.md', 
        description: 'Complete audit trail implementation with tamper-proof logging'
      }
    ],
    components: [
      {
        title: 'Audit Engine',
        path: './src/@core/audit/',
        features: ['Security Audits', 'Compliance Checks', 'Risk Assessment']
      }
    ]
  },
  'compliance validation': {
    matrix: [
      {
        scope: 'PRODUCTION',
        features: ['Automated Validation', 'Compliance Monitoring', 'Policy Enforcement'],
        standards: ['HIPAA', 'PCI DSS', 'SOC 2', 'GDPR', 'ISO 27001']
      },
      {
        scope: 'ENTERPRISE',
        features: ['Compliance Checks', 'Validation Rules', 'Policy Management'],
        standards: ['HIPAA', 'PCI DSS', 'SOC 2', 'GDPR']
      }
    ],
    documentation: [
      {
        title: 'Compliance Validation System',
        file: './docs/COMPLIANCE_VALIDATION_COMPLETE.md',
        description: 'Automated compliance validation with real-time monitoring'
      },
      {
        title: 'Policy Enforcement Framework',
        file: './docs/POLICY_ENHANCEMENT_COMPLETE.md',
        description: 'Policy enforcement and compliance validation framework'
      }
    ],
    components: [
      {
        title: 'Compliance Engine',
        path: './src/@core/compliance/',
        features: ['Policy Validation', 'Compliance Reporting', 'Audit Trails']
      }
    ]
  },
  'security monitoring': {
    matrix: [
      {
        scope: 'PRODUCTION',
        features: ['Real-time Monitoring', 'Threat Detection', 'Security Alerts'],
        standards: ['SOC 2', 'ISO 27001']
      },
      {
        scope: 'ENTERPRISE',
        features: ['Security Monitoring', 'Alert System', 'Incident Response'],
        standards: ['SOC 2', 'HIPAA']
      }
    ],
    documentation: [
      {
        title: 'Security Monitoring System',
        file: './docs/SECURITY_MONITORING_COMPLETE.md',
        description: 'Real-time security monitoring with threat detection and alerting'
      },
      {
        title: 'Enhanced Security Metrics',
        file: './docs/SECURITY_METRICS_INTEGRATION_COMPLETE.md',
        description: 'Advanced security metrics and monitoring integration'
      }
    ],
    components: [
      {
        title: 'Security Monitoring',
        path: './src/monitoring/security/',
        features: ['Threat Detection', 'Security Alerts', 'Compliance Monitoring']
      }
    ]
  }
};

function demonstrateRelatedSearch(query: string) {
  console.log(`🔍 Related Search: "${query}"`);
  console.log('─'.repeat(60));
  
  const data = relatedSearchData[query as keyof typeof relatedSearchData];
  if (!data) {
    console.log('❌ No data found for this query');
    return;
  }
  
  // Matrix Results
  console.log('\n📂 Matrix System Results:');
  data.matrix.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.scope} Scope`);
    console.log(`     Features: ${item.features.join(', ')}`);
    console.log(`     Standards: ${item.standards.join(', ')}`);
  });
  
  // Documentation Results
  console.log('\n📚 Documentation Results:');
  data.documentation.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.title}`);
    console.log(`     📁 ${item.file}`);
    console.log(`     📝 ${item.description}`);
  });
  
  // System Components
  console.log('\n⚙️  System Component Results:');
  data.components.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.title}`);
    console.log(`     📁 ${item.path}`);
    console.log(`     🔧 Features: ${item.features.join(', ')}`);
  });
  
  console.log('\n💡 Additional Related Searches:');
  const suggestions = getAdditionalSuggestions(query);
  suggestions.forEach(suggestion => {
    console.log(`  • duoplus-enhanced xref "${suggestion}" --type all`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

function getAdditionalSuggestions(currentQuery: string): string[] {
  const suggestions: { [key: string]: string[] } = {
    'security audit': ['risk assessment', 'audit trails', 'security policies', 'compliance reporting'],
    'compliance validation': ['policy enforcement', 'regulatory compliance', 'validation rules', 'compliance monitoring'],
    'security monitoring': ['threat detection', 'security alerts', 'incident response', 'real-time monitoring']
  };
  
  return suggestions[currentQuery] || [];
}

// Run all related search demonstrations
console.log('🚀 Demonstrating Related Search Suggestions\n');

console.log('From HIPAA PCI DSS search, the system suggested:');
demonstrateRelatedSearch('security audit');
demonstrateRelatedSearch('compliance validation');
demonstrateRelatedSearch('security monitoring');

console.log('✅ Related Search Demonstrations Complete!');
console.log('📊 Each search provides comprehensive results across:');
console.log('   • Matrix System configurations');
console.log('   • Documentation and guides');
console.log('   • System components and features');
console.log('   • Additional related search suggestions');
console.log('🔗 Creates a complete knowledge graph for discovery');
