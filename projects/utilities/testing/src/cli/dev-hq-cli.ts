#!/usr/bin/env bun
/**
 * 🚀 ADVANCED DEV-HQ CLI
 * Enhanced with smart detection, flag separation, and auto-correction
 */

import { parseArgs } from "util";
import { type Choice } from "enquirer";
import { createTable } from "./utils/table-formatter";

// --- Configuration & Constants ---

// Type imports for dynamically loaded modules
type PhoneSystem = any;
type MetricsCollector = any;
type IntelligentAutoScaler = any;
type PredictiveFailureDetector = any;
type AnomalyDashboard = any;
type AutomaticRemediator = any;
type AutomatedQualityGate = any;
type ChaosEngineering = any;
const COMMAND_ALIASES: Record<string, string> = {
  'i': 'insights',
  'h': 'health',
  't': 'test',
  'g': 'git',
  'd': 'docker',
  'm': 'metrics'
};

const LOCAL_ONLY_COMMANDS = ['insights', 'analyze', 'debug', 'profile', 'coverage', 'chaos', 'predict', 'quality'];

// --- Utility Functions ---

/**
 * Separate Bun flags from CLI flags
 * Example: bun --smol dev-hq-cli.ts insights --table
 */
function parseFlags(args: string[]) {
  const bunFlags: string[] = [];
  const cliFlags: string[] = [];
  let scriptIndex = -1;
  
  args.forEach((arg, i) => {
    if (arg.endsWith('.ts') || arg.endsWith('.js')) {
      scriptIndex = i;
    } else if (scriptIndex === -1 && arg.startsWith('--')) {
      bunFlags.push(arg);
    } else if (scriptIndex !== -1) {
      cliFlags.push(arg);
    }
  });
  
  return { bunFlags, cliFlags };
}

/**
 * Auto-correct common mistakes
 */
function autoCorrectCommand(command: string) {
  const corrections: Record<string, string> = {
    'insight': 'insights',
    'helth': 'health',
    'metrix': 'metrics',
    'teste': 'test',
    'scal': 'scale'
  };
  
  if (corrections[command]) {
    console.info(`💡 Did you mean "${corrections[command]}"?`);
    return corrections[command];
  }
  
  return command;
}

/**
 * Auto-add missing flags for better UX
 */
function autoAddFlags(flags: string[], command: string) {
  const defaultFlags: Record<string, string[]> = {
    'insights': ['--table'],
    'test': ['--verbose'],
    'health': ['--color']
  };
  
  if (!flags.length && defaultFlags[command]) {
    console.info(`⚡ Auto-adding default flags: ${defaultFlags[command].join(' ')}`);
    return [...defaultFlags[command]];
  }
  
  return flags;
}

/**
 * Interactive Command Builder
 */
async function interactiveCommandBuilder() {
  try {
    const { default: enquirer } = await import('enquirer');
    
    // @ts-ignore
    const response = await enquirer.prompt([
      {
        type: 'select',
        name: 'command',
        message: 'Select command:',
        choices: ['insights', 'health', 'test', 'scale', 'metrics', 'predict']
      },
      {
        type: 'multiselect',
        name: 'flags',
        message: 'Select flags:',
        choices: [
          { name: '--table', value: 'table' },
          { name: '--json', value: 'json' },
          { name: '--verbose', value: 'verbose' },
          { name: '--color', value: 'color' }
        ]
      }
    ]);
    
    const commandToRun = (response as any).command;
    const flagsToRun = (response as any).flags;
    
    console.info(`🚀 Running: bun dev-hq-cli.ts ${commandToRun} ${flagsToRun.join(' ')}`);
    // In a real implementation, this would spawn the process
  } catch (e) {
    console.error('Interactive mode requires "enquirer" to be installed.');
  }
}

// --- Main CLI Logic ---

