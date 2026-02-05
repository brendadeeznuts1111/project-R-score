/**
 * Enterprise Schedule page template with VIP Management features
 */

import type { EmployeeData } from '../types';
import { generateHtmlHead, generateHeader, generateFooter } from '../components';
import { sanitizeHtml } from '../utils';

export function generateSchedulePage(employee: EmployeeData): string {
  const availabilityDashboard = generateAvailabilityDashboard(employee);
  const bookingForm = generateBookingForm(employee);
  const integrationHub = generateIntegrationHub(employee);
  const priorityQueue = generatePriorityQueue(employee);

  const html = `
    ${generateHtmlHead(
      `Schedule Meeting - ${employee.name}`,
      `Professional scheduling system for ${employee.title} - VIP Management Executive`
    )}
    <style>
      ${getScheduleStyles()}
    </style>
    ${generateHeader(employee, '/schedule')}
    <main class="schedule-container">
      ${generateScheduleHero(employee)}
      ${availabilityDashboard}
      ${bookingForm}
      ${integrationHub}
      ${employee.tier === 5 ? priorityQueue : ''}
      ${generateScheduleAnalytics(employee)}
    </main>
    ${generateFooter()}
    <script>
      ${getScheduleScripts()}
    </script>
    </body>
    </html>
  `;

  return html;
}

function generateScheduleHero(employee: EmployeeData): string {
  const statusIndicator =
    employee.tier === 5
      ? '👑 VIP Executive'
      : employee.tier >= 4
        ? '🎯 Senior Leadership'
        : '💼 Professional';

  return `
    <div class="schedule-hero">
      <div class="hero-header">
        <h1>📅 Enterprise Scheduling System</h1>
        <div class="status-badge">${statusIndicator}</div>
      </div>

      <div class="hero-content">
        <div class="hero-info">
          <h2>Schedule Meeting with ${sanitizeHtml(employee.name)}</h2>
          <p class="hero-description">
            ${
              employee.tier === 5
                ? 'VIP Management Executive • Specialized in high-value client relationships and premium betting operations'
                : employee.tier >= 4
                  ? 'Senior Leadership • Strategic planning and business development'
                  : 'Professional Consultation • Expert guidance and support'
            }
          </p>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-value">${employee.tier === 5 ? '< 3 min' : '< 5 min'}</span>
              <span class="stat-label">Response Time</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">24/7</span>
              <span class="stat-label">Availability</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">100%</span>
              <span class="stat-label">Commitment</span>
            </div>
          </div>
        </div>

        <div class="meeting-types-grid">
          ${generateMeetingTypes(employee)}
        </div>
      </div>
    </div>
  `;
}

function generateMeetingTypes(employee: EmployeeData): string {
  const meetingTypes = [
    {
      icon: '💼',
      title: 'Business Consultation',
      duration: '30 minutes',
      description: 'Standard consultation and professional guidance',
      tier: 1,
      color: 'blue',
    },
    {
      icon: '📊',
      title: 'Strategy Session',
      duration: '60 minutes',
      description: 'In-depth planning and strategic discussion',
      tier: 3,
      color: 'green',
    },
    {
      icon: '🎯',
      title: 'Portfolio Review',
      duration: '45 minutes',
      description: 'Investment portfolio analysis and optimization',
      tier: 4,
      color: 'orange',
    },
    {
      icon: '👑',
      title: 'VIP Consultation',
      duration: '45 minutes',
      description: 'Premium client service and high-value relationship management',
      tier: 5,
      color: 'gold',
    },
    {
      icon: '🚨',
      title: 'Emergency Meeting',
      duration: '30 minutes',
      description: 'Urgent matters requiring immediate attention',
      tier: 5,
      color: 'red',
    },
  ];

  return meetingTypes
    .filter(type => employee.tier >= type.tier)
    .map(
      type => `
      <div class="meeting-type-card ${type.color}" data-type="${type.title.toLowerCase().replace(/\s+/g, '-')}">
        <div class="meeting-icon">${type.icon}</div>
        <div class="meeting-content">
          <h3>${type.title}</h3>
          <div class="meeting-meta">
            <span class="duration">${type.duration}</span>
            ${employee.tier === 5 && type.tier === 5 ? '<span class="priority">PRIORITY</span>' : ''}
          </div>
          <p>${type.description}</p>
        </div>
        <div class="meeting-select">
          <input type="radio" name="meeting-type" value="${type.title.toLowerCase().replace(/\s+/g, '-')}" id="${type.title.toLowerCase().replace(/\s+/g, '-')}">
          <label for="${type.title.toLowerCase().replace(/\s+/g, '-')}">Select</label>
        </div>
      </div>
    `
    )
    .join('');
}

