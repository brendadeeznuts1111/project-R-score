#!/usr/bin/env bun

// scripts/generate-graphs.ts

import { factoryWagerSecurityCitadel } from '../lib/secrets/core/factorywager-security-citadel';
import { secretManager } from '../lib/secrets/core/secrets';
import { BUN_DOCS } from '../lib/utils/docs/urls';

interface GraphOptions {
  allSecrets?: boolean;
  output?: 'r2' | 'local' | 'both';
  format?: 'all' | 'mermaid' | 'd3' | 'terminal';
  secrets?: string[];
}

function parseArgs(): GraphOptions {
  const options: GraphOptions = {
    output: 'local',
    format: 'all'
  };
  
  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];
    
    if (arg === '--all-secrets') options.allSecrets = true;
    if (arg === '--output' && Bun.argv[i + 1]) {
      options.output = Bun.argv[++i] as 'r2' | 'local' | 'both';
    }
    if (arg === '--format' && Bun.argv[i + 1]) {
      options.format = Bun.argv[++i] as 'all' | 'mermaid' | 'd3' | 'terminal';
    }
    if (arg === '--secrets' && Bun.argv[i + 1]) {
      options.secrets = Bun.argv[++i].split(',');
    }
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function showHelp() {
  console.log('📊 Generate Initial Version Graphs');
  console.log('=================================');
  console.log();
  console.log('Generate visual version graphs for secrets.');
  console.log();
  console.log('Options:');
  console.log('  --all-secrets        Generate graphs for all secrets');
  console.log('  --secrets <list>     Comma-separated list of secret keys');
  console.log('  --output <type>      Output destination: r2, local, both');
  console.log('  --format <type>      Graph format: all, mermaid, d3, terminal');
  console.log('  --help, -h           Show this help');
  console.log();
  console.log('Examples:');
  console.log('  bun generate-graphs.ts --all-secrets --output r2');
  console.log('  bun generate-graphs.ts --secrets API_KEY,DATABASE_URL --format mermaid');
  console.log('  bun generate-graphs.ts --all-secrets --output both --format all');
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

async function main() {
  const options = parseArgs();
  
  console.log(styled('📊 Version Graph Generator', 'primary'));
  console.log(styled('==========================', 'muted'));
  console.log();
  
  try {
    // Step 1: Discover secrets to process
    console.log(styled('🔍 Step 1: Discovering secrets...', 'info'));
    
    let secretsToProcess: string[] = [];
    
    if (options.allSecrets) {
      secretsToProcess = await discoverAllSecrets();
      console.log(styled(`   Found ${secretsToProcess.length} secrets`, 'success'));
    } else if (options.secrets) {
      secretsToProcess = options.secrets;
      console.log(styled(`   Processing ${secretsToProcess.length} specified secrets`, 'info'));
    } else {
      console.log(styled('❌ No secrets specified. Use --all-secrets or --secrets', 'error'));
      process.exit(1);
    }
    
    secretsToProcess.forEach(secret => {
      console.log(styled(`   • ${secret}`, 'muted'));
    });
    console.log();
    
    // Step 2: Generate graphs for each secret
    console.log(styled('📊 Step 2: Generating graphs...', 'info'));
    
    const results = [];
    
    for (const secretKey of secretsToProcess) {
      try {
        console.log(styled(`   🔄 Processing: ${secretKey}`, 'primary'));
        
        const graphData = await factoryWagerSecurityCitadel.generateVisualGraph(secretKey);
        
        const result = {
          key: secretKey,
          mermaid: graphData.mermaid,
          d3: graphData.d3,
          terminal: graphData.terminal,
          timeline: graphData.timeline,
          generated: new Date().toISOString()
        };
        
        results.push(result);
        
        // Store graphs based on output option
        if (options.output === 'local' || options.output === 'both') {
          await storeGraphsLocally(result, options.format);
        }
        
        if (options.output === 'r2' || options.output === 'both') {
          await storeGraphsInR2(result, options.format);
        }
        
        console.log(styled(`   ✅ Generated: ${secretKey}`, 'success'));
        
      } catch (error) {
        console.log(styled(`   ❌ Failed: ${secretKey} - ${error.message}`, 'error'));
        results.push({
          key: secretKey,
          error: error.message,
          generated: new Date().toISOString()
        });
      }
    }
    
    console.log();
    
    // Step 3: Generate summary report
    console.log(styled('📋 Step 3: Generating summary report...', 'info'));
    
    const summary = {
      generated: new Date().toISOString(),
      options,
      totalSecrets: secretsToProcess.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results,
      factorywager: {
        version: '5.1',
        formats: options.format,
        output: options.output
      }
    };
    
    await storeSummaryReport(summary, options.output);
    
    console.log(styled('   ✅ Summary report generated', 'success'));
    console.log();
    
    // Step 4: Show results
    console.log(styled('📊 Generation Summary:', 'primary'));
    console.log(styled(`   Total secrets: ${summary.totalSecrets}`, 'info'));
    console.log(styled(`   Successful: ${summary.successful}`, 'success'));
    console.log(styled(`   Failed: ${summary.failed}`, summary.failed > 0 ? 'error' : 'success'));
    console.log(styled(`   Output: ${options.output}`, 'muted'));
    console.log(styled(`   Format: ${options.format}`, 'muted'));
    
    if (summary.failed > 0) {
      console.log();
      console.log(styled('⚠️  Failed generations:', 'warning'));
      results.filter(r => r.error).forEach(result => {
        console.log(styled(`   • ${result.key}: ${result.error}`, 'error'));
      });
    }
    
    console.log();
    console.log(styled('🎉 Graph generation completed!', 'success'));
    
    if (options.output === 'r2' || options.output === 'both') {
      console.log(styled('🌐 Graphs available in R2 bucket', 'info'));
    }
    
    if (options.output === 'local' || options.output === 'both') {
      console.log(styled('📁 Graphs saved to local directory', 'info'));
    }
    
  } catch (error) {
    console.error(styled(`❌ Graph generation failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function discoverAllSecrets(): Promise<string[]> {
  // Discover all versioned secrets
  const secrets = [
    'api:github_token',
    'database:password',
    'jwt:secret',
    'stripe:webhook_secret',
    'redis:auth',
    'internal:api_token'
  ];
  
  const existingSecrets = [];
  
  for (const secret of secrets) {
    try {
      const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(secret, 1);
      if (timeline.length > 0) {
        existingSecrets.push(secret);
      }
    } catch (error) {
      // Secret doesn't have version history
    }
  }
  
  return existingSecrets;
}

async function storeGraphsLocally(result: any, format: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = `graphs/${result.key}`;
  
  // Create directory structure
  await Bun.write(`${baseDir}/.gitkeep`, '');
  
  if (format === 'all' || format === 'mermaid') {
    await Bun.write(`${baseDir}/${timestamp}-mermaid.md`, `# ${result.key} Version Graph\n\n\`\`\`mermaid\n${result.mermaid}\n\`\`\``);
  }
  
  if (format === 'all' || format === 'd3') {
    await Bun.write(`${baseDir}/${timestamp}-d3.json`, JSON.stringify(result.d3, null, 2));
  }
  
  if (format === 'all' || format === 'terminal') {
    await Bun.write(`${baseDir}/${timestamp}-terminal.txt`, `${result.key} Version Graph\n${'='.repeat(50)}\n\n${result.terminal}`);
  }
  
  if (format === 'all') {
    await Bun.write(`${baseDir}/${timestamp}-timeline.json`, JSON.stringify(result.timeline, null, 2));
    await Bun.write(`${baseDir}/${timestamp}-full.json`, JSON.stringify(result, null, 2));
  }
}

async function storeGraphsInR2(result: any, format: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const r2Credentials = {
    accountId: '7a470541a704caaf91e71efccc78fd36',
    accessKeyId: '84c87a7398c721036cd6e95df42d718c',
    secretAccessKey: '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
    bucketName: 'bun-executables'
  };
  
  const endpoint = `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`;
  const authString = `${r2Credentials.accessKeyId}:${r2Credentials.secretAccessKey}`;
  const authHeader = `Basic ${btoa(authString)}`;
  
  const makeR2Request = async (key: string, content: string, contentType: string, metadata: Record<string, string>) => {
    const url = `${endpoint}/${r2Credentials.bucketName}/${key}`;
    
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Content-Type': contentType,
      'x-amz-content-sha256': await Bun.hash(content)
    };
    
    Object.entries(metadata).forEach(([k, v]) => {
      headers[`x-amz-meta-${k}`] = v;
    });
    
    await fetch(url, {
      method: 'PUT',
      headers,
      body: content
    });
  };
  
  const baseKey = `graphs/${result.key}`;
  
  if (format === 'all' || format === 'mermaid') {
    const content = `# ${result.key} Version Graph\n\n\`\`\`mermaid\n${result.mermaid}\n\`\`\``;
    await makeR2Request(`${baseKey}/${timestamp}-mermaid.md`, content, 'text/markdown', {
      'graph-type': 'mermaid',
      'secret-key': result.key,
      'factorywager-version': '5.1'
    });
  }
  
  if (format === 'all' || format === 'd3') {
    const content = JSON.stringify(result.d3, null, 2);
    await makeR2Request(`${baseKey}/${timestamp}-d3.json`, content, 'application/json', {
      'graph-type': 'd3',
      'secret-key': result.key,
      'factorywager-version': '5.1'
    });
  }
  
  if (format === 'all' || format === 'terminal') {
    const content = `${result.key} Version Graph\n${'='.repeat(50)}\n\n${result.terminal}`;
    await makeR2Request(`${baseKey}/${timestamp}-terminal.txt`, content, 'text/plain', {
      'graph-type': 'terminal',
      'secret-key': result.key,
      'factorywager-version': '5.1'
    });
  }
  
  if (format === 'all') {
    const fullContent = JSON.stringify(result, null, 2);
    await makeR2Request(`${baseKey}/${timestamp}-full.json`, fullContent, 'application/json', {
      'graph-type': 'full',
      'secret-key': result.key,
      'factorywager-version': '5.1'
    });
  }
}

async function storeSummaryReport(summary: any, output: string): Promise<void> {
  const content = JSON.stringify(summary, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (output === 'local' || output === 'both') {
    await Bun.write(`graphs/summary-${timestamp}.json`, content);
  }
  
  if (output === 'r2' || output === 'both') {
    const r2Credentials = {
      accountId: '7a470541a704caaf91e71efccc78fd36',
      accessKeyId: '84c87a7398c721036cd6e95df42d718c',
      secretAccessKey: '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
      bucketName: 'bun-executables'
    };
    
    const endpoint = `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${r2Credentials.bucketName}/graphs/summary-${timestamp}.json`;
    
    const authString = `${r2Credentials.accessKeyId}:${r2Credentials.secretAccessKey}`;
    const authHeader = `Basic ${btoa(authString)}`;
    
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'x-amz-content-sha256': await Bun.hash(content),
        'x-amz-meta-report-type': 'graph-generation-summary',
        'x-amz-meta-factorywager-version': '5.1'
      },
      body: content
    });
  }
}

// Run the graph generator
main().catch(console.error);
