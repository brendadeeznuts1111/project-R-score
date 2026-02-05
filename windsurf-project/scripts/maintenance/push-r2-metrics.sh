#!/bin/bash

# Configuration
BENCH_SCRIPT="bench/storage/bench-r2-real.ts"
METRICS_ENDPOINT="https://metrics-ingest.your-domain.com/r2_metrics"
ENVIRONMENT="prod"

echo "Starting R2 Benchmark..."

# Check if script exists
if [ ! -f "$BENCH_SCRIPT" ]; then
    # Try searching for it if not in direct path
    BENCH_SCRIPT=$(find . -name "bench-r2-real.ts" | head -n 1)
    if [ -z "$BENCH_SCRIPT" ]; then
        echo "Error: bench-r2-real.ts not found."
        exit 1
    fi
fi

# Run benchmark and push to Prometheus
bun "$BENCH_SCRIPT" | \
  awk -v ts="$(date +%s)000" -v env="$ENVIRONMENT" '
    BEGIN {
      print "# HELP r2_speed R2 operations per second"
      print "# TYPE r2_speed gauge"
    }
    /IDs\/s/ {
      # Extract numeric value before IDs/s
      # Assuming output format like: 125.4 IDs/s
      match($0, /([0-9.]+)\s+IDs\/s/, arr)
      val = arr[1] ? arr[1] : $1
      print "r2_speed{job=\"bench-r2\",env=\""env"\"} " val " " ts
    }
  ' | \
  curl -X POST \
    -H "Content-Type: text/plain; version=0.0.4" \
    --data-binary @- \
    "$METRICS_ENDPOINT"

echo "Metrics pushed to $METRICS_ENDPOINT"
