"use client";

import React, { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Loader2,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

function TransaksiPageContent() {
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get("storeId");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  const loadData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        setCurrentUser(authData.user);
      }

      const url = storeIdParam
        ? `/api/transactions?storeId=${storeIdParam}`
        : "/api/transactions";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeIdParam]);

  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.invoiceNumber.toLowerCase().includes(q) ||
      (t.cashierName && t.cashierName.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar userRole={currentUser?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={currentUser} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Receipt className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Riwayat & Laporan Transaksi Kasir
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Seluruh catatan struk pembayaran belanja, metode kas/QRIS, dan detail item terjual.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari No. Faktur Invoice..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {currentUser?.role === "MIRRORING" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="font-semibold">Mode Riwayat Transaksi Khusus (Urut)</span>
                <span className="text-amber-700 hidden sm:inline">— Menampilkan transaksi terpilih dengan nomor invoice berurutan tanpa celah.</span>
              </div>
              <span className="font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg text-[11px] font-bold self-start sm:self-auto">
                AKUN LAPORAN
              </span>
            </div>
          )}

          {/* Transactions List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Ditemukan: <strong className="text-slate-800">{filteredTransactions.length} Transaksi</strong></span>
              {storeIdParam && (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Filter Toko Aktif
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs">Memuat daftar transaksi...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Belum ada transaksi pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">No. Invoice</th>
                      <th className="py-3 px-4">Tanggal & Waktu</th>
                      <th className="py-3 px-4">Toko</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4">Total Belanja</th>
                      <th className="py-3 px-4">Kasir</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTransactions.map((trx) => {
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

                      const method =
                        trx.paymentMethod === "QRIS"
                          ? { label: "QRIS", icon: QrCode, bg: "bg-blue-50 text-blue-700 border-blue-200" }
                          : trx.paymentMethod === "DEBIT_CREDIT"
                          ? { label: "Debit/Kredit", icon: CreditCard, bg: "bg-purple-50 text-purple-700 border-purple-200" }
                          : { label: "Tunai", icon: Banknote, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };

                      const MethodIcon = method.icon;

                      return (
                        <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {trx.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {dateStr} <span className="text-slate-400 text-[11px]">{timeStr}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-semibold">
                            {trx.store?.name || "Toko"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${method.bg}`}>
                              <MethodIcon className="w-3 h-3" />
                              {method.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            Rp {trx.totalAmount.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {trx.cashierName || "Kasir"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedTrx(trx)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Lihat Struk
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Preview Struk Belanja Termal */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Preview Struk Termal</h3>
              <button
                onClick={() => setSelectedTrx(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Slip Container */}
            <div
              id="printable-receipt"
              className="bg-white p-5 border border-dashed border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 space-y-3 leading-relaxed shadow-sm"
            >
              {/* Header Toko */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <p className="font-bold text-sm uppercase">{selectedTrx.store?.name || "KASIRKU"}</p>
                <p className="text-[10px] text-slate-500">{selectedTrx.store?.address || "Pusat Perbelanjaan & Retail"}</p>
                <p className="text-[10px] text-slate-500">Telp: {selectedTrx.store?.phone || "0812-3456-7890"}</p>
              </div>

              {/* Info Faktur */}
              <div className="space-y-0.5 text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span>No: {selectedTrx.invoiceNumber}</span>
                  <span>{new Date(selectedTrx.createdAt).toLocaleDateString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {selectedTrx.cashierName || "Kasir"}</span>
                  <span>{new Date(selectedTrx.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {selectedTrx.items?.map((item: any) => (
                  <div key={item.id}>
                    <p className="font-bold">{item.productName}</p>
                    <div className="flex justify-between text-slate-600">
                      <span>{item.quantity} x Rp {item.price.toLocaleString("id-ID")}</span>
                      <span>Rp {item.subtotal.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL</span>
                  <span>Rp {selectedTrx.totalAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Bayar ({selectedTrx.paymentMethod})</span>
                  <span>Rp {selectedTrx.paidAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kembalian</span>
                  <span>Rp {(selectedTrx.changeAmount || 0).toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Footer Struk */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p className="font-semibold">{selectedTrx.store?.receiptHeader || "Terima Kasih Atas Kunjungan Anda"}</p>
                <p className="text-[9px]">{selectedTrx.store?.receiptFooter || "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan"}</p>
              </div>
            </div>

            {/* Print action buttons */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <TransaksiPageContent />
    </Suspense>
  );
}
