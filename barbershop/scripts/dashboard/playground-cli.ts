#!/usr/bin/env bun
/**
 * FactoryWager Playground Dashboard CLI
 *
 * Visual dashboards for:
 * - Clients (view services, bookings, payments)
 * - Admins (manage barbers, view analytics)
 * - Payment Approvals (visual pipeline)
 * - Barber Hierarchy (team structure)
 *
 * Usage:
 *   bun run playground.ts [dashboard] [options]
 */

import {
  registry,
  type PaymentPipeline,
  type BarberHierarchy,
  type PaymentApproval,
} from '../../lib/cloudflare/registry';
import { ThemedConsole, getDomainTheme, themedSeparator } from '../../themes/config/domain-theme';
import { FACTORY_WAGER_BRAND } from '../../src/config/domain';
import { colorManager } from '../../lib/cloudflare/bun-data-api';

const args = process.argv.slice(2);
const dashboard = args[0];
const subcommand = args[1];

const t = new ThemedConsole('professional');

function printHeader(): void {
  const { icon, name } = FACTORY_WAGER_BRAND;
  const separator = themedSeparator('professional', 60);

  t.log();
  t.log(separator);
  t.log(`${icon} ${name} Playground Dashboard`);
  t.log(`   Visual Management System`);
  t.log(separator);
  t.log();
}

// ==================== Visual Pipeline ====================

function renderPipeline(pipeline: PaymentPipeline): void {
  t.header(`💰 Payment Pipeline: ${pipeline.id}`);
  t.log();

  const stageColors: Record<string, string> = {
    pending: '\x1b[90m', // gray
    active: '\x1b[33m', // yellow
    completed: '\x1b[32m', // green
    failed: '\x1b[31m', // red
  };

  const reset = '\x1b[0m';

  // Render pipeline visualization
  t.log('  Pipeline Flow:');
  t.log();

  pipeline.stages.forEach((stage, index) => {
    const isLast = index === pipeline.stages.length - 1;
    const color = stageColors[stage.status];
    const symbol =
      stage.status === 'completed'
        ? '✓'
        : stage.status === 'active'
          ? '●'
          : stage.status === 'failed'
            ? '✗'
            : '○';

    // Stage box
    t.log(`  ${color}┌─────────────────────────┐${reset}`);
    t.log(`  ${color}│ ${symbol} ${stage.name.padEnd(20)} │${reset}`);

    if (stage.assignee) {
      t.log(`  ${color}│   👤 ${stage.assignee.padEnd(17)}│${reset}`);
    }

    if (stage.startedAt) {
      const time = new Date(stage.startedAt).toLocaleTimeString();
      t.log(`  ${color}│   🕐 ${time.padEnd(17)}│${reset}`);
    }

    t.log(`  ${color}└─────────────────────────┘${reset}`);

    if (!isLast) {
      t.log(`  ${color}           ↓              ${reset}`);
    }
  });

  t.log();
  t.info(`Status: ${pipeline.status}`);
  t.info(`Amount: $${pipeline.amount} ${pipeline.currency}`);
  t.info(`Client: ${pipeline.client}`);
  t.info(`Barber: ${pipeline.barber}`);
}

// ==================== Hierarchy Tree ====================

function renderHierarchy(barbers: BarberHierarchy[], parentId?: string, level = 0): void {
  const indent = '  '.repeat(level);

  const team = barbers.filter(b => b.parentId === parentId);

  team.forEach((barber, index) => {
    const isLast = index === team.length - 1;
    const branch = isLast ? '└──' : '├──';
    const roleIcon =
      barber.role === 'owner'
        ? '👑'
        : barber.role === 'manager'
          ? '💼'
          : barber.role === 'senior'
            ? '✂️'
            : barber.role === 'junior'
              ? '🪒'
              : '📚';

    t.log(`${indent}${branch} ${roleIcon} ${barber.name} (${barber.role})`);

    if (barber.metrics) {
      const metrics = `⭐${barber.metrics.rating.toFixed(1)} 💰$${barber.metrics.revenue} ✂️${barber.metrics.totalCuts}`;
      t.log(`${indent}${isLast ? '    ' : '│   '}   ${metrics}`);
    }

    // Recursively render children
    renderHierarchy(barbers, barber.id, level + 1);
  });
}

