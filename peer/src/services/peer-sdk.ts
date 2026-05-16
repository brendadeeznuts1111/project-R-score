import {
  OfframpClient,
  Zkp2pClient,
  createPeerExtensionSdk,
  getPaymentMethodsCatalog,
  type PeerExtensionSdk,
  type RuntimeEnv,
} from "@zkp2p/sdk";
import { createWalletClient, custom, type Address } from "viem";
import { base } from "viem/chains";

import { runtimeConfig } from "../config";

type WalletWindow = Window & {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
};

export type WalletConnection = {
  address: Address;
  chainId: number;
  peerClient: Zkp2pClient;
  offrampClient: OfframpClient;
};

export class PeerSdkService {
  readonly extension: PeerExtensionSdk = createPeerExtensionSdk({ window: window as never });

  getPaymentCatalog() {
    return getPaymentMethodsCatalog(runtimeConfig.chainId, runtimeConfig.catalogEnv as RuntimeEnv);
  }

  async connectWallet(): Promise<WalletConnection> {
    const ethereum = (window as WalletWindow).ethereum;
    if (!ethereum) {
      throw new Error("No injected browser wallet found. Install a wallet like MetaMask first.");
    }

    const transportProvider = ethereum as Parameters<typeof custom>[0];

    const baseWalletClient = createWalletClient({
      chain: base,
      transport: custom(transportProvider),
    });
    const [address] = await baseWalletClient.requestAddresses();
    const chainId = await baseWalletClient.getChainId();
    const walletClient = createWalletClient({
      account: address,
      chain: base,
      transport: custom(transportProvider),
    });

    return {
      address,
      chainId,
      peerClient: new Zkp2pClient({
        walletClient,
        chainId: runtimeConfig.chainId,
      }),
      offrampClient: new OfframpClient({
        walletClient,
        chainId: runtimeConfig.chainId,
      }),
    };
  }
}

export const peerSdk = new PeerSdkService();
