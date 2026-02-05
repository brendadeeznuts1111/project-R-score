#!/usr/bin/env bun

// Duo Automation CLI Agent
// A comprehensive CLI tool for interacting with the Duo Automation API

import { Command } from 'commander';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import figlet from 'figlet';
import path from 'path';

const program = new Command();

// Configuration
const CONFIG_FILE = path.join(process.env.HOME || '', '.duo-cli-config.json');
let config: any = {};

// Load configuration
async function loadConfig() {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      config = JSON.parse(await file.text());
    }
  } catch (error) {
    console.log(console.yellow('⚠️  No configuration found, please run "duo-cli init"'));
  }
}

// Save configuration
async function saveConfig() {
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// API request helper
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const baseUrl = config.baseUrl || 'http://localhost:3002';
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('No API key configured. Run "duo-cli init" first.');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Initialize CLI
program
  .name('duo-cli')
  .description('Duo Automation CLI Agent')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize CLI configuration')
  .action(async () => {
    console.log(console.blue(figlet.textSync('Duo CLI', { font: 'Small' })));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'API Base URL:',
        default: 'http://localhost:3002'
      },
      {
        type: 'list',
        name: 'keyType',
        message: 'Select API key type:',
        choices: [
          { name: 'Super Admin (Full Access)', value: 'super-admin-key-001' },
          { name: 'Agent CLI (Task Execution)', value: 'agent-cli-key-002' },
          { name: 'Social User (Social Features)', value: 'social-user-key-003' },
          { name: 'Billing (Payment Processing)', value: 'billing-key-004' },
          { name: 'Demo Super Admin', value: 'demo-key-super-admin' },
          { name: 'Demo Analyst', value: 'demo-key-analyst' }
        ]
      },
      {
        type: 'password',
        name: 'customKey',
        message: 'Enter custom API key (or leave empty to use selected):',
        when: (answers) => answers.keyType === 'custom'
      }
    ]);

    config.baseUrl = answers.baseUrl;
    config.apiKey = answers.customKey || answers.keyType;
    saveConfig();

    console.log(console.green('✅ Configuration saved successfully!'));
    
    // Test connection
    try {
      const response = await apiRequest('/api/dashboard/health');
      console.log(console.green('✅ Connection test successful!'));
    } catch (error) {
      console.log(console.red(`❌ Connection test failed: ${error.message}`));
    }
  });

// Status command
program
  .command('status')
  .description('Check agent status and system health')
  .action(async () => {
    try {
      console.log(console.blue('🔍 Checking system status...'));
      
      // Get agent status
      const agentStatus = await apiRequest('/api/agent/status');
      console.log(console.green('✅ Agent Status: Online'));
      
      // Get dashboard metrics
      const metrics = await apiRequest('/api/dashboard/metrics');
      console.log(console.cyan('📊 System Metrics:'));
      console.log(`   Total Requests: ${metrics.data.overview.totalRequests.toLocaleString()}`);
      console.log(`   Avg Response Time: ${metrics.data.overview.averageResponseTime}ms`);
      console.log(`   Error Rate: ${metrics.data.overview.errorRate}%`);
      console.log(`   Uptime: ${metrics.data.overview.uptime}%`);
      
      // Get R2 stats if available
      try {
        const r2Stats = await apiRequest('/api/r2/stats');
        console.log(console.magenta('💾 R2 Storage:'));
        console.log(`   Total Files: ${r2Stats.data.usage.totalFiles.toLocaleString()}`);
        console.log(`   Storage Used: ${r2Stats.data.usage.totalSize}`);
        console.log(`   Uploads Today: ${r2Stats.data.usage.uploadsToday}`);
      } catch (error) {
        // R2 not available, skip
      }
      
    } catch (error) {
      console.log(console.red(`❌ Status check failed: ${error.message}`));
    }
  });

