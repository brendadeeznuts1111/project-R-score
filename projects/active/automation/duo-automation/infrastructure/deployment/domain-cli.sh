#!/bin/bash
# DOMAIN-INTEGRATED CLI COMMANDS
# Access all dashboards via domain

DOMAIN="apple.factory-wager.com"

echo "🌐 Apple ID System - Domain Integrated Access"
echo "=============================================="
echo "Domain: $DOMAIN"
echo ""

# Dashboard URLs
echo "📊 Dashboard URLs:"
echo "   Analytics: https://$DOMAIN/analytics"
echo "   Metrics:   https://$DOMAIN/metrics"
echo "   Dashboard: https://$DOMAIN/dashboard"
echo "   Status:    https://$DOMAIN/status"
echo "   Admin:     https://$DOMAIN/admin"
echo ""

# Quick commands
echo "⚡ Quick Commands:"
echo "   Open Analytics: open https://$DOMAIN/analytics"
echo "   Open Metrics:   open https://$DOMAIN/metrics"
echo "   Open Status:    open https://$DOMAIN/status"
echo "   Health Check:   curl https://$DOMAIN/api/health"
echo ""

# API endpoints
echo "🔗 API Endpoints:"
echo "   Health:  https://$DOMAIN/api/health"
echo "   Analytics Data: https://$DOMAIN/api/analytics"
echo "   Metrics Data:   https://$DOMAIN/api/metrics"
echo ""

case "$1" in
    "analytics")
        echo "📊 Opening Analytics Dashboard..."
        open "https://$DOMAIN/analytics"
        ;;
    "metrics")
        echo "📈 Opening Metrics Dashboard..."
        open "https://$DOMAIN/metrics"
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
        echo "Usage: $0 [analytics|metrics|status|admin|health]"
        echo ""
        echo "Available commands:"
        echo "   analytics  - Open analytics dashboard"
        echo "   metrics    - Open metrics dashboard"
        echo "   status     - Open status page"
        echo "   admin      - Open admin panel"
        echo "   health     - Check system health"
        ;;
esac
