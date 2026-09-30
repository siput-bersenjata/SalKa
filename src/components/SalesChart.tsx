"use client";

import React, { useState } from "react";
import { TrendingUp } from "lucide-react";

interface SalesPoint {
  date: string;
  label: string;
  total: number;
  x?: number;
  y?: number;
}

interface SalesChartProps {
  data?: SalesPoint[];
}

export default function SalesChart({ data = [] }: SalesChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<(SalesPoint & { x: number; y: number }) | null>(null);

  // Fallback demo data if no transactions yet
  const chartData =
    data.length >= 7
      ? data
      : [
          { date: "2026-09-24", label: "2 Sep", total: 1300000 },
          { date: "2026-09-25", label: "3 Sep", total: 1050000 },
          { date: "2026-09-26", label: "4 Sep", total: 1950000 },
          { date: "2026-09-27", label: "5 Sep", total: 1650000 },
          { date: "2026-09-28", label: "6 Sep", total: 2500000 },
          { date: "2026-09-29", label: "7 Sep", total: 2300000 },
          { date: "2026-09-30", label: "8 Sep", total: 3100000 },
        ];

  const maxVal = Math.max(...chartData.map((d) => d.total), 4000000);
  const height = 220;
  const width = 500;
  const paddingX = 40;
  const paddingY = 20;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.total / maxVal) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Grafik Penjualan</h3>
            <p className="text-xs text-slate-500">Aktivitas omset penjualan harian</p>
          </div>
        </div>

        <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 font-medium focus:outline-none">
          <option>7 Hari Terakhir</option>
          <option>30 Hari Terakhir</option>
        </select>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            const labelValue = Math.round(ratio * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {labelValue >= 1000000
                    ? `${(labelValue / 1000000).toFixed(0)}.000.000`
                    : labelValue > 0
                    ? `${(labelValue / 1000).toFixed(0)}k`
                    : "0"}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#salesGrad)" />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)}>
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
              <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
              <text
                x={p.x}
                y={height - 4}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-medium"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute -top-3 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 whitespace-nowrap z-10 font-mono"
            style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
          >
            <p className="font-semibold text-[11px]">{hoveredPoint.label}</p>
            <p className="text-blue-300 font-bold">Rp {hoveredPoint.total.toLocaleString("id-ID")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
