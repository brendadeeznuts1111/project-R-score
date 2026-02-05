#!/bin/bash
# Maintainer Workflow Helper Script
# Wrapper around maintainer-workflow.ts for easier CLI usage

set -e

PACKAGE=""
PROPERTY=""
VALUES=""
WORKFLOW="property"
REVIEWER=""
REGISTRY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--package=*)
			PACKAGE="${1#*=}"
			shift
			;;
		--property=*)
			PROPERTY="${1#*=}"
			shift
			;;
		--values=*)
			VALUES="${1#*=}"
			shift
			;;
		--workflow=*)
			WORKFLOW="${1#*=}"
			shift
			;;
		--reviewer=*)
			REVIEWER="${1#*=}"
			shift
			;;
		--registry=*)
			REGISTRY="${1#*=}"
			shift
			;;
		*)
			echo "Unknown option: $1"
			exit 1
			;;
	esac
done

# Build command
CMD="bun run scripts/maintainer-workflow.ts --package=$PACKAGE --workflow=$WORKFLOW"

if [ -n "$PROPERTY" ]; then
	CMD="$CMD --property=$PROPERTY"
fi

if [ -n "$VALUES" ]; then
	CMD="$CMD --values=$VALUES"
fi

if [ -n "$REVIEWER" ]; then
	CMD="$CMD --reviewer=$REVIEWER"
fi

if [ -n "$REGISTRY" ]; then
	CMD="$CMD --registry=$REGISTRY"
fi

# Execute
exec $CMD