function generateAvailabilityDashboard(employee: EmployeeData): string {
  const today = new Date();
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Generate next 7 days
  const availabilityData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayName = weekDays[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = i === 0;

    // VIP executives have more flexible schedules
    const slots = employee.tier === 5 ? generateVIPSlots(date, i) : generateStandardSlots(date, i);

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      dayName,
      isWeekend,
      isToday,
      slots,
    };
  });

  return `
    <div class="availability-dashboard">
      <div class="dashboard-header">
        <h2>🕒 Real-Time Availability</h2>
        <div class="availability-status">
          <div class="status-indicator online">
            <span class="pulse"></span>
            Available Now
          </div>
          <div class="timezone-info">All times in EST</div>
        </div>
      </div>

      <div class="calendar-week">
        ${availabilityData
          .map(
            (day, index) => `
          <div class="calendar-day ${day.isToday ? 'today' : ''} ${day.isWeekend ? 'weekend' : ''}" data-date="${day.date}">
            <div class="day-header">
              <div class="day-name">${day.dayName}</div>
              <div class="day-date">${day.date.split(',')[1]}</div>
              ${day.isToday ? '<div class="today-badge">TODAY</div>' : ''}
            </div>

            <div class="day-slots">
              ${day.slots
                .map(
                  slot => `
                <button class="time-slot ${slot.status}"
                        data-time="${slot.time}"
                        data-duration="${slot.duration}"
                        ${slot.status === 'available' ? '' : 'disabled'}>
                  <div class="slot-time">${slot.time}</div>
                  <div class="slot-duration">${slot.duration}</div>
                  <div class="slot-status">${slot.statusText}</div>
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="availability-legend">
        <div class="legend-item">
          <div class="legend-color available"></div>
          <span>Available</span>
        </div>
        <div class="legend-item">
          <div class="legend-color booked"></div>
          <span>Booked</span>
        </div>
        <div class="legend-item">
          <div class="legend-color tentative"></div>
          <span>Tentative</span>
        </div>
        <div class="legend-item">
          <div class="legend-color vip-only"></div>
          <span>VIP Only</span>
        </div>
      </div>
    </div>
  `;
}

function generateVIPSlots(date: Date, dayIndex: number): any[] {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return [
      { time: '10:00 AM', duration: '60 min', status: 'vip-only', statusText: 'VIP Only' },
      { time: '2:00 PM', duration: '45 min', status: 'vip-only', statusText: 'VIP Only' },
      { time: '4:00 PM', duration: '30 min', status: 'available', statusText: 'Available' },
    ];
  }

  // VIP executives have premium morning slots
  return [
    { time: '8:00 AM', duration: '60 min', status: 'vip-only', statusText: 'VIP Only' },
    { time: '9:00 AM', duration: '45 min', status: 'available', statusText: 'Available' },
    { time: '10:30 AM', duration: '30 min', status: 'booked', statusText: 'Booked' },
    { time: '11:00 AM', duration: '60 min', status: 'available', statusText: 'Available' },
    { time: '1:00 PM', duration: '45 min', status: 'tentative', statusText: 'Tentative' },
    { time: '2:30 PM', duration: '30 min', status: 'available', statusText: 'Available' },
    { time: '3:00 PM', duration: '60 min', status: 'vip-only', statusText: 'VIP Only' },
    { time: '4:30 PM', duration: '30 min', status: 'available', statusText: 'Available' },
  ];
}

function generateStandardSlots(date: Date, dayIndex: number): any[] {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return [
      { time: '10:00 AM', duration: '60 min', status: 'available', statusText: 'Available' },
      { time: '2:00 PM', duration: '45 min', status: 'available', statusText: 'Available' },
    ];
  }

  return [
    { time: '9:00 AM', duration: '60 min', status: 'available', statusText: 'Available' },
    { time: '10:30 AM', duration: '30 min', status: 'booked', statusText: 'Booked' },
    { time: '11:00 AM', duration: '45 min', status: 'available', statusText: 'Available' },
    { time: '1:30 PM', duration: '30 min', status: 'available', statusText: 'Available' },
    { time: '2:30 PM', duration: '60 min', status: 'tentative', statusText: 'Tentative' },
    { time: '4:00 PM', duration: '30 min', status: 'available', statusText: 'Available' },
  ];
}

