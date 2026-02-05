#!/bin/bash
# GitHub Actions CI/CD Pipeline
# Place in: .github/workflows/bundle-analysis.yml (or use this as reference)

name: Bundle Analysis & Health Check

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'package.json'
      - 'bunfig.toml'
  pull_request:
    branches: [main]

jobs:
  bundle-analysis:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Create metrics directory
        run: mkdir -p ./metrics

      - name: Run bundle analysis
        run: bun run scripts/analyze-bundle.ts

      - name: Compare with main branch
        if: github.event_name == 'pull_request'
        run: |
          # Save current metrics
          cp ./metrics/bundle-latest.json ./metrics/bundle-pr.json
          
          # Checkout main branch metrics
          git fetch origin main:main
          git show origin/main:metrics/bundle-latest.json > ./metrics/bundle-main.json || echo "No baseline metrics"
          
          # Analyze main
          git checkout main -- src/
          bun run scripts/analyze-bundle.ts || true
          cp ./metrics/bundle-latest.json ./metrics/bundle-baseline.json
          
          # Restore PR code
          git checkout - -- src/

      - name: Generate comparison report
        if: github.event_name == 'pull_request'
        run: bun run scripts/compare-bundles.ts

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('./metrics/comparison-report.md', 'utf-8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Fail if health below threshold
        run: |
          HEALTH=$(cat ./metrics/bundle-latest.json | jq '.summary.bundleHealth')
          if [ "$HEALTH" -lt 60 ]; then
            echo "❌ Bundle health $HEALTH is below threshold (60)"
            exit 1
          fi

      - name: Upload metrics artifact
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: bundle-metrics-${{ github.run_id }}
          path: ./metrics/

      - name: Archive metrics
        if: github.ref == 'refs/heads/main' && success()
        run: |
          cp ./metrics/bundle-latest.json ./metrics/bundle-previous.json
          git config user.name "Bundle Bot"
          git config user.email "bundle@duoplus.local"
          git add ./metrics/bundle-previous.json
          git commit -m "📊 Update bundle metrics" || true
          git push origin main || true
