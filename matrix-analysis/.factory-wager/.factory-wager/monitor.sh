#!/bin/bash
# FactoryWager Monitoring

echo "📊 FactoryWager Monitoring"

# Worker logs
echo "🔍 Worker logs:"
bunx wrangler tail --format=pretty

# R2 usage
echo "📦 R2 Storage usage:"
bunx wrangler r2 bucket list

# Analytics
echo "📈 Analytics:"
bunx wrangler analytics --since=1h
