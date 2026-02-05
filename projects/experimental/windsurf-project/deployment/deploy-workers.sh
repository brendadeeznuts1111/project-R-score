#!/bin/bash
# DEPLOYMENT SCRIPT USING BUNX

DOMAIN="apple.factory-wager.com"

echo "🚀 Deploying Apple ID Dashboards with bunx..."
echo "🌐 Domain: $DOMAIN"
echo ""

# Check if wrangler is available via bunx
echo "📦 Checking bunx wrangler..."
if ! bunx wrangler --version > /dev/null 2>&1; then
    echo "❌ bunx wrangler not found. Installing..."
    bunx wrangler --version
fi

echo "✅ bunx wrangler available"
echo ""

# Create worker directory structure
echo "📁 Creating worker directory structure..."
mkdir -p workers/src
echo "✅ Created workers/src directory"

# Copy worker files
echo "📝 Copying worker files..."
cp cloudflare-worker.js workers/src/index.js
cp analytics-router.js workers/src/
cp metrics-router.js workers/src/
cp status-router.js workers/src/
cp admin-router.js workers/src/
cp wrangler.toml workers/
echo "✅ Worker files copied"

# Navigate to worker directory
cd workers

# Login to Cloudflare (if needed)
echo "🔐 Checking Cloudflare authentication..."
if ! bunx wrangler whoami > /dev/null 2>&1; then
    echo "🔑 Please login to Cloudflare:"
    bunx wrangler login
fi

# Deploy to staging first
echo "🧪 Deploying to staging..."
bunx wrangler deploy --env staging

if [ $? -eq 0 ]; then
    echo "✅ Staging deployment successful"
    
    # Test staging deployment
    echo "🧪 Testing staging deployment..."
    curl -s "https://staging.$DOMAIN/api/health" | jq .
    
    echo ""
    read -p "Deploy to production? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to production..."
        bunx wrangler deploy --env production
        
        if [ $? -eq 0 ]; then
            echo "✅ Production deployment successful!"
            echo ""
            echo "🌐 Your dashboards are now live at:"
            echo "   📊 Analytics: https://$DOMAIN/analytics"
            echo "   📈 Metrics:   https://$DOMAIN/metrics"
            echo "   ⚙️ Dashboard: https://$DOMAIN/dashboard"
            echo "   📋 Status:    https://$DOMAIN/status"
            echo "   👑 Admin:     https://$DOMAIN/admin"
            echo ""
            echo "🔗 API Endpoints:"
            echo "   🏥 Health:  https://$DOMAIN/api/health"
            echo "   📊 Data:    https://$DOMAIN/api/analytics"
            echo "   📈 Metrics: https://$DOMAIN/api/metrics"
        else
            echo "❌ Production deployment failed"
            exit 1
        fi
    else
        echo "🚫 Production deployment cancelled"
    fi
else
    echo "❌ Staging deployment failed"
    exit 1
fi

cd ..
echo ""
echo "🎉 Deployment process completed!"
