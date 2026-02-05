#!/usr/bin/env bun

// shopping/server.ts - Shopping API Server with RBAC
// RESTful API server for shopping platform with role-based access control

import { ShoppingAPI } from './api.js';
import { serve } from 'bun';

console.log("🛒 Shopping API Server with RBAC - Starting...");

const shoppingAPI = new ShoppingAPI();
const PORT = 3005;
const HOST = 'localhost'; // Server hostname
const ENTERPRISE_HOST = 'api.factory-wager.com'; // Enterprise branding

// CORS middleware
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

// Request handler
async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Health check
        if (path === '/health' && method === 'GET') {
            const result = await shoppingAPI.health();
            return jsonResponse(result, corsHeaders);
        }

        // Authentication endpoints
        if (path === '/auth/login' && method === 'POST') {
            const body = await request.json();
            const result = await shoppingAPI.login(body.username, body.password);
            return jsonResponse(result, corsHeaders);
        }

        // Protected endpoints - require authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse({
                success: false,
                error: 'Authentication required',
                timestamp: new Date().toISOString(),
                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }, corsHeaders, 401);
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // User Management
        if (path === '/users' && method === 'GET') {
            const result = await shoppingAPI.getUsers(token);
            return jsonResponse(result, corsHeaders);
        }

        if (path === '/users' && method === 'POST') {
            const body = await request.json();
            const result = await shoppingAPI.createUser(token, body);
            return jsonResponse(result, corsHeaders);
        }

        // Product Management
        if (path === '/products' && method === 'GET') {
            const result = await shoppingAPI.getProducts(token);
            return jsonResponse(result, corsHeaders);
        }

        if (path === '/products' && method === 'POST') {
            const body = await request.json();
            const result = await shoppingAPI.createProduct(token, body);
            return jsonResponse(result, corsHeaders);
        }

        // Order Management
        if (path === '/orders' && method === 'GET') {
            const result = await shoppingAPI.getOrders(token);
            return jsonResponse(result, corsHeaders);
        }

        if (path === '/orders' && method === 'POST') {
            const body = await request.json();
            const result = await shoppingAPI.createOrder(token, body);
            return jsonResponse(result, corsHeaders);
        }

        // Dashboard Analytics
        if (path === '/dashboard' && method === 'GET') {
            const result = await shoppingAPI.getDashboardData(token);
            return jsonResponse(result, corsHeaders);
        }

        // Serve dashboard HTML
        if (path === '/' || path === '/dashboard') {
            const dashboardHtml = await Bun.file('./shopping/dashboard.html').text();
            return new Response(dashboardHtml, {
                headers: {
                    'Content-Type': 'text/html',
                    ...corsHeaders
                }
            });
        }

        // 404 - Not Found
        return jsonResponse({
            success: false,
            error: 'Endpoint not found',
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }, corsHeaders, 404);

    } catch (error) {
        console.error('Request handling error:', error);
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }, corsHeaders, 500);
    }
}

// JSON response helper
function jsonResponse(data: any, headers: Record<string, string> = {}, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
}

// Start server
console.log(`🚀 Shopping API Server starting on ${HOST}:${PORT}`);
console.log(`📊 Local Dashboard: http://${HOST}:${PORT}/dashboard`);
console.log(`🔗 Local API: http://${HOST}:${PORT}/api/shopping`);
console.log(`🌐 Enterprise URLs (configure hosts):`);
console.log(`   Dashboard: http://${ENTERPRISE_HOST}:${PORT}/dashboard`);
console.log(`   API: http://${ENTERPRISE_HOST}:${PORT}/api/shopping`);
console.log(`👤 Default login: username: admin, password: any (demo mode)`);
console.log(`🏷️  Enterprise branding: ${ENTERPRISE_HOST}`);

const server = serve({
    port: PORT,
    fetch: handleRequest,
    hostname: HOST
});

console.log("✅ Shopping API Server with RBAC is running!");
console.log("\n🎯 Available Endpoints:");
console.log("  POST /auth/login - User authentication");
console.log("  GET  /users - List users (admin/manager only)");
console.log("  POST /users - Create user (admin only)");
console.log("  GET  /products - List products");
console.log("  POST /products - Create product (admin/manager only)");
console.log("  GET  /orders - List orders");
console.log("  POST /orders - Create order");
console.log("  GET  /dashboard - Dashboard analytics (authenticated users)");
console.log("  GET  /health - System health check");
console.log("\n🔐 Role-Based Access Control:");
console.log("  Admin: Full access to all resources");
console.log("  Manager: Products, orders, analytics, read users");
console.log("  Cashier: Read products, create/read/update orders");
console.log("  Customer: Read products, create/read own orders");
console.log("  Viewer: Read products and analytics only");

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Shopping API Server...');
    server.stop();
    console.log('✅ Server stopped gracefully');
    process.exit(0);
});

export { server, handleRequest };
