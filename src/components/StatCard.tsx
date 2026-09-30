import React from "react";
import { ArrowUpRight, ChevronRight, LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  href?: string;
}

export default function StatCard({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  iconColor,
  iconBg,
  href,
}: StatCardProps) {
  const content = (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {trend && (
          <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{trend}</span>
          </div>
        )}
        {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
      </div>

      <div className="flex flex-col items-end space-y-3">
        <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
        {href && (
          <div className="text-slate-400 hover:text-slate-600">
            <ChevronRight className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
