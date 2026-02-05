/**
 * User Service
 * Handles user-related business logic
 */

import { BaseService } from './base-service';
import { DatabaseService } from './database-service';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateUserData {
  email: string;
  name: string;
  role?: 'admin' | 'user' | 'moderator';
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'admin' | 'user' | 'moderator';
  isActive?: boolean;
}

export class UserService extends BaseService {
  private db: DatabaseService;

  constructor(dbService: DatabaseService) {
    super('UserService');
    this.db = dbService;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    console.log('User service initialized successfully');
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    // Validate input
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required');
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user data
    const now = new Date();
    const user: Omit<User, 'id'> = {
      email: userData.email,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    // Insert into database
    const userId = await this.db.insert('users', user);

    return {
      id: userId.toString(),
      ...user,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.db.findById('users', id);
    return user ? this.mapDbUserToUser(user) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users.length > 0 ? this.mapDbUserToUser(users[0]) : null;
  }

  /**
   * Get all users with pagination
   */
  async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    const users = await this.db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, offset]);
    return users.map(this.mapDbUserToUser);
  }

  /**
   * Update user
   */
  async updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      return null;
    }

    // Prepare update data
    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    // Update in database
    await this.db.update('users', id, updatePayload);

    // Return updated user
    return await this.findById(id);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: string): Promise<boolean> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      return false;
    }

    return await this.db.update('users', id, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Get users by role
   */
  async findByRole(role: string, limit: number = 50): Promise<User[]> {
    const users = await this.db.query(
      'SELECT * FROM users WHERE role = ? AND isActive = true LIMIT ?',
      [role, limit]
    );
    return users.map(this.mapDbUserToUser);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    byRole: Record<string, number>;
  }> {
    const [totalResult, activeResult, roleStats] = await Promise.all([
      this.db.query('SELECT COUNT(*) as count FROM users'),
      this.db.query('SELECT COUNT(*) as count FROM users WHERE isActive = true'),
      this.db.query(
        'SELECT role, COUNT(*) as count FROM users WHERE isActive = true GROUP BY role'
      ),
    ]);

    const byRole: Record<string, number> = {};
    roleStats.forEach((stat: any) => {
      byRole[stat.role] = stat.count;
    });

    return {
      total: totalResult[0]?.count || 0,
      active: activeResult[0]?.count || 0,
      byRole,
    };
  }

  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      createdAt: new Date(dbUser.createdAt),
      updatedAt: new Date(dbUser.updatedAt),
      isActive: Boolean(dbUser.isActive),
    };
  }
}
