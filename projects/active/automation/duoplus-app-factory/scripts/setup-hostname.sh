#!/bin/bash
# Setup custom hostname for Nebula-Flow™ API Dashboard

echo "🔧 Setting up custom hostname for Nebula-Flow™..."

# Check if nebula.local is already in /etc/hosts
if grep -q "nebula.local" /etc/hosts; then
    echo "✅ nebula.local already configured in /etc/hosts"
else
    echo "📝 Adding nebula.local to /etc/hosts..."
    echo "127.0.0.1 nebula.local" | sudo tee -a /etc/hosts > /dev/null
    echo "✅ Added nebula.local to /etc/hosts"
fi

# Also add api.duoplus.local for API endpoints
if grep -q "api.duoplus.local" /etc/hosts; then
    echo "✅ api.duoplus.local already configured in /etc/hosts"
else
    echo "📝 Adding api.duoplus.local to /etc/hosts..."
    echo "127.0.0.1 api.duoplus.local" | sudo tee -a /etc/hosts > /dev/null
    echo "✅ Added api.duoplus.local to /etc/hosts"
fi

# Verify the entries
echo ""
echo "📋 Current hostname entries:"
grep -E "nebula.local|api.duoplus.local" /etc/hosts

echo ""
echo "✨ Setup complete!"
echo ""
echo "🚀 You can now access the dashboard at:"
echo "   http://nebula.local:3000"
echo ""
echo "📝 To start the server, run:"
echo "   bun web-app/server.js"

