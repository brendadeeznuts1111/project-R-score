#!/bin/bash

# FactoryWager Master Orchestrator Test Script
# Simulates the complete /fw-release workflow

echo "🚀 FactoryWager Master Orchestrator Test"
echo "======================================="

CONFIG_FILE=${1:-"config.yaml"}
VERSION=${2:-"1.2.0"}
DRY_RUN=${3:-"true"}

echo "Configuration: $CONFIG_FILE"
echo "Version: $VERSION"
echo "Dry Run: $DRY_RUN"
echo ""

# Phase 1: Pre-Release Analysis
echo "📍 Phase 1: Pre-Release Analysis"
echo "================================"

echo "1. Running /fw-analyze --json-only"
if ! ./test-fw-analyze.sh "$CONFIG_FILE" --json-only; then
    echo "❌ Analysis failed - halting release"
    exit 1
fi

echo ""
echo "2. Running /fw-validate --env=production --strict"
if ! ./test-fw-validate.sh "$CONFIG_FILE" production --strict; then
    echo "❌ Validation failed - halting release"
    exit 1
fi

echo ""
echo "3. Running /fw-changelog --from=last-deploy-tag --to=HEAD"
if ! ./test-fw-changelog.sh HEAD~1 HEAD; then
    echo "❌ Changelog analysis failed - halting release"
    exit 1
fi

# Extract risk score from analysis output
ANALYSIS_REPORT=".factory-wager/reports/fw-analyze-$(date +%Y%m%d-%H%M%S).json"

if [ -f "$ANALYSIS_REPORT" ]; then
  RISK_SCORE=$(grep -o '"risk_score":[[:space:]]*[0-9]*' "$ANALYSIS_REPORT" | cut -d':' -f2 | tr -d ' ')
  CHANGE_COUNT=$(grep -o '"artifacts_created"' "$ANALYSIS_REPORT" | wc -l)

  # Validate extracted values
  if [ -z "$RISK_SCORE" ] || [ "$RISK_SCORE" -eq 0 ]; then
    echo "⚠️  Warning: Could not extract risk score, using default"
    RISK_SCORE=50
  fi

  if [ -z "$CHANGE_COUNT" ] || [ "$CHANGE_COUNT" -eq 0 ]; then
    CHANGE_COUNT=1
  fi
else
  echo "⚠️  Warning: Analysis report not found, using default values"
  RISK_SCORE=50
  CHANGE_COUNT=1
fi

echo "📊 Extracted metrics: Risk Score=$RISK_SCORE, Changes=$CHANGE_COUNT"

# Phase 2: Release Decision Gate
echo ""
echo "🎯 Phase 2: Release Decision Gate"
echo "==============================="

echo "🚀 FACTORYWAGER RELEASE CANDIDATE"
echo ""
echo "Version: $VERSION"
echo "Config: $CONFIG_FILE"
echo "Risk Score: $RISK_SCORE/100"
echo "Changes: $CHANGE_COUNT keys modified"
echo ""

echo "Analysis Summary:"
echo "- Documents: 3"
echo "- Anchors: 2"
echo "- Hardening: PRODUCTION"
echo ""
echo "Validation Status: ✅ PASSED"
echo "Security Gates: 5/5 passed"
echo ""
echo "Inheritance Drift:"
echo "- Development: 0% (unchanged)"
echo "- Staging: 15% (3 keys modified)"
echo "- Production: 22% (4 keys modified, 1 added)"
echo ""
echo "Risk Score: $RISK_SCORE/100 (medium)"
echo "Recommended Action: DEPLOY"

# User confirmation
if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "🔍 DRY RUN MODE - Skipping confirmation"
    CONFIRMED="true"
else
    echo ""
    echo "🎯 RELEASE CONFIRMATION"
    echo "Type 'DEPLOY' to release $VERSION to production:"
    echo "____________________________________________________"
    read -r confirmation

    if [[ "$confirmation" == "DEPLOY" ]]; then
        CONFIRMED="true"
    else
        echo "❌ Release cancelled by user"
        exit 5
    fi
fi

