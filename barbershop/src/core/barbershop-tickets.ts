// barbershop-tickets.ts - Complete Ticket Management System
// Uses Bun native APIs: serve, redis, secrets, Cookie

import { serve, redis, secrets, Cookie } from 'bun';

// ==================== TYPES ====================
type Service = { name: string; price: number; duration: number };
type Ticket = {
  id: string;
  customerName: string;
  services: Service[];
  totalAmount: number;
  walkIn: boolean;
  paymentId: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
};

type Barber = {
  id: string;
  name: string;
  code: string;
  skills: string[];
  commissionRate: number;
  status: 'active' | 'off_duty' | 'on_break';
  currentTicket?: string;
};

// ==================== UTILS ====================
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
const now = () => new Date().toISOString();

// ==================== REDIS HELPERS ====================
async function saveTicket(ticket: Ticket): Promise<void> {
  await redis.hmset(`ticket:${ticket.id}`, [
    'id', ticket.id,
    'customerName', ticket.customerName,
    'services', JSON.stringify(ticket.services),
    'totalAmount', ticket.totalAmount.toString(),
    'walkIn', ticket.walkIn ? 'true' : 'false',
    'paymentId', ticket.paymentId,
    'status', ticket.status,
    'assignedTo', ticket.assignedTo || '',
    'createdAt', ticket.createdAt,
    'assignedAt', ticket.assignedAt || '',
    'completedAt', ticket.completedAt || ''
  ]);
  await redis.sadd(`tickets:${ticket.status}`, ticket.id);
  await redis.sadd('tickets:all', ticket.id);
}

async function getTicket(id: string): Promise<Ticket | null> {
  const data = await redis.hgetall(`ticket:${id}`);
  if (!data.id) return null;
  return {
    id: data.id,
    customerName: data.customerName,
    services: JSON.parse(data.services || '[]'),
    totalAmount: parseFloat(data.totalAmount),
    walkIn: data.walkIn === 'true',
    paymentId: data.paymentId,
    status: data.status as Ticket['status'],
    assignedTo: data.assignedTo || undefined,
    createdAt: data.createdAt,
    assignedAt: data.assignedAt || undefined,
    completedAt: data.completedAt || undefined
  };
}

async function saveBarber(barber: Barber): Promise<void> {
  await redis.hmset(`barber:${barber.id}`, [
    'id', barber.id,
    'name', barber.name,
    'code', barber.code,
    'skills', JSON.stringify(barber.skills),
    'commissionRate', barber.commissionRate.toString(),
    'status', barber.status,
    'currentTicket', barber.currentTicket || ''
  ]);
  await redis.set(`barber:code:${barber.code}`, barber.id);
}

async function getBarberByCode(code: string): Promise<Barber | null> {
  const id = await redis.get(`barber:code:${code}`);
  if (!id) return null;
  const data = await redis.hgetall(`barber:${id}`);
  if (!data.id) return null;
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    skills: JSON.parse(data.skills || '[]'),
    commissionRate: parseFloat(data.commissionRate),
    status: data.status as Barber['status'],
    currentTicket: data.currentTicket || undefined
  };
}

async function getAllBarbers(): Promise<Barber[]> {
  const keys = await redis.send('KEYS', ['barber:*']) as string[];
  const barbers: Barber[] = [];
  for (const key of keys) {
    if (key.includes(':code:')) continue;
    const data = await redis.hgetall(key);
    if (data.id) {
      barbers.push({
        id: data.id,
        name: data.name,
        code: data.code,
        skills: JSON.parse(data.skills || '[]'),
        commissionRate: parseFloat(data.commissionRate),
        status: data.status as Barber['status'],
        currentTicket: data.currentTicket || undefined
      });
    }
  }
  return barbers;
}

async function getPendingTickets(): Promise<Ticket[]> {
  const ids = await redis.smembers('tickets:pending');
  const tickets: Ticket[] = [];
  for (const id of ids) {
    const ticket = await getTicket(id);
    if (ticket) tickets.push(ticket);
  }
  return tickets;
}