function generateBookingForm(employee: EmployeeData): string {
  return `
    <div class="booking-form-section">
      <h2>📝 Meeting Details</h2>
      <form id="bookingForm" class="booking-form">
        <div class="form-row">
          <div class="form-group">
            <label for="clientName">Full Name *</label>
            <input type="text" id="clientName" name="clientName" required placeholder="Enter your full name">
          </div>

          <div class="form-group">
            <label for="clientEmail">Email Address *</label>
            <input type="email" id="clientEmail" name="clientEmail" required placeholder="your.email@example.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="clientPhone">Phone Number</label>
            <input type="tel" id="clientPhone" name="clientPhone" placeholder="(555) 123-4567">
          </div>

          <div class="form-group">
            <label for="clientCompany">Company/Organization</label>
            <input type="text" id="clientCompany" name="clientCompany" placeholder="Company name">
          </div>
        </div>

        <div class="form-group">
          <label for="meetingTopic">Meeting Topic *</label>
          <select id="meetingTopic" name="meetingTopic" required>
            <option value="">Select a topic...</option>
            <option value="portfolio-review">Portfolio Review</option>
            <option value="strategy-planning">Strategy Planning</option>
            <option value="investment-advice">Investment Advice</option>
            <option value="vip-services">VIP Services</option>
            <option value="emergency-consultation">Emergency Consultation</option>
            <option value="business-consultation">Business Consultation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="meetingDescription">Meeting Description</label>
          <textarea id="meetingDescription" name="meetingDescription" rows="4"
                    placeholder="Please provide details about what you'd like to discuss..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="preferredDate">Preferred Date</label>
            <input type="date" id="preferredDate" name="preferredDate">
          </div>

          <div class="form-group">
            <label for="preferredTime">Preferred Time</label>
            <select id="preferredTime" name="preferredTime">
              <option value="">Select time...</option>
              <option value="morning">Morning (9 AM - 12 PM)</option>
              <option value="afternoon">Afternoon (1 PM - 5 PM)</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="timezone">Your Timezone</label>
          <select id="timezone" name="timezone">
            <option value="EST">Eastern Time (EST)</option>
            <option value="CST">Central Time (CST)</option>
            <option value="MST">Mountain Time (MST)</option>
            <option value="PST">Pacific Time (PST)</option>
            <option value="GMT">Greenwich Mean Time (GMT)</option>
          </select>
        </div>

        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" name="calendarInvite" checked>
            <span class="checkmark"></span>
            Send calendar invite
          </label>

          <label class="checkbox-label">
            <input type="checkbox" name="reminder" checked>
            <span class="checkmark"></span>
            Email reminder 24h before
          </label>

          <label class="checkbox-label">
            <input type="checkbox" name="followUp">
            <span class="checkmark"></span>
            Request follow-up meeting
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="clearForm()">Clear Form</button>
          <button type="submit" class="btn-primary">
            📅 Schedule Meeting
          </button>
        </div>
      </form>
    </div>
  `;
}

