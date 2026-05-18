/**
 * Main Profile Template Entry Point
 * Routes to appropriate templates based on pathname
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateProfilePage(employee: EmployeeData, pathname?: string): string {
  const content = generateProfileContent(employee, pathname);

  const html = `
    ${generateHtmlHead(
      `${employee.name} - ${employee.title}`,
      `${employee.title} at Fire22. ${employee.bio || 'Professional profile and contact information.'}`
    )}
    ${generateHeader(employee, '/profile')}
    <main class="profile-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateProfileContent(employee: EmployeeData, pathname?: string): string {
  return `
    <div class="profile-hero">
      <div class="profile-avatar">
        <img src="${employee.avatar || '/default-avatar.png'}" alt="${employee.name}" />
      </div>
      <div class="profile-info">
        <h1>${employee.name}</h1>
        <h2>${employee.title}</h2>
        <p class="department">${employee.department}</p>
        <div class="contact-info">
          <p><strong>Email:</strong> <a href="mailto:${employee.email}">${employee.email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${employee.phone}">${employee.phone}</a></p>
          ${employee.location ? `<p><strong>Location:</strong> ${employee.location}</p>` : ''}
        </div>
      </div>
    </div>

    ${
      employee.bio
        ? `
    <div class="profile-bio">
      <h3>About</h3>
      <p>${employee.bio}</p>
    </div>
    `
        : ''
    }

    <div class="profile-actions">
      <a href="/contact" class="action-button primary">Contact ${employee.name.split(' ')[0]}</a>
      <a href="/schedule" class="action-button secondary">Schedule Meeting</a>
      ${employee.department ? `<a href="/tools/dept" class="action-button tertiary">Department Tools</a>` : ''}
    </div>

    ${
      employee.skills
        ? `
    <div class="profile-skills">
      <h3>Skills & Expertise</h3>
      <div class="skills-grid">
        ${employee.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
      </div>
    </div>
    `
        : ''
    }
  `;
}
