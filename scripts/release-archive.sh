#!/bin/bash
# Release Archive Script - Creates and validates release tarballs

set -e

VERSION="v4.4"
VERSION_PATCH="v4.4.1"
RELEASE_DIR="./releases"

echo "📦 Creating release archives..."

mkdir -p $RELEASE_DIR

# Create tarballs for v4.4 (base optimization stack)
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "  Creating ${VERSION} archives..."
  git archive --format=tar.gz --prefix=factorywager-${VERSION}/ ${VERSION} \
    > ${RELEASE_DIR}/factorywager-${VERSION}.tar.gz

  git archive --format=zip --prefix=factorywager-${VERSION}/ ${VERSION} \
    > ${RELEASE_DIR}/factorywager-${VERSION}.zip
else
  echo "  ⚠️  Tag ${VERSION} not found, skipping..."
fi

# Create tarballs for v4.4.1 (includes dotfiles + docs)
if git rev-parse "$VERSION_PATCH" >/dev/null 2>&1; then
  echo "  Creating ${VERSION_PATCH} archives..."
  git archive --format=tar.gz --prefix=factorywager-${VERSION_PATCH}/ ${VERSION_PATCH} \
    > ${RELEASE_DIR}/factorywager-${VERSION_PATCH}.tar.gz

  git archive --format=zip --prefix=factorywager-${VERSION_PATCH}/ ${VERSION_PATCH} \
    > ${RELEASE_DIR}/factorywager-${VERSION_PATCH}.zip
else
  echo "  ⚠️  Tag ${VERSION_PATCH} not found, using HEAD..."
  git archive --format=tar.gz --prefix=factorywager-${VERSION_PATCH}/ HEAD \
    > ${RELEASE_DIR}/factorywager-${VERSION_PATCH}.tar.gz

  git archive --format=zip --prefix=factorywager-${VERSION_PATCH}/ HEAD \
    > ${RELEASE_DIR}/factorywager-${VERSION_PATCH}.zip
fi

# Generate checksums
echo "🔐 Generating checksums..."
cd $RELEASE_DIR

# SHA-256
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum factorywager-*.tar.gz factorywager-*.zip > checksums.sha256 2>/dev/null || true
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 factorywager-*.tar.gz factorywager-*.zip > checksums.sha256 2>/dev/null || true
fi

# BLAKE3 (if available)
if command -v b3sum >/dev/null 2>&1; then
  b3sum factorywager-*.tar.gz factorywager-*.zip > checksums.blake3 2>/dev/null || true
fi

# Verify integrity
echo "✅ Verifying archive integrity..."
for archive in factorywager-*.tar.gz factorywager-*.zip; do
  if [ -f "$archive" ]; then
    if [[ "$archive" == *.tar.gz ]]; then
      if tar -tzf "$archive" >/dev/null 2>&1; then
        echo "  ✓ $archive: VALID"
      else
        echo "  ✗ $archive: CORRUPTED"
        exit 1
      fi
    elif [[ "$archive" == *.zip ]]; then
      if unzip -t "$archive" >/dev/null 2>&1; then
        echo "  ✓ $archive: VALID"
      else
        echo "  ✗ $archive: CORRUPTED"
        exit 1
      fi
    fi
  fi
done

# File sizes
echo "📊 Archive sizes:"
ls -lh factorywager-*.{tar.gz,zip} 2>/dev/null | awk '{print "  " $9 ": " $5}' || echo "  No archives found"

echo ""
echo "🎯 Release archives ready in ${RELEASE_DIR}/"
if [ -f checksums.sha256 ]; then
  echo "📋 Checksums: ${RELEASE_DIR}/checksums.sha256"
fi
