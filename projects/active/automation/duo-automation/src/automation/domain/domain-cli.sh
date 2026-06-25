#!/bin/bash
# DOMAIN-INTEGRATED CLI COMMANDS
# Access all dashboards via domain

DOMAIN="apple.factory-wager-registry.utahj4754.workers.dev"

echo "🌐 Apple ID System - Domain Integrated Access"
echo "=============================================="
echo "Domain: $DOMAIN"
echo ""

# Dashboard URLs
echo "📊 Dashboard URLs:"
echo "   Main Dashboard:    https://$DOMAIN/dashboard"
echo "   CashApp Analytics: https://$DOMAIN/analytics"
echo "   Live Metrics:      https://$DOMAIN/metrics"
echo "   Apple ID Grading:  https://$DOMAIN/apple-id"
echo "   System Utilities:  https://$DOMAIN/utilities"
echo "   Database Mgmt:     https://$DOMAIN/database"
echo "   Carrier Intel:     https://$DOMAIN/carriers"
echo "   Bucket Mgmt:       https://$DOMAIN/bucket"
echo "   Status Page:       https://$DOMAIN/status"
echo "   Admin Panel:       https://$DOMAIN/admin"
echo ""

# Quick commands
echo "⚡ Quick Commands:"
echo "   Main Dashboard:    ./domain-cli.sh dashboard"
echo "   CashApp Analytics: ./domain-cli.sh analytics"
echo "   Live Metrics:      ./domain-cli.sh metrics"
echo "   Apple ID Grading:  ./domain-cli.sh apple-id"
echo "   System Utilities:  ./domain-cli.sh utilities"
echo "   Database Mgmt:     ./domain-cli.sh database"
echo "   Carrier Intel:     ./domain-cli.sh carriers"
echo "   Bucket Mgmt:       ./domain-cli.sh bucket"
echo "   Status Page:       ./domain-cli.sh status"
echo "   Admin Panel:       ./domain-cli.sh admin"
echo "   Health Check:      ./domain-cli.sh health"
echo ""

# API endpoints
echo "🔗 API Endpoints:"
echo "   Health:  https://$DOMAIN/api/health"
echo "   All Dashboard APIs: https://$DOMAIN/api/* (proxied)"
echo ""

case "$1" in
    "dashboard")
        echo "🏠 Opening Main Dashboard..."
        open "https://$DOMAIN/dashboard"
        ;;
    "analytics")
        echo "💰 Opening CashApp Analytics Dashboard..."
        open "https://$DOMAIN/analytics"
        ;;
    "metrics")
        echo "📊 Opening Live Metrics Dashboard..."
        open "https://$DOMAIN/metrics"
        ;;
    "apple-id")
        echo "🍎 Opening Apple ID Grading Dashboard..."
        open "https://$DOMAIN/apple-id"
        ;;
    "utilities")
        echo "🛠️ Opening System Utilities Dashboard..."
        open "https://$DOMAIN/utilities"
        ;;
    "database")
        echo "🗄️ Opening Database Management Dashboard..."
        open "https://$DOMAIN/database"
        ;;
    "carriers")
        echo "📡 Opening Carrier Intelligence Dashboard..."
        open "https://$DOMAIN/carriers"
        ;;
    "bucket")
        echo "☁️ Opening Bucket Management Dashboard..."
        open "https://$DOMAIN/bucket"
        ;;
    "status")
        echo "📋 Opening Status Page..."
        open "https://$DOMAIN/status"
        ;;
    "admin")
        echo "👑 Opening Admin Panel..."
        open "https://$DOMAIN/admin"
        ;;
    "health")
        echo "🏥 Checking System Health..."
        curl -s "https://$DOMAIN/api/health" | jq .
        ;;
    *)
        echo "Usage: $0 [dashboard|analytics|metrics|apple-id|utilities|database|carriers|bucket|status|admin|health]"
        echo ""
        echo "Available commands:"
        echo "   dashboard  - Open main dashboard"
        echo "   analytics  - Open CashApp analytics dashboard"
        echo "   metrics    - Open live metrics dashboard"
        echo "   apple-id   - Open Apple ID grading dashboard"
        echo "   utilities  - Open system utilities dashboard"
        echo "   database   - Open database management dashboard"
        echo "   carriers   - Open carrier intelligence dashboard"
        echo "   bucket     - Open bucket management dashboard"
        echo "   status     - Open status page"
        echo "   admin      - Open admin panel"
        echo "   health     - Check system health"
        ;;
esac
