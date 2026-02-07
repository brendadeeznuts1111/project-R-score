#!/usr/bin/env bun
/**
 * Business Registry Dashboard
 * Visual card-based display of all registered businesses
 */

import Redis from 'ioredis';
import { BusinessContinuity } from '@fw/p2p';

const PORT = Number(Bun.env.REGISTRY_PORT ?? 3004);
const REDIS_URL = Bun.env.REDIS_URL ?? 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('✅ Redis connected for registry'));

// ============================================================================
// HTML Template
// ============================================================================

function generateRegistryHTML(businesses: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Registry - P2P Proxy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 48px;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header p {
      font-size: 18px;
      opacity: 0.9;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .business-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .business-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    .business-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    .business-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--card-color, #667eea);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .card-logo {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      background: var(--card-color, #667eea);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 24px;
      flex-shrink: 0;
      background-image: var(--logo-url, none);
      background-size: cover;
      background-position: center;
    }
    .card-info {
      flex: 1;
      min-width: 0;
    }
    .card-name {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-alias {
      font-size: 14px;
      color: #666;
      font-family: monospace;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .card-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .status-active {
      background: #d4edda;
      color: #155724;
    }
    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }
    .card-details {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .detail-label {
      color: #666;
    }
    .detail-value {
      color: #333;
      font-weight: 500;
    }
    .payment-handles {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .handle-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }
    .handle-cashapp {
      background: #d4f4dd;
      color: #00D632;
    }
    .handle-venmo {
      background: #e3f2fd;
      color: #008cff;
    }
    .handle-paypal {
      background: #e8eaf6;
      color: #003087;
    }
    .card-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .btn-primary {
      background: var(--card-color, #667eea);
      color: white;
    }
    .btn-secondary {
      background: #f5f5f5;
      color: #333;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      color: #666;
    }
    .empty-state h2 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #333;
    }
    .refresh-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 24px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .refresh-btn:hover {
      transform: rotate(180deg);
    }
    .filter-bar {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-input {
      flex: 1;
      min-width: 200px;
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }
    .filter-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .filter-select {
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }
    .specialty-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .specialty-title {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .specialty-items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .specialty-tag {
      padding: 6px 12px;
      background: #f0f0f0;
      border-radius: 6px;
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }
    .specialty-tag.highlight {
      background: var(--card-color, #667eea);
      color: white;
    }
    .pricing-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pricing-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f9f9f9;
      border-radius: 6px;
      font-size: 13px;
    }
    .pricing-name {
      color: #333;
      font-weight: 500;
    }
    .pricing-price {
      color: var(--card-color, #667eea);
      font-weight: 600;
    }
    .hours-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }
    .type-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 10px;
      background: rgba(0,0,0,0.1);
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 Business Registry</h1>
      <p>All registered businesses in the P2P Proxy system</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${businesses.length}</div>
        <div class="stat-label">Total Businesses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${businesses.filter(b => b.current === 'true').length}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${businesses.filter(b => b.current === 'false').length}</div>
        <div class="stat-label">Inactive</div>
      </div>
    </div>

    <div class="filter-bar">
      <input 
        type="text" 
        class="filter-input" 
        id="searchInput" 
        placeholder="Search businesses by name or alias..."
        onkeyup="filterBusinesses()"
      />
      <select class="filter-select" id="statusFilter" onchange="filterBusinesses()">
        <option value="all">All Status</option>
        <option value="active">Active Only</option>
        <option value="inactive">Inactive Only</option>
      </select>
      <select class="filter-select" id="typeFilter" onchange="filterBusinesses()">
        <option value="all">All Types</option>
        <option value="barbershop">💈 Barbershop</option>
        <option value="coffee">☕ Coffee</option>
        <option value="gym">💪 Gym</option>
        <option value="restaurant">🍽️ Restaurant</option>
        <option value="bookstore">📚 Bookstore</option>
        <option value="retail">🛍️ Retail</option>
        <option value="service">🔧 Service</option>
      </select>
    </div>

    <div class="business-grid" id="businessGrid">
      ${businesses.length === 0 ? `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h2>No businesses registered yet</h2>
          <p>Register your first business using the admin API</p>
        </div>
      ` : businesses.map(business => {
        const branding = business.branding ? JSON.parse(business.branding) : {};
        const paymentHandles = business.paymentHandles ? JSON.parse(business.paymentHandles) : {};
        const specialty = business.specialty ? JSON.parse(business.specialty) : null;
        const primaryColor = branding.primaryColor || '#667eea';
        const logoUrl = branding.logoUrl;
        const logoText = branding.logoText || business.name.charAt(0);
        const isActive = business.current === 'true';
        const proxyUrl = Bun.env.PROXY_URL || 'http://localhost:3002';
        
        // Render specialty section based on business type
        const renderSpecialty = () => {
          if (!specialty) return '';
          
          const type = specialty.type || 'other';
          let specialtyHTML = '';
          
          // Business hours
          if (specialty.hours) {
            specialtyHTML += `
              <div class="hours-badge">
                🕐 ${specialty.hours}
              </div>
            `;
          }
          
          // Barbershop/Service: Show services and pricing
          if (type === 'barbershop' || type === 'service') {
            if (specialty.services && specialty.services.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">✂️ Services</div>
                  <div class="specialty-items">
                    ${specialty.services.slice(0, 4).map((s: string) => 
                      `<span class="specialty-tag">${s}</span>`
                    ).join('')}
                    ${specialty.services.length > 4 ? `<span class="specialty-tag">+${specialty.services.length - 4} more</span>` : ''}
                  </div>
                </div>
              `;
            }
            if (specialty.pricing && specialty.pricing.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">💰 Pricing</div>
                  <div class="pricing-list">
                    ${specialty.pricing.slice(0, 3).map((p: any) => `
                      <div class="pricing-item">
                        <span class="pricing-name">${p.item}</span>
                        <span class="pricing-price">${p.price}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }
          }
          
          // Coffee/Restaurant: Show menu items
          if (type === 'coffee' || type === 'restaurant') {
            if (specialty.menuItems && specialty.menuItems.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">🍽️ Popular Items</div>
                  <div class="specialty-items">
                    ${specialty.menuItems.slice(0, 5).map((item: string) => 
                      `<span class="specialty-tag highlight">${item}</span>`
                    ).join('')}
                  </div>
                </div>
              `;
            }
            if (specialty.popularItems && specialty.popularItems.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">⭐ Customer Favorites</div>
                  <div class="specialty-items">
                    ${specialty.popularItems.slice(0, 3).map((item: string) => 
                      `<span class="specialty-tag">${item}</span>`
                    ).join('')}
                  </div>
                </div>
              `;
            }
          }
          
          // Gym: Show membership tiers
          if (type === 'gym') {
            if (specialty.membershipTiers && specialty.membershipTiers.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">💪 Membership Plans</div>
                  <div class="pricing-list">
                    ${specialty.membershipTiers.slice(0, 3).map((tier: any) => `
                      <div class="pricing-item">
                        <span class="pricing-name">${tier.name}</span>
                        <span class="pricing-price">${tier.price}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }
            if (specialty.specialties && specialty.specialties.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">🏋️ Facilities</div>
                  <div class="specialty-items">
                    ${specialty.specialties.slice(0, 4).map((s: string) => 
                      `<span class="specialty-tag">${s}</span>`
                    ).join('')}
                  </div>
                </div>
              `;
            }
          }
          
          // Bookstore: Show categories
          if (type === 'bookstore' || type === 'retail') {
            if (specialty.categories && specialty.categories.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">📚 Categories</div>
                  <div class="specialty-items">
                    ${specialty.categories.slice(0, 5).map((cat: string) => 
                      `<span class="specialty-tag">${cat}</span>`
                    ).join('')}
                  </div>
                </div>
              `;
            }
            if (specialty.popularItems && specialty.popularItems.length > 0) {
              specialtyHTML += `
                <div class="specialty-section">
                  <div class="specialty-title">📖 Bestsellers</div>
                  <div class="specialty-items">
                    ${specialty.popularItems.slice(0, 3).map((item: string) => 
                      `<span class="specialty-tag highlight">${item}</span>`
                    ).join('')}
                  </div>
                </div>
              `;
            }
          }
          
          // General specialties
          if (specialty.specialties && specialty.specialties.length > 0 && !specialtyHTML.includes('specialty-tag')) {
            specialtyHTML += `
              <div class="specialty-section">
                <div class="specialty-title">⭐ Specialties</div>
                <div class="specialty-items">
                  ${specialty.specialties.slice(0, 4).map((s: string) => 
                    `<span class="specialty-tag">${s}</span>`
                  ).join('')}
                </div>
              </div>
            `;
          }
          
          return specialtyHTML;
        };
        
        const typeLabels: Record<string, string> = {
          barbershop: '💈 Barbershop',
          coffee: '☕ Coffee',
          gym: '💪 Gym',
          restaurant: '🍽️ Restaurant',
          bookstore: '📚 Bookstore',
          retail: '🛍️ Retail',
          service: '🔧 Service',
          other: '🏢 Business'
        };
        
        return `
          <div class="business-card" 
               data-name="${business.name.toLowerCase()}" 
               data-alias="${business.alias.toLowerCase()}"
               data-status="${isActive ? 'active' : 'inactive'}"
               data-type="${specialty?.type || 'other'}"
               style="--card-color: ${primaryColor}; ${logoUrl ? `--logo-url: url('${logoUrl}');` : ''}">
            ${specialty?.type ? `<div class="type-badge">${typeLabels[specialty.type] || 'Business'}</div>` : ''}
            
            <div class="card-header">
              <div class="card-logo">${logoUrl ? '' : logoText}</div>
              <div class="card-info">
                <div class="card-name">${business.name}</div>
                <div class="card-alias">${business.alias}</div>
                <span class="card-status ${isActive ? 'status-active' : 'status-inactive'}">
                  ${isActive ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
            </div>
            
            <div class="card-details">
              ${business.location ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Location</span>
                  <span class="detail-value">${business.location}</span>
                </div>
              ` : ''}
              
              ${business.contact ? `
                <div class="detail-row">
                  <span class="detail-label">📧 Contact</span>
                  <span class="detail-value">${business.contact}</span>
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Started</span>
                <span class="detail-value">${new Date(business.startDate).toLocaleDateString()}</span>
              </div>
              
              ${business.endDate ? `
                <div class="detail-row">
                  <span class="detail-label">📅 Ended</span>
                  <span class="detail-value">${new Date(business.endDate).toLocaleDateString()}</span>
                </div>
              ` : ''}
              
              ${business.migratedTo ? `
                <div class="detail-row">
                  <span class="detail-label">↪️ Migrated To</span>
                  <span class="detail-value">${business.migratedTo}</span>
                </div>
              ` : ''}
              
              ${renderSpecialty()}
              
              <div class="payment-handles" style="margin-top: 16px;">
                ${paymentHandles.cashapp ? `
                  <span class="handle-badge handle-cashapp">${paymentHandles.cashapp}</span>
                ` : ''}
                ${paymentHandles.venmo ? `
                  <span class="handle-badge handle-venmo">${paymentHandles.venmo}</span>
                ` : ''}
                ${paymentHandles.paypal ? `
                  <span class="handle-badge handle-paypal">${paymentHandles.paypal}</span>
                ` : ''}
              </div>
            </div>
            
            <div class="card-actions">
              <a href="${proxyUrl}/pay?alias=${business.alias}&amount=25" 
                 class="btn btn-primary" 
                 target="_blank">
                💳 Test Payment
              </a>
              <a href="${proxyUrl}/admin/stats?alias=${business.alias}" 
                 class="btn btn-secondary" 
                 target="_blank">
                📊 Stats
              </a>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  <button class="refresh-btn" onclick="location.reload()" title="Refresh">
    🔄
  </button>

  <script>
    function filterBusinesses() {
      const searchInput = document.getElementById('searchInput').value.toLowerCase();
      const statusFilter = document.getElementById('statusFilter').value;
      const typeFilter = document.getElementById('typeFilter')?.value || 'all';
      const cards = document.querySelectorAll('.business-card');
      
      cards.forEach(card => {
        const name = card.dataset.name;
        const alias = card.dataset.alias;
        const status = card.dataset.status;
        const type = card.dataset.type || 'other';
        
        const matchesSearch = !searchInput || 
          name.includes(searchInput) || 
          alias.includes(searchInput);
        
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesType = typeFilter === 'all' || type === typeFilter;
        
        if (matchesSearch && matchesStatus && matchesType) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    }
  
  // Add type filter
  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', filterBusinesses);
  }
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      location.reload();
    }, 30000);
  </script>
</body>
</html>`;
}

// ============================================================================
// Bun Server
// ============================================================================

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Registry page
    if (url.pathname === '/' || url.pathname === '/registry') {
      try {
        const businesses = await BusinessContinuity.listBusinesses();
        
        // Sort: active first, then by name
        businesses.sort((a, b) => {
          if (a.current === 'true' && b.current !== 'true') return -1;
          if (a.current !== 'true' && b.current === 'true') return 1;
          return a.name.localeCompare(b.name);
        });
        
        return new Response(generateRegistryHTML(businesses), {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    // JSON API endpoint
    if (url.pathname === '/api/businesses') {
      try {
        const businesses = await BusinessContinuity.listBusinesses();
        return new Response(JSON.stringify(businesses), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    return new Response('Business Registry', { status: 404 });
  },
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log(`║  🏢 Business Registry Dashboard                           ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  URL:     http://localhost:${PORT}                        ║`);
console.log(`║  Registry: http://localhost:${PORT}/registry              ║`);
console.log(`║  API:     http://localhost:${PORT}/api/businesses         ║`);
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

export default server;
