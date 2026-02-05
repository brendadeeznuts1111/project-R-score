#!/bin/bash

# Configuration
BENCH_SCRIPT="bench/storage/bench-r2-real.ts"
METRICS_BUCKET="metrics-bucket"

echo "Starting R2 Benchmark and Direct Upload..."

# Check if benchmark script exists
if [ ! -f "$BENCH_SCRIPT" ]; then
    BENCH_SCRIPT=$(find . -name "bench-r2-real.ts" | head -n 1)
    if [ -z "$BENCH_SCRIPT" ]; then
        echo "Error: bench-r2-real.ts not found."
        exit 1
    fi
fi

# Run benchmark, extract speed, and upload JSON to R2
bunx r2-upload \
  --bucket "$METRICS_BUCKET" \
  --key "real-time/$(date +%s).json" \
  --data "$(bun "$BENCH_SCRIPT" | grep -o '[0-9]\+ IDs/s' | head -n 1 | jq -R '{speed: . | match("[0-9]+") | .string | tonumber}')"

echo "Benchmark result uploaded to R2 bucket: $METRICS_BUCKET"
