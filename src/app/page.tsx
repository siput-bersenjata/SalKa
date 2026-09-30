"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import SalesChart from "@/components/SalesChart";
import CategoryDonut from "@/components/CategoryDonut";
import LowStockWidget from "@/components/LowStockWidget";
import RecentTransactionsTable from "@/components/RecentTransactionsTable";
import StockOverviewTable from "@/components/StockOverviewTable";
import { Receipt, DollarSign, Package, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { TrialStatusResult } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [trial, setTrial] = useState<TrialStatusResult | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/login");
          return;
        }

        const authData = await authRes.json();
        setUser(authData.user);
        setStore(authData.store);
        setTrial(authData.trial);

        // Fetch reports summary
        const summaryRes = await fetch("/api/reports/summary");
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setData(summaryData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-400">Memuat KasirKu Back Office...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalTransactions: 48,
    totalRevenue: 2485000,
    totalItemsSold: 132,
    lowStockCount: 5,
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar userRole={user?.role} storeName={store?.name} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} trial={trial} />

        <main className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Welcome Header & Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Selamat datang, {user?.fullName || user?.username || "Admin"}!
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Berikut ringkasan aktivitas toko {store?.name ? `(${store.name})` : ""} hari ini.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{todayStr} - {todayStr}</span>
            </div>
          </div>

          {/* 4 Stat Cards (Row 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Transaksi"
              value={summary.totalTransactions}
              trend="12% dari kemarin"
              icon={Receipt}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Total Pendapatan"
              value={`Rp ${summary.totalRevenue.toLocaleString("id-ID")}`}
              trend="18% dari kemarin"
              icon={DollarSign}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Total Item Terjual"
              value={`${summary.totalItemsSold} pcs`}
              trend="16% dari kemarin"
              icon={Package}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
            <StatCard
              title="Stok Menipis"
              value={summary.lowStockCount}
              subtext="Produk perlu restock"
              icon={AlertTriangle}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              href="/produk?lowStock=true"
            />
          </div>

          {/* Middle Row: Sales Chart, Category Donut, Low Stock Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <SalesChart data={data?.salesTrend} />
            </div>
            <div className="lg:col-span-4">
              <CategoryDonut
                totalRevenue={summary.totalRevenue}
                data={data?.categoryDistribution}
              />
            </div>
            <div className="lg:col-span-3">
              <LowStockWidget products={data?.lowStockProducts} />
            </div>
          </div>

          {/* Bottom Row: Recent Transactions Table & Stock Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <RecentTransactionsTable transactions={data?.recentTransactions} />
            </div>
            <div className="lg:col-span-5">
              <StockOverviewTable products={data?.topProducts} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