// ==================== AUTO-ASSIGNMENT ====================
function calculateMatchScore(ticket: Ticket, barber: Barber): number {
  if (barber.status !== 'active' || barber.currentTicket) return 0;
  
  const requiredSkills = ticket.services.map(s => s.name.toLowerCase());
  const barberSkills = barber.skills.map(s => s.toLowerCase());
  
  let matches = 0;
  for (const skill of requiredSkills) {
    if (barberSkills.some(s => s.includes(skill) || skill.includes(s))) {
      matches++;
    }
  }
  
  // Score: percentage of skills matched * 100, bonus for walk-ins
  const score = (matches / requiredSkills.length) * 100 + (ticket.walkIn ? 10 : 0);
  return score;
}

async function autoAssignTicket(ticket: Ticket): Promise<boolean> {
  const barbers = await getAllBarbers();
  let bestBarber: Barber | null = null;
  let bestScore = 0;
  
  for (const barber of barbers) {
    const score = calculateMatchScore(ticket, barber);
    if (score > bestScore) {
      bestScore = score;
      bestBarber = barber;
    }
  }
  
  if (bestBarber && bestScore >= 50) {
    ticket.assignedTo = bestBarber.id;
    ticket.assignedAt = now();
    ticket.status = 'assigned';
    await redis.srem('tickets:pending', ticket.id);
    await redis.sadd('tickets:assigned', ticket.id);
    await saveTicket(ticket);
    
    bestBarber.currentTicket = ticket.id;
    await saveBarber(bestBarber);
    
    // Publish assignment event
    await redis.publish('ticket:assigned', JSON.stringify({
      ticketId: ticket.id,
      barberId: bestBarber.id,
      barberName: bestBarber.name,
      score: bestScore
    }));
    
    console.log(`🎯 Auto-assigned ticket ${ticket.id} to ${bestBarber.name} (score: ${bestScore.toFixed(1)})`);
    return true;
  }
  
  return false;
}

