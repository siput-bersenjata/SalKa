import React from "react";
import Link from "next/link";
import { Boxes, ExternalLink } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  stock: number;
  minStock?: number;
}

interface StockOverviewTableProps {
  products?: ProductRow[];
}

export default function StockOverviewTable({
  products = [],
}: StockOverviewTableProps) {
  const displayItems =
    products.length > 0
      ? products.slice(0, 6)
      : [
          { id: "1", name: "Air Mineral 600ml", stock: 72, minStock: 5 },
          { id: "2", name: "Teh Botol", stock: 45, minStock: 5 },
          { id: "3", name: "Indomie Goreng", stock: 5, minStock: 5 },
          { id: "4", name: "Roti Tawar", stock: 6, minStock: 5 },
          { id: "5", name: "Kopi Sachet", stock: 8, minStock: 5 },
          { id: "6", name: "Susu UHT", stock: 30, minStock: 5 },
        ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Stok Produk</h3>
            <p className="text-xs text-slate-500">Ketersediaan barang di gudang/toko</p>
          </div>
        </div>

        <Link
          href="/produk"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          Lihat Semua <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="pb-3">Nama Produk</th>
              <th className="pb-3">Stok</th>
              <th className="pb-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {displayItems.map((prod) => {
              const isLow = prod.stock <= (prod.minStock ?? 5);

              return (
                <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 font-semibold text-slate-800">{prod.name}</td>
                  <td className="py-3 font-mono text-slate-600">{prod.stock} pcs</td>
                  <td className="py-3 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isLow
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isLow ? "Rendah" : "Aman"}
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
