import { SocketManager } from '../websocket/socket-manager';
import { WebhookService } from './webhook-service';

class RealTimeServiceLocator {
  private static socketManager: SocketManager | null = null;
  private static webhookService: WebhookService | null = null;

  static setServices(socketManager: SocketManager, webhookService: WebhookService | null = null): void {
    this.socketManager = socketManager;
    this.webhookService = webhookService;
  }

  static getSocketManager(): SocketManager | null {
    return this.socketManager;
  }

  static getWebhookService(): WebhookService | null {
    return this.webhookService;
  }
}

export { RealTimeServiceLocator };
