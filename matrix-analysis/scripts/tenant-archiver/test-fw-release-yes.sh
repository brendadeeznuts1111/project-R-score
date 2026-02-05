#!/bin/bash

# Quick demo of --yes flag bypassing confirmation

echo "🚀 Testing /fw-release with --yes flag"
echo "====================================="

echo "Simulating: /fw-release config.yaml --version=1.3.0 --yes"
echo ""

# Phase 1: Quick analysis (simulated)
echo "📍 Phase 1: Pre-Release Analysis"
echo "✅ /fw-analyze --json-only - Risk Score: 45/100"
echo "✅ /fw-validate --env=production --strict - 5/5 gates passed"
echo "✅ /fw-changelog --from=last-deploy-tag --to=HEAD - 2 changes"

echo ""
echo "🎯 Phase 2: Release Decision Gate"
echo "================================="

echo "🚀 FACTORYWAGER RELEASE CANDIDATE"
echo ""
echo "Version: 1.3.0"
echo "Risk Score: 45/100"
echo "Changes: 2 keys modified"
echo "Recommended Action: DEPLOY"

echo ""
echo "🔥 --yes FLAG DETECTED - Bypassing confirmation gate"
echo "✅ Auto-confirmed for deployment"

echo ""
echo "📍 Phase 3: Deployment Execution"
echo "==============================="
echo "✅ /fw-deploy --to=production - All environments healthy"
echo "✅ /fw-nexus-status --verify - Health: 95/100"

echo ""
echo "📍 Phase 4: Release Finalization"
echo "==============================="
echo "✅ Release report generated"
echo "✅ Git tag created: release-1.3.0-$(date +%Y%m%d-%H%M%S)"
echo "✅ Audit trail updated"

echo ""
echo "🎉 FACTORYWAGER RELEASE 1.3.0 COMPLETED (AUTOMATED)"
echo ""
echo "Key Benefits of --yes flag:"
echo "- Bypasses manual confirmation for CI/CD automation"
echo "- Enables fully automated release pipelines"
echo "- Maintains all safety gates and audit logging"
echo "- Perfect for GitHub Actions or GitLab CI integration"

echo ""
echo "📊 Generated Artifacts:"
echo "- Release Report: .factory-wager/releases/release-1.3.0-*.md"
echo "- HTML Report: .factory-wager/reports/factory-wager-release-1.3.0.html"
echo "- Git Tag: release-1.3.0-$(date +%Y%m%d-%H%M%S)"
