import { randomUUID } from "node:crypto";

import type { CreatePeerDepositRequest, PersistedDepositRecord } from "./types/app";
import { listDeposits, readDeposit, upsertDeposit } from "./store";

function nowIso(): string {
  return new Date().toISOString();
}

function appendEvent(
  record: PersistedDepositRecord,
  event: PersistedDepositRecord["events"][number],
): PersistedDepositRecord {
  return {
    ...record,
    status: event.status,
    updatedAt: event.timestamp,
    updatedBy: event.actorMemberId,
    transactionHash: event.transactionHash ?? record.transactionHash,
    events: [event, ...record.events],
  };
}

export async function createPeerDepositRecord(params: {
  actorMemberId: string;
  memberName: string;
  request: CreatePeerDepositRequest;
}): Promise<PersistedDepositRecord> {
  const createdAt = nowIso();
  const status = params.request.protocol.transactionHash ? "submitted" : "prepared";
  const recordId = randomUUID();

  return upsertDeposit({
    recordId,
    memberId: params.request.memberId,
    memberName: params.memberName,
    division: params.request.division,
    preferredMethod: params.request.preferredMethod,
    processorNames: params.request.payload.processorNames,
    fiatCurrency: params.request.fiatCurrency,
    walletAddress: params.request.walletAddress,
    tokenAddress: params.request.payload.token,
    amountBaseUnits: params.request.payload.amount,
    minIntentAmount: params.request.payload.intentAmountRange.min,
    maxIntentAmount: params.request.payload.intentAmountRange.max,
    live: params.request.live,
    riskLevel: params.request.riskLevel,
    status,
    createdAt,
    updatedAt: createdAt,
    createdBy: params.actorMemberId,
    updatedBy: params.actorMemberId,
    transactionHash: params.request.protocol.transactionHash ?? null,
    onchainDepositId: params.request.protocol.onchainDepositId ?? null,
    compositeDepositId: params.request.protocol.compositeDepositId ?? null,
    escrowAddress: params.request.protocol.escrowAddress ?? null,
    payeeDetailsHashes: params.request.protocol.payeeDetailsHashes,
    payload: params.request.payload,
    lastError: null,
    events: [
      {
        eventId: randomUUID(),
        depositRecordId: recordId,
        eventType: "created",
        actorMemberId: params.actorMemberId,
        status,
        timestamp: createdAt,
        transactionHash: params.request.protocol.transactionHash ?? null,
        metadata: {
          division: params.request.division,
          preferredMethod: params.request.preferredMethod,
          processorNames: params.request.payload.processorNames,
        },
      },
    ],
  });
}

export async function listPeerDepositRecords(filters?: Parameters<typeof listDeposits>[0]) {
  return listDeposits(filters);
}

export async function getPeerDepositRecord(recordId: string): Promise<PersistedDepositRecord> {
  const record = await readDeposit(recordId);
  if (!record) {
    throw new Error("Deposit record not found.");
  }
  return record;
}

export async function addFundsToPeerDeposit(params: {
  recordId: string;
  actorMemberId: string;
  amount: string;
  transactionHash?: string | null;
}): Promise<PersistedDepositRecord> {
  const current = await getPeerDepositRecord(params.recordId);
  return upsertDeposit(
    appendEvent(
      {
        ...current,
        amountBaseUnits: (BigInt(current.amountBaseUnits) + BigInt(params.amount)).toString(),
      },
      {
        eventId: randomUUID(),
        depositRecordId: current.recordId,
        eventType: "funded",
        actorMemberId: params.actorMemberId,
        status: "active",
        timestamp: nowIso(),
        transactionHash: params.transactionHash ?? null,
        metadata: {
          addedAmount: params.amount,
          previousAmount: current.amountBaseUnits,
        },
      },
    ),
  );
}

export async function setPeerDepositAccepting(params: {
  recordId: string;
  actorMemberId: string;
  accepting: boolean;
  transactionHash?: string | null;
}): Promise<PersistedDepositRecord> {
  const current = await getPeerDepositRecord(params.recordId);
  return upsertDeposit(
    appendEvent(current, {
      eventId: randomUUID(),
      depositRecordId: current.recordId,
      eventType: "accepting_updated",
      actorMemberId: params.actorMemberId,
      status: params.accepting ? "active" : "paused",
      timestamp: nowIso(),
      transactionHash: params.transactionHash ?? null,
      metadata: {
        accepting: params.accepting,
      },
    }),
  );
}

export async function withdrawPeerDeposit(params: {
  recordId: string;
  actorMemberId: string;
  transactionHash?: string | null;
}): Promise<PersistedDepositRecord> {
  const current = await getPeerDepositRecord(params.recordId);
  return upsertDeposit(
    appendEvent(current, {
      eventId: randomUUID(),
      depositRecordId: current.recordId,
      eventType: "withdrawn",
      actorMemberId: params.actorMemberId,
      status: "withdrawn",
      timestamp: nowIso(),
      transactionHash: params.transactionHash ?? null,
      metadata: {},
    }),
  );
}
