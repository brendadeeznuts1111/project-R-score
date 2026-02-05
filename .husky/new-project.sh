#!/bin/bash
# [BUN][SCRIPT][ONBOARD][META:SETUP][PROJECT][#REF:new-project]
# Initialize new project with metadata enforcement hooks

PROJECT_NAME=$1
BUN_PLATFORM_HOME="${BUN_PLATFORM_HOME:-${HOME}/Projects}"
PROJECT_PATH="$BUN_PLATFORM_HOME/$PROJECT_NAME"
HOOKS_PATH="$BUN_PLATFORM_HOME/.husky"

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: new-project.sh <project-name>"
  echo "Note: Uses BUN_PLATFORM_HOME (default: $HOME/Projects)"
  exit 1
fi

mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

if [ ! -d ".git" ]; then
  git init -q
fi

git config core.hooksPath "$HOOKS_PATH"

cat <<EOF
✓ $PROJECT_NAME initialized
✓ Hooks: $HOOKS_PATH

Enforcement:
  [CACHE] changes → require *.test.ts (blocks)
  [PERF][PARALLEL] → reminder to check --metrics
  [BUN][API] → warning if no tests

Tag your code:
  // [DOMAIN][SCOPE][TYPE][META:prop][CLASS][#REF:id]
EOF
