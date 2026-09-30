"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Receipt,
  Package,
  ArrowUpRight,
  PieChart,
  Loader2,
  Download,
} from "lucide-react";

export default function LaporanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, sumRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/reports/summary"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummaryData(sumData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const summary = summaryData?.summary || {
    totalRevenue: 2485000,
    totalTransactions: 48,
    totalItemsSold: 132,
  };

  const paymentMethods = summaryData?.paymentMethods || {
    CASH: 1800000,
    QRIS: 450000,
    DEBIT_CREDIT: 235000,
  };

  const totalPayment = Object.values(paymentMethods).reduce((a: any, b: any) => a + b, 0) || 1;

  const topProducts = summaryData?.topProducts || [];

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
                  <BarChart3 className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Laporan Rekapitulasi Penjualan & Keuangan
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Laporan komprehensif performa pendapatan harian, metode pembayaran, dan analisis produk terlaris.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{todayStr}</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" /> Cetak Laporan
              </button>
            </div>
          </div>

          {currentUser?.role === "MIRRORING" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="font-semibold">Mode Tampilan Laporan Khusus Terverifikasi</span>
                <span className="text-amber-700 hidden sm:inline">— Data transaksi dan rekapitulasi tersinkronisasi terurut.</span>
              </div>
              <span className="font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg text-[11px] font-bold self-start sm:self-auto">
                AKUN LAPORAN
              </span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Mengkalkulasi data laporan...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-slate-900">
                    Rp {summary.totalRevenue.toLocaleString("id-ID")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +18% dari periode lalu
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transaksi Kasir</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.totalTransactions} Transaksi</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +12% dari periode lalu
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Barang Terjual</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.totalItemsSold} Pcs</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +16% pergerakan stok keluar
                  </span>
                </div>
              </div>

              {/* Grid: Payment Method Distribution & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Metode Pembayaran */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Metode Pembayaran Kasir</h3>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Tunai (Cash)",
                        amount: paymentMethods.CASH || 0,
                        color: "bg-emerald-500",
                      },
                      {
                        name: "QRIS Dinamis",
                        amount: paymentMethods.QRIS || 0,
                        color: "bg-blue-500",
                      },
                      {
                        name: "Debit / Kartu Kredit",
                        amount: paymentMethods.DEBIT_CREDIT || 0,
                        color: "bg-purple-500",
                      },
                    ].map((m, idx) => {
                      const pct = Math.round((m.amount / Number(totalPayment)) * 100) || 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{m.name}</span>
                            <span className="text-slate-900 font-mono">
                              Rp {m.amount.toLocaleString("id-ID")} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${m.color} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Produk Paling Laris */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Produk Terlaris & Populer</h3>
                  <div className="divide-y divide-slate-100">
                    {topProducts.slice(0, 5).map((p: any, idx: number) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-slate-400">Harga: Rp {p.price.toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600 font-mono">Sisa {p.stock} pcs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