// ==================== Approval Board ====================

function renderApprovalBoard(approvals: PaymentApproval[]): void {
  t.header('📋 Payment Approvals');
  t.log();

  const pending = approvals.filter(a => a.status === 'pending');
  const approved = approvals.filter(a => a.status === 'approved');
  const rejected = approvals.filter(a => a.status === 'rejected');

  // Pending approvals (need attention)
  if (pending.length > 0) {
    t.warning(`Pending (${pending.length}):`);
    pending.forEach(a => {
      t.log(`  ⚠️  $${a.amount} - ${a.reason}`);
      t.log(`     Requested by: ${a.requestedBy}`);
      t.log(`     Waiting for: ${a.approvers.join(', ')}`);
    });
    t.log();
  }

  // Approved
  if (approved.length > 0) {
    t.success(`Approved (${approved.length}):`);
    approved.forEach(a => {
      t.log(`  ✓ $${a.amount} - ${a.reason}`);
      t.log(`     Approved by: ${a.approvedBy}`);
    });
    t.log();
  }

  // Rejected
  if (rejected.length > 0) {
    t.error(`Rejected (${rejected.length}):`);
    rejected.forEach(a => {
      t.log(`  ✗ $${a.amount} - ${a.reason}`);
      if (a.comments.length > 0) {
        t.log(`     Reason: ${a.comments[a.comments.length - 1].text}`);
      }
    });
  }
}

// ==================== Dashboard Commands ====================

async function cmdDashboardClient(): Promise<void> {
  t.header('👤 Client Dashboard');
  t.log();

  // Mock client data
  const bookings = [
    { service: 'Haircut', date: '2024-02-10', barber: 'John', status: 'confirmed' },
    { service: 'Beard Trim', date: '2024-02-15', barber: 'Mike', status: 'pending' },
  ];

  const payments = [
    { amount: 45, status: 'completed', date: '2024-02-01' },
    { amount: 30, status: 'pending', date: '2024-02-05' },
  ];

  t.info('Upcoming Bookings:');
  bookings.forEach(b => {
    const status = b.status === 'confirmed' ? '✓' : '⏳';
    t.log(`  ${status} ${b.service} with ${b.barber} on ${b.date}`);
  });

  t.log();
  t.info('Payment History:');
  payments.forEach(p => {
    const status = p.status === 'completed' ? '✓' : '⏳';
    t.log(`  ${status} $${p.amount} - ${p.date}`);
  });
}

async function cmdDashboardAdmin(): Promise<void> {
  t.header('🔧 Admin Dashboard');
  t.log();

  // Mock analytics
  const stats = {
    totalRevenue: 12500,
    totalCuts: 342,
    activeBarbers: 8,
    pendingApprovals: 3,
  };

  t.success('Key Metrics:');
  t.log(`  💰 Revenue: $${stats.totalRevenue}`);
  t.log(`  ✂️  Total Cuts: ${stats.totalCuts}`);
  t.log(`  👥 Active Barbers: ${stats.activeBarbers}`);
  t.warning(`  ⏳ Pending Approvals: ${stats.pendingApprovals}`);

  t.log();
  t.info('Quick Actions:');
  t.log('  1. Manage Barbers');
  t.log('  2. View Reports');
  t.log('  3. Process Approvals');
  t.log('  4. System Settings');
}

