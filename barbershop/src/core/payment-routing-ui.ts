// payment-routing-ui.ts - Admin Payment Routing UI Components
// Split payments, routing configuration, and fallback plans management

import {
  generateLayoutCSS,
  generateThemeCSS,
} from './ui-components';

const RESOURCE_HINTS = '';

// ==================== TYPES ====================

export type PaymentSplitType = 'equal' | 'percentage' | 'fixed' | 'custom';

export interface SplitRecipientUI {
  barberId: string;
  barberName: string;
  splitType: PaymentSplitType;
  splitValue: number;
}

export interface PendingPaymentUI {
  id: string;
  ticketId: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  recipients: SplitRecipientUI[];
}

// ==================== ADMIN PAYMENT ROUTING PANEL ====================

export function renderPaymentRoutingPanel(): string {
  return `
    <div class="payment-routing-panel">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button class="tab-btn active" data-tab="routes">🛤️ Routes</button>
        <button class="tab-btn" data-tab="splits">💸 Split Payments</button>
        <button class="tab-btn" data-tab="fallbacks">🔄 Fallback Plans</button>
        <button class="tab-btn" data-tab="config">⚙️ Configuration</button>
      </div>

      <!-- Routes Tab -->
      <div class="tab-content active" id="tab-routes">
        <div class="section-header">
          <h3>Payment Routes</h3>
          <button class="btn btn-primary" onclick="openRouteModal()">
            <span>+ New Route</span>
          </button>
        </div>
        <div class="routes-list" id="routesList">
          <div class="loading-state">Loading routes...</div>
        </div>
      </div>

      <!-- Split Payments Tab -->
      <div class="tab-content" id="tab-splits">
        <div class="section-header">
          <h3>Pending Split Payments</h3>
          <button class="btn btn-secondary" onclick="refreshPendingSplits()">
            <span>🔄 Refresh</span>
          </button>
        </div>
        <div class="splits-list" id="splitsList">
          <div class="loading-state">Loading split payments...</div>
        </div>
      </div>

      <!-- Fallback Plans Tab -->
      <div class="tab-content" id="tab-fallbacks">
        <div class="section-header">
          <h3>Fallback Plans</h3>
          <button class="btn btn-primary" onclick="openFallbackModal()">
            <span>+ New Plan</span>
          </button>
        </div>
        <div class="fallbacks-list" id="fallbacksList">
          <div class="loading-state">Loading fallback plans...</div>
        </div>
      </div>

      <!-- Configuration Tab -->
      <div class="tab-content" id="tab-config">
        <div class="section-header">
          <h3>Routing Configuration</h3>
          <button class="btn btn-success" onclick="saveRoutingConfig()">
            <span>💾 Save</span>
          </button>
        </div>
        <div class="config-form" id="configForm">
          ${renderConfigForm()}
        </div>
      </div>
    </div>

    <!-- Route Modal -->
    <div class="modal" id="routeModal" style="display: none;">
      <div class="modal-backdrop" onclick="closeRouteModal()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="routeModalTitle">New Payment Route</h3>
          <button class="modal-close" onclick="closeRouteModal()">×</button>
        </div>
        <div class="modal-body">
          ${renderRouteForm()}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeRouteModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveRoute()">Save Route</button>
        </div>
      </div>
    </div>

    <!-- Fallback Modal -->
    <div class="modal" id="fallbackModal" style="display: none;">
      <div class="modal-backdrop" onclick="closeFallbackModal()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="fallbackModalTitle">New Fallback Plan</h3>
          <button class="modal-close" onclick="closeFallbackModal()">×</button>
        </div>
        <div class="modal-body">
          ${renderFallbackForm()}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeFallbackModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveFallback()">Save Plan</button>
        </div>
      </div>
    </div>

    <!-- Split Payment Modal -->
    <div class="modal" id="splitModal" style="display: none;">
      <div class="modal-backdrop" onclick="closeSplitModal()"></div>
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>Configure Split Payment</h3>
          <button class="modal-close" onclick="closeSplitModal()">×</button>
        </div>
        <div class="modal-body">
          ${renderSplitForm()}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSplitModal()">Cancel</button>
          <button class="btn btn-primary" onclick="processSplit()">Process Split</button>
        </div>
      </div>
    </div>

    <style>
      .payment-routing-panel {
        background: var(--color-background-primary, #fff);
        border: 1px solid var(--color-border-light, #e5e7eb);
        border-radius: var(--radius-lg, 12px);
        overflow: hidden;
      }

      .tab-nav {
        display: flex;
        border-bottom: 1px solid var(--color-border-light, #e5e7eb);
        background: var(--color-background-secondary, #f9fafb);
      }

      .tab-btn {
        flex: 1;
        padding: 1rem;
        background: transparent;
        border: none;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 2px solid transparent;
      }

      .tab-btn:hover {
        color: var(--color-text-primary, #111827);
        background: var(--color-background-tertiary, #f3f4f6);
      }

      .tab-btn.active {
        color: var(--color-primary-600, #2563eb);
        border-bottom-color: var(--color-primary-600, #2563eb);
        background: var(--color-background-primary, #fff);
      }

      .tab-content {
        display: none;
        padding: 1.5rem;
      }

      .tab-content.active {
        display: block;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .section-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: var(--radius-md, 8px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--color-primary-500, #3b82f6);
        color: white;
      }

      .btn-primary:hover {
        background: var(--color-primary-600, #2563eb);
      }

      .btn-secondary {
        background: var(--color-background-secondary, #f3f4f6);
        color: var(--color-text-primary, #111827);
        border: 1px solid var(--color-border-light, #e5e7eb);
      }

      .btn-secondary:hover {
        background: var(--color-background-tertiary, #e5e7eb);
      }

      .btn-success {
        background: var(--color-success-500, #22c55e);
        color: white;
      }

      .btn-success:hover {
        background: var(--color-success-600, #16a34a);
      }

      .btn-danger {
        background: var(--color-error-500, #ef4444);
        color: white;
      }

      .btn-danger:hover {
        background: var(--color-error-600, #dc2626);
      }

      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
      }

      /* Routes List */
      .routes-list, .splits-list, .fallbacks-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .route-card, .split-card, .fallback-card {
        background: var(--color-background-secondary, #f9fafb);
        border: 1px solid var(--color-border-light, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .route-info, .split-info, .fallback-info {
        flex: 1;
      }

      .route-name, .split-id, .fallback-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .route-meta, .split-meta, .fallback-meta {
        font-size: 0.75rem;
        color: var(--color-text-secondary, #6b7280);
      }

      .route-actions, .split-actions, .fallback-actions {
        display: flex;
        gap: 0.5rem;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-full, 9999px);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .status-active {
        background: var(--color-success-100, #dcfce7);
        color: var(--color-success-700, #15803d);
      }

      .status-paused {
        background: var(--color-warning-100, #fef3c7);
        color: var(--color-warning-700, #a16207);
      }

      .status-disabled {
        background: var(--color-error-100, #fee2e2);
        color: var(--color-error-700, #b91c1c);
      }

      .status-pending {
        background: var(--color-primary-100, #dbeafe);
        color: var(--color-primary-700, #1d4ed8);
      }

      /* Split Recipients */
      .split-recipients {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .recipient-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: var(--color-primary-50, #eff6ff);
        border: 1px solid var(--color-primary-200, #bfdbfe);
        border-radius: var(--radius-full, 9999px);
        font-size: 0.75rem;
      }

      .recipient-amount {
        font-weight: 600;
        color: var(--color-primary-700, #1d4ed8);
      }

      /* Loading State */
      .loading-state {
        text-align: center;
        padding: 2rem;
        color: var(--color-text-muted, #9ca3af);
      }

      /* Modal Styles */
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .modal-content {
        position: relative;
        background: var(--color-background-primary, #fff);
        border-radius: var(--radius-lg, 12px);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .modal-lg {
        max-width: 700px;
      }

      .modal-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--color-border-light, #e5e7eb);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.125rem;
      }

      .modal-close {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        font-size: 1.5rem;
        color: var(--color-text-muted, #9ca3af);
        cursor: pointer;
        border-radius: var(--radius-md, 8px);
      }

      .modal-close:hover {
        background: var(--color-background-secondary, #f3f4f6);
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
      }

      .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--color-border-light, #e5e7eb);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      /* Form Styles */
      .form-group {
        margin-bottom: 1rem;
      }

      .form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.375rem;
      }

      .form-input, .form-select, .form-textarea {
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--color-border-default, #d1d5db);
        border-radius: var(--radius-md, 8px);
        font-size: 0.875rem;
        background: var(--color-background-primary, #fff);
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .form-input:focus, .form-select:focus, .form-textarea:focus {
        outline: none;
        border-color: var(--color-primary-500, #3b82f6);
        box-shadow: 0 0 0 3px var(--color-primary-100, #dbeafe);
      }

      .form-textarea {
        min-height: 80px;
        resize: vertical;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .form-checkbox input {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary-500, #3b82f6);
      }

      .form-help {
        font-size: 0.75rem;
        color: var(--color-text-muted, #9ca3af);
        margin-top: 0.25rem;
      }

      /* Split Configuration */
      .split-config {
        background: var(--color-background-secondary, #f9fafb);
        border: 1px solid var(--color-border-light, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .split-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .split-config-title {
        font-weight: 600;
        font-size: 0.875rem;
      }

      .split-preview {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--color-primary-50, #eff6ff);
        border-radius: var(--radius-md, 8px);
      }

      .split-preview-title {
        font-weight: 600;
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
      }

      .split-preview-row {
        display: flex;
        justify-content: space-between;
        padding: 0.375rem 0;
        font-size: 0.875rem;
      }

      .split-preview-total {
        border-top: 2px solid var(--color-primary-200, #bfdbfe);
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        font-weight: 600;
      }

      /* Config Form */
      .config-section {
        background: var(--color-background-secondary, #f9fafb);
        border: 1px solid var(--color-border-light, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        padding: 1.25rem;
        margin-bottom: 1rem;
      }

      .config-section-title {
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--color-border-light, #e5e7eb);
      }

      /* Responsive */
      @media (max-width: 640px) {
        .form-row {
          grid-template-columns: 1fr;
        }
        .route-card, .split-card, .fallback-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }
        .route-actions, .split-actions, .fallback-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    </style>

    <script>
      // Tab Navigation
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          const tabId = 'tab-' + btn.dataset.tab;
          document.getElementById(tabId).classList.add('active');
        };
      });

      // Route Management
      let editingRouteId = null;
      
      function openRouteModal(routeId = null) {
        editingRouteId = routeId;
        document.getElementById('routeModalTitle').textContent = routeId ? 'Edit Route' : 'New Payment Route';
        document.getElementById('routeModal').style.display = 'flex';
        if (routeId) {
          loadRouteData(routeId);
        } else {
          clearRouteForm();
        }
      }

      function closeRouteModal() {
        document.getElementById('routeModal').style.display = 'none';
        editingRouteId = null;
      }

      async function loadRoutes() {
        try {
          const res = await fetch('/payment/routes');
          const data = await res.json();
          renderRoutes(data.routes || []);
        } catch (err) {
          document.getElementById('routesList').innerHTML = '<div class="loading-state">Failed to load routes</div>';
        }
      }

      function renderRoutes(routes) {
        if (routes.length === 0) {
          document.getElementById('routesList').innerHTML = '<div class="loading-state">No routes configured</div>';
          return;
        }
        document.getElementById('routesList').innerHTML = routes.map(r => \`
          <div class="route-card">
            <div class="route-info">
              <div class="route-name">\${r.name}</div>
              <div class="route-meta">
                Barber: \${r.barberName || r.barberId} | Priority: \${r.priority} | 
                Methods: \${r.paymentMethods?.join(', ') || 'all'}
              </div>
              <span class="status-badge status-\${r.status}">\${r.status}</span>
            </div>
            <div class="route-actions">
              <button class="btn btn-sm btn-secondary" onclick="openRouteModal('\${r.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteRoute('\${r.id}')">Delete</button>
            </div>
          </div>
        \`).join('');
      }

      async function saveRoute() {
        const data = {
          name: document.getElementById('routeName').value,
          barberId: document.getElementById('routeBarberId').value,
          paymentMethods: Array.from(document.getElementById('routeMethods').selectedOptions).map(o => o.value),
          priority: parseInt(document.getElementById('routePriority').value) || 100,
          maxDailyAmount: parseFloat(document.getElementById('routeMaxDaily').value) || null,
          maxTransactionAmount: parseFloat(document.getElementById('routeMaxTx').value) || null,
          status: document.getElementById('routeStatus').value,
        };

        try {
          const url = editingRouteId ? '/payment/routes/' + editingRouteId : '/payment/routes';
          const method = editingRouteId ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (result.success) {
            closeRouteModal();
            loadRoutes();
          } else {
            alert('Error: ' + result.error);
          }
        } catch (err) {
          alert('Failed to save route: ' + err.message);
        }
      }

      async function deleteRoute(routeId) {
        if (!confirm('Delete this route?')) return;
        try {
          const res = await fetch('/payment/routes/' + routeId, { method: 'DELETE' });
          const result = await res.json();
          if (result.success) loadRoutes();
          else alert('Error: ' + result.error);
        } catch (err) {
          alert('Failed to delete route: ' + err.message);
        }
      }

      function clearRouteForm() {
        document.getElementById('routeName').value = '';
        document.getElementById('routeBarberId').value = '';
        document.getElementById('routePriority').value = '100';
        document.getElementById('routeMaxDaily').value = '';
        document.getElementById('routeMaxTx').value = '';
        document.getElementById('routeStatus').value = 'active';
      }

      async function loadRouteData(routeId) {
        try {
          const res = await fetch('/payment/routes/' + routeId);
          const route = await res.json();
          if (route.id) {
            document.getElementById('routeName').value = route.name || '';
            document.getElementById('routeBarberId').value = route.barberId || '';
            document.getElementById('routePriority').value = route.priority || 100;
            document.getElementById('routeMaxDaily').value = route.maxDailyAmount || '';
            document.getElementById('routeMaxTx').value = route.maxTransactionAmount || '';
            document.getElementById('routeStatus').value = route.status || 'active';
          }
        } catch (err) {
          console.error('Failed to load route:', err);
        }
      }

      // Split Payment Management
      let currentSplitPayment = null;

      async function loadPendingSplits() {
        try {
          const res = await fetch('/payment/splits/pending');
          const data = await res.json();
          renderSplits(data.splits || []);
        } catch (err) {
          document.getElementById('splitsList').innerHTML = '<div class="loading-state">Failed to load split payments</div>';
        }
      }

      function refreshPendingSplits() {
        loadPendingSplits();
      }

      function renderSplits(splits) {
        if (splits.length === 0) {
          document.getElementById('splitsList').innerHTML = '<div class="loading-state">No pending split payments</div>';
          return;
        }
        document.getElementById('splitsList').innerHTML = splits.map(s => \`
          <div class="split-card">
            <div class="split-info">
              <div class="split-id">Ticket #\${s.ticketId?.slice(-6) || s.id?.slice(-6)}</div>
              <div class="split-meta">
                Customer: \${s.customerName || 'N/A'} | Total: $\${s.totalAmount?.toFixed(2) || '0.00'} | 
                Status: <span class="status-badge status-\${s.status}">\${s.status}</span>
              </div>
              \${s.recipients?.length ? \`
                <div class="split-recipients">
                  \${s.recipients.map(r => \`
                    <span class="recipient-chip">
                      \${r.barberName || r.barberId}: 
                      <span class="recipient-amount">\$${r.splitType === 'percentage' ? r.splitValue + '%' : r.splitValue.toFixed(2)}</span>
                    </span>
                  \`).join('')}
                </div>
              \` : ''}
            </div>
            <div class="split-actions">
              <button class="btn btn-sm btn-primary" onclick="openSplitModal('\${s.id}')">Configure Split</button>
              <button class="btn btn-sm btn-success" onclick="processSplitPayment('\${s.id}')">Process</button>
            </div>
          </div>
        \`).join('');
      }

      function openSplitModal(splitId) {
        currentSplitPayment = splitId;
        document.getElementById('splitModal').style.display = 'flex';
        loadSplitData(splitId);
      }

      function closeSplitModal() {
        document.getElementById('splitModal').style.display = 'none';
        currentSplitPayment = null;
      }

      async function loadSplitData(splitId) {
        try {
          const res = await fetch('/payment/splits/' + splitId);
          const split = await res.json();
          if (split.id) {
            document.getElementById('splitTotalAmount').value = split.totalAmount || 0;
            document.getElementById('splitTicketId').value = split.ticketId || '';
            renderSplitRecipients(split.recipients || []);
            updateSplitPreview();
          }
        } catch (err) {
          console.error('Failed to load split:', err);
        }
      }

      function renderSplitRecipients(recipients) {
        const container = document.getElementById('splitRecipients');
        container.innerHTML = recipients.map((r, i) => \`
          <div class="split-config" data-index="\${i}">
            <div class="split-config-header">
              <span class="split-config-title">Recipient \${i + 1}</span>
              <button class="btn btn-sm btn-danger" onclick="removeSplitRecipient(\${i})">×</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Barber</label>
                <select class="form-select split-barber" data-index="\${i}">
                  <option value="\${r.barberId}">\${r.barberName || r.barberId}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Split Type</label>
                <select class="form-select split-type" data-index="\${i}" onchange="updateSplitPreview()">
                  <option value="percentage" \${r.splitType === 'percentage' ? 'selected' : ''}>Percentage</option>
                  <option value="fixed" \${r.splitType === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
                  <option value="equal" \${r.splitType === 'equal' ? 'selected' : ''}>Equal Split</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Value</label>
              <input type="number" class="form-input split-value" data-index="\${i}" value="\${r.splitValue}" onchange="updateSplitPreview()" />
            </div>
          </div>
        \`).join('');
      }

      function addSplitRecipient() {
        const container = document.getElementById('splitRecipients');
        const index = container.children.length;
        const html = \`
          <div class="split-config" data-index="\${index}">
            <div class="split-config-header">
              <span class="split-config-title">Recipient \${index + 1}</span>
              <button class="btn btn-sm btn-danger" onclick="removeSplitRecipient(\${index})">×</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Barber</label>
                <select class="form-select split-barber" data-index="\${index}">
                  <option value="">Select barber...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Split Type</label>
                <select class="form-select split-type" data-index="\${index}" onchange="updateSplitPreview()">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="equal">Equal Split</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Value</label>
              <input type="number" class="form-input split-value" data-index="\${index}" value="0" onchange="updateSplitPreview()" />
            </div>
          </div>
        \`;
        container.insertAdjacentHTML('beforeend', html);
        loadBarbersIntoSelects();
      }

      function removeSplitRecipient(index) {
        const el = document.querySelector(\`.split-config[data-index="\${index}"]\`);
        if (el) el.remove();
        updateSplitPreview();
      }

      async function loadBarbersIntoSelects() {
        try {
          const res = await fetch('/barbers');
          const data = await res.json();
          const barbers = data.barbers || [];
          document.querySelectorAll('.split-barber').forEach(select => {
            const current = select.value;
            select.innerHTML = '<option value="">Select barber...</option>' + 
              barbers.map(b => \`<option value="\${b.id}">\${b.name} (\${b.code})</option>\`).join('');
            if (current) select.value = current;
          });
        } catch (err) {
          console.error('Failed to load barbers:', err);
        }
      }

      function updateSplitPreview() {
        const total = parseFloat(document.getElementById('splitTotalAmount').value) || 0;
        const configs = document.querySelectorAll('.split-config');
        let remaining = total;
        let totalPercent = 0;
        const allocations = [];

        configs.forEach((config, i) => {
          const type = config.querySelector(\`.split-type\`).value;
          const value = parseFloat(config.querySelector(\`.split-value\`).value) || 0;
          
          if (type === 'fixed') {
            allocations.push({ amount: value, type: 'fixed' });
            remaining -= value;
          } else if (type === 'percentage') {
            totalPercent += value;
            const amount = (value / 100) * total;
            allocations.push({ amount, type: 'percent', percent: value });
          }
        });

        // Handle equal splits
        const equalCount = Array.from(configs).filter(c => c.querySelector('.split-type').value === 'equal').length;
        if (equalCount > 0) {
          const equalAmount = remaining / equalCount;
          configs.forEach(config => {
            if (config.querySelector('.split-type').value === 'equal') {
              allocations.push({ amount: equalAmount, type: 'equal' });
            }
          });
        }

        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
        const remainder = total - totalAllocated;

        document.getElementById('splitPreviewTotal').textContent = '$' + totalAllocated.toFixed(2);
        document.getElementById('splitPreviewRemainder').textContent = '$' + Math.abs(remainder).toFixed(2);
        document.getElementById('splitPreviewValid').textContent = 
          remainder >= -0.01 && remainder <= 0.01 && totalPercent <= 100 ? '✓ Valid' : '⚠ Check values';
      }

      async function processSplit() {
        const configs = document.querySelectorAll('.split-config');
        const recipients = [];
        
        configs.forEach(config => {
          recipients.push({
            barberId: config.querySelector('.split-barber').value,
            splitType: config.querySelector('.split-type').value,
            splitValue: parseFloat(config.querySelector('.split-value').value) || 0,
          });
        });

        try {
          const res = await fetch('/payment/splits/' + currentSplitPayment, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ recipients })
          });
          const result = await res.json();
          if (result.success) {
            closeSplitModal();
            loadPendingSplits();
            alert('Split payment updated');
          } else {
            alert('Error: ' + result.error);
          }
        } catch (err) {
          alert('Failed to update split: ' + err.message);
        }
      }

      async function processSplitPayment(splitId) {
        if (!confirm('Process this split payment?')) return;
        try {
          const res = await fetch('/payment/splits/' + splitId + '/process', { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            loadPendingSplits();
            alert('Split payment processed successfully');
          } else {
            alert('Error: ' + result.error);
          }
        } catch (err) {
          alert('Failed to process split: ' + err.message);
        }
      }

      // Fallback Management
      let editingFallbackId = null;

      function openFallbackModal(fallbackId = null) {
        editingFallbackId = fallbackId;
        document.getElementById('fallbackModalTitle').textContent = fallbackId ? 'Edit Plan' : 'New Fallback Plan';
        document.getElementById('fallbackModal').style.display = 'flex';
        if (fallbackId) {
          loadFallbackData(fallbackId);
        } else {
          clearFallbackForm();
        }
        loadRoutesIntoFallbackSelect();
      }

      function closeFallbackModal() {
        document.getElementById('fallbackModal').style.display = 'none';
        editingFallbackId = null;
      }

      async function loadFallbacks() {
        try {
          const res = await fetch('/payment/fallbacks');
          const data = await res.json();
          renderFallbacks(data.fallbacks || []);
        } catch (err) {
          document.getElementById('fallbacksList').innerHTML = '<div class="loading-state">Failed to load fallback plans</div>';
        }
      }

      function renderFallbacks(fallbacks) {
        if (fallbacks.length === 0) {
          document.getElementById('fallbacksList').innerHTML = '<div class="loading-state">No fallback plans configured</div>';
          return;
        }
        document.getElementById('fallbacksList').innerHTML = fallbacks.map(f => \`
          <div class="fallback-card">
            <div class="fallback-info">
              <div class="fallback-name">\${f.name}</div>
              <div class="fallback-meta">
                Trigger: \${f.trigger} | Retries: \${f.retryCount} | 
                Routes: \${f.fallbackRouteIds?.length || 0} fallbacks
              </div>
              <span class="status-badge status-\${f.status}">\${f.status}</span>
            </div>
            <div class="fallback-actions">
              <button class="btn btn-sm btn-secondary" onclick="openFallbackModal('\${f.id}')">Edit</button>
            </div>
          </div>
        \`).join('');
      }

      async function loadRoutesIntoFallbackSelect() {
        try {
          const res = await fetch('/payment/routes');
          const data = await res.json();
          const routes = data.routes || [];
          const primarySelect = document.getElementById('fallbackPrimaryRoute');
          const fallbacksSelect = document.getElementById('fallbackRoutes');
          
          primarySelect.innerHTML = '<option value="">Select primary route...</option>' +
            routes.filter(r => r.status === 'active').map(r => 
              \`<option value="\${r.id}">\${r.name}</option>\`
            ).join('');
            
          fallbacksSelect.innerHTML = routes.map(r => 
            \`<option value="\${r.id}">\${r.name}</option>\`
          ).join('');
        } catch (err) {
          console.error('Failed to load routes:', err);
        }
      }

      async function saveFallback() {
        const data = {
          name: document.getElementById('fallbackName').value,
          primaryRouteId: document.getElementById('fallbackPrimaryRoute').value,
          fallbackRouteIds: Array.from(document.getElementById('fallbackRoutes').selectedOptions).map(o => o.value),
          trigger: document.getElementById('fallbackTrigger').value,
          retryCount: parseInt(document.getElementById('fallbackRetries').value) || 3,
          retryDelayMs: parseInt(document.getElementById('fallbackDelay').value) || 1000,
          notifyOnFallback: document.getElementById('fallbackNotify').checked,
          status: document.getElementById('fallbackStatus').value,
        };

        try {
          const url = editingFallbackId ? '/payment/fallbacks/' + editingFallbackId : '/payment/fallbacks';
          const method = editingFallbackId ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (result.success) {
            closeFallbackModal();
            loadFallbacks();
          } else {
            alert('Error: ' + result.error);
          }
        } catch (err) {
          alert('Failed to save fallback: ' + err.message);
        }
      }

      function clearFallbackForm() {
        document.getElementById('fallbackName').value = '';
        document.getElementById('fallbackPrimaryRoute').value = '';
        document.getElementById('fallbackRetries').value = '3';
        document.getElementById('fallbackDelay').value = '1000';
        document.getElementById('fallbackNotify').checked = true;
        document.getElementById('fallbackStatus').value = 'active';
      }

      async function loadFallbackData(fallbackId) {
        try {
          const res = await fetch('/payment/fallbacks/' + fallbackId);
          const f = await res.json();
          if (f.id) {
            document.getElementById('fallbackName').value = f.name || '';
            document.getElementById('fallbackTrigger').value = f.trigger || 'primary_unavailable';
            document.getElementById('fallbackRetries').value = f.retryCount || 3;
            document.getElementById('fallbackDelay').value = f.retryDelayMs || 1000;
            document.getElementById('fallbackNotify').checked = f.notifyOnFallback !== false;
            document.getElementById('fallbackStatus').value = f.status || 'active';
          }
        } catch (err) {
          console.error('Failed to load fallback:', err);
        }
      }

      // Configuration
      async function loadRoutingConfig() {
        try {
          const res = await fetch('/payment/config');
          const config = await res.json();
          if (config.id) {
            document.getElementById('configAutoRouting').checked = config.enableAutoRouting !== false;
            document.getElementById('configFallbacks').checked = config.enableFallbacks !== false;
            document.getElementById('configSplitThreshold').value = config.splitThreshold || 100;
            document.getElementById('configDefaultSplit').value = config.defaultSplitType || 'percentage';
            document.getElementById('configMaxRecipients').value = config.maxSplitRecipients || 5;
            document.getElementById('configStrategy').value = config.routingStrategy || 'priority';
          }
        } catch (err) {
          console.error('Failed to load config:', err);
        }
      }

      async function saveRoutingConfig() {
        const data = {
          enableAutoRouting: document.getElementById('configAutoRouting').checked,
          enableFallbacks: document.getElementById('configFallbacks').checked,
          splitThreshold: parseFloat(document.getElementById('configSplitThreshold').value) || 100,
          defaultSplitType: document.getElementById('configDefaultSplit').value,
          maxSplitRecipients: parseInt(document.getElementById('configMaxRecipients').value) || 5,
          routingStrategy: document.getElementById('configStrategy').value,
        };

        try {
          const res = await fetch('/payment/config', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (result.success) {
            alert('Configuration saved');
          } else {
            alert('Error: ' + result.error);
          }
        } catch (err) {
          alert('Failed to save config: ' + err.message);
        }
      }

      // Initialize
      loadRoutes();
      loadPendingSplits();
      loadFallbacks();
      loadRoutingConfig();
    </script>
  `;
}

