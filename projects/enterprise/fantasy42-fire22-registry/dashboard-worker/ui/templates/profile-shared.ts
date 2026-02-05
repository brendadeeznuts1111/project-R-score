/**
 * Shared Profile Template Utilities
 * Common functions and utilities for profile templates
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';

// Profile-specific utility functions
export function formatEmployeeName(employee: EmployeeData): string {
  return employee.name || 'Unknown Employee';
}

export function formatEmployeeTitle(employee: EmployeeData): string {
  return employee.title || 'Team Member';
}

export function formatContactInfo(employee: EmployeeData): string {
  const parts = [];
  if (employee.email) parts.push(`<a href="mailto:${employee.email}">${employee.email}</a>`);
  if (employee.phone) parts.push(`<a href="tel:${employee.phone}">${employee.phone}</a>`);
  return parts.join(' • ');
}

export function getEmployeeInitials(employee: EmployeeData): string {
  if (!employee.name) return '??';
  const names = employee.name.split(' ');
  return names
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateProfileMeta(employee: EmployeeData): string {
  return `
    <meta name="description" content="${employee.bio || `${employee.name} - ${employee.title} at Fire22`}" />
    <meta name="keywords" content="Fire22, ${employee.department || 'team'}, ${employee.title || 'professional'}" />
    <meta property="og:title" content="${employee.name} - ${employee.title}" />
    <meta property="og:description" content="${employee.bio || `${employee.title} at Fire22`}" />
    <meta property="og:image" content="${employee.avatar || '/default-avatar.png'}" />
    <meta name="twitter:card" content="summary_large_image" />
  `;
}

// Export all profile-related utilities
export * from './profile-main';
