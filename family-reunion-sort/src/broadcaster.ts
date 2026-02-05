// Utility for broadcasting real-time updates via WebSockets
import type { Server } from "bun";

let serverInstance: Server | null = null;

export function setServerInstance(server: Server) {
  serverInstance = server;
}

export function broadcastDisputeUpdate(disputeId: string, update: any) {
  if (!serverInstance) return;
  
  serverInstance.publish(`dispute:${disputeId}`, JSON.stringify({
    type: 'dispute_update',
    disputeId,
    update,
    timestamp: new Date().toISOString()
  }));
}

export function broadcastMerchantUpdate(merchantId: string, update: any) {
  if (!serverInstance) return;

  serverInstance.publish(`merchant:${merchantId}`, JSON.stringify({
    type: 'merchant_update',
    merchantId,
    update,
    timestamp: new Date().toISOString()
  }));
}