// ==================== FORM TEMPLATES ====================

function renderRouteForm(): string {
  return `
    <div class="form-group">
      <label class="form-label">Route Name</label>
      <input type="text" id="routeName" class="form-input" placeholder="e.g., Primary Card Route" />
    </div>
    <div class="form-group">
      <label class="form-label">Barber ID</label>
      <input type="text" id="routeBarberId" class="form-input" placeholder="e.g., barber_jb" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Priority</label>
        <input type="number" id="routePriority" class="form-input" value="100" />
        <div class="form-help">Lower = higher priority</div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="routeStatus" class="form-select">
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Payment Methods</label>
      <select id="routeMethods" class="form-select" multiple>
        <option value="card" selected>Card</option>
        <option value="cash" selected>Cash</option>
        <option value="venmo">Venmo</option>
        <option value="cashapp">CashApp</option>
        <option value="paypal">PayPal</option>
      </select>
      <div class="form-help">Hold Ctrl/Cmd to select multiple</div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Max Daily Amount ($)</label>
        <input type="number" id="routeMaxDaily" class="form-input" placeholder="No limit" />
      </div>
      <div class="form-group">
        <label class="form-label">Max Transaction Amount ($)</label>
        <input type="number" id="routeMaxTx" class="form-input" placeholder="No limit" />
      </div>
    </div>
  `;
}