// ==================== END OF DAY REPORT ====================
async function generateEndOfDayReport(): Promise<any> {
  const allTicketIds = await redis.smembers('tickets:all');
  const today = new Date().toISOString().split('T')[0];
  
  const tickets: Ticket[] = [];
  for (const id of allTicketIds) {
    const t = await getTicket(id);
    if (t && t.createdAt.startsWith(today)) tickets.push(t);
  }
  
  const completed = tickets.filter(t => t.status === 'completed');
  const pending = tickets.filter(t => t.status === 'pending');
  const assigned = tickets.filter(t => t.status === 'assigned');
  const cancelled = tickets.filter(t => t.status === 'cancelled');
  
  const totalRevenue = completed.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTips = completed.reduce((sum, t) => sum + (t.totalAmount * 0.15), 0); // Assume 15% avg tip
  
  // Barber commission calculations
  const barbers = await getAllBarbers();
  const barberStats: Record<string, { name: string; tickets: number; revenue: number; commission: number }> = {};
  
  for (const barber of barbers) {
    const barberTickets = completed.filter(t => t.assignedTo === barber.id);
    const revenue = barberTickets.reduce((sum, t) => sum + t.totalAmount, 0);
    barberStats[barber.id] = {
      name: barber.name,
      tickets: barberTickets.length,
      revenue,
      commission: revenue * barber.commissionRate
    };
  }
  
  return {
    date: today,
    summary: {
      totalTickets: tickets.length,
      completed: completed.length,
      pending: pending.length,
      assigned: assigned.length,
      cancelled: cancelled.length,
      totalRevenue,
      totalTips,
      totalCommission: Object.values(barberStats).reduce((sum, b) => sum + b.commission, 0)
    },
    barbers: barberStats,
    services: completed.flatMap(t => t.services).reduce((acc, s) => {
      acc[s.name] = (acc[s.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

// ==================== SERVER ====================
const MANAGER_KEY = Bun.env.MANAGER_KEY || 'manager123';

// Seed data
async function seedData(): Promise<void> {
  // Create barbers
  await saveBarber({
    id: 'barber_jb',
    name: 'John Barber',
    code: 'JB',
    skills: ['Haircut', 'Beard Trim', 'Hot Towel Shave'],
    commissionRate: 0.6,
    status: 'active'
  });
  
  await saveBarber({
    id: 'barber_ms',
    name: 'Mike Styles',
    code: 'MS',
    skills: ['Haircut', 'Fade', 'Design'],
    commissionRate: 0.55,
    status: 'active'
  });
  
  await saveBarber({
    id: 'barber_ck',
    name: 'Chris Kutz',
    code: 'CK',
    skills: ['Beard Trim', 'Hot Towel Shave', 'Facial'],
    commissionRate: 0.5,
    status: 'off_duty'
  });
  
  console.log('✅ Seeded 3 barbers');
}

const server = serve({
  port: 3005,
  routes: {
    // 1. CREATE TICKET (from payment system)
    '/ticket/create': async (req) => {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const body = await req.json();
      const ticket: Ticket = {
        id: generateId('ticket'),
        customerName: body.customerName,
        services: body.services,
        totalAmount: body.totalAmount,
        walkIn: body.walkIn ?? true,
        paymentId: body.paymentId,
        status: 'pending',
        createdAt: now()
      };
      
      await saveTicket(ticket);
      
      // Try auto-assignment
      const assigned = await autoAssignTicket(ticket);
      
      return Response.json({
        success: true,
        ticket: {
          id: ticket.id,
          customerName: ticket.customerName,
          services: ticket.services.map(s => s.name),
          total: ticket.totalAmount,
          status: ticket.status,
          assignedTo: ticket.assignedTo,
          autoAssigned: assigned
        }
      });
    },
    
    // 2. BARBER LOGIN
    '/barber/login': async (req) => {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const { code } = await req.json();
      const barber = await getBarberByCode(code);
      
      if (!barber) {
        return Response.json({ success: false, error: 'Invalid code' }, { status: 401 });
      }
      
      // Update status to active
      barber.status = 'active';
      await saveBarber(barber);
      
      // Set session cookie
      const sessionCookie = new Cookie('barber_session', barber.id, {
        httpOnly: true,
        path: '/',
        maxAge: 8 * 60 * 60 // 8 hours
      });
      
      // Get assigned tickets
      const allTickets = await redis.smembers('tickets:assigned');
      const myTickets: Ticket[] = [];
      for (const id of allTickets) {
        const t = await getTicket(id);
        if (t?.assignedTo === barber.id) myTickets.push(t);
      }
      
      return new Response(JSON.stringify({
        success: true,
        barber: {
          id: barber.id,
          name: barber.name,
          skills: barber.skills,
          commissionRate: barber.commissionRate
        },
        tickets: myTickets.map(t => ({
          id: t.id,
          customer: t.customerName,
          services: t.services.map(s => s.name),
          amount: t.totalAmount
        }))
      }), {
        headers: { 'Set-Cookie': sessionCookie.toString() }
      });
    },
    
    // 3. BARBER COMPLETE TICKET
    '/barber/complete': async (req) => {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const barberId = req.cookies.get('barber_session');
      if (!barberId) return new Response('Unauthorized', { status: 401 });
      
      const { ticketId } = await req.json();
      const ticket = await getTicket(ticketId);
      
      if (!ticket || ticket.assignedTo !== barberId) {
        return Response.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      
      ticket.status = 'completed';
      ticket.completedAt = now();
      await redis.srem('tickets:assigned', ticketId);
      await redis.sadd('tickets:completed', ticketId);
      await saveTicket(ticket);
      
      // Free up barber
      const barber = (await getAllBarbers()).find(b => b.id === barberId);
      if (barber) {
        barber.currentTicket = undefined;
        await saveBarber(barber);
        
        // Check for pending tickets
        const pending = await getPendingTickets();
        for (const t of pending) {
          const assigned = await autoAssignTicket(t);
          if (assigned) break; // Only assign one at a time
        }
      }
      
      return Response.json({ success: true, ticketId, status: 'completed' });
    },
    
    // 4. GET PENDING TICKETS
    '/tickets/pending': async () => {
      const tickets = await getPendingTickets();
      return Response.json({
        count: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          customer: t.customerName,
          services: t.services.map(s => s.name),
          amount: t.totalAmount,
          walkIn: t.walkIn,
          waitingSince: t.createdAt
        }))
      });
    },
    
    // 5. MANAGER CLEAR UNASSIGNED
    '/manager/clear': async (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('key') !== MANAGER_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      const pending = await getPendingTickets();
      const cleared: string[] = [];
      
      for (const ticket of pending) {
        ticket.status = 'cancelled';
        await redis.srem('tickets:pending', ticket.id);
        await redis.sadd('tickets:cancelled', ticket.id);
        await saveTicket(ticket);
        cleared.push(ticket.id);
      }
      
      // Publish clear event
      await redis.publish('tickets:cleared', JSON.stringify({
        cleared,
        count: cleared.length,
        timestamp: now()
      }));
      
      return Response.json({
        success: true,
        cleared,
        message: `Cancelled ${cleared.length} unassigned tickets`
      });
    },
    
    // 6. MANAGER END OF DAY
    '/manager/end-of-day': async (req) => {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${MANAGER_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      const report = await generateEndOfDayReport();
      
      // Save report
      await redis.hmset(`report:${report.date}`, [
        'date', report.date,
        'data', JSON.stringify(report),
        'generatedAt', now()
      ]);
      
      // Reset for tomorrow
      await redis.sadd('reports:history', report.date);
      
      // Publish end of day event
      await redis.publish('eod', JSON.stringify({
        date: report.date,
        summary: report.summary
      }));
      
      return Response.json({
        success: true,
        report: {
          date: report.date,
          summary: report.summary,
          barbers: report.barbers,
          services: report.services
        },
        files: {
          pdf: `/reports/${report.date}.pdf`,
          csv: `/reports/${report.date}.csv`
        }
      });
    },
    
    // 7. GET REPORT
    '/manager/report/:date': async (req, params) => {
      const data = await redis.hgetall(`report:${params.date}`);
      if (!data.data) return new Response('Report not found', { status: 404 });
      return Response.json(JSON.parse(data.data));
    },
    
    // 8. LIST ALL TICKETS (admin)
    '/tickets/all': async () => {
      const ids = await redis.smembers('tickets:all');
      const tickets = await Promise.all(ids.map(id => getTicket(id)));
      return Response.json({
        count: tickets.length,
        byStatus: {
          pending: tickets.filter(t => t?.status === 'pending').length,
          assigned: tickets.filter(t => t?.status === 'assigned').length,
          completed: tickets.filter(t => t?.status === 'completed').length,
          cancelled: tickets.filter(t => t?.status === 'cancelled').length
        },
        tickets: tickets.filter(Boolean)
      });
    },
    
    // Health check
    '/health': () => Response.json({ status: 'ok', timestamp: now() })
  }
});

// Initialize
await seedData();

console.log(`
🦘 Barbershop Ticket System Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port:      ${server.port}

ENDPOINTS:
  POST /ticket/create       - Create ticket from payment
  POST /barber/login        - Barber clock in (code: JB, MS, CK)
  POST /barber/complete     - Complete assigned ticket
  GET  /tickets/pending     - List pending tickets
  GET  /manager/clear       - Clear unassigned (?key=${MANAGER_KEY})
  POST /manager/end-of-day  - Generate EOD report
  GET  /tickets/all         - All tickets (admin)
  GET  /health              - Health check

TEST COMMANDS:
  # Create ticket
  curl -X POST http://localhost:${server.port}/ticket/create \\
    -H "Content-Type: application/json" \\
    -d '{"customerName":"John Smith","services":[{"name":"Haircut","price":30,"duration":30}],"totalAmount":30,"walkIn":true,"paymentId":"pay_123"}'

  # Barber login
  curl -X POST http://localhost:${server.port}/barber/login \\
    -H "Content-Type: application/json" \\
    -d '{"code":"JB"}'

  # End of day
  curl -X POST http://localhost:${server.port}/manager/end-of-day \\
    -H "Authorization: Bearer ${MANAGER_KEY}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
