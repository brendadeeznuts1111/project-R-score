import { PERMISSIONS } from './permissions';

// Load config from the central config/rbac.json (hardened)
const CONFIG_PATH = process.env.RBAC_CONFIG_PATH || './config/rbac.json';
const RBAC_CONFIG = JSON.parse(await Bun.file(CONFIG_PATH).text());

// Map config permissions → internal permission constants
const PERMISSION_MAP: Record<string, string> = {
  'view_metrics': PERMISSIONS.OPS.METRICS,
  'generate_tasks': PERMISSIONS.TASKS.CREATE,
  'cleanup_storage': PERMISSIONS.OPS.CLEANUP,
  'view_logs': PERMISSIONS.STORAGE.READ,
  'manage_users': PERMISSIONS.USER.MANAGE,
};

export class RBAC_Config {
  private tokens = new Map<string, { userId: string; role: string }>();
  private permissions = new Map<string, string[]>();

  constructor() {
    // Index tokens & permissions for O(1) lookup
    Object.entries(RBAC_CONFIG.users).forEach(([userId, user]: any) => {
      this.tokens.set(user.token, { userId, role: user.role });
    });
    Object.entries(RBAC_CONFIG.roles).forEach(([roleId, role]: any) => {
      const mapped = (role.permissions as string[])
        .map((p: string) => PERMISSION_MAP[p])
        .filter((p): p is string => !!p);
      this.permissions.set(roleId, mapped);
    });
  }

  // Validate token → user + role
  authenticate(token: string): { userId: string; role: string } | null {
    return this.tokens.get(token) || null;
  }

  // Check permission via mapped config
  hasPermission(role: string, permission: string): boolean {
    const perms = this.permissions.get(role);
    return perms?.includes(permission) || false;
  }
}

export const rbacConfig = new RBAC_Config();