function generateIntegrationHub(employee: EmployeeData): string {
  const integrations = [
    {
      icon: '📧',
      title: 'Email Integration',
      description: 'Automated email confirmations and reminders',
      status: 'active',
    },
    {
      icon: '📱',
      title: 'Mobile Calendar',
      description: 'Sync with iOS Calendar, Google Calendar, Outlook',
      status: 'active',
    },
    {
      icon: '💼',
      title: 'Corporate Outlook',
      description: 'Direct integration with enterprise calendar systems',
      status: employee.tier >= 3 ? 'active' : 'inactive',
    },
    {
      icon: '🤖',
      title: 'CRM Integration',
      description: 'Automatic client data synchronization',
      status: employee.tier >= 4 ? 'active' : 'inactive',
    },
    {
      icon: '📊',
      title: 'Analytics Tracking',
      description: 'Meeting effectiveness and engagement metrics',
      status: 'active',
    },
    {
      icon: '🚨',
      title: 'Emergency Override',
      description: 'Priority scheduling for urgent matters',
      status: employee.tier === 5 ? 'active' : 'inactive',
    },
  ];

  return `
    <div class="integration-hub">
      <h2>🔗 Integration Hub</h2>
      <p>Seamless integration with your preferred tools and platforms</p>

      <div class="integrations-grid">
        ${integrations
          .map(
            integration => `
          <div class="integration-card ${integration.status}">
            <div class="integration-icon">${integration.icon}</div>
            <div class="integration-content">
              <h3>${integration.title}</h3>
              <p>${integration.description}</p>
              <div class="integration-status">
                <span class="status-indicator ${integration.status}"></span>
                ${integration.status === 'active' ? 'Active' : 'Coming Soon'}
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="integration-summary">
        <div class="summary-item">
          <span class="summary-value">${integrations.filter(i => i.status === 'active').length}</span>
          <span class="summary-label">Active Integrations</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">99.9%</span>
          <span class="summary-label">Uptime</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">< 5 min</span>
          <span class="summary-label">Sync Time</span>
        </div>
      </div>
    </div>
  `;
}

function generatePriorityQueue(employee: EmployeeData): string {
  const priorityItems = [
    {
      type: 'vip-emergency',
      title: 'VIP Client Crisis',
      requester: 'Diamond Club Member',
      time: '2 min ago',
      priority: 'CRITICAL',
    },
    {
      type: 'strategy-review',
      title: 'Portfolio Strategy Review',
      requester: 'Premium Client',
      time: '15 min ago',
      priority: 'HIGH',
    },
    {
      type: 'investment-opportunity',
      title: 'Time-Sensitive Investment',
      requester: 'High-Net-Worth Individual',
      time: '1 hour ago',
      priority: 'HIGH',
    },
  ];

  return `
    <div class="priority-queue">
      <h2>🚨 Priority Queue</h2>
      <p>Urgent matters requiring immediate attention</p>

      <div class="queue-items">
        ${priorityItems
          .map(
            item => `
          <div class="queue-item ${item.type}" data-priority="${item.priority}">
            <div class="queue-icon">
              ${item.priority === 'CRITICAL' ? '🚨' : '⚡'}
            </div>
            <div class="queue-content">
              <h3>${item.title}</h3>
              <div class="queue-meta">
                <span class="requester">${item.requester}</span>
                <span class="timestamp">${item.time}</span>
              </div>
            </div>
            <div class="queue-actions">
              <button class="btn-priority" onclick="handlePriority('${item.type}')">
                Handle Now
              </button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="queue-controls">
        <button class="btn-emergency" onclick="triggerEmergencyMode()">
          🚨 Emergency Override
        </button>
        <button class="btn-reschedule" onclick="rescheduleQueue()">
          📅 Reschedule All
        </button>
      </div>
    </div>
  `;
}

function generateScheduleAnalytics(employee: EmployeeData): string {
  return `
    <div class="schedule-analytics">
      <h2>📊 Scheduling Analytics</h2>

      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-icon">📅</div>
          <div class="analytics-content">
            <div class="analytics-value">1,247</div>
            <div class="analytics-label">Meetings This Month</div>
            <div class="analytics-trend positive">↗️ +23.1%</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">⏱️</div>
          <div class="analytics-content">
            <div class="analytics-value">${employee.tier === 5 ? '< 3 min' : '< 5 min'}</div>
            <div class="analytics-label">Average Response</div>
            <div class="analytics-trend positive">↗️ -45s faster</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">⭐</div>
          <div class="analytics-content">
            <div class="analytics-value">4.9/5</div>
            <div class="analytics-label">Client Satisfaction</div>
            <div class="analytics-trend positive">↗️ +0.2 pts</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">💰</div>
          <div class="analytics-content">
            <div class="analytics-value">$847K</div>
            <div class="analytics-label">Monthly Revenue</div>
            <div class="analytics-trend positive">↗️ +18.7%</div>
          </div>
        </div>
      </div>

      <div class="analytics-actions">
        <a href="/tools/analytics" class="btn-analytics">📊 View Full Analytics</a>
        <a href="/tools/vip/crm" class="btn-crm">🤖 CRM Dashboard</a>
      </div>
    </div>
  `;
}

function getScheduleStyles(): string {
  return `
    .schedule-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
      min-height: 100vh;
    }

    .schedule-hero {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 107, 53, 0.1));
      border: 2px solid #ffd700;
      border-radius: 20px;
      padding: 3rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
    }

    .hero-header h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffd700, #ff6b35);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .status-badge {
      display: inline-block;
      background: linear-gradient(135deg, #ffd700, #ff6b35);
      color: #000;
      padding: 0.5rem 1.5rem;
      border-radius: 25px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .meeting-types-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .meeting-type-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
      border: 2px solid transparent;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .meeting-type-card.selected {
      border-color: #ffd700;
      background: rgba(255, 215, 0, 0.1);
    }

    .availability-dashboard {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .calendar-week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .time-slot.available {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
    }

    .time-slot.booked {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .time-slot.vip-only {
      border-color: #ffd700;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 107, 53, 0.1));
    }

    .booking-form-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: #e0e6ed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #ffd700, #ff6b35);
      color: #000;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }

    .integration-hub {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .priority-queue {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(255, 107, 53, 0.1));
      border: 2px solid #ef4444;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .schedule-analytics {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 768px) {
      .calendar-week {
        grid-template-columns: 1fr;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function getScheduleScripts(): string {
  return `
    let selectedTimeSlot = null;
    let selectedMeetingType = null;

    document.addEventListener('DOMContentLoaded', function() {
      // Time slot selection
      document.querySelectorAll('.time-slot.available').forEach(slot => {
        slot.addEventListener('click', function() {
          selectTimeSlot(this);
        });
      });

      // Meeting type selection
      document.querySelectorAll('input[name=\"meeting-type\"]').forEach(radio => {
        radio.addEventListener('change', function() {
          selectMeetingType(this.value);
        });
      });

      // Form submission
      const form = document.getElementById('bookingForm');
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          handleFormSubmission(this);
        });
      }
    });

    function selectTimeSlot(slotElement) {
      document.querySelectorAll('.time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
      });

      slotElement.classList.add('selected');
      selectedTimeSlot = {
        date: slotElement.closest('.calendar-day').dataset.date,
        time: slotElement.dataset.time,
        duration: slotElement.dataset.duration
      };

      // Update form
      const dateInput = document.getElementById('preferredDate');
      const timeInput = document.getElementById('preferredTime');
      if (dateInput && timeInput) {
        dateInput.value = selectedTimeSlot.date.split(',')[1].trim();
        timeInput.value = selectedTimeSlot.time;
      }
    }

    function selectMeetingType(type) {
      selectedMeetingType = type;
      document.querySelectorAll('.meeting-type-card').forEach(card => {
        card.classList.remove('selected');
      });
      document.querySelector('input[value=\"' + type + '\"]').closest('.meeting-type-card').classList.add('selected');
    }

    function handleFormSubmission(form) {
      if (!selectedTimeSlot || !selectedMeetingType) {
        alert('Please select both a time slot and meeting type');
        return;
      }

      const submitBtn = form.querySelector('.btn-primary');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '⏳ Scheduling...';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.textContent = '✅ Scheduled!';
        submitBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
          alert('Meeting scheduled successfully!\\n\\n📅 ' + selectedTimeSlot.date + ' at ' + selectedTimeSlot.time + '\\n👤 ' + form.clientName.value + '\\n📧 Confirmation sent to ' + form.clientEmail.value);
          form.reset();
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
          selectedTimeSlot = null;
          selectedMeetingType = null;
        }, 2000);
      }, 1500);
    }

    function clearForm() {
      document.getElementById('bookingForm').reset();
      selectedTimeSlot = null;
      selectedMeetingType = null;
      document.querySelectorAll('.time-slot.selected, .meeting-type-card.selected').forEach(el => {
        el.classList.remove('selected');
      });
    }

    function handlePriority(type) {
      alert('Handling priority: ' + type + '\\n\\n🚨 Priority override activated\\n📞 Emergency protocols engaged\\n⚡ Immediate response initiated');
    }

    function triggerEmergencyMode() {
      alert('🚨 EMERGENCY MODE ACTIVATED\\n\\n🔴 All meetings paused\\n📞 Emergency hotline prioritized\\n🛡️ Crisis protocols engaged\\n⚡ Elite response team mobilized');
    }

    function rescheduleQueue() {
      if (confirm('Reschedule all priority items? This will notify all clients.')) {
        alert('✅ Priority queue rescheduled\\n📧 Notifications sent to all clients\\n📅 New slots assigned automatically');
      }
    }
  `;
}
