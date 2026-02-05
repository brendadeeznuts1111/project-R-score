/**
 * Dashboard page template
 */

import type { EmployeeData } from '../types';
import { CONFIG } from '../config';
import {
  generateHtmlHead,
  generateHeader,
  generateActionButtons,
  generateFooter,
  generateMetricGrid,
} from '../components';

export function generateDashboardPage(employee: EmployeeData): string {
  const quickActions = generateQuickActions(employee);
  const recentActivity = generateRecentActivity(employee);

  const html = `
    ${generateHtmlHead(
      `Dashboard - ${employee.name}`,
      `Executive dashboard and performance metrics for ${employee.title}`
    )}
    ${generateHeader(employee, '/dashboard')}
    <main class="dashboard-container">
      ${generateDashboardHero(employee)}
      ${quickActions}
      ${recentActivity}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateDashboardHero(employee: EmployeeData): string {
  const tierColor = CONFIG.TIERS[employee.tier]?.color || CONFIG.TIERS[4].color;
  const tierName = CONFIG.TIERS[employee.tier]?.name || 'Standard';

  return `
    <div class="dashboard-hero">
      <div class="dashboard-header">
        <h1>🎯 ${employee.name}'s Dashboard</h1>
        <div class="tier-badge" style="background: ${tierColor};">
          ${tierName} Tier ${employee.tier}
        </div>
      </div>
      <p>Welcome back! Here's your personalized overview and key metrics.</p>
    </div>
  `;
}

function generateQuickActions(employee: EmployeeData): string {
  const actions = [
    {
      href: '/profile',
      label: 'View Profile',
      icon: '👤',
      className: 'secondary',
    },
    ...(employee.features.includes('scheduling')
      ? [
          {
            href: '/schedule',
            label: 'Schedule Meeting',
            icon: '📅',
            className: 'secondary',
          },
        ]
      : []),
    {
      href: '/tools',
      label: 'Department Tools',
      icon: '🔧',
      className: 'primary',
    },
    {
      href: '/api',
      label: 'API Management',
      icon: '🔌',
      className: 'secondary',
    },
    {
      href: '/contact',
      label: 'Contact Info',
      icon: '📞',
      className: 'secondary',
    },
  ];

  // Add VIP-specific actions for tier 5
  if (employee.tier === 5) {
    actions.splice(2, 0, {
      href: '/tools/vip',
      label: 'VIP Portal',
      icon: '👑',
      className: 'accent',
    });
  }

  // Add analytics for higher tiers
  if (employee.tier >= 3) {
    actions.splice(3, 0, {
      href: '/tools/analytics',
      label: 'Analytics',
      icon: '📊',
      className: 'secondary',
    });
  }

  return `
    <div class="dashboard-card">
      <h3>⚡ Quick Actions</h3>
      <div class="action-grid">
        ${actions
          .map(
            action => `
          <a href="${action.href}" class="action-card">
            <div class="action-icon">${action.icon}</div>
            <div class="action-title">${action.label}</div>
            <div class="action-desc">${getActionDescription(action.href)}</div>
          </a>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

function generateRecentActivity(employee: EmployeeData): string {
  const activities = [
    {
      icon: '👑',
      title: 'VIP Client Portal Accessed',
      description: 'High-Roller Client Management',
      time: '2 minutes ago',
    },
    {
      icon: '🎰',
      title: 'Fantasy402 Dashboard Updated',
      description: 'Sportsbook Analytics',
      time: '5 minutes ago',
    },
    {
      icon: '💚',
      title: 'System Health Check Completed',
      description: 'All Systems Operational',
      time: '10 minutes ago',
    },
    {
      icon: '📊',
      title: 'Performance Report Generated',
      description: 'Monthly Analytics Summary',
      time: '1 hour ago',
    },
    {
      icon: '📞',
      title: 'Client Meeting Scheduled',
      description: 'VIP Client Consultation',
      time: '2 hours ago',
    },
  ];

  // Add department-specific activities
  if (employee.department === 'VIP Management') {
    activities.unshift({
      icon: '🚨',
      title: 'VIP Escalation Handled',
      description: 'Priority Client Support',
      time: '30 minutes ago',
    });
  } else if (employee.department === 'Technology') {
    activities.unshift({
      icon: '🔧',
      title: 'System Deployment Completed',
      description: 'Production Environment',
      time: '45 minutes ago',
    });
  }

  return `
    <div class="dashboard-card">
      <h3>📋 Recent Activity</h3>
      <div class="activity-list">
        ${activities
          .slice(0, 6)
          .map(
            activity => `
          <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
              <div class="activity-title">${activity.title}</div>
              <div class="activity-meta">${activity.description} • ${activity.time}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

function getActionDescription(href: string): string {
  const descriptions: Record<string, string> = {
    '/profile': 'View your professional profile',
    '/schedule': 'Schedule meetings and appointments',
    '/tools': 'Access department-specific tools',
    '/tools/vip': 'Manage VIP client relationships',
    '/tools/analytics': 'View performance analytics',
    '/api': 'System integration and data access',
    '/contact': 'Contact information and support',
  };

  return descriptions[href] || 'Access this feature';
}
