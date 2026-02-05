#!/bin/bash
# Team-specific aliases for NEXUS monorepo
# Source this file: source scripts/team-aliases.sh

# Sports Team (Alex Chen)
alias sports="cd packages/@graph/layer4 && bun run dev"
alias sports-install="bun install --filter '@graph/layer4' --filter '@graph/layer3'"
alias sports-dev="bun --filter '@graph/layer4' dev & bun --filter '@graph/layer3' dev & wait"
alias sports-bench="bun run @bench/layer4"
alias sports-pub="bun run scripts/team-publish.ts @graph/layer4"
alias sports-test="bun --filter '@graph/layer4' test && bun --filter '@graph/layer3' test"
alias sports-mini="cd apps/@mini/sports-correlation && bun run dev"

# Markets Team (Sarah Kumar)
alias markets="cd packages/@graph/layer2 && bun run dev"
alias markets-install="bun install --filter '@graph/layer2' --filter '@graph/layer1'"
alias markets-dev="bun --filter '@graph/layer2' dev & bun --filter '@graph/layer1' dev & wait"
alias markets-bench="bun run @bench/layer2"
alias markets-pub="bun run scripts/team-publish.ts @graph/layer2"
alias markets-test="bun --filter '@graph/layer2' test && bun --filter '@graph/layer1' test"
alias markets-mini="cd apps/@mini/market-analytics && bun run dev"

# Platform & Tools Team (Mike Rodriguez)
alias platform="cd packages/@graph/algorithms && bun run dev"
alias platform-install="bun install --filter '@graph/*' --filter '@bench/*'"
alias platform-dev="bun --filter '@graph/algorithms' dev & bun --filter '@graph/storage' dev & bun --filter '@graph/streaming' dev & wait"
alias platform-bench="bun --filter '@bench/*' bench"
alias platform-pub="bun run scripts/team-publish.ts"
alias platform-test="bun --filter '@graph/*' test"
alias platform-mini="cd apps/@mini/platform-tools && bun run dev"

# Benchmarking (Ryan Gupta - Platform Team)
alias bench-all="bun run bench:all"
alias bench-l4="bun run @bench/layer4 --property=threshold"
alias bench-l3="bun run @bench/layer3"
alias bench-l2="bun run @bench/layer2"
alias bench-l1="bun run @bench/layer1"
alias bench-property="bun run @bench/property"
alias bench-stress="bun run @bench/stress"

# Registry Management
alias registry-verify="bun run @dev/registry verify-ownership"
alias registry-health="curl https://npm.internal.yourcompany.com/-/ping"

# Quick navigation
alias cd-sports="cd packages/@graph/layer4"
alias cd-markets="cd packages/@graph/layer2"
alias cd-platform="cd packages/@graph/algorithms"
alias cd-bench="cd packages/@bench"
alias cd-sports-mini="cd apps/@mini/sports-correlation"
alias cd-markets-mini="cd apps/@mini/market-analytics"
alias cd-platform-mini="cd apps/@mini/platform-tools"

# Test Management
alias test-list="bun run test:list"
alias test-stats="bun run test:stats"
alias test-show="bun run test:show"
alias test-compare="bun run test:compare"
alias test-clean="bun run test:clean"

echo "✅ Team aliases loaded!"
echo ""
echo "Sports Team:    sports, sports-install, sports-dev, sports-test, sports-bench, sports-pub, sports-mini"
echo "Markets Team:   markets, markets-install, markets-dev, markets-test, markets-bench, markets-pub, markets-mini"
echo "Platform Team:  platform, platform-install, platform-dev, platform-test, platform-bench, platform-pub, platform-mini"
echo "Benchmarking:   bench-all, bench-l4, bench-l3, bench-l2, bench-l1"
echo "Test Management: test-list, test-stats, test-show, test-compare, test-clean"
echo "Registry:       registry-verify, registry-health"
echo "Mini-Apps:      sports-mini, markets-mini, platform-mini"
echo ""
echo "💡 Tip: Use 'bun --filter' for parallel execution across packages"
echo "💡 Tip: Use 'bun run test:*' for test management commands"
