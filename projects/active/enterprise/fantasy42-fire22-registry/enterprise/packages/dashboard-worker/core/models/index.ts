/**
 * Core Models Module
 * Data models and type definitions
 */

// User model
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// API Response model
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}
