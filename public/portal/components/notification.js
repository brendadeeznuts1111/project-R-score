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
    this.topics = ['identity'];
    this.sinceByTopic = new Map();
  }

  connectedCallback() {
    if (!this.classList.contains('notification-root')) {
      this.classList.add('notification-root');
    }
  }

  start(topic) {
    this.startTopics(Array.isArray(topic) ? topic : [topic]);
  }

  startTopics(topics) {
    this.topics = topics.length ? topics : ['identity'];
    this.topic = this.topics[0];
    this.sinceByTopic = new Map(this.topics.map(t => [t, 0]));
    this.since = 0;
    this.stop();
    for (const t of this.topics) {
      this.connectSse(t);
    }
    this.timer = setInterval(() => this.pollAll(), 15000);
    this.pollAll();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.eventSources) {
      for (const es of this.eventSources) es.close();
      this.eventSources = [];
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  connectSse(topic = this.topic) {
    if (typeof EventSource === 'undefined') return;
    if (!this.eventSources) this.eventSources = [];
    try {
      const since = this.sinceByTopic?.get(topic) ?? this.since ?? 0;
      const url = `/api/channels/events?topic=${encodeURIComponent(topic)}&since=${since}&stream=1`;
      const es = new EventSource(url);
      es.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          const seq = msg.seq ?? 0;
          if (this.sinceByTopic) this.sinceByTopic.set(topic, Math.max(this.sinceByTopic.get(topic) ?? 0, seq));
          this.since = Math.max(this.since, seq);
          this.showToast(this.formatEvent(msg), this.toastType(msg));
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es.close();
      };
      this.eventSources.push(es);
    } catch {
      /* offline / no session */
    }
  }

  async pollAll() {
    for (const topic of this.topics ?? [this.topic]) {
      await this.pollTopic(topic);
    }
  }

  async pollTopic(topic) {
    try {
      const since = this.sinceByTopic?.get(topic) ?? this.since ?? 0;
      const url = `/api/channels/events?topic=${encodeURIComponent(topic)}&since=${since}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      for (const ev of data.events ?? []) {
        const seq = ev.seq ?? 0;
        if (this.sinceByTopic) this.sinceByTopic.set(topic, Math.max(this.sinceByTopic.get(topic) ?? 0, seq));
        this.since = Math.max(this.since, seq);
        this.showToast(this.formatEvent(ev), this.toastType(ev));
      }
    } catch {
      /* offline / no session */
    }
  }

  /** @deprecated use pollTopic */
  async poll() {
    return this.pollTopic(this.topic);
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
    if (p.eventType === 'play.gate.denied') return `Play gated (deny) · ${String(p.playId ?? '').slice(0, 8)}`;
    if (p.eventType === 'play.gate.adjusted') return `Play gated (adjust) · ${String(p.playId ?? '').slice(0, 8)}`;
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
