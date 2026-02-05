#!/usr/bin/env bun

// shopping/api.ts - Shopping API with RBAC and Dashboard
// Enterprise-grade shopping platform with role-based access control

console.log("🛒 Shopping API with RBAC - Starting");

// Role and Permission Types
export type Role = 'admin' | 'manager' | 'cashier' | 'customer' | 'viewer';

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  permissions: Permission[];
  createdAt: Date;
  lastLogin?: Date;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  fraudScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

// RBAC Configuration
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'orders', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'settings', actions: ['read', 'update'] }
  ],
  manager: [
    { resource: 'products', actions: ['create', 'read', 'update'] },
    { resource: 'orders', actions: ['read', 'update'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'users', actions: ['read'] }
  ],
  cashier: [
    { resource: 'products', actions: ['read'] },
    { resource: 'orders', actions: ['create', 'read', 'update'] }
  ],
  customer: [
    { resource: 'products', actions: ['read'] },
    { resource: 'orders', actions: ['create', 'read'] }
  ],
  viewer: [
    { resource: 'products', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] }
  ]
};

export class ShoppingAPI {
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private sessions: Map<string, { userId: string; expires: Date }> = new Map();
  private requestCount = 0;
  private startTime = Date.now();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Create default admin user
    const adminUser: User = {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@shop.com',
      role: 'admin',
      permissions: ROLE_PERMISSIONS.admin,
      createdAt: new Date(),
      active: true
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample products
    const sampleProducts: Product[] = [
      {
        id: 'prod-001',
        name: 'Premium Laptop',
        description: 'High-performance laptop for professionals',
        price: 1299.99,
        category: 'Electronics',
        stock: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id
      },
      {
        id: 'prod-002',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 29.99,
        category: 'Electronics',
        stock: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id
      }
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  // Authentication
  async login(username: string, password: string): Promise<APIResponse<{ token: string; user: User }>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const user = Array.from(this.users.values()).find(u => 
        u.username === username && u.active
      );

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          timestamp: new Date().toISOString(),
          requestId
        };
      }

      // Generate session token
      const token = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.sessions.set(token, {
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      user.lastLogin = new Date();

      return {
        success: true,
        data: { token, user },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // Authorization middleware
  private authorize(token: string, resource: string, action: string): User | null {
    const session = this.sessions.get(token);
    if (!session || session.expires < new Date()) {
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user || !user.active) {
      return null;
    }

    const hasPermission = user.permissions.some(permission =>
      permission.resource === resource && permission.actions.includes(action as any)
    );

    return hasPermission ? user : null;
  }

  // User Management (RBAC)
  async createUser(token: string, userData: Omit<User, 'id' | 'createdAt' | 'permissions'>): Promise<APIResponse<User>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'users', 'create');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...userData,
        permissions: ROLE_PERMISSIONS[userData.role],
        createdAt: new Date()
      };

      this.users.set(newUser.id, newUser);

      return {
        success: true,
        data: newUser,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  async getUsers(token: string): Promise<APIResponse<User[]>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'users', 'read');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const users = Array.from(this.users.values());
      return {
        success: true,
        data: users,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // Product Management
  async createProduct(token: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<APIResponse<Product>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'products', 'create');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: authUser.id
      };

      this.products.set(newProduct.id, newProduct);

      return {
        success: true,
        data: newProduct,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  async getProducts(token: string): Promise<APIResponse<Product[]>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'products', 'read');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const products = Array.from(this.products.values());
      return {
        success: true,
        data: products,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // Order Management
  async createOrder(token: string, orderData: { customerId: string; items: Array<{ productId: string; quantity: number }> }): Promise<APIResponse<Order>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'orders', 'create');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const item of orderData.items) {
        const product = this.products.get(item.productId);
        if (!product) {
          return {
            success: false,
            error: `Product ${item.productId} not found`,
            timestamp: new Date().toISOString(),
            requestId
          };
        }

        if (product.stock < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for product ${product.name}`,
            timestamp: new Date().toISOString(),
            requestId
          };
        }

        const itemTotal = product.price * item.quantity;
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal
        });

        total += itemTotal;
        product.stock -= item.quantity;
      }

      const newOrder: Order = {
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: orderData.customerId,
        items: orderItems,
        total,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.orders.set(newOrder.id, newOrder);

      return {
        success: true,
        data: newOrder,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  async getOrders(token: string): Promise<APIResponse<Order[]>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'orders', 'read');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const orders = Array.from(this.orders.values());
      return {
        success: true,
        data: orders,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // Analytics Dashboard
  async getDashboardData(token: string): Promise<APIResponse<any>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const authUser = this.authorize(token, 'analytics', 'read');
    if (!authUser) {
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    try {
      const orders = Array.from(this.orders.values());
      const products = Array.from(this.products.values());
      const users = Array.from(this.users.values());

      const dashboardData = {
        overview: {
          totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
          totalOrders: orders.length,
          totalProducts: products.length,
          totalUsers: users.length,
          activeUsers: users.filter(u => u.active).length
        },
        recentOrders: orders.slice(-10).reverse(),
        topProducts: products
          .sort((a, b) => b.stock - a.stock)
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            price: p.price,
            category: p.category
          })),
        orderStatus: {
          pending: orders.filter(o => o.status === 'pending').length,
          processing: orders.filter(o => o.status === 'processing').length,
          shipped: orders.filter(o => o.status === 'shipped').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length
        },
        userRoles: {
          admin: users.filter(u => u.role === 'admin').length,
          manager: users.filter(u => u.role === 'manager').length,
          cashier: users.filter(u => u.role === 'cashier').length,
          customer: users.filter(u => u.role === 'customer').length,
          viewer: users.filter(u => u.role === 'viewer').length
        },
        systemMetrics: {
          uptime: Date.now() - this.startTime,
          requestCount: this.requestCount,
          memoryUsage: process.memoryUsage()
        }
      };

      return {
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // Health check
  async health(): Promise<APIResponse<any>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();

      return {
        success: true,
        data: {
          status: 'healthy',
          uptime,
          memoryUsage,
          activeSessions: this.sessions.size,
          totalUsers: this.users.size,
          totalProducts: this.products.size,
          totalOrders: this.orders.size,
          requestCount: this.requestCount
        },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }
}
