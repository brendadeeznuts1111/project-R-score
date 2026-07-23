/**
 * Notification center — polls channel events for tenant topic.
 */

export class NotificationCenter extends HTMLElement {
  constructor() {
    super();
    this.since = 0;
    this.timer = null;
    this.topic = 'factory';
  }

  connectedCallback() {
    if (!this.classList.contains('notification-root')) {
      this.classList.add('notification-root');
    }
  }

  start(topic) {
    this.topic = topic;
    this.since = 0;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.poll(), 5000);
    this.poll();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async poll() {
    try {
      const url = `/api/channels/events?topic=${encodeURIComponent(this.topic)}&since=${this.since}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      for (const ev of data.events ?? []) {
        this.since = Math.max(this.since, ev.seq);
        this.showToast(this.formatEvent(ev), ev.payload?.event?.includes('deploy') ? 'info' : 'default');
      }
    } catch {
      /* offline / no session */
    }
  }

  formatEvent(ev) {
    const p = ev.payload ?? {};
    if (p.event === 'account.created') return `New user: ${p.account?.email ?? 'unknown'}`;
    if (p.event === 'deploy.requested') return `Deploy requested by ${p.by ?? 'user'}`;
    if (p.event === 'alert.set') return `Alert: ${p.market} @ ${p.price}`;
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
