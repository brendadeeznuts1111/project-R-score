/**
 * Barber Payment QR Code Template System
 * =======================================
 * 
 * Generates a web-based template system where barbers can input their payment
 * information to generate a printable template for the design team.
 * 
 * The QR code contains a unified payment URL that routes to the appropriate
 * payment method based on backend logic.
 * 
 * Enhanced Features:
 * - Real QR code generation using QRCode.js
 * - Toast notifications for better UX
 * - Copy-to-clipboard functionality
 * - Form validation with error messages
 * - Loading states and animations
 * - Export/download functionality
 * - Mobile-responsive design
 */

/**
 * Generate the barber payment QR code template page
 * 
 * This page includes:
 * - Form with input fields for all payment methods (CashApp, Venmo, PayPal)
 * - Real-time preview with actual QR code generation
 * - Print button for template export
 * - Copy-to-clipboard for URLs
 * - Save to database functionality
 * - Toast notifications for user feedback
 * 
 * @param barberId - The barber's unique identifier
 * @returns HTML string for the template page
 */
export function generateBarberTemplatePage(barberId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment QR Code Template - Barber ${barberId}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #00ff88;
      --secondary: #00d4ff;
      --bg: #0a0a0f;
      --panel: #111118;
      --border: #22222a;
      --text: #e0e0e0;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 14px;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--primary);
    }
    .header h1 {
      color: var(--primary);
      font-size: 24px;
      margin-bottom: 10px;
    }
    .form-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .form-section h2 {
      color: var(--secondary);
      font-size: 18px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      color: var(--text);
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .form-group input {
      width: 100%;
      background: #16161f;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      transition: all 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
    }
    .form-group input.error {
      border-color: #ff3366;
    }
    .form-group input.valid {
      border-color: var(--primary);
    }
    .error-message {
      color: #ff3366;
      font-size: 11px;
      margin-top: 5px;
      display: none;
    }
    .error-message.show {
      display: block;
    }
    .form-group small {
      display: block;
      color: #666;
      margin-top: 5px;
      font-size: 11px;
    }
    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 25px;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--primary);
      color: #000;
      font-weight: bold;
    }
    .btn-primary:hover:not(:disabled) {
      background: #00cc6f;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
    }
    .btn-secondary {
      background: var(--secondary);
      color: #000;
      font-weight: bold;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #00b8e6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
    }
    .btn-icon {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text);
      padding: 8px 12px;
      font-size: 12px;
    }
    .btn-icon:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
    }
    .btn-loading {
      pointer-events: none;
    }
    .btn-loading::after {
      content: '';
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-left: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .preview-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .template-preview {
      background: #fff;
      color: #000;
      padding: 40px;
      border-radius: 8px;
      max-width: 600px;
      margin: 0 auto;
    }
    .template-header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .template-header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .template-header p {
      font-size: 14px;
      color: #666;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 30px auto;
      gap: 15px;
    }
    .qr-code-wrapper {
      width: 200px;
      height: 200px;
      border: 3px solid #000;
      border-radius: 8px;
      padding: 10px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    #qrCode {
      width: 100%;
      height: 100%;
    }
    .qr-loading {
      color: #999;
      font-size: 12px;
      text-align: center;
    }
    .qr-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .payment-methods {
      margin: 30px 0;
    }
    .payment-method {
      display: flex;
      justify-content: space-between;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    .payment-method:last-child {
      border-bottom: none;
    }
    .payment-method-label {
      font-weight: bold;
      font-size: 16px;
    }
    .payment-method-value {
      font-size: 16px;
      color: #333;
    }
    .qr-url {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      text-align: center;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
    }
    .instructions {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
    }
    .instructions h3 {
      color: #856404;
      margin-bottom: 10px;
    }
    .instructions ul {
      color: #856404;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 5px;
    }
    .toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--panel);
      border: 1px solid var(--primary);
      border-radius: 8px;
      padding: 15px 20px;
      color: var(--text);
      font-size: 14px;
      z-index: 10000;
      display: none;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    }
    .toast.show {
      display: flex;
    }
    .toast.success {
      border-color: var(--primary);
    }
    .toast.error {
      border-color: #ff3366;
    }
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .telemetry-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      max-height: 500px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .telemetry-header {
      background: linear-gradient(90deg, #16161f, #1e1e2a);
      padding: 12px 15px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .telemetry-header h3 {
      color: var(--secondary);
      font-size: 14px;
      margin: 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: var(--text);
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .btn-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .telemetry-content {
      padding: 15px;
      overflow-y: auto;
      max-height: 450px;
    }
    .telemetry-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-item {
      background: #16161f;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
    .stat-label {
      display: block;
      color: #666;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .stat-value {
      display: block;
      color: var(--primary);
      font-size: 18px;
      font-weight: bold;
    }
    .percentile-badge {
      display: inline-block;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid var(--primary);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      margin: 2px;
      color: var(--primary);
    }
    .telemetry-events h4 {
      color: var(--secondary);
      font-size: 12px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .event-item {
      background: #16161f;
      padding: 8px;
      margin-bottom: 6px;
      border-radius: 4px;
      border-left: 3px solid var(--primary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .event-type {
      color: var(--text);
      text-transform: capitalize;
    }
    .event-time {
      color: #666;
      font-size: 10px;
    }
    .telemetry-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--primary);
      color: #000;
      border: none;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
      z-index: 9998;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .telemetry-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 255, 136, 0.4);
    }
    @media (max-width: 768px) {
      .telemetry-panel {
        width: calc(100% - 40px);
        right: 20px;
        left: 20px;
        max-height: 60vh;
      }
      .telemetry-toggle {
        bottom: 80px;
      }
    }
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      z-index: 1000;
    }
    .loading-overlay.show {
      display: flex;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @media (max-width: 768px) {
      body { padding: 10px; }
      .container { max-width: 100%; }
      .button-group { flex-direction: column; }
      .btn { width: 100%; justify-content: center; }
      .qr-code-wrapper { width: 180px; height: 180px; }
      .template-preview { padding: 20px; }
    }
    @media print {
      body { background: white; }
      .form-section, .button-group, .qr-actions, .toast { display: none !important; }
      .template-preview {
        max-width: 100%;
        page-break-inside: avoid;
      }
      .qr-code-wrapper {
        border: 2px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Barber Payment QR Code Template</h1>
      <p>Fill in your payment information below</p>
    </div>
    
    <div class="form-section">
      <h2>Payment Information</h2>
      <form id="paymentForm">
        <div class="form-group">
          <label for="cashapp">CashApp Cashtag</label>
          <input type="text" id="cashapp" name="cashapp" placeholder="$YourCashtag" 
                 pattern="^\\$?[a-zA-Z0-9]+$" />
          <small>Your CashApp cashtag (e.g., $JohnBarberFresh)</small>
          <div class="error-message" id="cashappError"></div>
        </div>
        
        <div class="form-group">
          <label for="venmo">Venmo Username</label>
          <input type="text" id="venmo" name="venmo" placeholder="@YourVenmo" 
                 pattern="^@?[a-zA-Z0-9_-]+$" />
          <small>Your Venmo username (e.g., @JohnBarber-Fresh)</small>
          <div class="error-message" id="venmoError"></div>
        </div>
        
        <div class="form-group">
          <label for="paypal">PayPal Email</label>
          <input type="email" id="paypal" name="paypal" placeholder="your@email.com" />
          <small>Your PayPal email address</small>
          <div class="error-message" id="paypalError"></div>
        </div>
        
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" placeholder="555-0100" 
                 pattern="[0-9\\-\\+\\(\\)\\s]+" />
          <small>Contact phone number</small>
          <div class="error-message" id="phoneError"></div>
        </div>
        
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" placeholder="barber@freshcuts.com" />
          <small>Contact email address</small>
          <div class="error-message" id="emailError"></div>
        </div>
        
        <div class="button-group">
          <button type="submit" class="btn btn-primary" id="saveBtn">
            <span>💾</span>
            <span>Save Payment Info</span>
          </button>
          <button type="button" class="btn btn-secondary" onclick="window.print()">
            <span>🖨️</span>
            <span>Print Template</span>
          </button>
          <button type="button" class="btn btn-icon" onclick="downloadQRCode()">
            <span>⬇️</span>
            <span>Download QR</span>
          </button>
        </div>
      </form>
    </div>
    
    <div class="preview-section">
      <h2 style="color: var(--secondary); margin-bottom: 20px;">Template Preview</h2>
      <div class="template-preview" id="templatePreview">
        <div class="template-header">
          <h1>Barber Payment QR Code</h1>
          <p id="barberName">Barber Name</p>
          <p id="barberCode" style="font-size: 12px; color: #666;">Code: <span id="barberCodeValue">-</span></p>
        </div>
        
        <div class="qr-container">
          <div class="qr-code-wrapper">
            <canvas id="qrCode"></canvas>
            <div class="qr-loading" id="qrLoading">Generating QR code...</div>
          </div>
          <div class="qr-actions">
            <button class="btn btn-icon" onclick="copyToClipboard('webUrlValue', 'Web URL')" style="font-size: 11px;">
              📋 Copy Web URL
            </button>
            <button class="btn btn-icon" onclick="copyToClipboard('universalLinkValue', 'Universal Link')" style="font-size: 11px;">
              📋 Copy Universal Link
            </button>
          </div>
        </div>
        
        <div class="qr-url" onclick="copyToClipboard('webUrlValue', 'Web URL')" title="Click to copy">
          <strong>Web URL:</strong><br/>
          <span id="webUrlValue">Loading...</span>
        </div>
        
        <div class="qr-url" style="background: #e3f2fd; border: 1px solid #2196f3;" onclick="copyToClipboard('universalLinkValue', 'Universal Link')" title="Click to copy">
          <strong>Universal Link (iOS/Android):</strong><br/>
          <span id="universalLinkValue">Loading...</span>
        </div>
        
        <div class="qr-url" style="background: #f3e5f5; border: 1px solid #9c27b0;" onclick="copyToClipboard('deeplinkValue', 'Deeplink')" title="Click to copy">
          <strong>Deeplink (App):</strong><br/>
          <span id="deeplinkValue">Loading...</span>
        </div>
        
        <div class="payment-methods">
          <div class="payment-method">
            <span class="payment-method-label">💚 CashApp:</span>
            <span class="payment-method-value" id="cashappValue">-</span>
          </div>
          <div class="payment-method">
            <span class="payment-method-label">💙 Venmo:</span>
            <span class="payment-method-value" id="venmoValue">-</span>
          </div>
          <div class="payment-method">
            <span class="payment-method-label">🅿️ PayPal:</span>
            <span class="payment-method-value" id="paypalValue">-</span>
          </div>
        </div>
        
        <div class="instructions">
          <h3>Instructions for Design Team:</h3>
          <ul>
            <li><strong>QR Code URL:</strong> Use the Universal Link for best mobile compatibility</li>
            <li><strong>Deeplink Support:</strong> QR code will open app if installed, otherwise web</li>
            <li><strong>Backend Routing:</strong> Payment URL routes to appropriate method automatically</li>
            <li><strong>Placement:</strong> Place QR code in the placeholder area above</li>
            <li><strong>Payment Methods:</strong> Include all configured methods shown above</li>
            <li><strong>Testing:</strong> Test with both app installed and web-only scenarios</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <div class="toast" id="toast"></div>
  
  <div class="telemetry-panel" id="telemetryPanel" style="display: none;">
    <div class="telemetry-header">
      <h3>📊 Template Analytics</h3>
      <button class="btn-close" onclick="toggleTelemetry()">✕</button>
    </div>
    <div class="telemetry-content">
      <div class="telemetry-stats" id="telemetryStats">
        <div class="stat-item">
          <span class="stat-label">Total Views:</span>
          <span class="stat-value" id="statViews">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">QR Generations:</span>
          <span class="stat-value" id="statQRGen">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Saves:</span>
          <span class="stat-value" id="statSaves">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Downloads:</span>
          <span class="stat-value" id="statDownloads">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Copies:</span>
          <span class="stat-value" id="statCopies">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Prints:</span>
          <span class="stat-value" id="statPrints">-</span>
        </div>
      </div>
      <div class="telemetry-events" id="telemetryEvents">
        <h4>Recent Events</h4>
        <div id="eventsList"></div>
      </div>
    </div>
  </div>
  
  <button class="telemetry-toggle" onclick="toggleTelemetry()" title="Show Analytics">
    📊
  </button>
  
  <script>
    // Telemetry tracking system with entity tracking
    function trackEvent(eventType, data = {}) {
      const eventData = {
        eventType: \`template_\${eventType}\`,
        barberId: barberId,
        data: {
          ...data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }
      };
      
      // Send to backend (fire and forget)
      fetch('/elite/template/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }).catch(err => console.error('Telemetry error:', err));
      
      // Also track with entity tracking if we have entity data
      const email = document.getElementById('email')?.value?.trim();
      const phone = document.getElementById('phone')?.value?.trim();
      
      if (email || phone || barberId) {
        trackEntityEvent(eventType, {
          email,
          phone,
          barberId,
          ...data
        });
      }
      
      // Update local stats
      updateLocalStats(eventType);
    }
    
    // Entity tracking function
    function trackEntityEvent(eventType, entities, eventData = {}) {
      const payload = {
        eventType: \`template_\${eventType}\`,
        entities: {
          barberId: entities.barberId || barberId,
          email: entities.email || null,
          phone: entities.phone || null,
          customerId: entities.customerId || null,
          paymentId: entities.paymentId || null,
          location: entities.location || null,
          zipcode: entities.zipcode || null,
          geocode: entities.geocode || null,
        },
        data: {
          ...eventData,
          timestamp: Date.now(),
          url: window.location.href,
        }
      };
      
      // Remove null values
      Object.keys(payload.entities).forEach(key => {
        if (payload.entities[key] === null) {
          delete payload.entities[key];
        }
      });
      
      fetch('/elite/tracking/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.error('Entity tracking error:', err));
    }
    
    // Local stats storage
    const localStats = {
      views: 0,
      qrGen: 0,
      saves: 0,
      downloads: 0,
      copies: 0,
      prints: 0,
    };
    
    function updateLocalStats(eventType) {
      const statMap = {
        'view': 'views',
        'qr_generated': 'qrGen',
        'save': 'saves',
        'download': 'downloads',
        'copy': 'copies',
        'print': 'prints',
      };
      
      const statKey = statMap[eventType];
      if (statKey) {
        localStats[statKey]++;
        updateTelemetryDisplay();
      }
    }
    
    async function loadTelemetryStats() {
      try {
        const res = await fetch(\`/elite/template/telemetry?barberId=\${barberId}&limit=50&percentiles=true&analytics=true\`);
        const data = await res.json();
        
        if (data.stats) {
          const statsMap = {};
          data.stats.forEach(stat => {
            const eventName = stat.eventType.replace('template_', '');
            statsMap[eventName] = parseInt(stat.count) || 0;
          });
          
          document.getElementById('statViews').textContent = statsMap.view || 0;
          document.getElementById('statQRGen').textContent = statsMap.qr_generated || 0;
          document.getElementById('statSaves').textContent = statsMap.save || 0;
          document.getElementById('statDownloads').textContent = statsMap.download || 0;
          document.getElementById('statCopies').textContent = statsMap.copy || 0;
          document.getElementById('statPrints').textContent = statsMap.print || 0;
        }
        
        // Display percentiles if available
        if (data.percentiles) {
          displayPercentiles(data.percentiles);
        }
        
        // Display analytics summary if available
        if (data.analytics && data.analytics.summary) {
          displayAnalyticsSummary(data.analytics.summary);
        }
        
        if (data.events && data.events.length > 0) {
          const eventsList = document.getElementById('eventsList');
          eventsList.innerHTML = data.events.slice(0, 10).map(event => {
            const eventData = JSON.parse(event.data || '{}');
            const eventType = event.eventType.replace('template_', '');
            const time = new Date(event.timestamp).toLocaleString();
            return \`
              <div class="event-item">
                <span class="event-type">\${eventType}</span>
                <span class="event-time">\${time}</span>
              </div>
            \`;
          }).join('');
        }
      } catch (err) {
        console.error('Failed to load telemetry:', err);
      }
    }
    
    function displayPercentiles(percentiles) {
      const statsContainer = document.getElementById('telemetryStats');
      
      // Find percentile data for QR generation
      const qrPercentiles = percentiles['template_qr_generated'];
      if (qrPercentiles) {
        const percentileHtml = \`
          <div class="stat-item" style="grid-column: 1 / -1; border-top: 2px solid var(--border); padding-top: 15px; margin-top: 10px;">
            <div style="color: var(--secondary); font-size: 11px; margin-bottom: 8px; text-transform: uppercase;">QR Generation Performance</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              <div>
                <div class="stat-label">P50</div>
                <div class="stat-value" style="font-size: 14px;">\${qrPercentiles.p50.toFixed(0)}ms</div>
              </div>
              <div>
                <div class="stat-label">P95</div>
                <div class="stat-value" style="font-size: 14px;">\${qrPercentiles.p95.toFixed(0)}ms</div>
              </div>
              <div>
                <div class="stat-label">P99</div>
                <div class="stat-value" style="font-size: 14px;">\${qrPercentiles.p99.toFixed(0)}ms</div>
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
              Avg: \${qrPercentiles.avg.toFixed(0)}ms | Min: \${qrPercentiles.min.toFixed(0)}ms | Max: \${qrPercentiles.max.toFixed(0)}ms
            </div>
          </div>
        \`;
        statsContainer.insertAdjacentHTML('beforeend', percentileHtml);
      }
    }
    
    function displayAnalyticsSummary(summary) {
      const statsContainer = document.getElementById('telemetryStats');
      
      const summaryHtml = \`
        <div class="stat-item" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.1)); border: 1px solid var(--primary); padding: 12px; margin-bottom: 10px;">
          <div style="color: var(--primary); font-size: 11px; margin-bottom: 8px; text-transform: uppercase; font-weight: bold;">Overall Analytics</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
            <div>
              <span style="color: #666;">Total Events:</span>
              <span style="color: var(--text); font-weight: bold; margin-left: 8px;">\${summary.totalEvents}</span>
            </div>
            <div>
              <span style="color: #666;">Success Rate:</span>
              <span style="color: var(--primary); font-weight: bold; margin-left: 8px;">\${summary.successRate.toFixed(1)}%</span>
            </div>
            <div>
              <span style="color: #666;">Event Types:</span>
              <span style="color: var(--text); font-weight: bold; margin-left: 8px;">\${summary.eventTypes}</span>
            </div>
            <div>
              <span style="color: #666;">Errors:</span>
              <span style="color: #ff3366; font-weight: bold; margin-left: 8px;">\${summary.errorEvents}</span>
            </div>
          </div>
        </div>
      \`;
      statsContainer.insertAdjacentHTML('afterbegin', summaryHtml);
    }
    
    function updateTelemetryDisplay() {
      document.getElementById('statViews').textContent = localStats.views;
      document.getElementById('statQRGen').textContent = localStats.qrGen;
      document.getElementById('statSaves').textContent = localStats.saves;
      document.getElementById('statDownloads').textContent = localStats.downloads;
      document.getElementById('statCopies').textContent = localStats.copies;
      document.getElementById('statPrints').textContent = localStats.prints;
    }
    
    function toggleTelemetry() {
      const panel = document.getElementById('telemetryPanel');
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loadTelemetryStats();
      } else {
        panel.style.display = 'none';
      }
    }
    
    // Track initial page view
    trackEvent('view', { referrer: document.referrer });
    
    // Toast notification system
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = \`toast \${type} show\`;
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
    
    // Copy to clipboard functionality
    async function copyToClipboard(elementId, label) {
      const element = document.getElementById(elementId);
      const text = element.textContent.trim();
      
      if (!text || text === 'Loading...') {
        showToast('No URL available to copy', 'error');
        return;
      }
      
      trackEvent('copy', { urlType: label, url: text });
      
      try {
        await navigator.clipboard.writeText(text);
        showToast(\`\${label} copied to clipboard!\`, 'success');
        
        // Visual feedback
        const urlElement = element.closest('.qr-url');
        if (urlElement) {
          urlElement.classList.add('url-copied');
          setTimeout(() => {
            urlElement.classList.remove('url-copied');
          }, 2000);
        }
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showToast(\`\${label} copied to clipboard!\`, 'success');
        } catch (e) {
          showToast('Failed to copy. Please select and copy manually.', 'error');
          trackEvent('copy_error', { error: e.message });
        }
        document.body.removeChild(textArea);
      }
    }
    
    // Download QR code as image
    function downloadQRCode() {
      const canvas = document.getElementById('qrCode');
      if (!canvas || !canvas.width) {
        showToast('QR code not ready yet', 'error');
        return;
      }
      
      trackEvent('download', { format: 'png' });
      
      const link = document.createElement('a');
      link.download = \`barber-\${barberId}-qr-code.png\`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('QR code downloaded!', 'success');
    }
    
    // Generate QR code
    function generateQRCode(url) {
      const canvas = document.getElementById('qrCode');
      const loading = document.getElementById('qrLoading');
      
      if (!window.QRCode) {
        loading.textContent = 'QR library loading...';
        setTimeout(() => generateQRCode(url), 500);
        return;
      }
      
      loading.style.display = 'none';
      
      const startTime = performance.now();
      
      QRCode.toCanvas(canvas, url, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      }, (err) => {
        const generationTime = performance.now() - startTime;
        
        if (err) {
          loading.style.display = 'block';
          loading.textContent = 'Failed to generate QR code';
          console.error('QR Code generation error:', err);
          trackEvent('qr_error', { error: err.message, url });
        } else {
          trackEvent('qr_generated', { 
            url,
            generationTime: Math.round(generationTime),
            size: '180x180'
          });
        }
      });
    }
    
    // Form validation
    function validateField(fieldId, value, pattern) {
      const field = document.getElementById(fieldId);
      const errorEl = document.getElementById(fieldId + 'Error');
      
      if (!value) {
        field.classList.remove('error', 'valid');
        if (errorEl) errorEl.classList.remove('show');
        return true; // Empty is OK (optional fields)
      }
      
      if (pattern && !pattern.test(value)) {
        field.classList.add('error');
        field.classList.remove('valid');
        if (errorEl) {
          errorEl.textContent = 'Invalid format';
          errorEl.classList.add('show');
        }
        return false;
      }
      
      field.classList.remove('error');
      field.classList.add('valid');
      if (errorEl) errorEl.classList.remove('show');
      return true;
    }
    
    function validateForm() {
      const cashapp = document.getElementById('cashapp').value.trim();
      const venmo = document.getElementById('venmo').value.trim();
      const paypal = document.getElementById('paypal').value.trim();
      const email = document.getElementById('email').value.trim();
      
      let isValid = true;
      
      if (cashapp) {
        isValid = validateField('cashapp', cashapp, /^\\$?[a-zA-Z0-9]+$/) && isValid;
      }
      if (venmo) {
        isValid = validateField('venmo', venmo, /^@?[a-zA-Z0-9_-]+$/) && isValid;
      }
      if (paypal) {
        isValid = validateField('paypal', paypal, /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/) && isValid;
      }
      if (email) {
        isValid = validateField('email', email, /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/) && isValid;
      }
      
      // At least one payment method required
      if (!cashapp && !venmo && !paypal) {
        showToast('Please provide at least one payment method', 'error');
        isValid = false;
      }
      
      return isValid;
    }
    const barberId = '${barberId}';
    
    // Load existing payment info
    async function loadPaymentInfo() {
      try {
        // First try to get payment info
        const res = await fetch(\`/elite/barber/\${barberId}/payment-info\`);
        const data = await res.json();
        
        if (data.paymentInfo) {
          const info = data.paymentInfo;
          document.getElementById('cashapp').value = info.cashapp || '';
          document.getElementById('venmo').value = info.venmo || '';
          document.getElementById('paypal').value = info.paypal || '';
          document.getElementById('phone').value = info.phone || '';
          document.getElementById('email').value = info.email || '';
          
          updatePreview(info);
        } else {
          // Load barber basic info if payment info doesn't exist
          const barbersRes = await fetch('/elite/barbers');
          const barbersData = await barbersRes.json();
          const barber = barbersData.barbers.find(b => b.id === barberId);
          if (barber) {
            const basicInfo = {
              name: barber.name,
              code: barber.code || barberId,
              cashapp: barber.cashapp || null,
              venmo: barber.venmo || null,
              paypal: barber.paypal || null,
              phone: barber.phone || null,
              email: barber.email || null,
              webUrl: \`\${window.location.origin}/pay/\${barberId}\`,
              universalLink: \`https://\${window.location.host}/pay/\${barberId}\`,
              deeplinkUrl: \`barbershop://pay/\${barberId}\`
            };
            
            document.getElementById('cashapp').value = basicInfo.cashapp || '';
            document.getElementById('venmo').value = basicInfo.venmo || '';
            document.getElementById('paypal').value = basicInfo.paypal || '';
            document.getElementById('phone').value = basicInfo.phone || '';
            document.getElementById('email').value = basicInfo.email || '';
            
            updatePreview(basicInfo);
          } else {
            // Fallback if barber not found
            document.getElementById('barberName').textContent = 'Barber ' + barberId;
            document.getElementById('barberCodeValue').textContent = barberId;
            document.getElementById('webUrlValue').textContent = \`\${window.location.origin}/pay/\${barberId}\`;
            document.getElementById('universalLinkValue').textContent = \`https://\${window.location.host}/pay/\${barberId}\`;
            document.getElementById('deeplinkValue').textContent = \`barbershop://pay/\${barberId}\`;
          }
        }
      } catch (err) {
        console.error('Failed to load payment info:', err);
        document.getElementById('webUrlValue').textContent = \`\${window.location.origin}/pay/\${barberId}\`;
        document.getElementById('universalLinkValue').textContent = \`https://\${window.location.host}/pay/\${barberId}\`;
        document.getElementById('deeplinkValue').textContent = \`barbershop://pay/\${barberId}\`;
      }
    }
    
    function updatePreview(info) {
      document.getElementById('barberName').textContent = info.name || 'Barber Name';
      document.getElementById('barberCodeValue').textContent = info.code || barberId;
      
      const webUrl = info.webUrl || info.qrCodeUrl || \`\${window.location.origin}/pay/\${barberId}\`;
      const universalLink = info.universalLink || \`https://\${window.location.host}/pay/\${barberId}\`;
      const deeplinkUrl = info.deeplinkUrl || \`barbershop://pay/\${barberId}\`;
      
      document.getElementById('webUrlValue').textContent = webUrl;
      document.getElementById('universalLinkValue').textContent = universalLink;
      document.getElementById('deeplinkValue').textContent = deeplinkUrl;
      
      document.getElementById('cashappValue').textContent = info.cashapp || 'Not configured';
      document.getElementById('venmoValue').textContent = info.venmo || 'Not configured';
      document.getElementById('paypalValue').textContent = info.paypal || 'Not configured';
      
      // Generate QR code with universal link (best for mobile)
      generateQRCode(universalLink);
    }
    
    // Form submission
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }
      
      const saveBtn = document.getElementById('saveBtn');
      saveBtn.classList.add('btn-loading');
      saveBtn.disabled = true;
      
      const formData = {
        cashapp: document.getElementById('cashapp').value.trim(),
        venmo: document.getElementById('venmo').value.trim(),
        paypal: document.getElementById('paypal').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
      };
      
      try {
        const res = await fetch(\`/elite/barber/\${barberId}/payment-info\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        const data = await res.json();
        if (data.success) {
          // Track save with entity data
          trackEntityEvent('save', {
            barberId: barberId,
            email: formData.email,
            phone: formData.phone,
          }, {
            hasCashApp: !!formData.cashapp,
            hasVenmo: !!formData.venmo,
            hasPayPal: !!formData.paypal,
            paymentMethods: [formData.cashapp && 'cashapp', formData.venmo && 'venmo', formData.paypal && 'paypal'].filter(Boolean),
          });
          
          trackEvent('save', {
            hasCashApp: !!formData.cashapp,
            hasVenmo: !!formData.venmo,
            hasPayPal: !!formData.paypal,
            hasPhone: !!formData.phone,
            hasEmail: !!formData.email,
          });
          showToast('Payment information saved successfully!', 'success');
          updatePreview(data.paymentInfo);
        } else {
          trackEvent('save_error', { error: data.error || 'Unknown error' });
          showToast('Failed to save: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        trackEvent('save_error', { error: err.message });
        showToast('Error saving payment info: ' + err.message, 'error');
      } finally {
        saveBtn.classList.remove('btn-loading');
        saveBtn.disabled = false;
      }
    });
    
    // Track print events
    window.addEventListener('beforeprint', () => {
      trackEvent('print', { timestamp: Date.now() });
    });
    
    // Track form field interactions
    ['cashapp', 'venmo', 'paypal', 'phone', 'email'].forEach(field => {
      const fieldEl = document.getElementById(field);
      let interactionCount = 0;
      
      fieldEl.addEventListener('focus', () => {
        interactionCount++;
        if (interactionCount === 1) {
          trackEvent('field_focus', { field });
        }
      });
    });
    
    // Real-time preview updates with validation
    ['cashapp', 'venmo', 'paypal', 'phone', 'email'].forEach(field => {
      const fieldEl = document.getElementById(field);
      fieldEl.addEventListener('input', () => {
        const value = fieldEl.value.trim();
        
        // Validate on input
        if (field === 'cashapp' && value) {
          validateField('cashapp', value, /^\\$?[a-zA-Z0-9]+$/);
        } else if (field === 'venmo' && value) {
          validateField('venmo', value, /^@?[a-zA-Z0-9_-]+$/);
        } else if (field === 'paypal' && value) {
          validateField('paypal', value, /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/);
        } else if (field === 'email' && value) {
          validateField('email', value, /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/);
        }
        
        // Update preview
        const info = {
          name: document.getElementById('barberName').textContent,
          code: document.getElementById('barberCodeValue').textContent,
          cashapp: document.getElementById('cashapp').value.trim() || null,
          venmo: document.getElementById('venmo').value.trim() || null,
          paypal: document.getElementById('paypal').value.trim() || null,
          webUrl: document.getElementById('webUrlValue').textContent,
          universalLink: document.getElementById('universalLinkValue').textContent,
          deeplinkUrl: document.getElementById('deeplinkValue').textContent,
        };
        updatePreview(info);
      });
    });
    
    // Load on page load
    loadPaymentInfo();
  </script>
</body>
</html>`;
}

/**
 * Payment info interface matching the database schema
 */
export interface BarberPaymentInfo {
  barberId: string;
  barberName: string;
  barberCode: string;
  cashapp?: string;      // e.g., "$JohnBarberFresh"
  venmo?: string;        // e.g., "@JohnBarber-Fresh"
  paypal?: string;       // e.g., "john.barber@freshcuts.com"
  phone?: string;
  email?: string;
  qrCodeUrl: string;     // Generated: "/pay/{barberId}"
  webUrl?: string;       // Full web URL
  universalLink?: string; // Universal link for mobile
  deeplinkUrl?: string;  // Deeplink URL for app
}
