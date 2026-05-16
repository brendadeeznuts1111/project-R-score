import type { DivisionName, DepositStatus } from "../types/app";
import type { DepositRecord } from "../services/local-store";

export type DepositFilters = {
  search: string;
  status: DepositStatus | "all";
  division: DivisionName | "all";
  paymentMethod: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type DepositPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

/** Filters deposit records for enterprise table views. */
export function filterDeposits(
  records: DepositRecord[],
  filters: DepositFilters,
): DepositRecord[] {
  const search = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    const amount = Number(record.amountBaseUnits);
    const date = new Date(record.createdAt).getTime();
    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`).getTime() : null;

    const matchesSearch =
      search.length === 0 ||
      record.id.toLowerCase().includes(search) ||
      record.memberId.toLowerCase().includes(search) ||
      record.memberName.toLowerCase().includes(search) ||
      record.walletAddress?.toLowerCase().includes(search) ||
      record.paymentMethod.toLowerCase().includes(search);

    const matchesStatus = filters.status === "all" || record.status === filters.status;
    const matchesDivision = filters.division === "all" || record.division === filters.division;
    const matchesMethod =
      filters.paymentMethod.trim().length === 0 ||
      record.paymentMethod.toLowerCase().includes(filters.paymentMethod.trim().toLowerCase());
    const matchesMin = filters.amountMin === undefined || Number.isNaN(filters.amountMin) || amount >= filters.amountMin;
    const matchesMax = filters.amountMax === undefined || Number.isNaN(filters.amountMax) || amount <= filters.amountMax;
    const matchesFrom = from === null || date >= from;
    const matchesTo = to === null || date <= to;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDivision &&
      matchesMethod &&
      matchesMin &&
      matchesMax &&
      matchesFrom &&
      matchesTo
    );
  });
}

/** Paginates arrays for tables and feeds. */
export function paginate<T>(items: T[], page: number, pageSize: number): DepositPage<T> {
  const normalizedSize = Math.max(1, pageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * normalizedSize;
  return {
    items: items.slice(start, start + normalizedSize),
    page: normalizedPage,
    pageSize: normalizedSize,
    totalItems,
    totalPages,
  };
}

/** Returns the newest records first for management screens. */
export function sortDeposits(records: DepositRecord[]): DepositRecord[] {
  return [...records].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
