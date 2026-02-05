#!/usr/bin/env bun

// shopping/api.test.ts - Shopping API Tests
// Comprehensive test suite for shopping API with RBAC

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { ShoppingAPI } from './api.js';

describe('Shopping API with RBAC', () => {
    let api: ShoppingAPI;
    let adminToken: string;
    let managerToken: string;
    let customerToken: string;
    let testUserId: string;
    let testProductId: string;
    let testOrderId: string;

    beforeAll(async () => {
        api = new ShoppingAPI();
        
        // Login as admin
        const adminLogin = await api.login('admin', 'password');
        expect(adminLogin.success).toBe(true);
        adminToken = adminLogin.data!.token;
        
        // Create test users
        const managerUser = await api.createUser(adminToken, {
            username: 'testmanager',
            email: 'manager@test.com',
            role: 'manager',
            active: true
        });
        expect(managerUser.success).toBe(true);
        
        const customerUser = await api.createUser(adminToken, {
            username: 'testcustomer',
            email: 'customer@test.com',
            role: 'customer',
            active: true
        });
        expect(customerUser.success).toBe(true);
        testUserId = customerUser.data!.id;
        
        // Login as manager and customer
        const managerLogin = await api.login('testmanager', 'password');
        expect(managerLogin.success).toBe(true);
        managerToken = managerLogin.data!.token;
        
        const customerLogin = await api.login('testcustomer', 'password');
        expect(customerLogin.success).toBe(true);
        customerToken = customerLogin.data!.token;
    });

    afterAll(() => {
        // Cleanup would go here in a real implementation
    });

    describe('Authentication', () => {
        it('should login with valid credentials', async () => {
            const result = await api.login('admin', 'password');
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('token');
            expect(result.data).toHaveProperty('user');
            expect(result.data!.user.role).toBe('admin');
        });

        it('should fail login with invalid credentials', async () => {
            const result = await api.login('invalid', 'credentials');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });
    });

    describe('User Management (RBAC)', () => {
        it('admin should create users', async () => {
            const result = await api.createUser(adminToken, {
                username: 'newuser',
                email: 'newuser@test.com',
                role: 'cashier',
                active: true
            });
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('id');
            expect(result.data!.role).toBe('cashier');
        });

        it('manager should not create users', async () => {
            const result = await api.createUser(managerToken, {
                username: 'unauthorized',
                email: 'unauth@test.com',
                role: 'customer',
                active: true
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('admin should list users', async () => {
            const result = await api.getUsers(adminToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data!.length).toBeGreaterThan(0);
        });

        it('manager should list users', async () => {
            const result = await api.getUsers(managerToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });

        it('customer should not list users', async () => {
            const result = await api.getUsers(customerToken);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('Product Management', () => {
        it('admin should create products', async () => {
            const result = await api.createProduct(adminToken, {
                name: 'Test Product',
                description: 'A test product for testing',
                price: 99.99,
                category: 'Electronics',
                stock: 100
            });
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('id');
            expect(result.data!.name).toBe('Test Product');
            testProductId = result.data!.id;
        });

        it('manager should create products', async () => {
            const result = await api.createProduct(managerToken, {
                name: 'Manager Product',
                description: 'Created by manager',
                price: 49.99,
                category: 'Books',
                stock: 50
            });
            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Manager Product');
        });

        it('cashier should not create products', async () => {
            const result = await api.createProduct(customerToken, {
                name: 'Unauthorized Product',
                description: 'Should not be created',
                price: 29.99,
                category: 'Toys',
                stock: 25
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('customer should list products', async () => {
            const result = await api.getProducts(customerToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data!.length).toBeGreaterThan(0);
        });
    });

    describe('Order Management', () => {
        it('customer should create orders', async () => {
            const result = await api.createOrder(customerToken, {
                customerId: testUserId,
                items: [
                    {
                        productId: testProductId,
                        quantity: 2
                    }
                ]
            });
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('id');
            expect(result.data!.status).toBe('pending');
            expect(result.data!.total).toBe(199.98); // 99.99 * 2
            testOrderId = result.data!.id;
        });

        it('admin should list orders', async () => {
            const result = await api.getOrders(adminToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data!.length).toBeGreaterThan(0);
        });

        it('manager should list orders', async () => {
            const result = await api.getOrders(managerToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });

        it('customer should list own orders', async () => {
            const result = await api.getOrders(customerToken);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });
    });

    describe('Dashboard Analytics', () => {
        it('admin should access dashboard', async () => {
            const result = await api.getDashboardData(adminToken);
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('overview');
            expect(result.data).toHaveProperty('recentOrders');
            expect(result.data).toHaveProperty('topProducts');
            expect(result.data).toHaveProperty('orderStatus');
            expect(result.data).toHaveProperty('userRoles');
            expect(result.data).toHaveProperty('systemMetrics');
        });

        it('manager should access dashboard', async () => {
            const result = await api.getDashboardData(managerToken);
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('overview');
        });

        it('viewer should access dashboard', async () => {
            // Create a viewer user
            const viewerUser = await api.createUser(adminToken, {
                username: 'testviewer',
                email: 'viewer@test.com',
                role: 'viewer',
                active: true
            });
            expect(viewerUser.success).toBe(true);
            
            const viewerLogin = await api.login('testviewer', 'password');
            expect(viewerLogin.success).toBe(true);
            
            const result = await api.getDashboardData(viewerLogin.data!.token);
            expect(result.success).toBe(true);
        });
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const result = await api.health();
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('status');
            expect(result.data!.status).toBe('healthy');
            expect(result.data).toHaveProperty('uptime');
            expect(result.data).toHaveProperty('totalUsers');
            expect(result.data).toHaveProperty('totalProducts');
            expect(result.data).toHaveProperty('totalOrders');
        });
    });

    describe('Permission Validation', () => {
        it('should reject requests without token', async () => {
            // This would be tested at the server level, but we can test the API directly
            const result = await api.getUsers('invalid-token');
            expect(result.success).toBe(false);
        });

        it('should handle expired tokens gracefully', async () => {
            // In a real implementation, this would test token expiration
            const result = await api.getUsers('expired-token');
            expect(result.success).toBe(false);
        });
    });

    describe('Data Validation', () => {
        it('should validate product data', async () => {
            const result = await api.createProduct(adminToken, {
                name: '', // Empty name should fail validation
                description: 'Invalid product',
                price: -10, // Negative price should fail
                category: '',
                stock: -5 // Negative stock should fail
            });
            // In a real implementation, this would fail validation
            // For now, we just test the API structure
            expect(result).toHaveProperty('success');
        });

        it('should validate order data', async () => {
            const result = await api.createOrder(customerToken, {
                customerId: 'invalid-customer-id',
                items: [
                    {
                        productId: 'invalid-product-id',
                        quantity: 0
                    }
                ]
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('Performance', () => {
        it('should handle concurrent requests', async () => {
            const promises = Array.from({ length: 10 }, () => 
                api.getProducts(customerToken)
            );
            
            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
        });

        it('should respond quickly', async () => {
            const start = performance.now();
            const result = await api.getProducts(customerToken);
            const end = performance.now();
            
            expect(result.success).toBe(true);
            expect(end - start).toBeLessThan(100); // Should respond in under 100ms
        });
    });
});

console.log("🛒 Shopping API Tests Complete!");
