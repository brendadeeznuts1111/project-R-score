// packages/odds-core/src/standards/rules/logging-monitoring-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class LoggingMonitoringRule {
  name = 'Logging & Monitoring';
  description = 'Implement comprehensive logging and monitoring';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    // Check for server/API files without logging
    const isServerFile = file.includes('server') || 
                        file.includes('api') || 
                        file.includes('controller') ||
                        file.includes('handler') ||
                        file.includes('route') ||
                        file.includes('endpoint');

    if (isServerFile) {
      const hasLogging = content.includes('console.log') || 
                        content.includes('console.error') ||
                        content.includes('console.warn') ||
                        content.includes('logger') ||
                        content.includes('winston') ||
                        content.includes('pino');

      const hasRequestLogging = content.includes('req.method') ||
                                content.includes('request.method') ||
                                content.includes('Request:') ||
                                content.includes('Response time:');

      if (!hasLogging) {
        violations.push(createViolation(
          this.name,
          file,
          'Server file without comprehensive logging',
          'warning',
          undefined,
          'Add structured logging for requests, errors, and performance metrics'
        ));
      }

      if (hasLogging && !hasRequestLogging) {
        violations.push(createViolation(
          this.name,
          file,
          'Server logging without request tracking',
          'warning',
          undefined,
          'Add request/response logging for monitoring and debugging'
        ));
      }
    }

    // Check for error handling without proper logging
    const hasErrorHandling = content.includes('catch') || content.includes('try');
    const hasErrorLogging = content.includes('console.error') || 
                           content.includes('logger.error') ||
                           content.includes('errorLogger');

    if (hasErrorHandling && !hasErrorLogging) {
      violations.push(createViolation(
        this.name,
        file,
        'Error handling without error logging',
        'warning',
        undefined,
        'Add error logging to all catch blocks for debugging'
      ));
    }

    return violations;
  }
}
