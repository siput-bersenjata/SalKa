"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  BarChart3,
  Users2,
  Settings,
  Store,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
  storeName?: string;
}

export default function Sidebar({ userRole, storeName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("salka_token");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  // Restrict menus for MIRRORING role (reports and transactions only)
  let menuItems: any[] = [];

  if (userRole === "MIRRORING") {
    menuItems = [
      {
        title: "Laporan Mirroring",
        href: "/laporan",
        icon: BarChart3,
        hasArrow: false,
        badge: "Data",
      },
      {
        title: "Riwayat Transaksi",
        href: "/transaksi",
        icon: Receipt,
        hasArrow: true,
      },
    ];
  } else {
    menuItems = [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        hasArrow: false,
      },
      {
        title: "Transaksi",
        href: "/transaksi",
        icon: Receipt,
        hasArrow: true,
      },
      {
        title: "Produk & Stok",
        href: "/produk",
        icon: Boxes,
        hasArrow: true,
      },
      {
        title: "Laporan",
        href: "/laporan",
        icon: BarChart3,
        hasArrow: false,
      },
      ...(userRole === "SUPER_ADMIN"
        ? [
            {
              title: "Manajemen Akun",
              href: "/admin/users",
              icon: ShieldCheck,
              hasArrow: false,
              badge: "Admin",
            },
          ]
        : [
            {
              title: "Karyawan & Akses",
              href: "/karyawan",
              icon: Users2,
              hasArrow: true,
              badge: "Staff",
            },
          ]),
      {
        title: "Pengaturan",
        href: "/pengaturan",
        icon: Settings,
        hasArrow: false,
      },
    ];
  }

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand Header */}
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">KasirKu</h1>
            <p className="text-xs text-slate-400 font-medium">Back Office</p>
          </div>
        </div>

        {/* Store info preview if any */}
        {storeName && (
          <div className="px-4 pt-4 pb-1">
            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Toko Aktif</p>
              <p className="text-sm font-medium text-white truncate">{storeName}</p>
            </div>
          </div>
        )}

        {/* Navigation Menus */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.hasArrow && (
                    <ChevronRight className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & Logout */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Keluar Akun
          </span>
        </button>

        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-300">Sistem Online</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