async function cmdDashboardPipeline(): Promise<void> {
  // Create sample payment pipeline
  const pipeline: PaymentPipeline = {
    id: 'pay-123456',
    status: 'review',
    amount: 150,
    currency: 'USD',
    client: 'Alice Johnson',
    barber: 'John Smith',
    stages: [
      {
        name: 'submission',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      {
        name: 'review',
        status: 'active',
        startedAt: new Date().toISOString(),
        assignee: 'Manager',
      },
      { name: 'approval', status: 'pending' },
      { name: 'processing', status: 'pending' },
      { name: 'completion', status: 'pending' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  renderPipeline(pipeline);
}

async function cmdDashboardHierarchy(): Promise<void> {
  t.header('👥 Barber Hierarchy');
  t.log();

  // Create sample hierarchy
  const barbers: BarberHierarchy[] = [
    {
      id: 'barber-1',
      name: 'Robert Owner',
      role: 'owner',
      commission: 0.5,
      permissions: ['all'],
      metrics: { totalCuts: 0, rating: 5.0, revenue: 50000 },
    },
    {
      id: 'barber-2',
      name: 'Mike Manager',
      role: 'manager',
      parentId: 'barber-1',
      commission: 0.3,
      permissions: ['manage', 'approve'],
      metrics: { totalCuts: 1200, rating: 4.8, revenue: 25000 },
    },
    {
      id: 'barber-3',
      name: 'John Senior',
      role: 'senior',
      parentId: 'barber-2',
      commission: 0.25,
      permissions: ['cut', 'train'],
      metrics: { totalCuts: 800, rating: 4.9, revenue: 18000 },
    },
    {
      id: 'barber-4',
      name: 'Sam Junior',
      role: 'junior',
      parentId: 'barber-2',
      commission: 0.15,
      permissions: ['cut'],
      metrics: { totalCuts: 200, rating: 4.5, revenue: 5000 },
    },
  ];

  renderHierarchy(barbers);

  t.log();
  t.info('Legend:');
  t.log('  👑 Owner  💼 Manager  ✂️ Senior  🪒 Junior  📚 Trainee');
}

async function cmdDashboardApprovals(): Promise<void> {
  // Create sample approvals
  const approvals: PaymentApproval[] = [
    {
      id: 'apr-1',
      paymentId: 'pay-123',
      requestedBy: 'John Smith',
      amount: 150,
      reason: 'Product purchase',
      status: 'pending',
      approvers: ['Manager', 'Owner'],
      comments: [],
    },
    {
      id: 'apr-2',
      paymentId: 'pay-124',
      requestedBy: 'Mike Manager',
      amount: 500,
      reason: 'Equipment upgrade',
      status: 'approved',
      approvers: ['Owner'],
      approvedBy: 'Robert Owner',
      approvedAt: new Date().toISOString(),
      comments: [
        {
          author: 'Robert Owner',
          text: 'Approved for purchase',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ];

  renderApprovalBoard(approvals);
}

// ==================== Interactive Commands ====================

async function cmdPipelineCreate(): Promise<void> {
  const amount = parseFloat(args[1]) || 100;
  const client = args[2] || 'Client';
  const barber = args[3] || 'Barber';

  t.header('🆕 Create Payment Pipeline');
  t.log();

  try {
    const pipeline = await registry.createPaymentPipeline({
      status: 'pending',
      amount,
      currency: 'USD',
      client,
      barber,
    });

    t.success('Pipeline created!');
    renderPipeline(pipeline);
  } catch (error) {
    t.error(`Failed: ${(error as Error).message}`);
  }
}

async function cmdPipelineAdvance(): Promise<void> {
  const pipelineId = args[1];

  if (!pipelineId) {
    t.error('Usage: pipeline-advance <pipeline-id>');
    return;
  }

  t.header('⏩ Advance Pipeline');
  t.log();

  try {
    // Find next pending stage and mark as active/completed
    const entry = await registry.fetch(`payment-${pipelineId}`);
    if (!entry) {
      t.error('Pipeline not found');
      return;
    }

    const pipeline = entry.content as PaymentPipeline;
    const activeStage = pipeline.stages.find(s => s.status === 'active');

    if (activeStage) {
      await registry.updatePipelineStage(pipelineId, activeStage.name, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      // Activate next stage
      const nextStage = pipeline.stages.find(s => s.status === 'pending');
      if (nextStage) {
        await registry.updatePipelineStage(pipelineId, nextStage.name, {
          status: 'active',
          startedAt: new Date().toISOString(),
        });
      }

      t.success('Pipeline advanced!');
    } else {
      t.warning('No active stage to advance');
    }
  } catch (error) {
    t.error(`Failed: ${(error as Error).message}`);
  }
}

async function cmdApprovalCreate(): Promise<void> {
  const amount = parseFloat(args[1]) || 100;
  const reason = args.slice(2).join(' ') || 'Payment approval';

  t.header('📝 Create Approval Request');
  t.log();

  try {
    const approval = await registry.createApproval({
      paymentId: `pay-${Date.now()}`,
      requestedBy: 'Barber',
      amount,
      reason,
      status: 'pending',
      approvers: ['Manager', 'Owner'],
      comments: [],
    });

    t.success('Approval request created!');
    t.log(`  ID: ${approval.id}`);
    t.log(`  Amount: $${approval.amount}`);
    t.log(`  Reason: ${approval.reason}`);
  } catch (error) {
    t.error(`Failed: ${(error as Error).message}`);
  }
}

async function cmdApprovalProcess(): Promise<void> {
  const approvalId = args[1];
  const decision = args[2] as 'approved' | 'rejected';
  const comment = args.slice(3).join(' ');

  if (!approvalId || !decision) {
    t.error('Usage: approval-process <id> <approved|rejected> [comment]');
    return;
  }

  t.header(`✓ Process Approval: ${decision}`);
  t.log();

  try {
    const approval = await registry.processApproval(approvalId, decision, 'Admin', comment);

    if (approval) {
      t.success(`Approval ${decision}!`);
      t.log(`  Payment: ${approval.paymentId}`);
      t.log(`  Amount: $${approval.amount}`);
    } else {
      t.error('Approval not found');
    }
  } catch (error) {
    t.error(`Failed: ${(error as Error).message}`);
  }
}

// ==================== Help ====================

async function cmdHelp(): Promise<void> {
  printHeader();

  t.header('Usage:');
  t.log('  bun run playground.ts <dashboard> [options]');
  t.log();

  t.header('Dashboards:');
  t.log('  client                 Client dashboard');
  t.log('  admin                  Admin dashboard');
  t.log('  pipeline               Payment pipeline view');
  t.log('  hierarchy              Barber hierarchy tree');
  t.log('  approvals              Payment approvals board');
  t.log();

  t.header('Interactive Commands:');
  t.log('  pipeline-create [amt] [client] [barber]');
  t.log('  pipeline-advance <id>');
  t.log('  approval-create <amount> <reason>');
  t.log('  approval-process <id> <approved|rejected> [comment]');
  t.log();

  t.header('Examples:');
  t.log('  bun run playground.ts client');
  t.log('  bun run playground.ts pipeline');
  t.log('  bun run playground.ts hierarchy');
  t.log('  bun run playground.ts pipeline-create 150 "Alice" "John"');
  t.log('  bun run playground.ts approval-create 500 "Equipment purchase"');
}

// ==================== Main ====================

async function main() {
  if (!dashboard || ['help', '--help', '-h'].includes(dashboard)) {
    await cmdHelp();
    return;
  }

  if (!['help', '--help', '-h'].includes(dashboard)) {
    printHeader();
  }

  switch (dashboard) {
    case 'client':
      await cmdDashboardClient();
      break;
    case 'admin':
      await cmdDashboardAdmin();
      break;
    case 'pipeline':
      await cmdDashboardPipeline();
      break;
    case 'hierarchy':
      await cmdDashboardHierarchy();
      break;
    case 'approvals':
      await cmdDashboardApprovals();
      break;
    case 'pipeline-create':
      await cmdPipelineCreate();
      break;
    case 'pipeline-advance':
      await cmdPipelineAdvance();
      break;
    case 'approval-create':
      await cmdApprovalCreate();
      break;
    case 'approval-process':
      await cmdApprovalProcess();
      break;
    default:
      t.error(`Unknown dashboard: ${dashboard}`);
      t.log('Run "help" for available dashboards');
  }
}

main().catch(console.error);
