import React from "react";
import Link from "next/link";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";

interface ProductLowStock {
  id: string;
  name: string;
  stock: number;
  minStock?: number;
  imageUrl?: string | null;
}

interface LowStockWidgetProps {
  products?: ProductLowStock[];
}

export default function LowStockWidget({ products = [] }: LowStockWidgetProps) {
  const displayItems =
    products.length > 0
      ? products.slice(0, 5)
      : [
          { id: "1", name: "Air Mineral 600ml", stock: 3 },
          { id: "2", name: "Indomie Goreng", stock: 5 },
          { id: "3", name: "Roti Tawar", stock: 6 },
          { id: "4", name: "Kopi Sachet", stock: 8 },
          { id: "5", name: "Susu UHT", stock: 4 },
        ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Produk Stok Menipis</h3>
            <p className="text-xs text-slate-500">Perlu restock segera</p>
          </div>
        </div>

        <Link
          href="/produk?lowStock=true"
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          Lihat Semua <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {displayItems.map((prod) => (
          <div key={prod.id} className="py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-800 truncate max-w-[150px]">{prod.name}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
              {prod.stock} pcs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
