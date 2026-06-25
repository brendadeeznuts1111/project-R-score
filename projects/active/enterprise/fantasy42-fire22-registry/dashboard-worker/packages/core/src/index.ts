/**
 * @fire22/core - Essential functionality for Fire22 Dashboard
 */

export * from './types';
export * from './config';
export * from './constants';

// Core version
export const VERSION = '1.0.0';

// Core utilities
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Core configuration
export const config = {
  apiUrl: process.env.FIRE22_API_URL || 'https://api.fire22.com',
  environment: process.env.NODE_ENV || 'development',
  version: VERSION,
};
