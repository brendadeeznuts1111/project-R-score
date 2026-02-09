// payment-routing.ts - Payment Splitting, Routing Configuration, and Fallback Plans
// Handles split payments among multiple barbers, routing rules, and fallback scenarios

import { RedisClient } from 'bun';

// Lazy Redis connection - only connect when needed
let _redis: ReturnType<typeof RedisClient> | null = null;

function getRedis() {
  if (!_redis) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    _redis = RedisClient(REDIS_URL);
  }
  return _redis;
}

// For convenience, export a proxy that lazily connects
const redis = new Proxy({} as ReturnType<typeof RedisClient>, {
  get(_target, prop) {
    const r = getRedis();
    return (r as Record<string, unknown>)[prop];
  }
});

// ==================== TYPES ====================

export type PaymentSplitType = 'equal' | 'percentage' | 'fixed' | 'custom';

export type PaymentRouteStatus = 'active' | 'paused' | 'disabled';

export type FallbackTrigger = 'primary_unavailable' | 'timeout' | 'error' | 'manual' | 'capacity_exceeded';

export type PaymentMethod = 'card' | 'cash' | 'venmo' | 'cashapp' | 'paypal' | 'other';

export interface PaymentSplitRecipient {
  id: string;
  barberId: string;
  barberName?: string;
  splitType: PaymentSplitType;
  splitValue: number; // percentage (0-100) or fixed amount
  priority: number; // lower = higher priority
  minAmount?: number; // minimum payment amount for this recipient
  maxAmount?: number; // maximum payment amount for this recipient
}

