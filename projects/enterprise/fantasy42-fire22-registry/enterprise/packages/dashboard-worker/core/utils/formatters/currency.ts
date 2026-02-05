/**
 * Currency Formatting Utilities
 * Comprehensive currency formatting and conversion utilities
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';
export type CurrencyFormat = 'symbol' | 'code' | 'name' | 'narrow';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  position: 'before' | 'after';
}

export interface CurrencyOptions {
  currency?: CurrencyCode;
  locale?: string;
  format?: CurrencyFormat;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  showSymbol?: boolean;
  compact?: boolean;
}

// Currency information database
const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, position: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, position: 'after' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, position: 'before' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, position: 'before' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, position: 'before' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, position: 'before' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, position: 'before' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, position: 'before' },
};

/**
 * Format currency amount with various options
 */
export function formatCurrency(amount: number, options: CurrencyOptions = {}): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    format = 'symbol',
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
    showSymbol = true,
    compact = false,
  } = options;

  const currencyInfo = CURRENCY_INFO[currency];
  if (!currencyInfo) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  // Handle zero and very small amounts
  if (Math.abs(amount) < 0.01 && amount !== 0) {
    return `${showSymbol ? currencyInfo.symbol : ''}0.00`;
  }

  // Use compact notation for large numbers
  if (compact && Math.abs(amount) >= 1000000) {
    return formatCompactCurrency(amount, currency, locale);
  }

  // Determine decimal places
  const decimals =
    maximumFractionDigits !== undefined
      ? maximumFractionDigits
      : minimumFractionDigits !== undefined
        ? minimumFractionDigits
        : currencyInfo.decimals;

  // Format the number
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  }).format(Math.abs(amount));

  // Add currency symbol/code
  let currencyPart = '';
  switch (format) {
    case 'symbol':
      currencyPart = showSymbol ? currencyInfo.symbol : '';
      break;
    case 'code':
      currencyPart = currency;
      break;
    case 'name':
      currencyPart = currencyInfo.name;
      break;
    case 'narrow':
      currencyPart = currencyInfo.symbol;
      break;
  }

  // Position the currency symbol
  if (currencyInfo.position === 'before') {
    return `${currencyPart}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currencyPart}`;
  }
}

/**
 * Format currency for compact display (K, M, B)
 */
function formatCompactCurrency(amount: number, currency: CurrencyCode, locale: string): string {
  const absAmount = Math.abs(amount);
  const currencyInfo = CURRENCY_INFO[currency];

  let formattedAmount: string;
  let suffix: string;

  if (absAmount >= 1000000000) {
    formattedAmount = (absAmount / 1000000000).toFixed(1);
    suffix = 'B';
  } else if (absAmount >= 1000000) {
    formattedAmount = (absAmount / 1000000).toFixed(1);
    suffix = 'M';
  } else if (absAmount >= 1000) {
    formattedAmount = (absAmount / 1000).toFixed(1);
    suffix = 'K';
  } else {
    formattedAmount = absAmount.toFixed(currencyInfo.decimals);
    suffix = '';
  }

  // Remove .0 if it's a whole number
  if (formattedAmount.endsWith('.0')) {
    formattedAmount = formattedAmount.slice(0, -2);
  }

  const symbol = currencyInfo.symbol;
  return `${symbol}${formattedAmount}${suffix}`;
}

/**
 * Parse currency string back to number
 */
