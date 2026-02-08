export function renderAdminDashboard(resourceHints: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin Control Room</title>
  ${resourceHints}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Space+Grotesk:wght@400;500;700&display=swap');
    :root {
      --ink: #12141a;
      --paper: #f4efe4;
      --accent: #0f766e;
      --warn: #b45309;
      --ok: #166534;
      --card: #fffdf8;
      --line: #d8cfbe;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Space Grotesk', sans-serif; background: radial-gradient(circle at top right, #f8f2e7, #efe7d6 45%, #e7dbc7); color: var(--ink); }
    header { padding: 20px; border-bottom: 2px solid var(--line); background: rgba(255,255,255,0.45); backdrop-filter: blur(6px); position: sticky; top: 0; }
    h1 { margin: 0; font-family: 'Fraunces', serif; font-size: 30px; letter-spacing: .3px; }
    .sub { margin-top: 4px; color: #5f5b52; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; padding: 14px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: 0 8px 24px rgba(0,0,0,.05); }
    .label { font-size: 12px; color: #6f6a61; text-transform: uppercase; letter-spacing: .08em; }
    .value { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .ok { color: var(--ok); } .warn { color: var(--warn); } .accent { color: var(--accent); }
    .wide { grid-column: span 2; }
    pre { margin: 0; font-size: 12px; max-height: 280px; overflow: auto; white-space: pre-wrap; }
    ul { margin: 0; padding-left: 18px; }
    @media (max-width: 960px) { .grid { grid-template-columns: 1fr 1fr; } .wide { grid-column: span 2; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .wide { grid-column: span 1; } }
  </style>
</head>
<body>
  <header>
    <h1>Admin Control Room</h1>
    <div class="sub">Live barbershop operations, finance, and stream health</div>
  </header>

  <section class="grid">
    <article class="card"><div class="label">Revenue</div><div class="value accent" id="revenue">$0</div></article>
    <article class="card"><div class="label">Tips</div><div class="value ok" id="tips">$0</div></article>
    <article class="card"><div class="label">Commissions</div><div class="value warn" id="commissions">$0</div></article>
    <article class="card"><div class="label">Connections</div><div class="value" id="connections">0</div></article>

    <article class="card wide">
      <div class="label">Barber Status</div>
      <pre id="barbers">Waiting for stream...</pre>
    </article>
    <article class="card wide">
      <div class="label">Recent Stream Events</div>
      <pre id="events">Waiting for stream...</pre>
    </article>
    <article class="card wide">
      <div class="label">Admin Snapshot</div>
      <pre id="snapshot">Loading /admin/data ...</pre>
    </article>
    <article class="card wide">
      <div class="label">Bundled Orders</div>
      <pre id="orders">Loading /admin/orders ...</pre>
    </article>
  </section>

  <script>
    const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(wsProto + '://' + location.host + '/admin/ws?key=' + (window.LIFECYCLE_KEY || 'development'));
    const events = [];
    const pushEvent = (evt) => {
      events.unshift('[' + new Date().toLocaleTimeString() + '] ' + evt);
      if (events.length > 30) events.pop();
      document.getElementById('events').textContent = events.join('\\n');
    };

    ws.onopen = () => pushEvent('Connected');
    ws.onclose = () => pushEvent('Disconnected');
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      pushEvent(data.type || 'message');
      if (data.type === 'financials') {
        document.getElementById('revenue').textContent = '$' + data.revenue.toFixed(2);
        document.getElementById('tips').textContent = '$' + data.tips.toFixed(2);
        document.getElementById('commissions').textContent = '$' + data.commissions.toFixed(2);
      }
      if (data.type === 'connections') document.getElementById('connections').textContent = String(data.count);
      if (data.type === 'barbers') {
        const lines = data.list.map((b) => b.code + ' | ' + b.name + ' | ' + b.status);
        document.getElementById('barbers').textContent = lines.join('\\n') || 'No barbers';
      }
    };

    async function refreshAdminData() {
      const [a, b] = await Promise.all([fetch('/admin/data'), fetch('/admin/orders')]);
      document.getElementById('snapshot').textContent = JSON.stringify(await a.json(), null, 2);
      document.getElementById('orders').textContent = JSON.stringify(await b.json(), null, 2);
    }
    refreshAdminData();
    setInterval(refreshAdminData, 7000);
  </script>
</body>
</html>`;
}

export function renderClientDashboard(resourceHints: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Client Checkout</title>
  ${resourceHints}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sora:wght@400;600;700&display=swap');
    :root {
      --bg1: #f8fafc; --bg2: #eef6ff; --ink: #0f172a; --muted: #556172;
      --brand: #0ea5e9; --brand2: #0284c7; --ok: #16a34a; --line: #d0deef;
      --card: rgba(255,255,255,.82);
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Sora', sans-serif; color: var(--ink); background: linear-gradient(135deg, var(--bg1), var(--bg2)); min-height: 100vh; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0; font-family: 'DM Serif Display', serif; font-size: 42px; }
    .sub { color: var(--muted); margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px; backdrop-filter: blur(6px); }
    .svc { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 10px; margin-bottom: 8px; cursor: pointer; }
    .svc.sel { border-color: var(--brand); background: #e8f5fd; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .total { font-size: 24px; font-weight: 700; border-top: 1px solid var(--line); padding-top: 8px; margin-top: 6px; }
    .btn { width: 100%; border: 0; border-radius: 12px; padding: 12px; font-weight: 700; color: #fff; background: linear-gradient(90deg, var(--brand), var(--brand2)); cursor: pointer; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    input, select { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px; margin-top: 6px; }
    pre { margin: 0; white-space: pre-wrap; font-size: 12px; max-height: 220px; overflow: auto; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>One Checkout. Zero Friction.</h1>
    <div class="sub">Bundle multi-barber services, products, and tips in one payment.</div>
    <div class="grid">
      <section class="card">
        <h3>Services</h3>
        <div id="services"></div>
        <h3>Tip</h3>
        <label>Mode<select id="tipMode"><option value="percent">Percent</option><option value="flat">Flat</option></select></label>
        <label>Value<input id="tipValue" type="number" min="0" step="0.01" value="15" /></label>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;"><input id="includeShampoo" type="checkbox" /> Add shampoo ($12) by house-cashier-01</label>
      </section>

      <aside class="card">
        <h3>Summary</h3>
        <div class="row"><span>Subtotal</span><strong id="subtotal">$0.00</strong></div>
        <div class="row"><span>Tip</span><strong id="tip">$0.00</strong></div>
        <div class="row total"><span>Total</span><strong id="total">$0.00</strong></div>
        <button class="btn" id="checkoutBtn" disabled>Checkout Bundle</button>
        <div style="margin-top:10px;">
          <h4 style="margin:8px 0;">Response</h4>
          <pre id="out">Waiting...</pre>
        </div>
      </aside>
    </div>
  </div>

  <script>
    const catalog = [
      { name: 'Haircut', price: 30, duration: 30 },
      { name: 'Beard Trim', price: 15, duration: 15 },
      { name: 'Hot Towel Shave', price: 25, duration: 20 },
      { name: 'Braids', price: 45, duration: 50 },
    ];
    let barbers = [];
    let selected = [];
    const servicesEl = document.getElementById('services');
    const tipModeEl = document.getElementById('tipMode');
    const tipValueEl = document.getElementById('tipValue');
    const shampooEl = document.getElementById('includeShampoo');
    const btn = document.getElementById('checkoutBtn');

    function render() {
      servicesEl.innerHTML = catalog.map((s) => {
        const sel = selected.find((x) => x.name === s.name);
        return '<div class="svc ' + (sel ? 'sel' : '') + '" data-name="' + s.name + '">' +
          '<div><strong>' + s.name + '</strong><div style="font-size:12px;color:#64748b">' + s.duration + ' min</div></div>' +
          '<strong>$' + s.price + '</strong></div>';
      }).join('');
      [...servicesEl.querySelectorAll('.svc')].forEach((el) => {
        el.onclick = () => {
          const name = el.getAttribute('data-name');
          const item = catalog.find((c) => c.name === name);
          const idx = selected.findIndex((s) => s.name === name);
          if (idx >= 0) selected.splice(idx, 1);
          else selected.push(item);
          render();
          compute();
        };
      });
      btn.disabled = selected.length === 0;
    }

    function compute() {
      let subtotal = selected.reduce((s, x) => s + x.price, 0);
      if (shampooEl.checked) subtotal += 12;
      const mode = tipModeEl.value;
      const value = Math.max(0, Number(tipValueEl.value || 0));
      const tip = mode === 'flat' ? value : subtotal * (value / 100);
      const total = subtotal + tip;
      document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
      document.getElementById('tip').textContent = '$' + tip.toFixed(2);
      document.getElementById('total').textContent = '$' + total.toFixed(2);
      return { subtotal, tip, total };
    }

    function pickProvider(index) {
      return barbers[index % Math.max(1, barbers.length)] || { id: 'barber_unassigned', name: 'Unassigned' };
    }

    async function boot() {
      const b = await fetch('/barbers').then((r) => r.json());
      barbers = (b.barbers || []).filter((x) => x.status === 'active');
      render();
      compute();
    }

    [tipModeEl, tipValueEl, shampooEl].forEach((el) => el.addEventListener('input', compute));
    btn.onclick = async () => {
      const items = selected.map((s, i) => {
        const p = pickProvider(i);
        return { name: s.name, price: s.price, quantity: 1, kind: 'service', providerId: p.id, providerName: p.name, providerRole: 'barber', tipEligible: true };
      });
      if (shampooEl.checked) items.push({ name: 'Shampoo', price: 12, quantity: 1, kind: 'product', providerId: 'house-cashier-01', providerName: 'House Cashier', providerRole: 'cashier', tipEligible: false });
      const res = await fetch('/checkout/bundle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Walk-in Customer',
          items,
          tip: { mode: tipModeEl.value, value: Number(tipValueEl.value || 0) },
          paymentId: 'pay_' + Date.now(),
          walkIn: true
        })
      });
      const json = await res.json();
      document.getElementById('out').textContent = JSON.stringify(json, null, 2);
    };

    boot();
  </script>
</body>
</html>`;
}

export function renderBarberDashboard(resourceHints: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Barber Station</title>
  ${resourceHints}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=Literata:opsz,wght@7..72,600&display=swap');
    :root { --bg:#0b1220; --card:#111c31; --line:#274066; --ink:#e5ecff; --muted:#9cb0d3; --brand:#22d3ee; --ok:#22c55e; }
    * { box-sizing: border-box; } body { margin:0; color:var(--ink); background:radial-gradient(circle at 20% 10%, #182a4a, #0b1220 60%); font-family:'Archivo',sans-serif; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 22px; }
    h1 { margin: 0 0 4px; font-family:'Literata',serif; }
    .card { background: var(--card); border:1px solid var(--line); border-radius:16px; padding:14px; margin:12px 0; }
    input { width:100%; border:1px solid #355892; background:#0f1a2f; color:var(--ink); border-radius:10px; padding:10px; margin-top:6px; }
    .row { display:flex; justify-content:space-between; margin:8px 0; }
    .pill { display:inline-block; padding:4px 10px; border-radius:999px; background:#12314f; border:1px solid #2f5d86; }
    button { border:0; border-radius:10px; padding:10px 14px; cursor:pointer; font-weight:700; }
    .btn { background:linear-gradient(90deg,#06b6d4,#0ea5e9); color:#00121a; }
    pre { margin:0; white-space:pre-wrap; font-size:12px; max-height:260px; overflow:auto; color:var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Barber Station</h1>
    <div style="color:var(--muted);margin-bottom:8px;">2-letter code login (JB, MS, CK, OM, JA)</div>

    <section class="card" id="loginBox">
      <label>Barber Code<input id="codeInput" maxlength="2" placeholder="JB" /></label>
      <button class="btn" id="loginBtn" style="margin-top:10px;">Login</button>
    </section>

    <section class="card" id="dashBox" style="display:none;">
      <div class="row"><span class="pill" id="status">ACTIVE</span><strong id="barberName">-</strong></div>
      <div class="row"><span>Code</span><span id="barberCode">-</span></div>
      <div class="row"><span>Commission Rate</span><span id="commissionRate">-</span></div>
      <div class="row"><span>Tickets Completed</span><span id="ticketsCompleted">0</span></div>
      <div class="row"><span>Tips Shared</span><span id="tipsShared">$0.00</span></div>
      <div class="row"><span>Orders Seen</span><span id="ordersSeen">0</span></div>
    </section>

    <section class="card">
      <strong>Current Ticket</strong>
      <pre id="ticket">Waiting for login...</pre>
      <button class="btn" id="completeBtn" style="margin-top:10px;display:none;">Complete Ticket</button>
    </section>
  </div>

  <script>
    let barber = null;
    let currentTicketId = null;
    let ws = null;

    async function refreshStats() {
      if (!barber) return;
      const s = await fetch('/barber/stats?barberId=' + encodeURIComponent(barber.id)).then((r) => r.json());
      document.getElementById('ticketsCompleted').textContent = String(s.ticketsCompleted || 0);
      document.getElementById('tipsShared').textContent = '$' + Number(s.tipsShared || 0).toFixed(2);
      document.getElementById('ordersSeen').textContent = String(s.ordersSeen || 0);
    }

    function setTicket(ticket) {
      if (!ticket) {
        currentTicketId = null;
        document.getElementById('ticket').textContent = 'No active ticket';
        document.getElementById('completeBtn').style.display = 'none';
        document.getElementById('status').textContent = 'ACTIVE';
        return;
      }
      currentTicketId = ticket.id;
      document.getElementById('ticket').textContent = JSON.stringify(ticket, null, 2);
      document.getElementById('completeBtn').style.display = 'inline-block';
      document.getElementById('status').textContent = 'BUSY';
    }

    async function login() {
      const code = document.getElementById('codeInput').value.toUpperCase().trim();
      if (code.length !== 2) return alert('Use 2-letter code');
      const res = await fetch('/barber/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!data.success) return alert('Invalid code');
      barber = data.barber;
      document.getElementById('loginBox').style.display = 'none';
      document.getElementById('dashBox').style.display = 'block';
      document.getElementById('barberName').textContent = barber.name;
      document.getElementById('barberCode').textContent = barber.code;
      document.getElementById('commissionRate').textContent = (barber.commissionRate * 100).toFixed(0) + '%';
      setTicket((data.tickets || [])[0] ? data.tickets[0] : null);
      refreshStats();

      const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(wsProto + '://' + location.host + '/ws/dashboard');
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'new_ticket' && m.assignedTo === barber.id) {
          setTicket(m.ticket);
        }
      };
    }

    async function completeTicket() {
      if (!currentTicketId) return;
      const res = await fetch('/barber/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticketId: currentTicketId })
      });
      const data = await res.json();
      if (!data.success) return;
      setTicket(null);
      refreshStats();
    }

    document.getElementById('loginBtn').onclick = login;
    document.getElementById('completeBtn').onclick = completeTicket;
    document.getElementById('codeInput').addEventListener('keyup', (e) => { if (e.key === 'Enter') login(); });
    setInterval(refreshStats, 8000);
  </script>
</body>
</html>`;
}
