#!/bin/bash
# Package Tier-1380 OMEGA skill for distribution

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_NAME="tier1380-omega"
OUTPUT_DIR="${SKILL_DIR}/../.."

echo "📦 Packaging ${SKILL_NAME} skill..."

cd "${OUTPUT_DIR}"

# Create skill archive
zip -r "${SKILL_NAME}.skill" "${SKILL_NAME}/" \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "*node_modules*"

echo "✅ Skill packaged: ${OUTPUT_DIR}/${SKILL_NAME}.skill"
echo ""
echo "Install with:"
echo "  kimi --skills-dir ~/.config/agents/skills"
echo "  unzip ${SKILL_NAME}.skill -d ~/.config/agents/skills/"