export interface PaymentSplit {
  id: string;
  ticketId: string;
  totalAmount: number;
  recipients: PaymentSplitRecipient[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  createdAt: string;
  processedAt?: string;
  error?: string;
}

export interface PaymentRoute {
  id: string;
  name: string;
  description?: string;
  barberId: string;
  barberName?: string;
  paymentMethods: PaymentMethod[];
  priority: number;
  status: PaymentRouteStatus;
  conditions: PaymentRouteCondition[];
  maxDailyAmount?: number;
  maxTransactionAmount?: number;
  currentDailyTotal: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRouteCondition {
  field: 'amount' | 'service_type' | 'customer_tier' | 'time_of_day' | 'day_of_week' | 'barber_available';
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: string | number | string[] | number[];
}

export interface FallbackPlan {
  id: string;
  name: string;
  description?: string;
  trigger: FallbackTrigger;
  primaryRouteId: string;
  fallbackRouteIds: string[]; // ordered by priority
  retryCount: number;
  retryDelayMs: number;
  notifyOnFallback: boolean;
  notificationChannels: ('email' | 'sms' | 'dashboard')[];
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface FallbackExecution {
  id: string;
  fallbackPlanId: string;
  originalRouteId: string;
  usedRouteId: string;
  trigger: FallbackTrigger;
  ticketId?: string;
  paymentId?: string;
  amount: number;
  retryAttempts: number;
  success: boolean;
  error?: string;
  executedAt: string;
}

export interface RoutingConfig {
  id: string;
  name: string;
  defaultRouteId?: string;
  enableAutoRouting: boolean;
  enableFallbacks: boolean;
  splitThreshold: number; // amount above which splitting is suggested
  defaultSplitType: PaymentSplitType;
  maxSplitRecipients: number;
  routingStrategy: 'round_robin' | 'priority' | 'load_balance' | 'skill_match';
  createdAt: string;
  updatedAt: string;
}

// ==================== REDIS KEYS ====================

const REDIS_KEYS = {
  // Payment splits
  split: (id: string) => `payment:split:${id}`,
  splitsByTicket: (ticketId: string) => `payment:splits:ticket:${ticketId}`,
  splitsPending: 'payment:splits:pending',
  splitsProcessing: 'payment:splits:processing',
  splitsCompleted: 'payment:splits:completed',
  
  // Routes
  route: (id: string) => `payment:route:${id}`,
  routesByBarber: (barberId: string) => `payment:routes:barber:${barberId}`,
  routesActive: 'payment:routes:active',
  routesAll: 'payment:routes:all',
  
  // Fallback plans
  fallbackPlan: (id: string) => `payment:fallback:${id}`,
  fallbacksByRoute: (routeId: string) => `payment:fallbacks:route:${routeId}`,
  fallbacksActive: 'payment:fallbacks:active',
  fallbackExecutions: 'payment:fallback:executions',
  
  // Routing config
  routingConfig: (id: string) => `payment:config:${id}`,
  activeRoutingConfig: 'payment:config:active',
  
  // Statistics
  statsDaily: (date: string) => `payment:stats:daily:${date}`,
  barberStats: (barberId: string) => `payment:stats:barber:${barberId}`,
};

// ==================== UTILITY FUNCTIONS ====================

const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const now = () => new Date().toISOString();

const today = () => new Date().toISOString().split('T')[0];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// ==================== PAYMENT SPLIT CALCULATIONS ====================

export interface SplitCalculationInput {
  totalAmount: number;
  recipients: Omit<PaymentSplitRecipient, 'id' | 'barberName'>[];
}

export interface SplitCalculationResult {
  recipients: {
    barberId: string;
    amount: number;
    percentage: number;
  }[];
  totalAllocated: number;
  remainder: number;
  isValid: boolean;
  errors: string[];
}

export function calculateSplit(input: SplitCalculationInput): SplitCalculationResult {
  const { totalAmount, recipients } = input;
  const errors: string[] = [];
  const allocations: { barberId: string; amount: number; percentage: number }[] = [];
  
  if (recipients.length === 0) {
    return {
      recipients: [],
      totalAllocated: 0,
      remainder: totalAmount,
      isValid: false,
      errors: ['No recipients specified'],
    };
  }

  // Sort by priority (lower = higher priority)
  const sorted = [...recipients].sort((a, b) => a.priority - b.priority);
  
  let remainingAmount = totalAmount;
  let totalPercentageUsed = 0;
  let totalFixedAmount = 0;

  // First pass: calculate fixed amounts and collect percentages
  for (const recipient of sorted) {
    if (recipient.splitType === 'fixed') {
      const amount = Math.min(recipient.splitValue, remainingAmount);
      if (recipient.minAmount !== undefined && amount < recipient.minAmount) {
        errors.push(`Recipient ${recipient.barberId} below minimum amount`);
      }
      if (recipient.maxAmount !== undefined && amount > recipient.maxAmount) {
        errors.push(`Recipient ${recipient.barberId} above maximum amount`);
      }
      totalFixedAmount += amount;
      remainingAmount -= amount;
    } else if (recipient.splitType === 'percentage') {
      totalPercentageUsed += recipient.splitValue;
    }
  }

  // Validate percentage doesn't exceed 100%
  if (totalPercentageUsed > 100) {
    errors.push(`Total percentage (${totalPercentageUsed}%) exceeds 100%`);
  }

  // Second pass: calculate percentage-based amounts
  const amountForPercentages = totalAmount - totalFixedAmount;
  let allocatedFromPercentages = 0;

  for (const recipient of sorted) {
    if (recipient.splitType === 'percentage') {
      const amount = roundMoney((recipient.splitValue / 100) * amountForPercentages);
      const actualPercentage = (amount / totalAmount) * 100;
      
      allocations.push({
        barberId: recipient.barberId,
        amount,
        percentage: roundMoney(actualPercentage),
      });
      allocatedFromPercentages += amount;
    } else if (recipient.splitType === 'fixed') {
      const amount = Math.min(recipient.splitValue, totalAmount);
      allocations.push({
        barberId: recipient.barberId,
        amount,
        percentage: roundMoney((amount / totalAmount) * 100),
      });
    } else if (recipient.splitType === 'equal') {
      // Equal split - will be calculated after all other types
    }
  }

  // Handle equal splits among remaining
  const equalSplitRecipients = sorted.filter(r => r.splitType === 'equal');
  if (equalSplitRecipients.length > 0) {
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    const remainingForEqual = totalAmount - totalAllocated;
    const equalAmount = roundMoney(remainingForEqual / equalSplitRecipients.length);
    
    for (const recipient of equalSplitRecipients) {
      allocations.push({
        barberId: recipient.barberId,
        amount: equalAmount,
        percentage: roundMoney((equalAmount / totalAmount) * 100),
      });
    }
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainder = roundMoney(totalAmount - totalAllocated);

  // If there's a remainder due to rounding, give it to highest priority recipient
  if (remainder > 0 && allocations.length > 0) {
    allocations[0].amount = roundMoney(allocations[0].amount + remainder);
    allocations[0].percentage = roundMoney((allocations[0].amount / totalAmount) * 100);
  }

  return {
    recipients: allocations,
    totalAllocated: roundMoney(totalAllocated + remainder),
    remainder: 0, // remainder is now allocated
    isValid: errors.length === 0,
    errors,
  };
}

// ==================== PAYMENT SPLIT OPERATIONS ====================

export async function createPaymentSplit(
  ticketId: string,
  totalAmount: number,
  recipients: Omit<PaymentSplitRecipient, 'id'>[]
): Promise<PaymentSplit> {
  const id = generateId('split');
  
  const splitRecipients: PaymentSplitRecipient[] = recipients.map((r, idx) => ({
    ...r,
    id: generateId('recip'),
    priority: r.priority ?? idx,
  }));

  const split: PaymentSplit = {
    id,
    ticketId,
    totalAmount,
    recipients: splitRecipients,
    status: 'pending',
    createdAt: now(),
  };

  await redis.hmset(REDIS_KEYS.split(id), [
    'id', split.id,
    'ticketId', split.ticketId,
    'totalAmount', split.totalAmount.toString(),
    'recipients', JSON.stringify(split.recipients),
    'status', split.status,
    'createdAt', split.createdAt,
  ]);

  await redis.sadd(REDIS_KEYS.splitsPending, id);
  await redis.set(REDIS_KEYS.splitsByTicket(ticketId), id);

  return split;
}

export async function getPaymentSplit(id: string): Promise<PaymentSplit | null> {
  const data = await redis.hgetall(REDIS_KEYS.split(id));
  if (!data.id) return null;
  
  return {
    id: data.id,
    ticketId: data.ticketId,
    totalAmount: parseFloat(data.totalAmount),
    recipients: JSON.parse(data.recipients || '[]'),
    status: data.status as PaymentSplit['status'],
    createdAt: data.createdAt,
    processedAt: data.processedAt || undefined,
    error: data.error || undefined,
  };
}

export async function getPaymentSplitByTicket(ticketId: string): Promise<PaymentSplit | null> {
  const id = await redis.get(REDIS_KEYS.splitsByTicket(ticketId));
  if (!id) return null;
  return getPaymentSplit(id);
}

export async function updatePaymentSplitStatus(
  id: string,
  status: PaymentSplit['status'],
  error?: string
): Promise<void> {
  const updates: string[] = [
    'status', status,
    'processedAt', now(),
  ];
  
  if (error) {
    updates.push('error', error);
  }

  await redis.hmset(REDIS_KEYS.split(id), updates);

  // Update sets
  await redis.srem(REDIS_KEYS.splitsPending, id);
  await redis.srem(REDIS_KEYS.splitsProcessing, id);
  
  if (status === 'completed') {
    await redis.sadd(REDIS_KEYS.splitsCompleted, id);
  } else if (status === 'processing') {
    await redis.sadd(REDIS_KEYS.splitsProcessing, id);
  }
}

export async function getPendingSplits(): Promise<PaymentSplit[]> {
  const ids = await redis.smembers(REDIS_KEYS.splitsPending);
  const splits: PaymentSplit[] = [];
  for (const id of ids) {
    const split = await getPaymentSplit(id);
    if (split) splits.push(split);
  }
  return splits;
}

// ==================== PAYMENT ROUTE OPERATIONS ====================

export async function createPaymentRoute(
  name: string,
  barberId: string,
  options: Partial<Omit<PaymentRoute, 'id' | 'name' | 'barberId' | 'createdAt' | 'updatedAt' | 'currentDailyTotal'>> = {}
): Promise<PaymentRoute> {
  const id = generateId('route');
  const timestamp = now();

  const route: PaymentRoute = {
    id,
    name,
    barberId,
    barberName: options.barberName,
    paymentMethods: options.paymentMethods ?? ['card', 'cash'],
    priority: options.priority ?? 100,
    status: options.status ?? 'active',
    conditions: options.conditions ?? [],
    maxDailyAmount: options.maxDailyAmount,
    maxTransactionAmount: options.maxTransactionAmount,
    currentDailyTotal: 0,
    metadata: options.metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await savePaymentRoute(route);
  return route;
}

async function savePaymentRoute(route: PaymentRoute): Promise<void> {
  await redis.hmset(REDIS_KEYS.route(route.id), [
    'id', route.id,
    'name', route.name,
    'barberId', route.barberId,
    'barberName', route.barberName || '',
    'paymentMethods', JSON.stringify(route.paymentMethods),
    'priority', route.priority.toString(),
    'status', route.status,
    'conditions', JSON.stringify(route.conditions),
    'maxDailyAmount', route.maxDailyAmount?.toString() || '',
    'maxTransactionAmount', route.maxTransactionAmount?.toString() || '',
    'currentDailyTotal', route.currentDailyTotal.toString(),
    'metadata', JSON.stringify(route.metadata || {}),
    'createdAt', route.createdAt,
    'updatedAt', route.updatedAt,
  ]);

  await redis.sadd(REDIS_KEYS.routesAll, route.id);
  
  if (route.status === 'active') {
    await redis.sadd(REDIS_KEYS.routesActive, route.id);
  } else {
    await redis.srem(REDIS_KEYS.routesActive, route.id);
  }

  await redis.sadd(REDIS_KEYS.routesByBarber(route.barberId), route.id);
}

export async function getPaymentRoute(id: string): Promise<PaymentRoute | null> {
  const data = await redis.hgetall(REDIS_KEYS.route(id));
  if (!data.id) return null;

  return {
    id: data.id,
    name: data.name,
    barberId: data.barberId,
    barberName: data.barberName || undefined,
    paymentMethods: JSON.parse(data.paymentMethods || '[]'),
    priority: parseInt(data.priority, 10),
    status: data.status as PaymentRouteStatus,
    conditions: JSON.parse(data.conditions || '[]'),
    maxDailyAmount: data.maxDailyAmount ? parseFloat(data.maxDailyAmount) : undefined,
    maxTransactionAmount: data.maxTransactionAmount ? parseFloat(data.maxTransactionAmount) : undefined,
    currentDailyTotal: parseFloat(data.currentDailyTotal || '0'),
    metadata: JSON.parse(data.metadata || '{}'),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getRoutesByBarber(barberId: string): Promise<PaymentRoute[]> {
  const ids = await redis.smembers(REDIS_KEYS.routesByBarber(barberId));
  const routes: PaymentRoute[] = [];
  for (const id of ids) {
    const route = await getPaymentRoute(id);
    if (route) routes.push(route);
  }
  return routes.sort((a, b) => a.priority - b.priority);
}

export async function getActiveRoutes(): Promise<PaymentRoute[]> {
  const ids = await redis.smembers(REDIS_KEYS.routesActive);
  const routes: PaymentRoute[] = [];
  for (const id of ids) {
    const route = await getPaymentRoute(id);
    if (route) routes.push(route);
  }
  return routes.sort((a, b) => a.priority - b.priority);
}

export async function updatePaymentRoute(
  id: string,
  updates: Partial<Omit<PaymentRoute, 'id' | 'createdAt'>>
): Promise<PaymentRoute | null> {
  const route = await getPaymentRoute(id);
  if (!route) return null;

  const updated: PaymentRoute = {
    ...route,
    ...updates,
    updatedAt: now(),
  };

  await savePaymentRoute(updated);
  return updated;
}

export async function deletePaymentRoute(id: string): Promise<boolean> {
  const route = await getPaymentRoute(id);
  if (!route) return false;

  await redis.del(REDIS_KEYS.route(id));
  await redis.srem(REDIS_KEYS.routesAll, id);
  await redis.srem(REDIS_KEYS.routesActive, id);
  await redis.srem(REDIS_KEYS.routesByBarber(route.barberId), id);

  return true;
}

export async function resetDailyRouteTotals(): Promise<void> {
  const ids = await redis.smembers(REDIS_KEYS.routesAll);
  for (const id of ids) {
    await redis.hset(REDIS_KEYS.route(id), 'currentDailyTotal', '0');
  }
}

// ==================== ROUTE EVALUATION ====================

export interface RouteEvaluationContext {
  amount: number;
  paymentMethod: PaymentMethod;
  serviceType?: string;
  customerTier?: string;
  timeOfDay?: number; // hour 0-23
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  barberAvailable?: boolean;
}

export function evaluateRouteCondition(
  condition: PaymentRouteCondition,
  context: RouteEvaluationContext
): boolean {
  const { field, operator, value } = condition;
  
  let fieldValue: unknown;
  switch (field) {
    case 'amount':
      fieldValue = context.amount;
      break;
    case 'service_type':
      fieldValue = context.serviceType;
      break;
    case 'customer_tier':
      fieldValue = context.customerTier;
      break;
    case 'time_of_day':
      fieldValue = context.timeOfDay ?? new Date().getHours();
      break;
    case 'day_of_week':
      fieldValue = context.dayOfWeek ?? new Date().getDay();
      break;
    case 'barber_available':
      fieldValue = context.barberAvailable;
      break;
    default:
      return false;
  }

  switch (operator) {
    case 'eq':
      return fieldValue === value;
    case 'neq':
      return fieldValue !== value;
    case 'gt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
    case 'gte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
    case 'lt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
    case 'lte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue as string | number);
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const num = fieldValue as number;
        return num >= (value[0] as number) && num <= (value[1] as number);
      }
      return false;
    default:
      return false;
  }
}

export async function findBestRoute(
  context: RouteEvaluationContext
): Promise<PaymentRoute | null> {
  const routes = await getActiveRoutes();
  
  for (const route of routes) {
    // Check payment method
    if (!route.paymentMethods.includes(context.paymentMethod)) {
      continue;
    }

    // Check transaction limit
    if (route.maxTransactionAmount && context.amount > route.maxTransactionAmount) {
      continue;
    }

    // Check daily limit
    if (route.maxDailyAmount && route.currentDailyTotal + context.amount > route.maxDailyAmount) {
      continue;
    }

    // Check all conditions
    const allConditionsMet = route.conditions.every(cond => evaluateRouteCondition(cond, context));
    if (!allConditionsMet) {
      continue;
    }

    return route;
  }

  return null;
}

// ==================== FALLBACK PLAN OPERATIONS ====================

export async function createFallbackPlan(
  name: string,
  primaryRouteId: string,
  options: Partial<Omit<FallbackPlan, 'id' | 'name' | 'primaryRouteId' | 'createdAt' | 'updatedAt'>> = {}
): Promise<FallbackPlan> {
  const id = generateId('fallback');
  const timestamp = now();

  const plan: FallbackPlan = {
    id,
    name,
    primaryRouteId,
    fallbackRouteIds: options.fallbackRouteIds ?? [],
    trigger: options.trigger ?? 'primary_unavailable',
    retryCount: options.retryCount ?? 3,
    retryDelayMs: options.retryDelayMs ?? 1000,
    notifyOnFallback: options.notifyOnFallback ?? true,
    notificationChannels: options.notificationChannels ?? ['dashboard'],
    status: options.status ?? 'active',
    description: options.description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await saveFallbackPlan(plan);
  return plan;
}

async function saveFallbackPlan(plan: FallbackPlan): Promise<void> {
  await redis.hmset(REDIS_KEYS.fallbackPlan(plan.id), [
    'id', plan.id,
    'name', plan.name,
    'description', plan.description || '',
    'primaryRouteId', plan.primaryRouteId,
    'fallbackRouteIds', JSON.stringify(plan.fallbackRouteIds),
    'trigger', plan.trigger,
    'retryCount', plan.retryCount.toString(),
    'retryDelayMs', plan.retryDelayMs.toString(),
    'notifyOnFallback', plan.notifyOnFallback ? 'true' : 'false',
    'notificationChannels', JSON.stringify(plan.notificationChannels),
    'status', plan.status,
    'createdAt', plan.createdAt,
    'updatedAt', plan.updatedAt,
  ]);

  await redis.sadd(REDIS_KEYS.fallbacksByRoute(plan.primaryRouteId), plan.id);
  
  if (plan.status === 'active') {
    await redis.sadd(REDIS_KEYS.fallbacksActive, plan.id);
  }
}

export async function getFallbackPlan(id: string): Promise<FallbackPlan | null> {
  const data = await redis.hgetall(REDIS_KEYS.fallbackPlan(id));
  if (!data.id) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    primaryRouteId: data.primaryRouteId,
    fallbackRouteIds: JSON.parse(data.fallbackRouteIds || '[]'),
    trigger: data.trigger as FallbackTrigger,
    retryCount: parseInt(data.retryCount, 10),
    retryDelayMs: parseInt(data.retryDelayMs, 10),
    notifyOnFallback: data.notifyOnFallback === 'true',
    notificationChannels: JSON.parse(data.notificationChannels || '[]'),
    status: data.status as 'active' | 'disabled',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getFallbackPlansByRoute(routeId: string): Promise<FallbackPlan[]> {
  const ids = await redis.smembers(REDIS_KEYS.fallbacksByRoute(routeId));
  const plans: FallbackPlan[] = [];
  for (const id of ids) {
    const plan = await getFallbackPlan(id);
    if (plan && plan.status === 'active') plans.push(plan);
  }
  return plans;
}

export async function executeFallback(
  planId: string,
  trigger: FallbackTrigger,
  context: { ticketId?: string; paymentId?: string; amount: number }
): Promise<{ success: boolean; usedRouteId?: string; error?: string }> {
  const plan = await getFallbackPlan(planId);
  if (!plan || plan.status !== 'active') {
    return { success: false, error: 'Fallback plan not found or disabled' };
  }

  // Try fallback routes in order
  for (const routeId of plan.fallbackRouteIds) {
    const route = await getPaymentRoute(routeId);
    if (!route || route.status !== 'active') continue;

    // Check if route can handle the amount
    if (route.maxTransactionAmount && context.amount > route.maxTransactionAmount) {
      continue;
    }
    if (route.maxDailyAmount && route.currentDailyTotal + context.amount > route.maxDailyAmount) {
      continue;
    }

    // Log fallback execution
    const execution: FallbackExecution = {
      id: generateId('fbexec'),
      fallbackPlanId: plan.id,
      originalRouteId: plan.primaryRouteId,
      usedRouteId: routeId,
      trigger,
      ...context,
      retryAttempts: 0,
      success: true,
      executedAt: now(),
    };

    await redis.lpush(REDIS_KEYS.fallbackExecutions, JSON.stringify(execution));

    // Update route daily total
    route.currentDailyTotal += context.amount;
    await savePaymentRoute(route);

    return { success: true, usedRouteId: routeId };
  }

  // No fallback worked
  const execution: FallbackExecution = {
    id: generateId('fbexec'),
    fallbackPlanId: plan.id,
    originalRouteId: plan.primaryRouteId,
    usedRouteId: '',
    trigger,
    ...context,
    retryAttempts: plan.fallbackRouteIds.length,
    success: false,
    error: 'No fallback route available',
    executedAt: now(),
  };

  await redis.lpush(REDIS_KEYS.fallbackExecutions, JSON.stringify(execution));

  return { success: false, error: 'No fallback route available' };
}

// ==================== ROUTING CONFIG OPERATIONS ====================

export async function createRoutingConfig(
  name: string,
  options: Partial<Omit<RoutingConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>> = {}
): Promise<RoutingConfig> {
  const id = generateId('config');
  const timestamp = now();

  const config: RoutingConfig = {
    id,
    name,
    defaultRouteId: options.defaultRouteId,
    enableAutoRouting: options.enableAutoRouting ?? true,
    enableFallbacks: options.enableFallbacks ?? true,
    splitThreshold: options.splitThreshold ?? 100,
    defaultSplitType: options.defaultSplitType ?? 'percentage',
    maxSplitRecipients: options.maxSplitRecipients ?? 5,
    routingStrategy: options.routingStrategy ?? 'priority',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await saveRoutingConfig(config);
  return config;
}

async function saveRoutingConfig(config: RoutingConfig): Promise<void> {
  await redis.hmset(REDIS_KEYS.routingConfig(config.id), [
    'id', config.id,
    'name', config.name,
    'defaultRouteId', config.defaultRouteId || '',
    'enableAutoRouting', config.enableAutoRouting ? 'true' : 'false',
    'enableFallbacks', config.enableFallbacks ? 'true' : 'false',
    'splitThreshold', config.splitThreshold.toString(),
    'defaultSplitType', config.defaultSplitType,
    'maxSplitRecipients', config.maxSplitRecipients.toString(),
    'routingStrategy', config.routingStrategy,
    'createdAt', config.createdAt,
    'updatedAt', config.updatedAt,
  ]);
}

export async function getRoutingConfig(id: string): Promise<RoutingConfig | null> {
  const data = await redis.hgetall(REDIS_KEYS.routingConfig(id));
  if (!data.id) return null;

  return {
    id: data.id,
    name: data.name,
    defaultRouteId: data.defaultRouteId || undefined,
    enableAutoRouting: data.enableAutoRouting === 'true',
    enableFallbacks: data.enableFallbacks === 'true',
    splitThreshold: parseFloat(data.splitThreshold),
    defaultSplitType: data.defaultSplitType as PaymentSplitType,
    maxSplitRecipients: parseInt(data.maxSplitRecipients, 10),
    routingStrategy: data.routingStrategy as RoutingConfig['routingStrategy'],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getActiveRoutingConfig(): Promise<RoutingConfig | null> {
  const id = await redis.get(REDIS_KEYS.activeRoutingConfig);
  if (!id) return null;
  return getRoutingConfig(id);
}

export async function setActiveRoutingConfig(id: string): Promise<boolean> {
  const config = await getRoutingConfig(id);
  if (!config) return false;
  await redis.set(REDIS_KEYS.activeRoutingConfig, id);
  return true;
}

// ==================== STATISTICS ====================

export interface PaymentRoutingStats {
  date: string;
  totalRouted: number;
  totalSplits: number;
  totalFallbacks: number;
  byRoute: Record<string, { count: number; total: number }>;
  byBarber: Record<string, { count: number; total: number }>;
  fallbackRate: number;
  averageSplitRecipients: number;
}

export async function getRoutingStats(date?: string): Promise<PaymentRoutingStats> {
  const targetDate = date ?? today();
  const data = await redis.hgetall(REDIS_KEYS.statsDaily(targetDate));
  
  return {
    date: targetDate,
    totalRouted: parseInt(data.totalRouted || '0', 10),
    totalSplits: parseInt(data.totalSplits || '0', 10),
    totalFallbacks: parseInt(data.totalFallbacks || '0', 10),
    byRoute: JSON.parse(data.byRoute || '{}'),
    byBarber: JSON.parse(data.byBarber || '{}'),
    fallbackRate: parseFloat(data.fallbackRate || '0'),
    averageSplitRecipients: parseFloat(data.averageSplitRecipients || '0'),
  };
}

export async function recordRoutingStats(
  routeId: string,
  barberId: string,
  amount: number,
  wasSplit: boolean,
  splitRecipientCount: number,
  wasFallback: boolean
): Promise<void> {
  const date = today();
  const key = REDIS_KEYS.statsDaily(date);
  
  await redis.hincrby(key, 'totalRouted', 1);
  if (wasSplit) {
    await redis.hincrby(key, 'totalSplits', 1);
  }
  if (wasFallback) {
    await redis.hincrby(key, 'totalFallbacks', 1);
  }

  // Update byRoute
  const byRouteRaw = await redis.hget(key, 'byRoute');
  const byRoute = JSON.parse(byRouteRaw || '{}');
  if (!byRoute[routeId]) {
    byRoute[routeId] = { count: 0, total: 0 };
  }
  byRoute[routeId].count += 1;
  byRoute[routeId].total += amount;
  await redis.hset(key, 'byRoute', JSON.stringify(byRoute));

  // Update byBarber
  const byBarberRaw = await redis.hget(key, 'byBarber');
  const byBarber = JSON.parse(byBarberRaw || '{}');
  if (!byBarber[barberId]) {
    byBarber[barberId] = { count: 0, total: 0 };
  }
  byBarber[barberId].count += 1;
  byBarber[barberId].total += amount;
  await redis.hset(key, 'byBarber', JSON.stringify(byBarber));

  // Update barber-specific stats
  const barberKey = REDIS_KEYS.barberStats(barberId);
  await redis.hincrby(barberKey, 'totalPayments', 1);
  await redis.hincrbyfloat(barberKey, 'totalAmount', amount.toString());
}

// ==================== EXPORT ====================

export const PaymentRouting = {
  // Split operations
  createPaymentSplit,
  getPaymentSplit,
  getPaymentSplitByTicket,
  updatePaymentSplitStatus,
  getPendingSplits,
  calculateSplit,
  
  // Route operations
  createPaymentRoute,
  getPaymentRoute,
  getRoutesByBarber,
  getActiveRoutes,
  updatePaymentRoute,
  deletePaymentRoute,
  findBestRoute,
  resetDailyRouteTotals,
  
  // Fallback operations
  createFallbackPlan,
  getFallbackPlan,
  getFallbackPlansByRoute,
  executeFallback,
  
  // Config operations
  createRoutingConfig,
  getRoutingConfig,
  getActiveRoutingConfig,
  setActiveRoutingConfig,
  
  // Stats
  getRoutingStats,
  recordRoutingStats,
};

export default PaymentRouting;