function renderFallbackForm(): string {
  return `
    <div class="form-group">
      <label class="form-label">Plan Name</label>
      <input type="text" id="fallbackName" class="form-input" placeholder="e.g., Primary Fallback Chain" />
    </div>
    <div class="form-group">
      <label class="form-label">Primary Route</label>
      <select id="fallbackPrimaryRoute" class="form-select">
        <option value="">Loading routes...</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Fallback Routes (in order)</label>
      <select id="fallbackRoutes" class="form-select" multiple size="4">
        <option value="">Loading routes...</option>
      </select>
      <div class="form-help">Hold Ctrl/Cmd to select multiple. Order matters!</div>
    </div>
    <div class="form-group">
      <label class="form-label">Trigger</label>
      <select id="fallbackTrigger" class="form-select">
        <option value="primary_unavailable">Primary Unavailable</option>
        <option value="timeout">Timeout</option>
        <option value="error">Error</option>
        <option value="capacity_exceeded">Capacity Exceeded</option>
        <option value="manual">Manual</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Retry Count</label>
        <input type="number" id="fallbackRetries" class="form-input" value="3" />
      </div>
      <div class="form-group">
        <label class="form-label">Retry Delay (ms)</label>
        <input type="number" id="fallbackDelay" class="form-input" value="1000" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-checkbox">
        <input type="checkbox" id="fallbackNotify" checked />
        <span>Send notification on fallback</span>
      </label>
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select id="fallbackStatus" class="form-select">
        <option value="active">Active</option>
        <option value="disabled">Disabled</option>
      </select>
    </div>
  `;
}

