"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Store,
  Receipt,
  Boxes,
  Loader2,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [extensionType, setExtensionType] = useState("1_MONTH");
  const [customDate, setCustomDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenExtend = (u: any) => {
    setSelectedUser(u);
    setExtensionType("1_MONTH");
    setCustomDate("");
    setNotes("");
    setSuccessMsg("");
  };

  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensionType,
          customDate: extensionType === "CUSTOM" ? customDate : undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          setSelectedUser(null);
          loadData();
        }, 1200);
      } else {
        alert(data.error || "Gagal mengubah masa aktif.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.store?.name && u.store.name.toLowerCase().includes(q))
    );
  });

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
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Manajemen Akun Kasir & Batas Waktu Lisensi
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Kelola status masa aktif, trial 1 bulan, dan perpanjangan langganan seluruh akun toko kasir.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari toko atau username..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Terdaftar: <strong className="text-slate-800">{filteredUsers.length} Akun</strong></span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <Filter className="w-3.5 h-3.5" /> Menampilkan seluruh penyewa/toko
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs">Memuat daftar akun kasir...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Tidak ada akun yang sesuai dengan pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Pengguna / Toko</th>
                      <th className="py-3 px-4">Kontak</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status & Sisa Waktu</th>
                      <th className="py-3 px-4">Batas Masa Aktif</th>
                      <th className="py-3 px-4">Statistik Toko</th>
                      <th className="py-3 px-4 text-right">Aksi Penyetelan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const trial = u.trialInfo;
                      const isExpired = trial?.isExpired;
                      const isLifetime = trial?.isLifetime;
                      const expiryDateStr = trial?.expiresAt
                        ? new Date(trial.expiresAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{u.username}</p>
                            <p className="text-slate-500 font-medium">{u.store?.name || "Belum ada toko"}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <p>{u.fullName || "-"}</p>
                            <p className="text-slate-400 text-[11px]">{u.phone || "-"}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === "SUPER_ADMIN"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {u.role === "SUPER_ADMIN" ? "Super Admin" : "Kasir / Owner"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              {isLifetime ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Sparkles className="w-3 h-3 text-purple-600" /> Lifetime
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Kadaluwarsa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Clock className="w-3 h-3 text-emerald-600" /> Sisa {trial?.daysRemaining} Hari
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {isLifetime ? "Permanen" : expiryDateStr}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.store ? (
                              <div className="flex items-center space-x-3 text-slate-500">
                                <span className="flex items-center gap-1" title="Jumlah Produk">
                                  <Boxes className="w-3.5 h-3.5 text-blue-500" /> {u.store.productCount} item
                                </span>
                                <span className="flex items-center gap-1" title="Jumlah Transaksi">
                                  <Receipt className="w-3.5 h-3.5 text-emerald-500" /> {u.store.transactionCount} trx
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {u.role !== "SUPER_ADMIN" && (
                              <button
                                onClick={() => handleOpenExtend(u)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                              >
                                Setel Batas Waktu
                              </button>
                            )}
                            {u.store && (
                              <Link
                                href={`/transaksi?storeId=${u.store.id}`}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
                              >
                                Cek Transaksi
                              </Link>
                            )}
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

      {/* Modal Penyetelan Batas Waktu Lisensi */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Setel Batas Waktu Masa Aktif</h3>
              <p className="text-xs text-slate-500">
                Ubah batas waktu akun kasir <strong className="text-blue-600">@{selectedUser.username}</strong> ({selectedUser.store?.name || "Toko"}).
              </p>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSaveExtension} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Durasi Perpanjangan:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    { label: "+1 Bulan (30 Hari)", value: "1_MONTH" },
                    { label: "+3 Bulan (90 Hari)", value: "3_MONTHS" },
                    { label: "+6 Bulan (180 Hari)", value: "6_MONTHS" },
                    { label: "+1 Tahun (365 Hari)", value: "1_YEAR" },
                    { label: "⭐ Aktif Selamanya (Lifetime)", value: "LIFETIME" },
                    { label: "📅 Tanggal Kustom", value: "CUSTOM" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExtensionType(opt.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        extensionType === opt.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {extensionType === "CUSTOM" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Tanggal Berakhir:
                  </label>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Catatan Admin (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Bukti pembayaran transfer BCA #INV102"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
