import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey(),
  customerId: text('customer_id'),
  amount: real('amount'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  agentId: text('agent_id').default('BLAKEPPH'),
  tranCode: text('tran_code'),
  tranType: text('tran_type'),
  documentNumber: text('document_number'),
  enteredBy: text('entered_by'),
  freeplayBalance: real('freeplay_balance').default(0),
  freeplayPendingBalance: real('freeplay_pending_balance').default(0),
  freeplayPendingCount: integer('freeplay_pending_count').default(0),
  gradeNum: integer('grade_num'),
  login: text('login'),
  shortDesc: text('short_desc'),
  tranDatetime: text('tran_datetime').default(sql`CURRENT_TIMESTAMP`),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey(),
  customerId: text('customer_id').unique().notNull(),
  username: text('username'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  login: text('login'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const bets = sqliteTable('bets', {
  id: integer('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  amount: real('amount'),
  odds: real('odds'),
  type: text('type'),
  status: text('status').default('pending'),
  outcome: text('outcome'),
  teams: text('teams'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
