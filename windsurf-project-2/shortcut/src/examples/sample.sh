
#!/usr/bin/env bun
# Bun Shell script loader

echo "🚀 Running Bun Shell script!"
echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

# Bun Shell supports modern shell features
for file in *.js; do
  echo "Processing: $file"
done

echo "✅ Shell script completed!"
