#!/bin/bash
# [BUN][SCRIPT][ONBOARD][META:SETUP][PROJECT][#REF:new-project]
# Initialize new project with metadata enforcement hooks

PROJECT_NAME=$1
PROJECT_PATH="/Users/nolarose/Projects/$PROJECT_NAME"

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: new-project.sh <project-name>"
  exit 1
fi

mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

if [ ! -d ".git" ]; then
  git init -q
fi

git config core.hooksPath /Users/nolarose/Projects/.husky

cat <<EOF
✓ $PROJECT_NAME initialized
✓ Hooks: /Users/nolarose/Projects/.husky

Enforcement:
  [CACHE] changes → require *.test.ts (blocks)
  [PERF][PARALLEL] → reminder to check --metrics
  [BUN][API] → warning if no tests

Tag your code:
  // [DOMAIN][SCOPE][TYPE][META:prop][CLASS][#REF:id]
EOF
