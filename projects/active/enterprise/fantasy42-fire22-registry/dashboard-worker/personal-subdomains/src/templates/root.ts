/**
 * Root domain template
 */

import { CONFIG } from '../config';
import { generateHtmlHead, generateFooter } from '../components';

export function generateRootDomainPage(): string {
  const html = `
    ${generateHtmlHead(
      'Fire22 Employee Directory',
      'Find your colleagues at their personal subdomains on the Fire22 platform'
    )}
    <body>
      <div class="root-container">
        <header class="root-header">
          <div class="logo">
            <span class="logo-text">🔥 ${CONFIG.BRAND_NAME}</span>
          </div>
          <p class="tagline">Professional Employee Presence Platform</p>
        </header>

        <main class="root-main">
          <div class="hero-section">
            <h1>👋 Welcome to ${CONFIG.BRAND_NAME}</h1>
            <p>Find your colleagues at their personal subdomains and connect with our amazing team.</p>
          </div>

          <div class="directory-section">
            <h2>📖 Employee Directory</h2>
            <p>Access personalized employee pages at:</p>
            <div class="subdomain-example">
              <code>https://[firstname-lastname].${CONFIG.DOMAIN}</code>
            </div>

            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">👤</div>
                <h3>Personal Profiles</h3>
                <p>Professional profiles with contact information and bios</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">📅</div>
                <h3>Meeting Scheduling</h3>
                <p>Easy scheduling system for meeting requests</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">🔧</div>
                <h3>Department Tools</h3>
                <p>Access specialized tools and resources by department</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Performance Analytics</h3>
                <p>Advanced analytics and business intelligence dashboards</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">🔌</div>
                <h3>API Integration</h3>
                <p>System integration and data access endpoints</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">👑</div>
                <h3>VIP Services</h3>
                <p>Premium services for high-value client management</p>
              </div>
            </div>
          </div>

          <div class="departments-section">
            <h2>🏢 Departments</h2>
            <div class="departments-grid">
              <div class="department-card">
                <h3>💻 Technology</h3>
                <p>Development, DevOps, and technical operations</p>
              </div>

              <div class="department-card">
                <h3>💰 Finance</h3>
                <p>Financial planning and business operations</p>
              </div>

              <div class="department-card">
                <h3>👥 HR</h3>
                <p>Human resources and talent management</p>
              </div>

              <div class="department-card">
                <h3>⚙️ Operations</h3>
                <p>Business operations and process management</p>
              </div>

              <div class="department-card">
                <h3>🎰 Fantasy402</h3>
                <p>Sportsbook platform and betting operations</p>
              </div>

              <div class="department-card vip">
                <h3>👑 VIP Management</h3>
                <p>High-value client services and support</p>
              </div>
            </div>
          </div>
        </main>
      </div>
      ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}
