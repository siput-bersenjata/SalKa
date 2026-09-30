"use client";

import { Search, Bell, User, Clock, AlertTriangle } from "lucide-react";
import { TrialStatusResult } from "@/types";

interface NavbarProps {
  user?: {
    username?: string;
    fullName?: string;
    role?: string;
  } | null;
  trial?: TrialStatusResult | null;
}

export default function Navbar({ user, trial }: NavbarProps) {
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      {/* Search Bar */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari transaksi, produk, atau laporan..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-6">
        {/* Trial / Subscription Badge (if not super admin) */}
        {!isSuperAdmin && trial && (
          <div
            className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              trial.isExpired
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : trial.daysRemaining <= 5
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {trial.isExpired ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>
              {trial.isLifetime
                ? "Lisensi: Aktif Permanen"
                : trial.isExpired
                ? "Masa Aktif Habis"
                : `Trial: Sisa ${trial.daysRemaining} Hari`}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.fullName?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {user?.fullName || user?.username || "Admin"}
            </p>
            <p className="text-xs text-slate-500">
              {isSuperAdmin ? "Administrator" : "Pemilik Toko"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
