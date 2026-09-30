"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Package,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Barcode,
} from "lucide-react";

export default function ProdukPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  // Modal Add / Edit Product
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    costPrice: "",
    stock: "",
    minStock: "5",
    categoryId: "",
    barcode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.user?.role === "MIRRORING") {
          window.location.href = "/laporan";
          return;
        }
        setCurrentUser(authData.user);
        setTrial(authData.trial);
      }

      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
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

  const openAddModal = () => {
    if (trial?.isExpired) {
      alert("Masa aktif akun Anda telah berakhir. Anda tidak dapat menambah produk baru. Silakan hubungi Admin untuk perpanjangan masa aktif.");
      return;
    }
    setEditId(null);
    setForm({
      name: "",
      price: "",
      costPrice: "",
      stock: "0",
      minStock: "5",
      categoryId: categories[0]?.id || "",
      barcode: "",
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      price: p.price.toString(),
      costPrice: (p.costPrice || 0).toString(),
      stock: p.stock.toString(),
      minStock: (p.minStock || 5).toString(),
      categoryId: p.categoryId || "",
      barcode: p.barcode || "",
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PUT" : "POST";

      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        costPrice: form.costPrice && form.costPrice.trim() !== "" ? parseFloat(form.costPrice) || 0 : 0,
        stock: form.stock && form.stock.trim() !== "" ? parseInt(form.stock, 10) || 0 : 0,
        minStock: form.minStock && form.minStock.trim() !== "" ? parseInt(form.minStock, 10) || 5 : 5,
        categoryId: form.categoryId || null,
        barcode: form.barcode ? form.barcode.trim() : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menyimpan produk.");
        return;
      }

      setShowModal(false);
      loadData();
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        alert("Gagal menghapus produk.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar userRole={currentUser?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={currentUser} trial={trial} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Boxes className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Manajemen Menu, Produk & Stok
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Kelola daftar produk, harga jual, harga pokok modal, dan batas peringatan stok menipis.
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 flex items-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>

          {/* Search & Category Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === c.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau barcode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs">Memuat data produk...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Tidak ada produk yang ditemukan. Klik tombol Tambah Produk untuk menambahkan menu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Harga Jual</th>
                      <th className="py-3 px-4">Harga Modal</th>
                      <th className="py-3 px-4">Stok Saat Ini</th>
                      <th className="py-3 px-4">Status Stok</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock <= (p.minStock ?? 5);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{p.name}</p>
                                {p.barcode && (
                                  <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                    <Barcode className="w-3 h-3" /> {p.barcode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {p.category?.name || "Lainnya"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            Rp {(Number(p.price) || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            Rp {(Number(p.costPrice) || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {p.stock} pcs
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                isLow
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {isLow ? `Menipis (≤ ${p.minStock})` : "Aman"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Modal Add / Edit Product */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editId ? "Edit Data Produk" : "Tambah Produk Baru"}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Menu / Produk
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Misal: Kopi Susu Aren"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kategori
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="contoh: 15000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Harga Pokok / Modal (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="contoh: 9000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Batas Peringatan (Min. Stok)
                  </label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kode Barcode (Opsional)
                </label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Scan atau masukkan nomor barcode"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
