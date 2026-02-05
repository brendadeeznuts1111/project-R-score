#!/usr/bin/env bash
# scripts/profiling/deploy-with-profiling.sh
# Deploy Multi-Layer Market Analysis System with Profiling

echo "🚀 Deploying Multi-Layer Market Analysis System with Profiling"
echo "=============================================================="

# Configuration
PROFILE_DIR="./profiling"
PROFILE_NAME="deployment_$(date +%Y%m%d_%H%M%S).cpuprofile"
DATA_SAMPLES=50000
CONCURRENCY_LEVEL=4

# Create profiling directory
mkdir -p "$PROFILE_DIR"

echo "📊 Starting CPU profiling..."
echo "📁 Profile will be saved to: $PROFILE_DIR/$PROFILE_NAME"

# Run the system with CPU profiling enabled
BUN_CPU_PROF=true \
BUN_CPU_PROF_NAME="$PROFILE_NAME" \
BUN_CPU_PROF_DIR="$PROFILE_DIR" \
bun run scripts/profiling/run-profiled-analysis.ts \
  --data-samples="$DATA_SAMPLES" \
  --concurrency="$CONCURRENCY_LEVEL" \
  --enable-profiling \
  --profile-output="$PROFILE_DIR/$PROFILE_NAME"

# Check if profiling was successful
if [ $? -eq 0 ]; then
  echo "✅ Profiling completed successfully"
  
  # Generate profile report
  echo "📈 Generating profile analysis..."
  bun run scripts/profiling/analyze-profile.ts "$PROFILE_DIR/$PROFILE_NAME"
  
  # Upload profile to analysis service (optional)
  if [ -n "$PROFILE_UPLOAD_URL" ]; then
    echo "🌐 Uploading profile to analysis service..."
    curl -X POST "$PROFILE_UPLOAD_URL" \
      -F "profile=@$PROFILE_DIR/$PROFILE_NAME" \
      -F "timestamp=$(date -Iseconds)" \
      -F "system=multilayer_market"
  fi
  
  # Run performance tests
  echo "🧪 Running performance regression tests..."
  bun test test/profiling/ --timeout 30000 --reporter spec
  
else
  echo "❌ Profiling failed"
  exit 1
fi

echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open $PROFILE_DIR/$PROFILE_NAME in Chrome DevTools"
echo "2. Check the Performance tab for CPU bottlenecks"
echo "3. Review test results for any regressions"
echo "4. Optimize recursive functions if needed"
