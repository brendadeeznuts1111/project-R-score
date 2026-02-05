#!/usr/bin/env bun

// [PIPE][STREAMS][ETL][PIPE-001][v1.3][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-F65][v1.3.0][ACTIVE]

// 1-line ETL pipeline: fetch → jq → append
// Demonstrates Bun's streaming capabilities

const API_URL = process.argv[2] || "https://api.example.com/bets";
const JQ_FILTER = process.argv[3] || '.bets[] | {agent, profit: (.result | tonumber), volume: (.bet | tonumber)}';
const OUTPUT_FILE = process.argv[4] || "data/processed-bets.jsonl";

async function pipeETL() {
  try {
    console.log(`🔄 Starting ETL pipeline: ${API_URL} → jq '${JQ_FILTER}' → ${OUTPUT_FILE}`);

    // Step 1: Fetch data stream
    console.log(`📡 Fetching from: ${API_URL}`);
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const jsonStream = response.body;

    if (!jsonStream) {
      throw new Error('No response body received');
    }

    // Step 2: Pipe through jq for transformation
    console.log(`🔧 Processing with jq: ${JQ_FILTER}`);
    const jqProcess = Bun.spawn(['jq', '-c', JQ_FILTER], {
      stdin: jsonStream,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    // Step 3: Collect and append results
    console.log(`💾 Appending to: ${OUTPUT_FILE}`);

    // Ensure output directory exists
    await Bun.mkdir('data', { recursive: true });

    const results: string[] = [];
    let lineCount = 0;

    // Read jq output line by line
    const reader = jqProcess.stdout.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line) {
            results.push(line);
            lineCount++;
          }
        }
      }

      // Handle any remaining buffered data
      const remaining = decoder.decode();
      if (remaining) {
        const lines = remaining.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line) {
            results.push(line);
            lineCount++;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Wait for jq to complete and check for errors
    const exitCode = await jqProcess.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(jqProcess.stderr).text();
      throw new Error(`jq failed with exit code ${exitCode}: ${stderr}`);
    }

    // Step 4: Append to output file
    const timestamp = new Date().toISOString();
    const outputLines = results.map(line => `${timestamp}\t${line}`);

    if (outputLines.length > 0) {
      const content = outputLines.join('\n') + '\n';
      await Bun.write(OUTPUT_FILE, content);
    }

    console.log(`✅ ETL complete: ${lineCount} records processed`);
    console.log(`📊 Output: ${outputLines.length} lines appended to ${OUTPUT_FILE}`);

    return {
      processed: lineCount,
      outputLines: outputLines.length,
      outputFile: OUTPUT_FILE
    };

  } catch (error) {
    console.error(`❌ ETL pipeline failed: ${error.message}`);
    throw error;
  }
}

// CLI usage
if (import.meta.main) {
  pipeETL().catch(error => {
    console.error(`❌ Pipeline error: ${error.message}`);
    process.exit(1);
  });
}

export { pipeETL };
