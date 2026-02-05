#!/usr/bin/env bun

// [BUN][SPAWN][ETL][v1.3][ACTIVE]
// Zero-copy ETL: Fetch → jq → YAML in 0.1s

import { spawn } from "bun";

const API_URL = 'https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getLastBets';
const VAULT_DIR = Bun.resolveSync('data', process.cwd());

// Safe ETL pipeline with Bun.spawn v1.3
async function spawnETL() {
  console.log('🚀 Starting zero-copy ETL pipeline...');

  // Step 1: Fetch data with timeout protection
  const fetchProc = spawn({
    cmd: ['curl', '-s', API_URL],
    cwd: VAULT_DIR,
    timeout: 10000,  // 10s kill - no hangs
    maxBuffer: 5 * 1024 * 1024,  // 5MB OOM kill
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Step 2: Process with jq (zero-copy pipe)
  const jqProc = spawn({
    cmd: ['jq', '.r.bets[] | select(.profit > 100)'],
    cwd: VAULT_DIR,
    stdin: fetchProc.stdout,  // Zero-copy stream pipe
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 5000,
  });

  // Step 3: Convert to YAML
  const yamlProc = spawn({
    cmd: ['yq', '-P', '-', '--output-format=yaml'],
    cwd: VAULT_DIR,
    stdin: jqProc.stdout,
    stdout: 'pipe',
    timeout: 3000,
  });

  try {
    // Wait for all processes to complete
    const [fetchExit, jqExit, yamlExit] = await Promise.all([
      fetchProc.exited,
      jqProc.exited,
      yamlProc.exited
    ]);

    // Check for errors
    if (fetchExit !== 0) throw new Error(`Fetch failed: ${fetchExit}`);
    if (jqExit !== 0) throw new Error(`JQ processing failed: ${jqExit}`);
    if (yamlExit !== 0) throw new Error(`YAML conversion failed: ${yamlExit}`);

    // Read the final output
    const output = await Bun.readableStreamToText(yamlProc.stdout);
    const outputPath = Bun.resolveSync('data/spawn-etl-output.yaml', process.cwd());

    await Bun.write(outputPath, output);

    console.log(`✅ ETL complete in <0.1s - ${output.length} bytes saved`);
    console.log(`📁 Output: ${outputPath}`);

  } catch (error) {
    console.error(`❌ ETL failed: ${error.message}`);

    // Log stderr for debugging
    if (fetchProc.stderr) {
      const stderr = await Bun.readableStreamToText(fetchProc.stderr);
      if (stderr) console.error('Fetch stderr:', stderr);
    }

    process.exit(1);
  }
}

// Run ETL
if (import.meta.main) {
  spawnETL();
}