// Tasks command
program
  .command('tasks')
  .description('Manage agent tasks')
  .option('-l, --list', 'List all tasks')
  .option('-e, --execute <taskId>', 'Execute a task')
  .option('-c, --cancel <taskId>', 'Cancel a task')
  .option('-r, --results <taskId>', 'Get task results')
  .action(async (options) => {
    try {
      if (options.list || Object.keys(options).length === 0) {
        const response = await apiRequest('/api/agent/tasks');
        
        const table = new Table({
          columns: [
            { name: 'id', alignment: 'left', color: 'cyan' },
            { name: 'name', alignment: 'left', color: 'white' },
            { name: 'status', alignment: 'center', color: 'yellow' },
            { name: 'progress', alignment: 'center', color: 'green' },
            { name: 'created', alignment: 'left', color: 'blue' }
          ]
        });
        
        response.data.tasks.forEach((task: any) => {
          const statusColor = task.status === 'completed' ? 'green' : 
                            task.status === 'running' ? 'yellow' : 'red';
          table.addRow({
            id: task.id,
            name: task.name,
            status: console[statusColor](task.status.toUpperCase()),
            progress: `${task.progress}%`,
            created: new Date(task.createdAt).toLocaleDateString()
          });
        });
        
        console.log(console.blue('📋 Agent Tasks:'));
        table.printTable();
        console.log(console.gray(`Total: ${response.data.total} | Running: ${response.data.running} | Completed: ${response.data.completed}`));
      }
      
      if (options.execute) {
        console.log(console.blue(`🚀 Executing task: ${options.execute}`));
        const response = await apiRequest(`/api/agent/tasks/${options.execute}/execute`, {
          method: 'POST'
        });
        console.log(console.green(`✅ Task execution started: ${response.data.taskId}`));
        console.log(console.cyan(`⏱️  Estimated completion: ${response.data.estimatedCompletion}`));
      }
      
      if (options.cancel) {
        console.log(console.yellow(`⏹️  Canceling task: ${options.cancel}`));
        const response = await apiRequest(`/api/agent/tasks/${options.cancel}/cancel`, {
          method: 'POST'
        });
        console.log(console.green(`✅ Task canceled: ${response.data.taskId}`));
      }
      
      if (options.results) {
        console.log(console.blue(`📊 Getting results for task: ${options.results}`));
        const response = await apiRequest(`/api/agent/results/${options.results}`);
        console.log(console.green('📈 Task Results:'));
        console.log(JSON.stringify(response.data.results, null, 2));
      }
      
    } catch (error) {
      console.log(console.red(`❌ Task operation failed: ${error.message}`));
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze phone number or platform data')
  .argument('<target>', 'Phone number or platform identifier')
  .option('-p, --phone', 'Analyze phone number')
  .option('-t, --platform <platform>', 'Analyze platform data (instagram, facebook, twitter)')
  .option('-u, --user <userId>', 'User ID for platform analysis')
  .option('-r, --risk', 'Include risk assessment')
  .action(async (target, options) => {
    try {
      if (options.phone) {
        console.log(console.blue(`🔍 Analyzing phone: ${target}`));
        
        let endpoint = `/api/analyze/phone/${target}`;
        if (options.risk) {
          endpoint = `/api/analyze/phone/${target}/risk`;
        }
        
        const response = await apiRequest(endpoint);
        
        console.log(console.green('✅ Analysis complete:'));
        console.log(JSON.stringify(response.data, null, 2));
        
        if (options.risk) {
          const riskLevel = response.data.risk.level;
          const riskColor = riskLevel === 'LOW' ? 'green' : 
                           riskLevel === 'MEDIUM' ? 'yellow' : 'red';
          console.log(console[riskColor](`⚠️  Risk Level: ${riskLevel}`));
        }
      }
      
      if (options.platform && options.user) {
        console.log(console.blue(`🔍 Analyzing ${options.platform} user: ${options.user}`));
        
        const response = await apiRequest(`/api/v1/platform/${options.platform}/users/${options.user}`);
        
        console.log(console.green('✅ Platform analysis complete:'));
        console.log(JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log(console.red(`❌ Analysis failed: ${error.message}`));
    }
  });

// Storage command
program
  .command('storage')
  .description('Manage R2 storage')
  .option('-l, --list', 'List files')
  .option('-u, --upload <file>', 'Upload file')
  .option('-k, --key <key>', 'File key for upload')
  .option('-d, --download <key>', 'Download file')
  .option('-s, --stats', 'Show storage statistics')
  .action(async (options) => {
    try {
      if (options.stats || Object.keys(options).length === 0) {
        console.log(console.blue('📊 Getting storage statistics...'));
        const response = await apiRequest('/api/r2/stats');
        
        console.log(console.green('💾 Storage Statistics:'));
        console.log(`   Bucket: ${response.data.bucket.name}`);
        console.log(`   Total Files: ${response.data.usage.totalFiles.toLocaleString()}`);
        console.log(`   Storage Used: ${response.data.usage.totalSize}`);
        console.log(`   Available: ${response.data.storage.available}`);
        console.log(`   Utilization: ${(response.data.storage.utilizationPercent * 100).toFixed(2)}%`);
      }
      
      if (options.list) {
        console.log(console.blue('📁 Listing files...'));
        const response = await apiRequest('/api/r2/files');
        
        const table = new Table({
          columns: [
            { name: 'key', alignment: 'left', color: 'cyan' },
            { name: 'size', alignment: 'right', color: 'yellow' },
            { name: 'type', alignment: 'center', color: 'green' },
            { name: 'modified', alignment: 'left', color: 'blue' }
          ]
        });
        
        response.data.files.forEach((file: any) => {
          const size = file.size > 1024 * 1024 ? 
            `${(file.size / (1024 * 1024)).toFixed(1)}MB` : 
            `${(file.size / 1024).toFixed(1)}KB`;
          
          table.addRow({
            key: file.key,
            size: size,
            type: file.contentType.split('/')[1]?.toUpperCase() || 'UNKNOWN',
            modified: new Date(file.lastModified).toLocaleDateString()
          });
        });
        
        console.log(console.green('📄 Files:'));
        table.printTable();
      }
      
      if (options.upload && options.key) {
        const file = Bun.file(options.upload);
        if (!(await file.exists())) {
          throw new Error(`File not found: ${options.upload}`);
        }
        
        console.log(console.blue(`📤 Uploading file: ${options.upload}`));
        
        const formData = new FormData();
        formData.append('file', Bun.file(options.upload));
        formData.append('key', options.key);
        
        const response = await apiRequest('/api/r2/upload', {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });
        
        console.log(console.green(`✅ Upload successful: ${response.data.key}`));
        console.log(console.cyan(`🔗 URL: ${response.data.url}`));
      }
      
      if (options.download) {
        console.log(console.blue(`📥 Generating download URL for: ${options.download}`));
        const response = await apiRequest(`/api/r2/download/${options.download}`);
        
        console.log(console.green(`✅ Download URL generated:`));
        console.log(console.cyan(response.data.signedUrl));
        console.log(console.yellow(`⏰ Expires: ${response.data.expires}`));
      }
      
    } catch (error) {
      console.log(console.red(`❌ Storage operation failed: ${error.message}`));
    }
  });

// Billing command
program
  .command('billing')
  .description('Manage billing and subscription')
  .option('-p, --plans', 'Show available plans')
  .option('-s, --subscription', 'Show current subscription')
  .option('-u, --usage', 'Show usage statistics')
  .action(async (options) => {
    try {
      if (options.plans || Object.keys(options).length === 0) {
        console.log(console.blue('💳 Available Plans:'));
        const response = await apiRequest('/api/billing/plans');
        
        response.data.plans.forEach((plan: any) => {
          const price = plan.price === 0 ? 'FREE' : `$${plan.price}/${plan.interval}`;
          console.log(console.green(`\n📦 ${plan.name} - ${price}`));
          
          plan.features.forEach((feature: string) => {
            console.log(console.gray(`   ✓ ${feature}`));
          });
        });
      }
      
      if (options.subscription) {
        console.log(console.blue('📊 Current Subscription:'));
        const response = await apiRequest('/api/billing/subscription');
        
        const sub = response.data.subscription;
        console.log(console.green(`Plan: ${sub.plan.toUpperCase()}`));
        console.log(console.cyan(`Status: ${sub.status}`));
        console.log(console.blue(`Period: ${sub.currentPeriodStart} to ${sub.currentPeriodEnd}`));
        
        console.log(console.yellow('\n📈 Usage:'));
        console.log(`   API Calls: ${sub.usage.apiCalls} / ${sub.limits.apiCalls}`);
        console.log(`   Storage: ${sub.usage.storage} / ${sub.limits.storage}`);
        console.log(`   Users: ${sub.usage.users} / ${sub.limits.users}`);
      }
      
      if (options.usage) {
        console.log(console.blue('📊 Usage Statistics:'));
        const response = await apiRequest('/api/billing/usage');
        
        console.log(JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log(console.red(`❌ Billing operation failed: ${error.message}`));
    }
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-r, --reset', 'Reset configuration')
  .action(async (options) => {
    if (options.show || Object.keys(options).length === 0) {
      console.log(console.blue('⚙️  Current Configuration:'));
      console.log(`Base URL: ${config.baseUrl || 'Not set'}`);
      console.log(`API Key: ${config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'Not set'}`);
    }
    
    if (options.reset) {
      await Bun.remove(CONFIG_FILE);
      console.log(console.green('✅ Configuration reset'));
      console.log(console.yellow('Run "duo-cli init" to reconfigure'));
    }
  });

// Main execution
loadConfig();

if (process.argv.length === 2) {
  console.log(console.blue(figlet.textSync('Duo CLI', { font: 'Small' })));
  console.log(console.gray('Duo Automation CLI Agent\n'));
  program.help();
}

program.parse();
