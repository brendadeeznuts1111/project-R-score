/**
 * WebAssembly.Table Usage Examples for Barbershop
 */

import { WASMMachine, createDefaultMachine } from '../src/utils/wasm-table';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Example 1: Secrets Field Risk Analysis
export function example1_secretsRiskAnalysis() {
  console.log(`\n${ANSI.bold}${ANSI.blue}Example 1: Secrets Field Risk Analysis${ANSI.reset}\n`);

  const machine = new WASMMachine({ initial: 8, element: 'funcref' });

  const riskIndex = machine.registerHook(
    'secretRisk',
    (input: number[]) => {
      const [exposure, sensitivity, accessCount, ageDays] = input;
      const accessFactor = Math.log10(accessCount + 1);
      const ageFactor = 1 + ageDays / 365;
      return exposure * sensitivity * accessFactor * ageFactor;
    },
    'Calculate secret exposure risk score'
  );

  const secrets = [
    { name: 'API Key', data: [8.5, 9.0, 15000, 30] },
    { name: 'DB Password', data: [9.0, 10.0, 5000, 180] },
    { name: 'JWT Secret', data: [6.0, 7.0, 100000, 365] },
  ];

  console.log('Secret Risk Analysis:');
  for (const secret of secrets) {
    const risk = machine.execute(riskIndex, secret.data);
    const level = risk > 1000 ? 'CRITICAL' : risk > 500 ? 'HIGH' : risk > 100 ? 'MEDIUM' : 'LOW';
    console.log(`  ${secret.name.padEnd(15)} Risk: ${risk.toFixed(2).padStart(8)} ${level}`);
  }
}

// Example 2: A/B Testing Algorithm Versions
export function example2_abTesting() {
  console.log(`\n${ANSI.bold}${ANSI.blue}Example 2: A/B Testing Algorithm Versions${ANSI.reset}\n`);

  const machine = createDefaultMachine();
  const testData = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95];

  console.log('Testing Entropy Variants:\n');

  // v1: Standard
  const v1Result = machine.execute(1, testData);
  console.log(`v1 - Standard: ${v1Result.toFixed(4)} bits`);

  // v2: Weighted
  machine.hotSwap(
    1,
    (input: number[]) => {
      const weighted = input.map((v, i) => (v * (i + 1)) / input.length);
      const sum = weighted.reduce((a, b) => a + b, 0);
      if (sum === 0) return 0;
      return -weighted.reduce((acc, val) => {
        if (val === 0) return acc;
        const p = val / sum;
        return acc + p * Math.log2(p);
      }, 0);
    },
    'weighted v2'
  );

  const v2Result = machine.execute(1, testData);
  console.log(`v2 - Weighted: ${v2Result.toFixed(4)} bits`);

  console.log(`\n${ANSI.green}✓${ANSI.reset} Hot-swap successful`);
}

// Run examples
if (import.meta.main) {
  console.log(`\n${ANSI.bold}🏰 WebAssembly.Table Examples${ANSI.reset}\n`);
  example1_secretsRiskAnalysis();
  example2_abTesting();
  console.log(`\n${ANSI.green}✓${ANSI.reset} Examples complete!\n`);
}
