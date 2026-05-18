/**
 * Date Formatting Utilities
 * Consolidated date and time formatting functions
 */

export type DateFormat =
  | 'iso'
  | 'human'
  | 'custom'
  | 'unix'
  | 'relative'
  | 'short'
  | 'long'
  | 'time-only';

/**
 * Format timestamp to various formats
 */
export function formatTimestamp(
  timestamp: string | number | Date,
  format: DateFormat = 'human'
): string {
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid timestamp provided');
  }

  switch (format) {
    case 'iso':
      return date.toISOString();

    case 'human':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });

    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'time-only':
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    case 'unix':
      return Math.floor(date.getTime() / 1000).toString();

    case 'relative':
      return formatRelativeTime(date);

    case 'custom':
      // Return ISO for custom formatting - consumers can use native Date methods
      return date.toISOString();

    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format date object to human readable string
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Format time ago from date
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format relative time (private helper)
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const isFuture = diffMs > 0;

  if (diffSeconds < 60) {
    return isFuture ? 'in a few seconds' : 'just now';
  }

  if (diffMinutes < 60) {
    const unit = diffMinutes === 1 ? 'minute' : 'minutes';
    return isFuture ? `in ${diffMinutes} ${unit}` : `${diffMinutes} ${unit} ago`;
  }

  if (diffHours < 24) {
    const unit = diffHours === 1 ? 'hour' : 'hours';
    return isFuture ? `in ${diffHours} ${unit}` : `${diffHours} ${unit} ago`;
  }

  if (diffDays < 7) {
    const unit = diffDays === 1 ? 'day' : 'days';
    return isFuture ? `in ${diffDays} ${unit}` : `${diffDays} ${unit} ago`;
  }

  // For longer periods, fall back to regular date formatting
  return formatTimestamp(date, 'human');
}

/**
 * Parse date from various formats
 */
export function parseDate(dateString: string): Date {
  // Handle ISO strings
  if (dateString.includes('T') || dateString.includes('Z')) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Handle common formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      const [, part1, part2, part3] = match;
      // Assume MM/DD/YYYY format for US locale
      const date = new Date(`${part1}/${part2}/${part3}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Try native Date parsing as last resort
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Unable to parse date: ${dateString}`);
  }

  return date;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Get start of day for date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from date
 */
export function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  const yesterday = subDays(new Date(), 1);
  return date.toDateString() === yesterday.toDateString();
}
