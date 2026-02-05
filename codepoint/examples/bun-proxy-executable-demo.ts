#!/usr/bin/env bun

// 🚀 Bun Proxy Executable Detection Demo
// Showcasing system tool detection and integration capabilities

import { checkSystemExecutables, findExecutable, hasExecutable, getExecutableVersion } from './bun-proxy/src/utils/executable';

// Demo scenarios for executable detection
const demoScenarios = [
  {
    name: 'Media Processing',
    tools: ['ffmpeg', 'ffprobe'],
    description: 'Video/audio processing and analysis',
    useCase: 'Stream transcoding, format conversion'
  },
  {
    name: 'HTTP Clients',
    tools: ['curl', 'wget'],
    description: 'Command-line HTTP clients',
    useCase: 'Fallback HTTP requests, testing'
  },
  {
    name: 'Security Tools',
    tools: ['openssl'],
    description: 'SSL/TLS and cryptography',
    useCase: 'Certificate validation, encryption'
  },
  {
    name: 'Runtime Environments',
    tools: ['node', 'bun'],
    description: 'JavaScript runtimes',
    useCase: 'Script execution, compatibility testing'
  }
];

// Test executable detection
async function testExecutableDetection() {
  console.log("🔍 Testing Executable Detection...\n");

  const results = [];

  for (const scenario of demoScenarios) {
    console.log(`📋 Checking: ${scenario.name} (${scenario.description})`);

    const scenarioResults = {
      'Category': scenario.name,
      'Tools': scenario.tools.join(', '),
      'Use Case': scenario.useCase,
      'Available': '',
      'Detected': '',
      'Versions': ''
    };

    const availableTools = [];
    const detectedPaths = [];
    const versions = [];

    for (const tool of scenario.tools) {
      try {
        const info = await findExecutable(tool);
        const available = info.available ? '✅' : '❌';
        const path = info.available ? info.path.split('/').pop() || info.path : 'N/A';
        const version = info.version || 'Unknown';

        availableTools.push(available);
        detectedPaths.push(path);
        versions.push(version);

      } catch (error) {
        availableTools.push('❌');
        detectedPaths.push('Error');
        versions.push('N/A');
      }
    }

    scenarioResults.Available = availableTools.join(' | ');
    scenarioResults.Detected = detectedPaths.join(' | ');
    scenarioResults.Versions = versions.join(' | ');

    results.push(scenarioResults);
    console.log(`   Available: ${availableTools.join(' | ')}`);
    console.log(`   Detected: ${detectedPaths.join(' | ')}`);
    console.log(`   Versions: ${versions.join(' | ')}\n`);
  }

  return results;
}

// Display system executable overview
async function displaySystemOverview() {
  console.log("🖥️ System Executable Overview:\n");

  const systemExecutables = await checkSystemExecutables();
  const executableArray = Array.from(systemExecutables.entries()).map(([name, info]) => ({
    'Tool': name,
    'Available': info.available ? '✅' : '❌',
    'Path': info.available ? info.path : 'Not found',
    'Version': info.version || 'Unknown',
    'Last Checked': info.lastChecked.toLocaleTimeString()
  }));

  console.log(Bun.inspect.table(executableArray, {
    colors: true,
    columns: [
      { key: 'Tool', header: 'Tool' },
      { key: 'Available', header: 'Available' },
      { key: 'Version', header: 'Version' },
      { key: 'Path', header: 'Path' }
    ]
  }));

  // Summary statistics
  const total = executableArray.length;
  const available = executableArray.filter(e => e.Available === '✅').length;
  const unavailable = total - available;

  console.log(`\n📊 Summary: ${available}/${total} tools available (${Math.round((available/total) * 100)}%)`);
  console.log(`   Available: ${available} | Not Found: ${unavailable}`);

  return { total, available, unavailable };
}

// Test individual executable operations
async function testExecutableOperations() {
  console.log("\n🔧 Testing Executable Operations:\n");

  const testTools = ['bun', 'node', 'curl', 'ffmpeg'];

  for (const tool of testTools) {
    console.log(`🔍 Testing ${tool}:`);

    try {
      // Test hasExecutable
      const hasTool = await hasExecutable(tool);
      console.log(`   hasExecutable: ${hasTool ? '✅' : '❌'}`);

      // Test getExecutableVersion
      const version = await getExecutableVersion(tool);
      console.log(`   getVersion: ${version || 'N/A'}`);

      // Test findExecutable (detailed info)
      const info = await findExecutable(tool);
      console.log(`   findExecutable: ${info.available ? '✅' : '❌'} ${info.path || 'N/A'}`);

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }

    console.log();
  }
}

