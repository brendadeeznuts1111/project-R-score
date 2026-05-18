/**
 * Authentication Controller
 *
 * Handles authentication operations for Fire22 dashboard
 */

import type { ValidatedRequest } from '../middleware/validate.middleware';
import { generateToken, generateRefreshToken } from '../middleware/auth.middleware';

/**
 * User login
 */
export async function login(request: ValidatedRequest): Promise<Response> {
  try {
    const { username, password } = request.validatedBody || (await request.json());

    // For now, mock authentication
    if (!username || !password) {
      return new Response(
        JSON.stringify({
          error: 'Missing credentials',
          message: 'Username and password are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Mock user data - replace with actual authentication
    const user = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username,
      role: 'manager', // Default role for demo
      permissions: ['manager.*', 'agent.view', 'customer.list'],
    };

    // Generate tokens
    const accessToken = await generateToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: 86400, // 24 hours
        },
      },
      message: 'Login successful',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Login failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * User logout
 */
export async function logout(request: ValidatedRequest): Promise<Response> {
  try {
    // For now, just return success
    const response = {
      success: true,
      message: 'Logout successful',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Logout failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Verify token
 */
export async function verify(request: ValidatedRequest): Promise<Response> {
  try {
    // If we reach this point, the token is valid (middleware validated it)
    const user = request.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          message: 'Token verification failed',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          role: user.role,
          level: user.level,
          permissions: user.permissions,
        },
        valid: true,
      },
      message: 'Token is valid',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Token verification failed',
        message: error.message,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Refresh access token
 */
export async function refresh(request: ValidatedRequest): Promise<Response> {
  try {
    const { refreshToken } = request.validatedBody || (await request.json());

    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          error: 'Missing refresh token',
          message: 'Refresh token is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // For now, mock the response
    const user = {
      id: 'user_123',
      role: 'manager',
      permissions: ['manager.*'],
    };

    const newAccessToken = await generateToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

    const response = {
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: 86400, // 24 hours
        },
      },
      message: 'Token refreshed successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Token refresh failed',
        message: error.message,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
