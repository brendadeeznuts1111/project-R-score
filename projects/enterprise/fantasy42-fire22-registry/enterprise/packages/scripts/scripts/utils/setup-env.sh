#!/bin/bash

# =============================================================================
# 🔥 FIRE22 DASHBOARD WORKER - ENVIRONMENT SETUP SCRIPT
# =============================================================================

echo "🚀 Setting up Fire22 Dashboard Worker environment..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    echo "📝 Current .env file:"
    cat .env
    echo ""
    read -p "❓ Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Keeping existing .env file."
        exit 1
    fi
fi

# Copy template to .env
echo "📋 Creating .env file from template..."
cp env-template.txt .env

# Make .env file readable only by owner
chmod 600 .env

echo "✅ .env file created successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Replace all 'your_*_here' values"
echo "3. Run: bun run env:validate (if available)"
echo "4. Start your system: bun run dev"
echo ""
echo "📖 Required variables to set:"
echo "   - JWT_SECRET (generate a strong random string)"
echo "   - ADMIN_PASSWORD (set your admin password)"
echo "   - STRIPE_SECRET_KEY (from Stripe dashboard)"
echo "   - STRIPE_WEBHOOK_SECRET (from Stripe webhooks)"
echo "   - SENDGRID_API_KEY (from SendGrid dashboard)"
echo "   - TWILIO_ACCOUNT_SID (from Twilio console)"
echo "   - TWILIO_AUTH_TOKEN (from Twilio console)"
echo "   - CRON_SECRET (generate a strong random string)"
echo ""
echo "🔐 For production, use: wrangler secret put VARIABLE_NAME"
echo "🌍 For local development, edit .env file directly"
