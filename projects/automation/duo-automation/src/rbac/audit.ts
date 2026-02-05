import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class AuditLogger {
  private logDir: string;

  constructor() {
    this.logDir = join(process.cwd(), 'data', 'logs', 'audit');
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(userId: string, action: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'SYSTEM_EVENT', resource: string) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      userId,
      action,
      resource,
    };

    const fileName = `audit-${new Date().toISOString().slice(0, 10)}.log`;
    const filePath = join(this.logDir, fileName);
    
    appendFileSync(filePath, JSON.stringify(entry) + '\n');
    console.log(`🔍 [AUDIT] ${timestamp} | ${userId} | ${action} | ${resource}`);
  }
}

export const audit = new AuditLogger();