// Proxy integration demonstration
async function demonstrateProxyIntegration() {
  console.log("🔗 Proxy Integration Demonstration:\n");

  // Check for tools that enhance proxy functionality
  const enhancementTools = {
    'Media Processing': ['ffmpeg', 'ffprobe'],
    'Security': ['openssl'],
    'HTTP Clients': ['curl', 'wget'],
    'Scripting': ['node', 'bun']
  };

  const integrationResults = [];

  for (const [category, tools] of Object.entries(enhancementTools)) {
    const availableTools = [];
    const features = [];

    for (const tool of tools) {
      const available = await hasExecutable(tool);
      if (available) {
        availableTools.push(tool);

        // Define features based on tool availability
        switch (tool) {
          case 'ffmpeg':
            features.push('Video transcoding', 'Format conversion');
            break;
          case 'ffprobe':
            features.push('Media analysis', 'Stream detection');
            break;
          case 'openssl':
            features.push('SSL validation', 'Certificate inspection');
            break;
          case 'curl':
            features.push('HTTP testing', 'API validation');
            break;
          case 'wget':
            features.push('Download testing', 'Large file handling');
            break;
          case 'node':
            features.push('Script execution', 'Legacy compatibility');
            break;
          case 'bun':
            features.push('High-performance runtime', 'Modern JS features');
            break;
        }
      }
    }

    integrationResults.push({
      'Category': category,
      'Available Tools': availableTools.join(', ') || 'None',
      'Enhanced Features': [...new Set(features)].join(', ') || 'None',
      'Status': availableTools.length > 0 ? '✅ Enhanced' : '⚠️ Basic'
    });
  }

  console.log(Bun.inspect.table(integrationResults, { colors: true }));

  // Show proxy capability matrix
  console.log("\n🎯 Proxy Capability Matrix:");

  const capabilities = [
    {
      'Feature': 'HTTP Proxy',
      'Base': '✅ Always',
      'Enhanced': '✅ Always',
      'Tools': 'None required'
    },
    {
      'Feature': 'WebSocket Proxy',
      'Base': '✅ Always',
      'Enhanced': '✅ Always',
      'Tools': 'None required'
    },
    {
      'Feature': 'Streaming Support',
      'Base': '✅ Always',
      'Enhanced': '✅ Always',
      'Tools': 'None required'
    },
    {
      'Feature': 'Rate Limiting',
      'Base': '✅ Always',
      'Enhanced': '✅ Always',
      'Tools': 'None required'
    },
    {
      'Feature': 'Circuit Breaker',
      'Base': '✅ Always',
      'Enhanced': '✅ Always',
      'Tools': 'None required'
    },
    {
      'Feature': 'Media Processing',
      'Base': '❌ Not supported',
      'Enhanced': await hasExecutable('ffmpeg') ? '✅ FFmpeg available' : '❌ FFmpeg not found',
      'Tools': 'ffmpeg, ffprobe'
    },
    {
      'Feature': 'SSL Inspection',
      'Base': '❌ Not supported',
      'Enhanced': await hasExecutable('openssl') ? '✅ OpenSSL available' : '❌ OpenSSL not found',
      'Tools': 'openssl'
    },
    {
      'Feature': 'Script Execution',
      'Base': '❌ Not supported',
      'Enhanced': (await hasExecutable('bun')) || (await hasExecutable('node')) ? '✅ Runtime available' : '❌ No runtime found',
      'Tools': 'bun, node'
    }
  ];

  console.log(Bun.inspect.table(capabilities, { colors: true }));
}

// Performance comparison
function displayPerformanceComparison() {
  console.log("\n⚡ Executable Detection Performance:\n");

  const performanceData = [
    {
      'Method': 'Environment Variables',
      'Speed': 'Instant',
      'Accuracy': 'High',
      'Use Case': 'Pre-configured paths'
    },
    {
      'Method': 'Common Paths Search',
      'Speed': 'Fast',
      'Accuracy': 'Medium-High',
      'Use Case': 'Standard installations'
    },
    {
      'Method': 'PATH Search',
      'Speed': 'Medium',
      'Accuracy': 'High',
      'Use Case': 'System-installed tools'
    },
    {
      'Method': 'Version Detection',
      'Speed': 'Slow',
      'Accuracy': 'Very High',
      'Use Case': 'Verification & compatibility'
    }
  ];

  console.log(Bun.inspect.table(performanceData, { colors: true }));
}

// Main demo execution
async function runExecutableDemo() {
  console.log("🚀 Bun Proxy Executable Detection Demo");
  console.log("======================================\n");

  try {
    // Test executable detection
    const detectionResults = await testExecutableDetection();

    // Display system overview
    const overviewStats = await displaySystemOverview();

    // Test individual operations
    await testExecutableOperations();

    // Demonstrate proxy integration
    await demonstrateProxyIntegration();

    // Performance comparison
    displayPerformanceComparison();

    // Final summary
    console.log("\n🏆 Executable Detection Demo Complete!");
    console.log("=====================================");
    console.log(`📊 Detected ${overviewStats.available}/${overviewStats.total} system tools`);
    console.log("🔧 Enhanced proxy capabilities based on available executables");
    console.log("⚡ Optimized detection with caching and multiple search strategies");

  } catch (error) {
    console.error("💥 Demo failed:", error);
  }
}

// Run the executable demo
runExecutableDemo();