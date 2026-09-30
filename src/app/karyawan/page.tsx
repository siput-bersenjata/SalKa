"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Users2,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  Edit3,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Lock,
  Phone,
  User,
  Sliders,
  Sparkles,
} from "lucide-react";

interface StaffItem {
  id: string;
  username: string;
  fullName: string | null;
  phone: string | null;
  role: "CASHIER" | "MANAGER" | "MIRRORING";
  permissions: {
    canViewReports?: boolean;
    canManageProducts?: boolean;
    canManageSettings?: boolean;
    canVoidTransaction?: boolean;
    canApplyDiscounts?: boolean;
  } | null;
  mirrorPercentage: number | null;
  mirrorPrefix: string | null;
  createdAt: string;
}

export default function KaryawanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"CASHIER" | "MANAGER" | "MIRRORING">("CASHIER");

  // Permissions (for Cashier & Manager)
  const [canViewReports, setCanViewReports] = useState(false);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [canVoidTransaction, setCanVoidTransaction] = useState(false);
  const [canApplyDiscounts, setCanApplyDiscounts] = useState(true);

  // Mirroring Settings
  const [mirrorPercentage, setMirrorPercentage] = useState<number>(50);
  const [mirrorPrefix, setMirrorPrefix] = useState<string>("TRX");

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<StaffItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [meRes, staffRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/staff"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData.staff || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(defaultRole: "CASHIER" | "MANAGER" | "MIRRORING" = "CASHIER") {
    setIsEditMode(false);
    setEditingId(null);
    setUsername("");
    setPassword("");
    setFullName("");
    setPhone("");
    setRole(defaultRole);
    setErrorMessage(null);

    if (defaultRole === "CASHIER") {
      setCanViewReports(false);
      setCanManageProducts(false);
      setCanManageSettings(false);
      setCanVoidTransaction(false);
      setCanApplyDiscounts(true);
    } else if (defaultRole === "MANAGER") {
      setCanViewReports(true);
      setCanManageProducts(true);
      setCanManageSettings(false);
      setCanVoidTransaction(true);
      setCanApplyDiscounts(true);
    } else if (defaultRole === "MIRRORING") {
      setCanViewReports(true);
      setCanManageProducts(false);
      setCanManageSettings(false);
      setCanVoidTransaction(false);
      setCanApplyDiscounts(false);
      setMirrorPercentage(50);
      setMirrorPrefix("TRX");
    }

    setIsModalOpen(true);
  }

  function openEditModal(staff: StaffItem) {
    setIsEditMode(true);
    setEditingId(staff.id);
    setUsername(staff.username);
    setPassword(""); // Kosongkan jika tidak ingin ganti password
    setFullName(staff.fullName || "");
    setPhone(staff.phone || "");
    setRole(staff.role);
    setErrorMessage(null);

    const perms = staff.permissions || {};
    setCanViewReports(Boolean(perms.canViewReports));
    setCanManageProducts(Boolean(perms.canManageProducts));
    setCanManageSettings(Boolean(perms.canManageSettings));
    setCanVoidTransaction(Boolean(perms.canVoidTransaction));
    setCanApplyDiscounts(perms.canApplyDiscounts !== false);

    setMirrorPercentage(staff.mirrorPercentage || 50);
    setMirrorPrefix(staff.mirrorPrefix || "TRX");

    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        role,
        permissions: {
          canViewReports: role === "MIRRORING" ? true : canViewReports,
          canManageProducts: role === "MIRRORING" ? false : canManageProducts,
          canManageSettings: role === "MIRRORING" ? false : canManageSettings,
          canVoidTransaction: role === "MIRRORING" ? false : canVoidTransaction,
          canApplyDiscounts: role === "MIRRORING" ? false : canApplyDiscounts,
        },
      };

      if (role === "MIRRORING") {
        payload.mirrorPercentage = mirrorPercentage;
        payload.mirrorPrefix = mirrorPrefix.trim().toUpperCase() || "TRX";
      }

      if (!isEditMode) {
        payload.username = username.trim().toLowerCase();
        payload.password = password;

        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Gagal membuat akun");
          setSubmitting(false);
          return;
        }

        setSuccessMessage(data.message || "Akun berhasil dibuat.");
      } else {
        if (password.trim()) {
          payload.password = password.trim();
        }

        const res = await fetch(`/api/staff/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Gagal memperbarui akun");
          setSubmitting(false);
          return;
        }

        setSuccessMessage(data.message || "Akun berhasil diperbarui.");
      }

      setIsModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus akun");
      } else {
        setSuccessMessage("Akun berhasil dihapus.");
        setDeleteTarget(null);
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const filteredStaff = staffList.filter((s) => {
    if (filterRole === "ALL") return true;
    return s.role === filterRole;
  });

  const countCashier = staffList.filter((s) => s.role === "CASHIER").length;
  const countManager = staffList.filter((s) => s.role === "MANAGER").length;
  const countMirroring = staffList.filter((s) => s.role === "MIRRORING").length;

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
                  <Users2 className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Manajemen Karyawan & Akses Data
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Kelola akun kasir untuk aplikasi Android, akun manajer, serta akun mirroring laporan transaksi bertarget.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreateModal("CASHIER")}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Tambah Karyawan Kasir
              </button>
              <button
                onClick={() => openCreateModal("MIRRORING")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" /> Buat Akun Mirroring
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Akun Staf</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{staffList.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Users2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akun Kasir (POS)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{countCashier}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akun Manajer</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{countManager}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Akun Mirroring</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{countMirroring}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Info Banner for Mirroring & Cashier App */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30">
                <Shield className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm tracking-wide text-white">
                Keamanan & Pemisahan Akses Karyawan vs Owner
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              • <strong>Karyawan Kasir</strong> dapat login di aplikasi kasir Android menggunakan username & password kasir mereka sendiri. Karyawan kasir tidak mengetahui password akun master Owner dan hanya dapat melakukan transaksi penjualan.<br />
              • <strong>Akun Data Mirroring</strong> dikhususkan bagi pihak ketiga (investor, mitra, atau pelaporan tertentu). Akun ini <em>hanya</em> memiliki hak akses membuka halaman laporan transaksi. Persentase data yang masuk dapat diatur (misal 50% atau 70%) dan nomor faktur akan <strong>otomatis dibuat berurutan (gapless sequence)</strong> tanpa meninggalkan celah nomor transaksi asli.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { label: "Semua Akun", value: "ALL", count: staffList.length },
              { label: "Kasir (Android POS)", value: "CASHIER", count: countCashier },
              { label: "Manager", value: "MANAGER", count: countManager },
              { label: "Akun Data Mirroring", value: "MIRRORING", count: countMirroring },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterRole(tab.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filterRole === tab.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs">Memuat daftar staf & akun mirroring...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Users2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Belum ada akun pada kategori ini</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Klik tombol &quot;Tambah Karyawan Kasir&quot; atau &quot;Buat Akun Mirroring&quot; di atas untuk membuat akun baru.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Nama & Username</th>
                      <th className="py-3.5 px-4">Tipe Akun</th>
                      <th className="py-3.5 px-4">Pengaturan Hak Akses / Mirroring</th>
                      <th className="py-3.5 px-4">Kontak</th>
                      <th className="py-3.5 px-4">Dibuat Pada</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStaff.map((staff) => {
                      const isMirror = staff.role === "MIRRORING";
                      const isManager = staff.role === "MANAGER";
                      const perms = staff.permissions || {};

                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs ${
                                  isMirror
                                    ? "bg-indigo-600"
                                    : isManager
                                    ? "bg-emerald-600"
                                    : "bg-blue-600"
                                }`}
                              >
                                {isMirror ? "MR" : staff.fullName?.charAt(0).toUpperCase() || staff.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {staff.fullName || staff.username}
                                </p>
                                <p className="text-slate-400 font-mono text-[11px]">
                                  @{staff.username}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {isMirror ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                                <Sparkles className="w-3.5 h-3.5" /> Akun Mirroring
                              </span>
                            ) : isManager ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                                <Shield className="w-3.5 h-3.5" /> Manager
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
                                <User className="w-3.5 h-3.5" /> Kasir (POS)
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {isMirror ? (
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                                  <Percent className="w-3 h-3 text-amber-600" />
                                  <span>Tampil {staff.mirrorPercentage || 100}% Transaksi Asli</span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Prefix Invoice: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{staff.mirrorPrefix || "TRX"}</code> (Nomor Urut Otomatis)
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  perms.canViewReports ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                                }`}>
                                  {perms.canViewReports ? "✓ Buka Laporan" : "✕ Tutup Laporan"}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  perms.canManageProducts ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                                }`}>
                                  {perms.canManageProducts ? "✓ Kelola Stok" : "✕ Kelola Stok"}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  perms.canManageSettings ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                                }`}>
                                  {perms.canManageSettings ? "✓ Ubah Toko" : "✕ Ubah Toko"}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-600">
                            {staff.phone ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {staff.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-400 text-[11px]">
                            {new Date(staff.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(staff)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                                title="Edit Akun & Akses"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(staff)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isEditMode ? "Edit Akun & Hak Akses" : "Tambah Akun Baru"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {role === "MIRRORING"
                    ? "Konfigurasi akun data mirroring dengan persentase laporan & nomor urut beruntun."
                    : "Konfigurasi akun login karyawan untuk aplikasi kasir Android / backoffice."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Role Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tipe Akun</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "CASHIER", label: "Kasir (POS)", icon: User },
                    { key: "MANAGER", label: "Manager", icon: Shield },
                    { key: "MIRRORING", label: "Mirroring", icon: Sparkles },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = role === t.key;
                    return (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => {
                          setRole(t.key as any);
                          if (t.key === "MIRRORING") {
                            setCanViewReports(true);
                            setCanManageProducts(false);
                            setCanManageSettings(false);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-bold">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Fields */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {role === "MIRRORING" ? "Nama / Deskripsi Laporan *" : "Nama Lengkap Karyawan *"}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === "MIRRORING" ? "Contoh: Laporan Partner Investor" : "Contoh: Budi Santoso"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    disabled={isEditMode}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: kasir_budi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  {isEditMode && <span className="text-[10px] text-slate-400">Username tidak dapat diubah</span>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isEditMode ? "Password Baru (Opsional)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    required={!isEditMode}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEditMode ? "Biarkan kosong jika tetap" : "Min. 5 karakter"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / Telepon (Opsional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* SPECIFIC CONFIGURATION: MIRRORING */}
              {role === "MIRRORING" ? (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">Konfigurasi Data Mirroring</span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tentukan berapa persen transaksi asli yang ingin Anda tampilkan ke akun ini. Sistem akan menyaring transaksi secara proporsional dan membuat <strong>nomor invoice berurutan (urut tanpa lompat)</strong>.
                  </p>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-700">Persentase Transaksi:</span>
                      <span className="font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md text-xs">
                        {mirrorPercentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={mirrorPercentage}
                      onChange={(e) => setMirrorPercentage(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>5% (Sangat sedikit)</span>
                      <span>50% (Separuh)</span>
                      <span>100% (Semua)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prefix Nomor Faktur Mirroring</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={mirrorPrefix}
                      onChange={(e) => setMirrorPrefix(e.target.value.toUpperCase())}
                      placeholder="TRX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs uppercase"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Contoh hasil nomor faktur: <code className="text-indigo-700 font-bold">{mirrorPrefix || "TRX"}2026100100001</code>, <code className="text-indigo-700 font-bold">{mirrorPrefix || "TRX"}2026100100002</code>...
                    </span>
                  </div>
                </div>
              ) : (
                /* SPECIFIC CONFIGURATION: CASHIER & MANAGER PERMISSIONS */
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-slate-900 text-sm">Hak Akses Karyawan</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canViewReports}
                        onChange={(e) => setCanViewReports(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Dapat Melihat Laporan Omset & Keuangan</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canManageProducts}
                        onChange={(e) => setCanManageProducts(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Dapat Menambah & Mengubah Produk / Stok</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canManageSettings}
                        onChange={(e) => setCanManageSettings(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Dapat Mengubah Pengaturan Toko & Struk</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canVoidTransaction}
                        onChange={(e) => setCanVoidTransaction(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Dapat Membatalkan / Void Transaksi</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canApplyDiscounts}
                        onChange={(e) => setCanApplyDiscounts(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Dapat Memberikan Diskon Transaksi</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isEditMode ? "Simpan Perubahan" : "Buat Akun"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Hapus Akun Ini?</h4>
              <p className="text-xs text-slate-500">
                Yakin ingin menghapus akun <strong>{deleteTarget.fullName || deleteTarget.username}</strong> (@{deleteTarget.username})? Pengguna ini tidak akan dapat login lagi.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
