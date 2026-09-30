"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Settings,
  Store,
  Printer,
  FileText,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  Bluetooth,
  Save,
} from "lucide-react";

export default function PengaturanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    paperSize: "58mm",
    receiptHeader: "",
    receiptFooter: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, profileRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/store/profile"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user?.role === "MIRRORING") {
            window.location.href = "/laporan";
            return;
          }
          if (meData.user?.role === "CASHIER" && !meData.user?.permissions?.canManageStore) {
            window.location.href = "/laporan";
            return;
          }
          setCurrentUser(meData.user);
          setTrial(meData.trial);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.store) {
            setForm({
              name: data.store.name || "Toko Sumber Rejeki",
              address: data.store.address || "",
              phone: data.store.phone || "",
              paperSize: data.store.paperSize || "58mm",
              receiptHeader: data.store.receiptHeader || "Terima Kasih Atas Kunjungan Anda",
              receiptFooter: data.store.receiptFooter || "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan",
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/store/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Pengaturan profil toko dan printer struk berhasil disimpan!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(data.error || "Gagal menyimpan pengaturan.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar userRole={currentUser?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={currentUser} trial={trial} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Settings className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Pengaturan Toko & Printer Struk Termal
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Sesuaikan identitas toko, nomor kontak, ukuran kertas struk (58mm/80mm), dan catatan header/footer.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-2xl border border-emerald-200 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Memuat pengaturan toko...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Bagian 1: Identitas Toko */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Store className="w-4 h-4 text-blue-600" /> Identitas Toko
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nama Toko
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Misal: Toko Sumber Rejeki"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          No. Telepon / WhatsApp
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="0812-3456-7890"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Alamat Toko
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="Jl. Sudirman No. 45, Jakarta"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Pengaturan Printer Struk Termal */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Printer className="w-4 h-4 text-blue-600" /> Format Struk & Printer Thermal
                    </h3>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Pilih Ukuran Lebar Kertas Thermal:
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label
                          className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                            form.paperSize === "58mm"
                              ? "border-blue-600 bg-blue-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <input
                              type="radio"
                              name="paperSize"
                              value="58mm"
                              checked={form.paperSize === "58mm"}
                              onChange={() => setForm({ ...form, paperSize: "58mm" })}
                              className="hidden"
                            />
                            <p className="font-bold text-slate-900 text-sm">58 mm (Standar)</p>
                            <p className="text-[11px] text-slate-500">Printer mini bluetooth kasir portable</p>
                          </div>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.paperSize === "58mm" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`} />
                        </label>

                        <label
                          className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                            form.paperSize === "80mm"
                              ? "border-blue-600 bg-blue-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <input
                              type="radio"
                              name="paperSize"
                              value="80mm"
                              checked={form.paperSize === "80mm"}
                              onChange={() => setForm({ ...form, paperSize: "80mm" })}
                              className="hidden"
                            />
                            <p className="font-bold text-slate-900 text-sm">80 mm (Besar)</p>
                            <p className="text-[11px] text-slate-500">Printer thermal desktop POS lebar</p>
                          </div>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.paperSize === "80mm" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Teks Header Struk
                      </label>
                      <input
                        type="text"
                        value={form.receiptHeader}
                        onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                        placeholder="Misal: Terima Kasih Atas Kunjungan Anda!"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Teks Catatan / Footer Struk
                      </label>
                      <input
                        type="text"
                        value={form.receiptFooter}
                        onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                        placeholder="Misal: Barang yang sudah dibeli tidak dapat ditukar/dikembalikan"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Simpan Pengaturan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Thermal Receipt Preview & Bluetooth Thermal Guide */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Preview Live Struk ({form.paperSize})
                  </h3>

                  <div className="bg-slate-50 p-4 border border-dashed border-slate-300 rounded-2xl font-mono text-[11px] space-y-2.5 shadow-inner">
                    <div className="text-center border-b border-dashed border-slate-300 pb-2">
                      <p className="font-bold text-sm uppercase text-slate-900">{form.name || "NAMA TOKO"}</p>
                      <p className="text-[10px] text-slate-500">{form.address || "Alamat Toko Anda"}</p>
                      <p className="text-[10px] text-slate-500">Telp: {form.phone || "-"}</p>
                    </div>

                    <div className="text-[10px] text-slate-600 flex justify-between">
                      <span>TRX-CONTOH-001</span>
                      <span>30/09/2026</span>
                    </div>

                    <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span>1x Kopi Sachet</span>
                        <span>Rp 2.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2x Teh Botol</span>
                        <span>Rp 8.000</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-1 text-slate-900 font-bold">
                      <div className="flex justify-between">
                        <span>TOTAL</span>
                        <span>Rp 10.000</span>
                      </div>
                    </div>

                    <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
                      <p className="font-semibold text-slate-700">{form.receiptHeader}</p>
                      <p className="text-[9px]">{form.receiptFooter}</p>
                    </div>
                  </div>
                </div>

                {/* Bluetooth Thermal Helper Box */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 space-y-3">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                    <Bluetooth className="w-4 h-4" />
                    <span>Koneksi Printer Bluetooth HP</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pengaturan nama toko dan ukuran kertas di sini akan otomatis sinkron ke aplikasi Android KasirKu saat login. Pada aplikasi Android, masuk ke menu <strong>Pengaturan &gt; Printer Bluetooth</strong> untuk pairing ke printer thermal Anda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
