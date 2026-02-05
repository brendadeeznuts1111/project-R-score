/**
 * Main Contact Template Entry Point
 * Routes to appropriate templates based on pathname
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateContactPage(employee: EmployeeData, pathname?: string): string {
  const content = generateContactContent(employee, pathname);

  const html = `
    ${generateHtmlHead(
      `Contact ${employee.name}`,
      `Get in touch with ${employee.name}, ${employee.title} at Fire22`
    )}
    ${generateHeader(employee, '/contact')}
    <main class="contact-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateContactContent(employee: EmployeeData, pathname?: string): string {
  return `
    <div class="contact-hero">
      <h1>Contact ${employee.name.split(' ')[0]}</h1>
      <p>Get in touch with me directly</p>
    </div>

    <div class="contact-grid">
      <div class="contact-card">
        <h3>📧 Email</h3>
        <p><a href="mailto:${employee.email}">${employee.email}</a></p>
        <p class="contact-description">Best for detailed questions and professional inquiries</p>
      </div>

      <div class="contact-card">
        <h3>📱 Phone</h3>
        <p><a href="tel:${employee.phone}">${employee.phone}</a></p>
        <p class="contact-description">Available during business hours</p>
      </div>

      ${
        employee.location
          ? `
      <div class="contact-card">
        <h3>📍 Location</h3>
        <p>${employee.location}</p>
        <p class="contact-description">Primary office location</p>
      </div>
      `
          : ''
      }

      <div class="contact-card">
        <h3>📅 Schedule Meeting</h3>
        <a href="/schedule" class="schedule-button">Book Time</a>
        <p class="contact-description">Set up a meeting or call</p>
      </div>
    </div>

    <div class="contact-form-section">
      <h2>Send a Message</h2>
      <form class="contact-form" id="contactForm">
        <div class="form-group">
          <label for="name">Your Name *</label>
          <input type="text" id="name" name="name" required>
        </div>

        <div class="form-group">
          <label for="email">Your Email *</label>
          <input type="email" id="email" name="email" required>
        </div>

        <div class="form-group">
          <label for="subject">Subject *</label>
          <input type="text" id="subject" name="subject" required>
        </div>

        <div class="form-group">
          <label for="message">Message *</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>

        <button type="submit" class="submit-button">Send Message</button>
      </form>
    </div>
  `;
}
