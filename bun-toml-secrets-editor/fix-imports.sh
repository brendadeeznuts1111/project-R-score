#!/bin/bash
echo "Fixing imports..."
find packages/core/src -name "*.ts" -type f | while read file; do
  sed -i "" "s|from \"../types/|from \"./types/|g" "$file"
  sed -i "" "s|from \"../../types/|from \"./types/|g" "$file"
done
for pkg in packages/rss packages/profiler packages/cli packages/dashboard packages/secrets-editor; do
  find "$pkg/src" -name "*.ts" -type f | while read file; do
    sed -i "" "s|from \"../../types/|from \"@bun-toml/core/types/|g" "$file"
  done
  echo "Fixed $pkg"
done
echo "Done"
