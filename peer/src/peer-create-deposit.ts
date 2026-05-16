import type {
  BuildPeerTeamPayoutsResult,
  PeerDepositData,
  SdkPayeeData,
} from "./peer-team-payouts";
import {
  getNormalizedTeamMemberOrThrow,
  getPeerCreateDepositPaymentConfig,
  getSdkPayeeData,
} from "./peer-team-payouts";

export type DemoConversionRate = {
  currency: string;
  conversionRate: string;
};

export type DemoCreateDepositRequest = {
  memberId: string;
  token: `0x${string}`;
  amount: string;
  minIntentAmount: string;
  maxIntentAmount: string;
  conversionRates: DemoConversionRate[];
};

export type DemoCreateDepositPayload = {
  token: `0x${string}`;
  amount: string;
  intentAmountRange: {
    min: string;
    max: string;
  };
  processorNames: string[];
  depositData: PeerDepositData[];
  payeeData: SdkPayeeData[];
  conversionRates: DemoConversionRate[][];
};

function assertBigIntString(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a whole-number string in base units.`);
  }

  return trimmed;
}

function assertTokenAddress(value: string): `0x${string}` {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error("token must be a valid 20-byte 0x-prefixed address.");
  }

  return trimmed as `0x${string}`;
}

export function buildDemoCreateDepositPayload(
  team: BuildPeerTeamPayoutsResult,
  request: DemoCreateDepositRequest,
): DemoCreateDepositPayload {
  const member = getNormalizedTeamMemberOrThrow(team, request.memberId);
  const paymentConfig = getPeerCreateDepositPaymentConfig(member);

  return {
    token: assertTokenAddress(request.token),
    amount: assertBigIntString(request.amount, "amount"),
    intentAmountRange: {
      min: assertBigIntString(request.minIntentAmount, "minIntentAmount"),
      max: assertBigIntString(request.maxIntentAmount, "maxIntentAmount"),
    },
    processorNames: paymentConfig.processorNames,
    depositData: paymentConfig.depositData,
    payeeData: getSdkPayeeData(member),
    conversionRates: [
      request.conversionRates.map((rate) => ({
        currency: rate.currency,
        conversionRate: rate.conversionRate,
      })),
    ],
  };
}
