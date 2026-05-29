import type { OrgMemberRecord } from "./org-model";
import type {
  MemberPaymentMethod,
  NormalizedTeamMember,
  PeerPaymentPlatform,
} from "./peer-team-payouts";

export type PeerExecutionContext = {
  signedInMember: {
    memberId: string;
    displayName: string;
    role: OrgMemberRecord["role"];
    region: OrgMemberRecord["region"];
    canExecutePeerTransactions: boolean;
    permissions: string[];
  };
  payoutOwner: {
    memberId: string;
    displayName: string;
    methods: MemberPaymentMethod[];
    processorNames: PeerPaymentPlatform[];
  };
  connectedWalletAddress: string | null;
  rules: {
    appAuth: string;
    depositOwnership: string;
    payoutOwnership: string;
    onramp: string;
  };
};

export function buildPeerExecutionContext(args: {
  signedInMember: OrgMemberRecord;
  permissions: string[];
  payoutOwner: NormalizedTeamMember;
  connectedWalletAddress?: string | null;
}): PeerExecutionContext {
  return {
    signedInMember: {
      memberId: args.signedInMember.memberId,
      displayName: args.signedInMember.displayName,
      role: args.signedInMember.role,
      region: args.signedInMember.region,
      canExecutePeerTransactions: args.signedInMember.canExecutePeerTransactions,
      permissions: args.permissions,
    },
    payoutOwner: {
      memberId: args.payoutOwner.memberId,
      displayName: args.payoutOwner.displayName,
      methods: args.payoutOwner.methods,
      processorNames: args.payoutOwner.methods.map((method) => method.processorName),
    },
    connectedWalletAddress: args.connectedWalletAddress ?? null,
    rules: {
      appAuth:
        "Internal teammates sign into this app individually. The app permission model decides who may initiate Peer SDK flows.",
      depositOwnership:
        "The connected wallet owns the deposit and submits onchain Peer actions. This is separate from internal app login.",
      payoutOwnership:
        "Venmo, Cash App, and PayPal values are member-owned payout destinations, not shared app-linked accounts inside Peer.",
      onramp:
        "Customer onramp uses the Peer browser extension per end user/browser session and is separate from team offramp operations.",
    },
  };
}
