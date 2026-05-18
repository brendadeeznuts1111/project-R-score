#!/bin/bash
# verify-micro-followups.sh

echo "🔧 Verifying Micro-Follow-Ups..."

# Test rate limiting
echo "1. Testing rate limiting..."
for i in {1..12}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/run-test \
    -H "Content-Type: application/json" \
    -d '{"code":"console.log(\"test\")","entry":"test.ts","testType":"rate-limit-test"}')

  if [ $i -eq 11 ] && [ "$response" != "429" ]; then
    echo "❌ Rate limiting failed - expected 429 on request 11"
    exit 1
  fi
done
echo "✅ Rate limiting working"

# Test timeout
echo "2. Testing 7-second timeout..."
timeout_response=$(curl -s -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"code":"while(true){}","entry":"hang.ts","testType":"timeout-test"}')

if [[ "$timeout_response" != *"Timeout"* ]]; then
  echo "❌ Timeout protection failed"
  exit 1
fi
echo "✅ Timeout protection working"

# Test baseline storage
echo "3. Testing baseline storage..."
baseline_response=$(curl -s -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"baseline\")","entry":"baseline.ts","testType":"baseline-test"}')

if [[ "$baseline_response" != *"baselineDelta"* ]]; then
  echo "❌ Baseline storage failed"
  exit 1
fi
echo "✅ Baseline storage working"

echo "🎉 All micro-follow-ups verified successfully!"
