export interface MockChannel {
  chan_id: string;
  local_balance: number;
  remote_balance: number;
  active: boolean;
  capacity: number;
  channel_point: string;
  num_updates: number;
  peer_id: string;
}

export interface MockInvoice {
  memo: string;
  value: number;
  settled: boolean;
  creation_date: string;
  payment_request: string;
  r_preimage: string;
}

export interface MockPayment {
  payment_hash: string;
  amount: number;
  fee: number;
  status: "pending" | "succeeded" | "failed";
  creation_date: string;
}

export interface MockNode {
  pubkey: string;
  alias: string;
  addresses: string[];
  color: string;
  last_update: number;
}

const mockChannels: MockChannel[] = [
  { chan_id: "1", local_balance: 250000, remote_balance: 250000, active: true, capacity: 500000, channel_point: "txid:0", num_updates: 15, peer_id: "peer1" },
  { chan_id: "2", local_balance: 500000, remote_balance: 100000, active: true, capacity: 600000, channel_point: "txid:1", num_updates: 8, peer_id: "peer2" },
  { chan_id: "3", local_balance: 100000, remote_balance: 400000, active: true, capacity: 500000, channel_point: "txid:2", num_updates: 22, peer_id: "peer3" },
  { chan_id: "4", local_balance: 150000, remote_balance: 350000, active: true, capacity: 500000, channel_point: "txid:3", num_updates: 5, peer_id: "peer4" },
  { chan_id: "5", local_balance: 0, remote_balance: 500000, active: false, capacity: 500000, channel_point: "txid:4", num_updates: 0, peer_id: "peer5" },
];

const mockInvoices: MockInvoice[] = [
  { memo: "Payment for services", value: 50000, settled: true, creation_date: new Date(Date.now() - 86400000).toISOString(), payment_request: "lnbc500...", r_preimage: "preimage1" },
  { memo: "Lightning tip", value: 10000, settled: true, creation_date: new Date(Date.now() - 172800000).toISOString(), payment_request: "lnbc100...", r_preimage: "preimage2" },
  { memo: "Subscription", value: 250000, settled: false, creation_date: new Date(Date.now() - 3600000).toISOString(), payment_request: "lnbc2500...", r_preimage: "preimage3" },
];

const mockPeers: MockNode[] = [
  { pubkey: "peer1", alias: "ACME-Node", addresses: ["1.2.3.4:9735"], color: "#F7931A", last_update: Date.now() },
  { pubkey: "peer2", alias: "Bitfinex", addresses: ["5.6.7.8:9735"], color: "#4A90D9", last_update: Date.now() },
  { pubkey: "peer3", alias: "Lightning Labs", addresses: ["9.10.11.12:9735"], color: "#22C55E", last_update: Date.now() },
];

const mockPayments: MockPayment[] = [];

export class LndMockClient {
  private nodeAlias = "DuoPlus-Mock-Node";
  private nodeColor = "#00FFAB";
  
  async getNodeInfo() {
    return {
      alias: this.nodeAlias,
      color: this.nodeColor,
      pubkey: "mock_pubkey_" + Math.random().toString(36).substring(7),
      synced_to_chain: true,
      synced_to_graph: true,
      version: "v0.17.0-beta",
      block_height: 850000,
      best_header_timestamp: Date.now(),
    };
  }

  async getNodeBalance(): Promise<{
    local: number;
    remote: number;
    pending: number;
    channels: number;
    activeChannels: number;
    total_capacity: number;
  }> {
    const channels = await this.listChannels();
    const activeChannels = channels.filter(ch => ch.active);
    
    return {
      local: channels.reduce((sum, ch) => sum + ch.local_balance, 0),
      remote: channels.reduce((sum, ch) => sum + ch.remote_balance, 0),
      pending: 100000,
      channels: channels.length,
      activeChannels: activeChannels.length,
      total_capacity: channels.reduce((sum, ch) => sum + ch.capacity, 0),
    };
  }

  async listChannels(): Promise<MockChannel[]> {
    return mockChannels;
  }

  async getChannelInfo(chanId: string): Promise<MockChannel | null> {
    return mockChannels.find(ch => ch.chan_id === chanId) || null;
  }

  async sendPayment(params: {
    dest?: string;
    amt?: number;
    fee_limit?: number;
    allow_self_payment?: boolean;
    timeout_seconds?: number;
  }): Promise<MockPayment> {
    const payment: MockPayment = {
      payment_hash: `mock_hash_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount: params.amt || 0,
      fee: Math.floor((params.amt || 0) * 0.001),
      status: "succeeded",
      creation_date: new Date().toISOString(),
    };
    mockPayments.unshift(payment);
    console.log(`🔄 Mock payment sent: ${payment.amount} sats (fee: ${payment.fee} sats)`);
    return payment;
  }

  async addInvoice(memo: string, value: number): Promise<MockInvoice> {
    const invoice: MockInvoice = {
      memo,
      value,
      settled: false,
      creation_date: new Date().toISOString(),
      payment_request: `lnbc${value}mock${Math.random().toString(36).substring(7)}`,
      r_preimage: `preimage_${Date.now()}`,
    };
    mockInvoices.unshift(invoice);
    console.log(`📝 Mock invoice created: ${value} sats - "${memo}"`);
    return invoice;
  }

  async listInvoices(): Promise<MockInvoice[]> {
    return mockInvoices;
  }

  async listPayments(): Promise<MockPayment[]> {
    return mockPayments;
  }

  async listPeers(): Promise<MockNode[]> {
    return mockPeers;
  }

  async connectPeer(pubkey: string, addr: string): Promise<{ peer_id: string }> {
    console.log(`🔗 Connected to peer: ${pubkey}@${addr}`);
    return { peer_id: pubkey };
  }

  async closeChannel(chanId: string): Promise<{ closing_hash: string; status: string }> {
    console.log(`🔒 Closing channel: ${chanId}`);
    const index = mockChannels.findIndex(ch => ch.chan_id === chanId);
    if (index > -1) {
      mockChannels.splice(index, 1);
    }
    return { closing_hash: `close_${chanId}_${Date.now()}`, status: "pending_close" };
  }

  async openChannel(
    nodeUri: string,
    amount: number
  ): Promise<{ funding_txid: string; output_index: number; status: string }> {
    console.log(`🔓 Opening channel to ${nodeUri} for ${amount} sats`);
    const newChannel: MockChannel = {
      chan_id: String(mockChannels.length + 1),
      local_balance: amount,
      remote_balance: 0,
      active: false,
      capacity: amount,
      channel_point: `txid_${Date.now()}:0`,
      num_updates: 0,
      peer_id: nodeUri.split("@")[0] || "new_peer",
    };
    mockChannels.push(newChannel);
    return { funding_txid: `fund_${Date.now()}`, output_index: 0, status: "pending_open" };
  }

  async getNetworkInfo(): Promise<{
    num_nodes: number;
    num_channels: number;
    total_network_capacity: number;
    avg_channel_size: number;
  }> {
    return {
      num_nodes: 15000,
      num_channels: 80000,
      total_network_capacity: 5000000000000,
      avg_channel_size: 62500000,
    };
  }

  async getOnChainBalance(): Promise<{
    confirmed: number;
    unconfirmed: number;
    total: number;
  }> {
    return {
      confirmed: 1500000,
      unconfirmed: 50000,
      total: 1550000,
    };
  }
}

export const lndMock = new LndMockClient();
