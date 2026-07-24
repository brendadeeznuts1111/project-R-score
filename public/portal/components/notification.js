/**
 * Notification center — SSE with poll fallback for ops channel events.
 */

export class NotificationCenter extends HTMLElement {
  constructor() {
    super();
    this.since = 0;
    this.timer = null;
    this.eventSource = null;
    this.topic = 'identity';
  }

  connectedCallback() {
    if (!this.classList.contains('notification-root')) {
      this.classList.add('notification-root');
    }
  }

  start(topic) {
    this.topic = topic;
    this.since = 0;
    this.stop();
    this.connectSse();
    this.timer = setInterval(() => this.poll(), 15000);
    this.poll();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  connectSse() {
    if (typeof EventSource === 'undefined') return;
    try {
      const url = `/api/channels/events?topic=${encodeURIComponent(this.topic)}&since=${this.since}&stream=1`;
      this.eventSource = new EventSource(url);
      this.eventSource.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          this.since = Math.max(this.since, msg.seq ?? 0);
          this.showToast(this.formatEvent(msg), this.toastType(msg));
        } catch {
          /* ignore */
        }
      };
      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      };
    } catch {
      /* offline / no session */
    }
  }

  async poll() {
    try {
      const url = `/api/channels/events?topic=${encodeURIComponent(this.topic)}&since=${this.since}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      for (const ev of data.events ?? []) {
        this.since = Math.max(this.since, ev.seq);
        this.showToast(this.formatEvent(ev), this.toastType(ev));
      }
    } catch {
      /* offline / no session */
    }
  }

  toastType(ev) {
    const p = ev.payload ?? {};
    if (p.event === 'deploy.requested') return 'info';
    if (p.eventType === 'play.settled') return 'info';
    if (p.eventType === 'partner.bound') return 'default';
    return 'default';
  }

  formatEvent(ev) {
    const p = ev.payload ?? {};
    if (p.event === 'account.created') return `New user: ${p.account?.email ?? p.email ?? 'unknown'}`;
    if (p.event === 'deploy.requested') return `Deploy requested by ${p.by ?? 'user'}`;
    if (p.event === 'alert.set') return `Alert: ${p.market} @ ${p.price}`;
    if (p.eventType === 'partner.bound') return `Partner bound: ${p.profileKey ?? p.treeNodeId ?? 'node'}`;
    if (p.eventType === 'play.dispatched') return `Play dispatched · ${String(p.playId ?? '').slice(0, 8)}`;
    if (p.eventType === 'play.settled') return `Play settled · ${p.result} · pnl $${p.pnl ?? 0}`;
    return JSON.stringify(p);
  }

  showToast(text, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = text;
    this.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
}

customElements.define('notification-center', NotificationCenter);
