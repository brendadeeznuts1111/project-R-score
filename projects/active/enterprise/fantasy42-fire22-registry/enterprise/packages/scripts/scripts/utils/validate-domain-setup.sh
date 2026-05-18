#!/bin/bash

# Domain Validation Script for docs.apexodds.net
# Verifies DNS, SSL, and Cloudflare Pages setup

set -e

DOMAIN="docs.apexodds.net"
PAGES_DOMAIN="crystal-clear-architecture.pages.dev"

echo "🔍 Crystal Clear Architecture - Domain Validation"
echo "=================================================="
echo ""

# Function to check command availability
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "⚠️  $1 not found. Some checks will be skipped."
        return 1
    fi
    return 0
}

# Check 1: DNS Resolution
echo "📋 Check 1: DNS Resolution"
echo "=========================="

if check_command dig; then
    echo "🔍 Checking DNS resolution for $DOMAIN..."
    DNS_RESULT=$(dig +short "$DOMAIN" 2>/dev/null)

    if [ -n "$DNS_RESULT" ]; then
        echo "✅ DNS Resolution: $DNS_RESULT"
    else
        echo "❌ DNS Resolution: Failed"
        echo "   Domain may not be configured yet"
    fi
else
    echo "🔍 Using nslookup for DNS check..."
    if nslookup "$DOMAIN" >/dev/null 2>&1; then
        echo "✅ DNS Resolution: OK"
    else
        echo "❌ DNS Resolution: Failed"
    fi
fi

echo ""

# Check 2: CNAME Record
echo "📋 Check 2: CNAME Record"
echo "========================"

if check_command dig; then
    echo "🔍 Checking CNAME record..."
    CNAME_RESULT=$(dig CNAME "$DOMAIN" +short 2>/dev/null)

    if [ -n "$CNAME_RESULT" ]; then
        echo "✅ CNAME Record: $CNAME_RESULT"
        if [[ "$CNAME_RESULT" == *"$PAGES_DOMAIN"* ]]; then
            echo "✅ CNAME Target: Correctly points to Pages domain"
        else
            echo "⚠️  CNAME Target: Points to $CNAME_RESULT (should be $PAGES_DOMAIN)"
        fi
    else
        echo "❌ CNAME Record: Not found"
        echo "   Check if DNS record is properly configured"
    fi
fi

echo ""

# Check 3: HTTP Connectivity
echo "📋 Check 3: HTTP Connectivity"
echo "============================"

echo "🔍 Testing HTTP connection to $DOMAIN..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/" 2>/dev/null)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTP Status: 200 OK"
elif [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "⚠️  HTTP Status: $HTTP_STATUS (Redirect)"
    REDIRECT_URL=$(curl -s -I "https://$DOMAIN/" | grep -i location | cut -d' ' -f2 | tr -d '\r\n')
    echo "   Redirects to: $REDIRECT_URL"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo "❌ HTTP Status: Connection failed"
    echo "   Domain may not be configured or DNS not propagated"
else
    echo "⚠️  HTTP Status: $HTTP_STATUS"
fi

echo ""

# Check 4: SSL Certificate
echo "📋 Check 4: SSL Certificate"
echo "==========================="

if check_command openssl; then
    echo "🔍 Checking SSL certificate..."
    SSL_CHECK=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ -n "$SSL_CHECK" ]; then
        echo "✅ SSL Certificate: Valid"
        echo "   Certificate details:"
        echo "$SSL_CHECK" | head -2
    else
        echo "❌ SSL Certificate: Not found or invalid"
        echo "   Certificate may still be provisioning"
    fi
else
    echo "🔍 Testing SSL via curl..."
    SSL_TEST=$(curl -s -I "https://$DOMAIN/" | grep -i "server\|cf-ray")

    if [ -n "$SSL_TEST" ]; then
        echo "✅ SSL Connection: Established"
    else
        echo "❌ SSL Connection: Failed"
    fi
fi

echo ""

# Check 5: Cloudflare Pages Health
echo "📋 Check 5: Cloudflare Pages Health"
echo "==================================="

echo "🔍 Testing API health endpoint..."
HEALTH_RESPONSE=$(curl -s "https://$DOMAIN/api/health" 2>/dev/null)

if [ -n "$HEALTH_RESPONSE" ]; then
    # Check if response contains expected fields
    if echo "$HEALTH_RESPONSE" | grep -q "status.*healthy"; then
        echo "✅ API Health: Service is healthy"
        # Extract and display key information
        SERVICE=$(echo "$HEALTH_RESPONSE" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
        VERSION=$(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        echo "   Service: $SERVICE"
        echo "   Version: $VERSION"
    else
        echo "⚠️  API Health: Unexpected response"
        echo "   Response: $HEALTH_RESPONSE"
    fi
else
    echo "❌ API Health: No response"
    echo "   API endpoint may not be configured"
fi

echo ""

# Check 6: Cloudflare Headers
echo "📋 Check 6: Cloudflare Headers"
echo "=============================="

echo "🔍 Checking Cloudflare-specific headers..."
CF_HEADERS=$(curl -s -I "https://$DOMAIN/" | grep -i "cf-\|server")

if [ -n "$CF_HEADERS" ]; then
    echo "✅ Cloudflare Headers: Present"
    echo "$CF_HEADERS" | while read -r line; do
        echo "   $line"
    done
else
    echo "⚠️  Cloudflare Headers: Not found"
    echo "   May indicate traffic is not going through Cloudflare"
fi

echo ""

# Summary and Recommendations
echo "📋 Validation Summary"
echo "====================="
echo ""

ISSUES_FOUND=0

# Check DNS
if ! dig +short "$DOMAIN" >/dev/null 2>&1 && ! nslookup "$DOMAIN" >/dev/null 2>&1; then
    echo "❌ DNS: Not resolving"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check HTTP
if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "301" ] && [ "$HTTP_STATUS" != "302" ]; then
    echo "❌ HTTP: Not responding correctly"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check SSL
if ! echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" >/dev/null 2>&1; then
    echo "❌ SSL: Certificate issues"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "🎉 All checks passed! Custom domain setup is working correctly."
    echo ""
    echo "🌐 Your site is live at: https://$DOMAIN"
    echo "🩺 Health check: https://$DOMAIN/api/health"
else
    echo "⚠️  Found $ISSUES_FOUND issue(s) that need attention."
    echo ""
    echo "🔧 Recommended actions:"
    if [ "$HTTP_STATUS" = "000" ]; then
        echo "   1. Check DNS records in Cloudflare dashboard"
        echo "   2. Ensure DNS record is proxied (orange cloud)"
        echo "   3. Wait for DNS propagation (5-10 minutes)"
    fi
    if ! echo | openssl s_client -connect "$DOMAIN:443" >/dev/null 2>&1; then
        echo "   1. Check SSL certificate status in Cloudflare dashboard"
        echo "   2. Wait for SSL certificate provisioning (up to 24 hours)"
    fi
fi

echo ""
echo "🔗 Useful links:"
echo "   Cloudflare Dashboard: https://dash.cloudflare.com/5e5d2b2fa037e9924a50619c08f442/apexodds.net"
echo "   Pages Project: crystal-clear-architecture"
echo "   Custom Domain: docs.apexodds.net"
