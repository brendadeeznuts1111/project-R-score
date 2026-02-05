/**
 * Core Services Module
 * Business logic and service layer
 */

// Export service classes
export class UserService {
  async getUser(id: string) {
    return { id, name: 'User ' + id };
  }
}

export class ApiService {
  async getHealth() {
    return { status: 'healthy', uptime: '99.9%' };
  }
}
