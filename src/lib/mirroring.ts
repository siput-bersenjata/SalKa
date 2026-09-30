import { Transaction, TransactionItem } from "@prisma/client";

export type TransactionWithDetails = Transaction & {
  items?: (TransactionItem & {
    product?: {
      category?: { name: string } | null;
    } | null;
  })[];
  store?: { name: string; phone?: string | null };
};

/**
 * Filter transactions deterministically according to mirror percentage
 * and rewrite invoice numbers sequentially with zero gaps.
 *
 * @param allTransactions - Chronologically sorted transactions (ascending by createdAt)
 * @param percentage - 1 to 100
 * @param prefix - e.g. "TRX" or "INV"
 */
export function applyMirroring<T extends { createdAt: Date; id: string; invoiceNumber: string }>(
  allTransactions: T[],
  percentage: number = 100,
  prefix: string = "TRX"
): T[] {
  const cleanPercentage = Math.max(1, Math.min(100, percentage));
  const total = allTransactions.length;

  if (total === 0) return [];

  if (cleanPercentage >= 100) {
    return allTransactions;
  }

  // Calculate target count
  const targetCount = Math.max(1, Math.round((total * cleanPercentage) / 100));

  // Evenly sample targetCount items across the full timeline
  const step = total / targetCount;
  const selectedIndices = new Set<number>();

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(total - 1, Math.floor(i * step));
    selectedIndices.add(idx);
  }

  // Extract selected transactions while maintaining chronological order
  const sampledTransactions: T[] = [];
  let seqNumber = 1;

  for (let i = 0; i < total; i++) {
    if (selectedIndices.has(i)) {
      const original = allTransactions[i];
      const dateStr = original.createdAt.toISOString().slice(0, 10).replace(/-/g, "");
      const formattedSeq = String(seqNumber).padStart(5, "0");
      const sequentialInvoice = `${prefix}${dateStr}${formattedSeq}`;

      sampledTransactions.push({
        ...original,
        id: `mir_${original.id}`,
        invoiceNumber: sequentialInvoice,
      });

      seqNumber++;
    }
  }

  return sampledTransactions;
}