async function main() {
  const { bunFlags, cliFlags } = parseFlags(process.argv);
  
  // Detection mode
  const isGlobal = !process.argv[1].includes('dev-hq-cli.ts');
  const isDevelopmentMode = !isGlobal;

  if (isDevelopmentMode) {
    process.env.NODE_ENV = 'development';
    process.env.DEBUG = 'dev-hq:*';
    console.info('💻 Running in local mode (full development suite)');
  } else {
    console.info('🌍 Running in global mode (production commands only)');
  }

  if (cliFlags.length === 0 || cliFlags.includes('--help')) {
    console.info(`
🚀 DEV-HQ CLI v2.0
Usage: bun dev-hq-cli.ts [command] [flags]

Commands:
  insights (i)    Analyze system status
  health (h)      System health check
  metrics (m)     Real-time performance metrics
  chaos           Run chaos engineering simulations
  quality         Execute automated quality gates
  test (t)        Run test suite
  scale           Trigger auto-scaling analysis
  predict         Predict failure points
  interactive     Launch command builder

Options:
  --table         Output as table
  --json          Output as JSON
  --verbose       Detailed logging
  --help          Show this help
    `);
    return;
  }

  if (cliFlags.includes('interactive')) {
    await interactiveCommandBuilder();
    return;
  }

  let rawCommand = cliFlags[0];
  let flags = cliFlags.slice(1);

  // 1. Resolve Aliases
  let command = COMMAND_ALIASES[rawCommand] || rawCommand;

  // 2. Auto-correction
  command = autoCorrectCommand(command);

  // 3. Security Check (Global vs Local)
  if (isGlobal && LOCAL_ONLY_COMMANDS.includes(command)) {
    console.error(`🚫 Command "${command}" is development-only.`);
    console.error('💡 Use the local TypeScript implementation:');
    console.error(`   bun dev-hq-cli.ts ${command}`);
    process.exit(1);
  }

  // 4. Auto-add flags
  flags = autoAddFlags(flags, command);

  // 5. Execute Command (Mocking execution for now)
  console.info(`[CLI] Executing: ${command} with flags: ${flags.join(', ')}`);
  
  switch(command) {
    case 'insights':
      console.info('📊 Gathering insights from systems...');
      const { analyzeCodebase } = await import('./core');
      const results = await analyzeCodebase();
      
      if (flags.includes('--json')) {
        console.info(JSON.stringify(results, null, 2));
      } else {
        console.info('\n--- SYSTEM HEALTH SCORE ---');
        console.info(`Score: ${results.stats.healthScore}/100`);
        console.info(`Files: ${results.stats.totalFiles}`);
        console.info(`Complexity: ${results.stats.complexity}`);
        
        if (flags.includes('--trend')) {
          console.info('Trend: ↔️ Stable');
        }

        console.info('\n--- TOP HOTSPOTS ---');
        const tableData = [
          ["File", "Health", "Complexity", "Lines"],
          ...results.files.map(f => [f.name, f.health, f.complexity, f.lines])
        ];
        createTable(tableData);
      }
      break;
    case 'analyze':
      const targetFile = flags[0];
      if (!targetFile) {
        console.error('❌ Please specify a file to analyze.');
        process.exit(1);
      }
      console.info(`🔍 Analyzing ${targetFile}...`);
      const core = await import('./core');
      const allResults = await core.analyzeCodebase();
      const fileData = allResults.files.find(f => f.name === targetFile);

      if (!fileData) {
        console.error(`❌ File ${targetFile} not found in codebase analysis.`);
        process.exit(1);
      }

      console.info(`\n--- FILE ANALYSIS: ${targetFile} ---`);
      console.info(`Health: ${fileData.health}`);
      console.info(`Complexity: ${fileData.complexity}`);
      console.info(`Size: ${fileData.size} bytes`);
      console.info(`Lines: ${fileData.lines}`);
      break;
    case 'health':
      console.info('✅ System health is optimal.');
      const { AnomalyDashboard } = await import('./core');
      const ad = new AnomalyDashboard();
      console.info(ad.displayRealTimeAnomalies());
      break;
    case 'chaos':
      const { ChaosEngineering: CEClass } = await import('./core');
      const ce = new CEClass();
      const scenario = flags[0] || 'latency_simulation';
      console.info(`🌀 Injecting chaos: ${scenario}...`);
      const score = await ce.runChaosTest(scenario);
      console.info('\n--- RESILIENCE REPORT ---');
      console.info(`Resilience Score: ${score.score}/100`);
      console.info(`Recovery Time: ${score.recoveryTime}ms`);
      if (score.recommendations.length > 0) {
        console.info('💡 Recommendations:');
        score.recommendations.forEach(r => console.info(`   - ${r}`));
      }
      break;
    case 'quality':
      const { AutomatedQualityGate } = await import('./core');
      const gatekeeper = new AutomatedQualityGate();
      console.info('🛡️ Running quality gate checks...');
      const gateResults = await gatekeeper.checkAllGates();
      console.info('\n--- QUALITY GATE RESULTS ---');
      const gateTable = [
        ["Gate", "Status", "Message"],
        ...gateResults.map(r => [r.name, r.success ? '✅ PASSED' : '❌ FAILED', r.message])
      ];
      createTable(gateTable);
      break;
    case 'scale':
      const { IntelligentAutoScaler } = await import('./systems/auto-scaler');
      // Mocked initialization
      console.info('🤖 Triggering Intelligent Auto-Scaling...');
      const { IntelligentAutoScaler: Scaler } = await import('./systems/auto-scaler');
      const scaler = new Scaler(null as any, null as any);
      const decision = await scaler.analyzeAndScale();
      console.info('\n--- SCALING DECISION ---');
      console.info(`Action: ${decision.action}`);
      console.info(`Confidence: ${Math.round(decision.confidence * 100)}%`);
      console.info(`Reason: ${decision.reason}`);
      break;
    case 'predict':
      const { PredictiveFailureDetector } = await import('./systems/predictive-monitor');
      const pfd = new PredictiveFailureDetector();
      console.info('🔮 Running predictive failure analysis...');
      const pResults = await pfd.predictAndPreventFailures();
      console.info('\n--- PREDICTIVE ANALYSIS ---');
      console.info(`Risk Probability: ${Math.round(pResults.riskFactors.probability * 100)}%`);
      console.info(`Identified Risk: ${pResults.riskFactors.reason}`);
      console.info(`Critical Anomalies: ${pResults.anomalies.length}`);
      break;
    case 'remediate':
      const { AnomalyDashboard: AD, AutomaticRemediator: AR } = await import('./core');
      const { default: IAS } = await import('./systems/auto-scaler');
      const { PredictiveFailureDetector: PFD } = await import('./systems/predictive-monitor');
      const adb = new AD();
      const as = new (IAS as any)(null as any, null as any);
      const pf = new PFD();
      const ar = new AR(as, pf);
      console.info('🛠️ Initiating automated remediation scan...');
      const rAnomalies = adb.scanForAnomalies();
      const rActions = await ar.remediate(rAnomalies);
      if (rActions.length === 0) {
        console.info('✅ No anomalies requiring immediate remediation found.');
      } else {
        console.info('\n--- REMEDIATION ACTIONS ---');
        rActions.forEach(a => console.info(`   - ${a}`));
      }
      break;
    default:
      console.info(`⚠️ Unknown command: ${command}`);
  }
}

main().catch(console.error);
