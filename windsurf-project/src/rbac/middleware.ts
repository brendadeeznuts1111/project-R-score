// src/rbac/middleware.ts
import { secretManager } from '../secrets/manager';
import { rbacConfig } from './config';
import { audit } from './audit';

export class RBACMiddleware {
  // ✅ ENFORCE: Token → Role → Permission (ASYNCHRONOUS)
  async enforce(req: Request, requiredPermission: string): Promise<{ userId: string; role: string }> {
    const token = this.extractToken(req);
    
    // ✅ Authenticate via secret manager (hashed, cached)
    const auth = await secretManager.authenticate(token);
    if (!auth) {
      throw new Error('🚫 INVALID TOKEN: Authentication failed');
    }

    // ✅ Permission check using the existing rbacConfig logic
    if (!rbacConfig.hasPermission(auth.role, requiredPermission)) {
      audit.log(auth.userId, 'ACCESS_DENIED', `${auth.role} → ${requiredPermission}`);
      throw new Error(`🚫 ACCESS DENIED: ${auth.role} lacks ${requiredPermission}`);
    }

    audit.log(auth.userId, 'ACCESS_GRANTED', `${auth.role} → ${requiredPermission}`);
    return auth;
  }

  // ✅ Token Extraction Logic
  private extractToken(req: Request): string {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || 
                  req.headers.get('Authorization')?.replace('Bearer ', '') || 
                  req.headers.get('x-api-token');
    
    if (!token) {
      throw new Error('🚫 MISSING TOKEN: Provide token in URL or x-api-token header');
    }

    return token;
  }
}

export const rbac = new RBACMiddleware();
