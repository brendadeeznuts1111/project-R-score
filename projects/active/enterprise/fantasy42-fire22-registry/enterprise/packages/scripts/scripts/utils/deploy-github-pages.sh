#!/bin/bash

# Crystal Clear Architecture - GitHub Pages Deployment Script
# This script helps deploy the project to GitHub Pages

echo "🏗️ Crystal Clear Architecture - GitHub Pages Deployment"
echo "======================================================="

# Check if we're in the right directory
if [ ! -f "crystal-clear-architecture/index.html" ]; then
    echo "❌ Error: crystal-clear-architecture/index.html not found!"
    echo "Please run this script from the repository root."
    exit 1
fi

# Create .nojekyll file to prevent Jekyll processing
echo "📝 Creating .nojekyll file..."
touch crystal-clear-architecture/.nojekyll

# Copy files to repository root for GitHub Pages
echo "📋 Copying files to repository root..."
cp -r crystal-clear-architecture/* ./

# Ensure we have an index.html in the root
if [ ! -f "index.html" ]; then
    echo "📄 Creating root index.html..."
    cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Crystal Clear Architecture...</title>
    <meta http-equiv="refresh" content="0; url=./crystal-clear-architecture/">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
        .container { max-width: 600px; padding: 2rem; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        p { font-size: 1.1rem; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ Crystal Clear Architecture</h1>
        <p>Redirecting to the main documentation...</p>
    </div>
    <script>setTimeout(()=>{window.location.href='./crystal-clear-architecture/'},1000);</script>
</body>
</html>
EOF
fi

echo "✅ Files prepared for GitHub Pages deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push these changes:"
echo "   git add ."
echo "   git commit -m 'Deploy to GitHub Pages'"
echo "   git push origin main"
echo ""
echo "2. Enable GitHub Pages in repository settings:"
echo "   - Go to Settings > Pages"
echo "   - Set source to 'Deploy from a branch'"
echo "   - Select 'main' branch and '/ (root)' folder"
echo ""
echo "3. Your site will be available at:"
echo "   https://brendadeeznuts1111.github.io/crystal-clear-architecture/"
echo ""
echo "🎉 Deployment preparation complete!"
