#!/usr/bin/env bash

# 🚀 CI/CD Constants Validation
# Fast validation for automated pipelines

set -e  # Exit on any error

echo "🚀 CI Constants Validation"

# Quick structure validation
echo "📋 Checking constants structure..."
bun -e 'import { ENTERPRISE_DOCUMENTATION_BASE_URLS, BUN_DOCS } from "./lib/core/core-documentation.ts"; console.log("✅ ENTERPRISE_DOCUMENTATION_BASE_URLS:", Object.keys(ENTERPRISE_DOCUMENTATION_BASE_URLS).length, "providers"); console.log("✅ BUN_DOCS:", Object.keys(BUN_DOCS).length, "APIs")'

# Critical URL validation
echo "🔗 Testing critical URLs..."
CRITICAL_URLS=(
    "https://bun.sh/docs"
    "https://bun.sh/docs/api"
    "https://bun.sh/rss.xml"
    "https://github.com/oven-sh/bun"
)

FAILED_URLS=()
for url in "${CRITICAL_URLS[@]}"; do
    status=$(bun -e "console.log((await fetch('$url', {method: 'HEAD'})).status)")
    if [ "$status" != "200" ]; then
        FAILED_URLS+=("$url")
    fi
done

if [ ${#FAILED_URLS[@]} -eq 0 ]; then
    echo "✅ All critical URLs accessible"
else
    echo "❌ Failed URLs: ${FAILED_URLS[*]}"
    exit 1
fi

# BUN_DOCS functionality test
echo "🛠️  Testing BUN_DOCS functionality..."
bun -e '
import { BUN_DOCS } from "./lib/core/core-documentation.ts";
const tests = [
    () => BUN_DOCS.secrets.overview(),
    () => BUN_DOCS.runtime("api"),
    () => BUN_DOCS.api.main()
];

for (const test of tests) {
    const result = test();
    if (!result || !result.startsWith("https://")) {
        console.error("❌ BUN_DOCS function failed");
        process.exit(1);
    }
}
console.log("✅ BUN_DOCS functions working");
'

echo "🎉 All validations passed!"
exit 0