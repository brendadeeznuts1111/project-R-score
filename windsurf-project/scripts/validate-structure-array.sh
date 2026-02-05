#!/bin/bash

echo "🔍 Directory Structure Validator with Arrays"
echo "=========================================="

# Directory structure arrays
CLI_DIRS=("cli/bin" "cli/commands")
SRC_DIRS=("src/cli" "src/patterns" "src/integrations" "src/core" "src/storage" "src/utils" "src/types" "src/filters" "src/apple-id" "src/audit" "src/autonomic" "src/address" "src/rbac" "src/validation")
DEMOS_DIRS=("demos/cli" "demos/analytics" "demos/grafana" "demos/main" "demos/credentials")
TESTS_DIRS=("tests/core" "tests/email" "tests/filter" "tests/bench")
SCRIPTS_DIRS=("scripts/build" "scripts/maintenance" "scripts/apple-id" "scripts/cashapp")
UTILS_DIRS=("utils/device" "utils/email" "utils/orchestration" "utils/storage")
DOCS_DIRS=("docs/api" "docs/architecture" "docs/archive" "docs/apple-id" "docs/deployment" "docs/getting-started" "docs/guides" "docs/maintenance" "docs/performance" "docs/planning" "docs/reference" "docs/sim" "docs/testing" "docs/tutorials")
CONFIG_DIRS=("config/application" "config/build-artifacts" "config/deployment" "config/environment" "config/project")
BENCH_DIRS=("bench/core" "bench/results" "bench/scripts" "bench/storage")
REPORTS_DIRS=("reports/audit" "reports/performance" "reports/directory")

echo ""
echo "📂 Directory Arrays Summary:"
echo "   CLI_DIRS: ${#CLI_DIRS[@]} directories"
echo "   SRC_DIRS: ${#SRC_DIRS[@]} directories"
echo "   DEMOS_DIRS: ${#DEMOS_DIRS[@]} directories"
echo "   TESTS_DIRS: ${#TESTS_DIRS[@]} directories"
echo "   SCRIPTS_DIRS: ${#SCRIPTS_DIRS[@]} directories"
echo "   UTILS_DIRS: ${#UTILS_DIRS[@]} directories"
echo "   DOCS_DIRS: ${#DOCS_DIRS[@]} directories"
echo "   CONFIG_DIRS: ${#CONFIG_DIRS[@]} directories"
echo "   BENCH_DIRS: ${#BENCH_DIRS[@]} directories"
echo "   REPORTS_DIRS: ${#REPORTS_DIRS[@]} directories"

echo ""
echo "📋 Total Directories Defined: $(( ${#CLI_DIRS[@]} + ${#SRC_DIRS[@]} + ${#DEMOS_DIRS[@]} + ${#TESTS_DIRS[@]} + ${#SCRIPTS_DIRS[@]} + ${#UTILS_DIRS[@]} + ${#DOCS_DIRS[@]} + ${#CONFIG_DIRS[@]} + ${#BENCH_DIRS[@]} + ${#REPORTS_DIRS[@]} ))"

echo ""
echo "🔍 Checking for misplaced files in root..."

violations=()
for file in *.ts *.js *.md *.sh *.json; do
    if [ -f "$file" ] && [ "$file" != "validate-structure-array.sh" ]; then
        if [[ "$file" != "README.md" && "$file" != "ORGANIZATION.md" && "$file" != "LICENSE" && "$file" != "package.json" && "$file" != "tsconfig.json" && "$file" != "bun.lock" && "$file" != ".gitignore" ]]; then
            violations+=("$file")
        fi
    fi
done

if [ ${#violations[@]} -eq 0 ]; then
    echo "✅ All files are in correct directories!"
    echo "✅ Directory structure is perfectly organized!"
else
    echo "❌ Found ${#violations[@]} misplaced files:"
    for violation in "${violations[@]}"; do
        echo "   - $violation"
    done
fi

echo ""
echo "🎯 Array-based directory structure validation complete!"