function renderSplitForm(): string {
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Total Amount</label>
        <input type="number" id="splitTotalAmount" class="form-input" readonly />
      </div>
      <div class="form-group">
        <label class="form-label">Ticket ID</label>
        <input type="text" id="splitTicketId" class="form-input" readonly />
      </div>
    </div>
    
    <div class="section-header" style="margin-top: 1rem;">
      <h4>Split Recipients</h4>
      <button class="btn btn-sm btn-primary" onclick="addSplitRecipient()">+ Add Recipient</button>
    </div>
    
    <div id="splitRecipients">
      <!-- Recipients rendered by JS -->
    </div>
    
    <div class="split-preview">
      <div class="split-preview-title">Split Preview</div>
      <div class="split-preview-row">
        <span>Total Allocated:</span>
        <span id="splitPreviewTotal">$0.00</span>
      </div>
      <div class="split-preview-row">
        <span>Remainder:</span>
        <span id="splitPreviewRemainder">$0.00</span>
      </div>
      <div class="split-preview-row split-preview-total">
        <span>Validation:</span>
        <span id="splitPreviewValid">-</span>
      </div>
    </div>
  `;
}

function renderConfigForm(): string {
  return `
    <div class="config-section">
      <div class="config-section-title">Routing Behavior</div>
      <div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" id="configAutoRouting" checked />
          <span>Enable Auto-Routing</span>
        </label>
        <div class="form-help">Automatically route payments based on rules</div>
      </div>
      <div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" id="configFallbacks" checked />
          <span>Enable Fallback Routing</span>
        </label>
        <div class="form-help">Use fallback routes when primary fails</div>
      </div>
      <div class="form-group">
        <label class="form-label">Routing Strategy</label>
        <select id="configStrategy" class="form-select">
          <option value="priority">Priority-based</option>
          <option value="round_robin">Round Robin</option>
          <option value="load_balance">Load Balance</option>
          <option value="skill_match">Skill Match</option>
        </select>
      </div>
    </div>
    
    <div class="config-section">
      <div class="config-section-title">Split Payment Defaults</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Split Threshold ($)</label>
          <input type="number" id="configSplitThreshold" class="form-input" value="100" />
          <div class="form-help">Suggest split for payments above this amount</div>
        </div>
        <div class="form-group">
          <label class="form-label">Max Recipients</label>
          <input type="number" id="configMaxRecipients" class="form-input" value="5" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Default Split Type</label>
        <select id="configDefaultSplit" class="form-select">
          <option value="percentage">Percentage</option>
          <option value="equal">Equal Split</option>
          <option value="fixed">Fixed Amount</option>
        </select>
      </div>
    </div>
  `;
}

// ==================== EXPORT ====================

export const PaymentRoutingUI = {
  renderPaymentRoutingPanel,
  renderRouteForm,
  renderFallbackForm,
  renderSplitForm,
  renderConfigForm,
};

export default PaymentRoutingUI;