export function parseCurrency(currencyString: string, currency: CurrencyCode = 'USD'): number {
  if (!currencyString || typeof currencyString !== 'string') {
    throw new Error('Invalid currency string');
  }

  const currencyInfo = CURRENCY_INFO[currency];
  if (!currencyInfo) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  // Remove currency symbol and common separators
  let cleanString = currencyString
    .replace(new RegExp(`\\${currencyInfo.symbol}`, 'g'), '')
    .replace(new RegExp(currency, 'g'), '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();

  // Handle suffixes
  const suffixMatch = cleanString.match(/(\d+(?:\.\d+)?)([KMB])$/i);
  if (suffixMatch) {
    const [, numStr, suffix] = suffixMatch;
    const num = parseFloat(numStr);

    switch (suffix.toUpperCase()) {
      case 'K':
        return num * 1000;
      case 'M':
        return num * 1000000;
      case 'B':
        return num * 1000000000;
    }
  }

  const parsed = parseFloat(cleanString);
  if (isNaN(parsed)) {
    throw new Error(`Unable to parse currency: ${currencyString}`);
  }

  return parsed;
}

/**
 * Calculate percentage change between two amounts
 */
export function calculatePercentageChange(
  oldAmount: number,
  newAmount: number
): {
  change: number;
  percentage: number;
  direction: 'up' | 'down' | 'unchanged';
} {
  if (oldAmount === 0) {
    return {
      change: newAmount,
      percentage: newAmount > 0 ? 100 : 0,
      direction: newAmount > 0 ? 'up' : newAmount < 0 ? 'down' : 'unchanged',
    };
  }

  const change = newAmount - oldAmount;
  const percentage = (change / Math.abs(oldAmount)) * 100;

  let direction: 'up' | 'down' | 'unchanged' = 'unchanged';
  if (change > 0) direction = 'up';
  else if (change < 0) direction = 'down';

  return { change, percentage, direction };
}

/**
 * Format percentage change
 */
export function formatPercentageChange(
  change: number,
  options: { showSign?: boolean; decimals?: number } = {}
): string {
  const { showSign = true, decimals = 2 } = options;

  const formatted = change.toFixed(decimals);
  const sign = showSign && change !== 0 ? (change > 0 ? '+' : '') : '';

  return `${sign}${formatted}%`;
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): number {
  const compoundRate = rate / compoundingFrequency;
  const periods = time * compoundingFrequency;

  return principal * Math.pow(1 + compoundRate, periods);
}

/**
 * Calculate simple interest
 */
export function calculateSimpleInterest(principal: number, rate: number, time: number): number {
  return principal * rate * time;
}

/**
 * Format interest rate
 */
export function formatInterestRate(
  rate: number,
  options: { showPercent?: boolean; decimals?: number } = {}
): string {
  const { showPercent = true, decimals = 2 } = options;
  const formatted = (rate * 100).toFixed(decimals);
  return showPercent ? `${formatted}%` : formatted;
}

/**
 * Validate currency amount
 */
export function isValidCurrencyAmount(amount: number, currency: CurrencyCode = 'USD'): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return false;
  }

  const currencyInfo = CURRENCY_INFO[currency];
  if (!currencyInfo) {
    return false;
  }

  // Check if amount has too many decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > currencyInfo.decimals) {
    return false;
  }

  return true;
}

/**
 * Get currency information
 */
export function getCurrencyInfo(currency: CurrencyCode): CurrencyInfo {
  const info = CURRENCY_INFO[currency];
  if (!info) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return info;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Object.keys(CURRENCY_INFO) as CurrencyCode[];
}

/**
 * Convert between currencies (simplified - in real app, use exchange rates)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  exchangeRate?: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (!exchangeRate) {
    throw new Error('Exchange rate required for currency conversion');
  }

  return amount * exchangeRate;
}

/**
 * Format currency range
 */
export function formatCurrencyRange(
  min: number,
  max: number,
  currency: CurrencyCode = 'USD',
  options: CurrencyOptions = {}
): string {
  const formattedMin = formatCurrency(min, { ...options, currency });
  const formattedMax = formatCurrency(max, { ...options, currency });

  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Format currency with trend indicator
 */
export function formatCurrencyWithTrend(
  amount: number,
  previousAmount: number,
  currency: CurrencyCode = 'USD',
  options: CurrencyOptions = {}
): {
  formatted: string;
  trend: 'up' | 'down' | 'unchanged';
  change: string;
} {
  const formatted = formatCurrency(amount, { ...options, currency });
  const { direction, percentage } = calculatePercentageChange(previousAmount, amount);
  const change = formatPercentageChange(percentage, { showSign: true });

  return {
    formatted,
    trend: direction,
    change,
  };
}