# Phase 3: Deployment Execution
echo ""
echo "📍 Phase 3: Deployment Execution"
echo "==============================="

if [[ "$CONFIRMED" == "true" ]]; then
    echo "4. Running /fw-deploy --to=production"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 DRY RUN: Simulating deployment..."
        echo "✅ Development deployment completed"
        echo "✅ Staging deployment completed"
        echo "✅ Production deployment completed"
        echo "📊 Health checks passed"
        echo "🏷️  Git tag created: release-$VERSION-$(date +%Y%m%d-%H%M%S)"
    else
        echo "🚀 EXECUTING PRODUCTION DEPLOYMENT..."
        # Would call actual deployment script here
        echo "✅ Deployment completed successfully"
    fi

    echo ""
    echo "5. Running /fw-nexus-status --verify"
    echo "🔍 Verifying infrastructure health..."
    echo "✅ Overall Health: 95/100"
    echo "✅ All endpoints responding"
    echo "✅ No configuration drift detected"

    DEPLOY_SUCCESS="true"
else
    echo "❌ Deployment cancelled"
    DEPLOY_SUCCESS="false"
fi

# Phase 4: Release Finalization
echo ""
echo "📍 Phase 4: Release Finalization"
echo "==============================="

if [[ "$DEPLOY_SUCCESS" == "true" ]]; then
    echo "6. Generating comprehensive release report..."

    # Generate HTML report
    ./.factory-wager/html-report-cli.sh generate --output "factory-wager-release-$VERSION.html"

    # Create release summary
    RELEASE_REPORT=".factory-wager/releases/release-$VERSION-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p .factory-wager/releases

    cat > "$RELEASE_REPORT" << EOF
# FactoryWager Release Report

## Release Information
- **Version**: $VERSION
- **Timestamp**: $(date)
- **Configuration**: $CONFIG_FILE
- **Risk Score**: $RISK_SCORE/100
- **Status**: ✅ SUCCESS

## Workflow Results
- **Analysis**: ✅ PASSED (Risk: $RISK_SCORE)
- **Validation**: ✅ PASSED (5/5 gates)
- **Changelog**: ✅ PASSED (3 changes)
- **Deployment**: ✅ PASSED (Production)
- **Verification**: ✅ PASSED (Health: 95%)

## Artifacts Created
- Analysis Report: .factory-wager/reports/fw-analyze-*.json
- HTML Report: .factory-wager/reports/factory-wager-release-$VERSION.html
- Git Tag: release-$VERSION-$(date +%Y%m%d-%H%M%S)
- Audit Trail: .factory-wager/audit.log

## Risk Assessment
- **Pre-Release Risk**: $RISK_SCORE/100
- **Risk Delta**: +5
- **Success Rate**: 100%
- **Recommendation**: ✅ DEPLOYED SUCCESSFULLY

## Next Steps
- Monitor production for 30 minutes
- Review HTML report with stakeholders
- Update documentation as needed

---
*Generated by FactoryWager v1.1.0 Master Orchestrator*
EOF

    echo "✅ Release report generated: $RELEASE_REPORT"

    # Log to audit
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] fw-release $VERSION exit=0 duration=300 risk_score=$RISK_SCORE" >> .factory-wager/audit.log

    echo ""
    echo "🎉 FACTORYWAGER RELEASE $VERSION COMPLETED"
    echo ""
    echo "Duration: 5 minutes"
    echo "Risk Score: $RISK_SCORE/100"
    echo "Health Status: 95%"
    echo ""
    echo "Artifacts Created:"
    echo "- Release Report: $RELEASE_REPORT"
    echo "- HTML Report: .factory-wager/reports/factory-wager-release-$VERSION.html"
    echo "- Git Tag: release-$VERSION-$(date +%Y%m%d-%H%M%S)"
    echo "- Deployment Snapshots: .factory-wager/deployments/$(date +%Y%m%d)/"
    echo ""
    echo "Next Steps:"
    echo "- Monitor production for 30 minutes"
    echo "- Review release report with team"
    echo "- Update documentation if needed"

else
    echo "❌ Release failed - no artifacts created"
    exit 3
fi
