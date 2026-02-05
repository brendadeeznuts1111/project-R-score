// @bun/proxy/utils/index.ts - Enhanced with better naming

// Export table functionality
export {
  TableBuilder, createConfigurationTable,
  createMetricsTable,
  createPaginatedView, createSimpleTable, exportTable, inspect
} from './table-builder.js';

// Export interactive table viewer
export {
  InteractiveTableViewer,
  createDemoViewer
} from './interactive-table-viewer.js';

export function calculateStringWidth(
  inputString,
  options
) {
  // Fallback implementation for string width calculation
  // Remove ANSI escape codes if not counting them
  let processedString = inputString;
  if (!options?.countAnsiEscapeCodes) {
    processedString = inputString.replace(/\x1b\[[0-9;]*m/g, '');
  }

  // Simple approximation - count code points
  return [...processedString].length;
}

export function formatByteSize(
  bytes,
  decimalPlaces = 2
) {
  if (bytes === 0) return '0 Bytes';

  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  if (bytes < kilobyte) {
    return `${bytes} Bytes`;
  } else if (bytes < megabyte) {
    return `${(bytes / kilobyte).toFixed(decimalPlaces)} KB`;
  } else if (bytes < gigabyte) {
    return `${(bytes / megabyte).toFixed(decimalPlaces)} MB`;
  } else if (bytes < terabyte) {
    return `${(bytes / gigabyte).toFixed(decimalPlaces)} GB`;
  } else {
    return `${(bytes / terabyte).toFixed(decimalPlaces)} TB`;
  }
}

export function formatTimeDuration(
  milliseconds,
  includeMilliseconds = false
) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingMilliseconds = milliseconds % 1000;
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  const remainingHours = hours % 24;

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  if (includeMilliseconds && remainingMilliseconds > 0) {
    parts.push(`${remainingMilliseconds}ms`);
  }

  return parts.length > 0 ? parts.join(' ') : '0s';
}

export function validateConfiguration(
  configuration,
  validationRules
) {
  const errors = [];
  const warnings = [];

  for (const rule of validationRules) {
    try {
      const result = rule.validate(configuration);
      if (!result.isValid) {
        if (rule.severity === 'error') {
          errors.push({
            field: rule.fieldName,
            message: result.message,
            code: result.code || 'VALIDATION_ERROR'
          });
        } else {
          warnings.push({
            field: rule.fieldName,
            message: result.message,
            code: result.code || 'VALIDATION_WARNING'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: rule.fieldName,
        message: `Validation failed: ${error.message}`,
        code: 'VALIDATION_ERROR'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date()
  };
}

export function deepMergeObjects(
  target,
  source
) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        result[key] &&
        typeof result[key] === 'object' &&
        typeof source[key] === 'object' &&
        !Array.isArray(result[key]) &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMergeObjects(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}
