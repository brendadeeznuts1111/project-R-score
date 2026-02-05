/**
 * Shared Contact Template Utilities
 * Common functions and utilities for contact templates
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';

// Contact-specific utility functions
export function generateContactMeta(employee: EmployeeData): string {
  return `
    <meta name="description" content="Contact ${employee.name}, ${employee.title} at Fire22" />
    <meta name="keywords" content="contact, ${employee.name}, ${employee.title}, Fire22" />
    <meta property="og:title" content="Contact ${employee.name}" />
    <meta property="og:description" content="Get in touch with ${employee.name}, ${employee.title} at Fire22" />
    <meta property="og:image" content="${employee.avatar || '/default-avatar.png'}" />
    <meta name="twitter:card" content="summary_large_image" />
  `;
}

export function validateContactForm(formData: FormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const subject = formData.get('subject')?.toString().trim();
  const message = formData.get('message')?.toString().trim();

  if (!name || name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!email || !email.includes('@')) {
    errors.push('Please provide a valid email address');
  }

  if (!subject || subject.length < 5) {
    errors.push('Subject must be at least 5 characters long');
  }

  if (!message || message.length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function formatContactResponse(employee: EmployeeData, formData: FormData): string {
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const subject = formData.get('subject')?.toString().trim();
  const message = formData.get('message')?.toString().trim();

  return `
    Subject: Contact Form - ${subject}

    From: ${name} <${email}>
    To: ${employee.name} <${employee.email}>

    Message:
    ${message}

    ---
    Sent via Fire22 Contact Form
    Timestamp: ${new Date().toISOString()}
  `;
}

// Export all contact-related utilities
export * from './contact-main';
