"use client";

import React from "react";
import { PieChart } from "lucide-react";

interface CategoryItem {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface CategoryDonutProps {
  totalRevenue?: number;
  data?: CategoryItem[];
}

export default function CategoryDonut({
  totalRevenue = 2485000,
  data = [],
}: CategoryDonutProps) {
  const palette = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#64748B", "#EC4899"];

  const items: { name: string; value: number; percentage: number; color: string }[] =
    data.length > 0
      ? (() => {
          const sum = data.reduce((a, b) => a + b.value, 0) || 1;
          return data.map((d, idx) => ({
            name: d.name,
            value: d.value,
            percentage: Math.round((d.value / sum) * 100),
            color: palette[idx % palette.length],
          }));
        })()
      : [
          { name: "Minuman", value: 944300, percentage: 38, color: "#2563EB" },
          { name: "Makanan", value: 670950, percentage: 27, color: "#10B981" },
          { name: "Snack", value: 372750, percentage: 15, color: "#F59E0B" },
          { name: "Rokok", value: 248500, percentage: 10, color: "#8B5CF6" },
          { name: "Lainnya", value: 248500, percentage: 10, color: "#64748B" },
        ];

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <PieChart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Penjualan per Kategori</h3>
          <p className="text-xs text-slate-500">Distribusi omset per kelompok menu</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
        {/* Donut Graphic */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            {items.map((item, idx) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercent / 100) * circumference);
              cumulativePercent += item.percentage;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-85"
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute text-center px-2">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              Rp {totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(2)}jt` : totalRevenue.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Total Penjualan</p>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 w-full sm:w-auto">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between sm:space-x-8 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
