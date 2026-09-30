import React from "react";
import Link from "next/link";
import { Receipt, ExternalLink } from "lucide-react";

interface TransactionRow {
  id: string;
  invoiceNumber: string;
  createdAt: string | Date;
  totalAmount: number;
  paymentMethod: string;
}

interface RecentTransactionsTableProps {
  transactions?: TransactionRow[];
}

export default function RecentTransactionsTable({
  transactions = [],
}: RecentTransactionsTableProps) {
  const displayItems =
    transactions.length > 0
      ? transactions.slice(0, 5)
      : [
          {
            id: "1",
            invoiceNumber: "TRX20260930048",
            createdAt: new Date().toISOString(),
            totalAmount: 42000,
            paymentMethod: "CASH",
          },
          {
            id: "2",
            invoiceNumber: "TRX20260930047",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            totalAmount: 67000,
            paymentMethod: "QRIS",
          },
          {
            id: "3",
            invoiceNumber: "TRX20260930046",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            totalAmount: 23500,
            paymentMethod: "CASH",
          },
          {
            id: "4",
            invoiceNumber: "TRX20260930045",
            createdAt: new Date(Date.now() - 10800000).toISOString(),
            totalAmount: 56000,
            paymentMethod: "QRIS",
          },
          {
            id: "5",
            invoiceNumber: "TRX20260930044",
            createdAt: new Date(Date.now() - 14400000).toISOString(),
            totalAmount: 31000,
            paymentMethod: "CASH",
          },
        ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Transaksi Terbaru</h3>
            <p className="text-xs text-slate-500">Aktivitas kasir masuk terkini</p>
          </div>
        </div>

        <Link
          href="/transaksi"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          Lihat Semua <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="pb-3">No. Transaksi</th>
              <th className="pb-3">Tanggal & Waktu</th>
              <th className="pb-3">Total</th>
              <th className="pb-3">Metode</th>
              <th className="pb-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {displayItems.map((trx) => {
              const d = new Date(trx.createdAt);
              const dateStr = d.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const timeStr = d.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const methodLabel =
                trx.paymentMethod === "QRIS"
                  ? "QRIS"
                  : trx.paymentMethod === "DEBIT_CREDIT"
                  ? "Debit/Kredit"
                  : "Tunai";

              return (
                <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 font-mono font-bold text-slate-800">{trx.invoiceNumber}</td>
                  <td className="py-3 text-slate-500">{`${dateStr} ${timeStr}`}</td>
                  <td className="py-3 font-bold text-slate-900">
                    Rp {trx.totalAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 text-slate-600">{methodLabel}</td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Selesai
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
